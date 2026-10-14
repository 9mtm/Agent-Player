// BE-UI-02: machine-readable `code` on sign-in and request-check errors, and a quiet CSRF hook.
// Run: node --import tsx --test test/auth-error-codes.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-auth-codes-'));
process.chdir(dir);
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ALLOWED_ORIGINS = 'http://localhost:41522';

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const { default: Fastify } = await import('fastify');
const { default: rateLimit } = await import('@fastify/rate-limit');
const { authRoutes } = await import('../src/api/routes/auth.ts');
const { registerAuthGate } = await import('../src/auth/auth-gate.ts');
const { requireActiveRole, OWNER_OR_ADMIN } = await import('../src/auth/route-guards.ts');
const { registerHostCheck, getAllowedHosts } = await import('../src/middleware/host-check.ts');
const { registerCsrfProtection } = await import('../src/middleware/csrf-protection.ts');
const { isPublishedDefaultPassword } = await import('../src/auth/default-accounts.ts');
const { generateToken } = await import('../src/auth/jwt.ts');
const bcrypt = (await import('bcryptjs')).default;

const db = getDatabase();
await db.initialize();

const strong = 'a-strong-passphrase-42';
const strongHash = await bcrypt.hash(strong, 10);
const mockHash = await bcrypt.hash('mock-only', 10);
const addUser = (id, email, { role = 'user', status = 'active', verified = 1, hash = strongHash } = {}) =>
  db.prepare(`INSERT INTO users (id, email, username, password_hash, full_name, role, status, email_verified, token_version)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`).run(id, email, id, hash, id, role, status, verified);

addUser('owner-1', 'owner@example.test', { role: 'owner' });
addUser('member-1', 'member@example.test');
addUser('guest-1', 'guest@example.test', { role: 'guest' });
addUser('disabled-1', 'disabled@example.test', { role: 'admin', status: 'suspended' });
addUser('unverified-1', 'unverified@example.test', { verified: 0 });
addUser('mock-1', 'mock@example.test', { hash: mockHash });

const bearer = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });

// Login routes without the rate limiter, so each refusal is reached directly.
const loginApp = Fastify();
await loginApp.register(authRoutes);
await loginApp.ready();

test.after(async () => {
  await loginApp.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const login = (app, email, password) => app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });

function assertCode(res, status, code) {
  assert.equal(res.statusCode, status, res.body);
  const body = res.json();
  assert.equal(body.code, code, res.body);
  assert.equal(typeof body.error, 'string');
  for (const word of ['stack', 'sql', 'SELECT', 'password_hash', 'token_version']) {
    assert.ok(!res.body.includes(word), `${code} body leaks "${word}"`);
  }
}

test('mock-mode fictional password is a published default password', () => {
  assert.ok(isPublishedDefaultPassword('mock-only'));
  assert.ok(isPublishedDefaultPassword('fictional-password'));
  assert.ok(!isPublishedDefaultPassword(strong));
});

test('login: inactive / unverified / system accounts -> account_inactive (message unchanged)', async () => {
  for (const email of ['disabled@example.test', 'unverified@example.test']) {
    const res = await login(loginApp, email, strong);
    assertCode(res, 403, 'account_inactive');
    assert.equal(res.json().message, 'Account access denied');
  }
  // S0-Q.21: the state is only shown after the password matches. Older
  // databases stored this published password for the system account.
  db.prepare(`UPDATE users SET password_hash = ? WHERE id = 'mock-user'`).run(await bcrypt.hash('system-user-not-for-login', 4));
  const system = await login(loginApp, 'system@agent-player.local', 'system-user-not-for-login');
  assertCode(system, 403, 'account_inactive');
});

test('login: published default password -> published_password', async () => {
  const res = await login(loginApp, 'mock@example.test', 'mock-only');
  assertCode(res, 403, 'published_password');
  assert.equal(res.json().token, undefined);
});

// S0-Q.20: no account-wide lock any more; a throttled source gets the generic
// rate_limited reply (account_locked is no longer sent), other sources are unaffected.
test('login: five wrong passwords throttle that source (rate_limited), even for the right password', async () => {
  addUser('lock-1', 'lock@example.test');
  const from = (remoteAddress, password) =>
    loginApp.inject({ method: 'POST', url: '/api/auth/login', remoteAddress, payload: { email: 'lock@example.test', password } });
  for (let i = 0; i < 5; i++) {
    assert.equal((await from('10.0.0.9', 'wrong-password-1')).statusCode, 401);
  }
  assertCode(await from('10.0.0.9', strong), 429, 'rate_limited');
  assert.equal((await from('10.0.0.10', strong)).statusCode, 200);
});

test('login: too many attempts -> 429 rate_limited', async () => {
  const app = Fastify();
  await app.register(rateLimit, { global: false, max: 100, timeWindow: '1 minute' });
  await app.register(authRoutes);
  await app.ready();
  try {
    let last;
    for (let i = 0; i < 6; i++) last = await login(app, 'nobody@example.test', 'wrong-password-1');
    assertCode(last, 429, 'rate_limited');
  } finally {
    await app.close();
  }
});

test('auth gate: no token -> unauthenticated; guest / missing role -> forbidden', async () => {
  const app = Fastify();
  registerAuthGate(app);
  app.get('/api/things', async () => ({ ok: true }));
  app.get('/api/database/stats', async () => ({ ok: true })); // owner tier
  await app.ready();
  try {
    assertCode(await app.inject({ method: 'GET', url: '/api/things' }), 401, 'unauthenticated');
    // A disabled account's token no longer signs anyone in.
    assertCode(await app.inject({ method: 'GET', url: '/api/things', headers: bearer('disabled-1') }), 401, 'unauthenticated');
    assertCode(await app.inject({ method: 'GET', url: '/api/things', headers: bearer('guest-1') }), 403, 'forbidden');
    assertCode(await app.inject({ method: 'GET', url: '/api/database/stats', headers: bearer('member-1') }), 403, 'forbidden');
    const ok = await app.inject({ method: 'GET', url: '/api/database/stats', headers: bearer('owner-1') });
    assert.equal(ok.statusCode, 200);
  } finally {
    await app.close();
  }
});

test('route guard: unauthenticated / inactive_user / forbidden', async () => {
  const app = Fastify();
  app.get('/guarded', { preHandler: requireActiveRole(OWNER_OR_ADMIN) }, async () => ({ ok: true }));
  await app.ready();
  try {
    assertCode(await app.inject({ method: 'GET', url: '/guarded' }), 401, 'unauthenticated');
    const disabled = await app.inject({ method: 'GET', url: '/guarded', headers: bearer('disabled-1') });
    assertCode(disabled, 403, 'inactive_user');
    assert.equal(disabled.json().error, 'This action requires an active owner or admin account');
    assertCode(await app.inject({ method: 'GET', url: '/guarded', headers: bearer('member-1') }), 403, 'forbidden');
    assert.equal((await app.inject({ method: 'GET', url: '/guarded', headers: bearer('owner-1') })).statusCode, 200);
  } finally {
    await app.close();
  }
});

test('host check: disallowed Host -> 421 host_not_allowed', async () => {
  const app = Fastify();
  registerHostCheck(app, getAllowedHosts('', undefined));
  app.get('/ping', async () => ({ ok: true }));
  await app.ready();
  try {
    assertCode(await app.inject({ method: 'GET', url: '/ping', headers: { host: 'rebind.attacker.example' } }), 421, 'host_not_allowed');
  } finally {
    await app.close();
  }
});

test('csrf: bad origin -> 403 origin_not_allowed; successful requests log nothing', async () => {
  const app = Fastify();
  registerCsrfProtection(app);
  app.post('/api/act', async () => ({ ok: true }));
  await app.ready();

  const logged = [];
  const saved = {};
  for (const level of ['log', 'info', 'debug', 'warn', 'error']) {
    saved[level] = console[level];
    console[level] = (...args) => { logged.push([level, args.map(String).join(' ')]); };
  }
  try {
    const good = await app.inject({ method: 'POST', url: '/api/act?secret=q1', headers: { origin: 'http://localhost:41522' }, payload: {} });
    assert.equal(good.statusCode, 200, good.body);
    const loopback = await app.inject({ method: 'POST', url: '/api/act', payload: {} });
    assert.equal(loopback.statusCode, 200, loopback.body);
    assert.deepEqual(logged, [], 'successful requests must not log');

    const bad = await app.inject({ method: 'POST', url: '/api/act?secret=q2', headers: { origin: 'https://evil.example' }, payload: {} });
    const missing = await app.inject({ method: 'POST', url: '/api/act', headers: { host: 'agent.example' }, payload: {} });
    const invalid = await app.inject({ method: 'POST', url: '/api/act', headers: { origin: 'not a url' }, payload: {} });
    for (const res of [bad, missing, invalid]) assertCode(res, 403, 'origin_not_allowed');
    assert.equal(bad.json().message, 'Origin not allowed');

    assert.equal(logged.length, 3);
    for (const [level, line] of logged) {
      assert.equal(level, 'warn');
      assert.ok(!line.includes('secret='), 'rejection log must not include the query string');
      assert.ok(!line.includes('evil.example'), 'rejection log must not include the origin');
    }
  } finally {
    Object.assign(console, saved);
    await app.close();
  }
});
