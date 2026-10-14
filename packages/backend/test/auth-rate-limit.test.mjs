// S0-Q.22: the auth route limits are never keyed by the shared loopback IP alone.
// Sign-in has only a per-IP flood guard (valid device tokens exempt); register is
// limited per target email and change-password per account.
// Run: node --import tsx --test test/auth-rate-limit.test.mjs
// The other auth tests register authRoutes without @fastify/rate-limit, so the
// route limits are inert there. Here the plugin is registered explicitly with
// RATE_LIMIT_PLUGIN_OPTIONS (the same options buildServer uses), so the real
// route configs run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-auth-rate-limit-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only

const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => { throw new Error(`unexpected network call in test: ${url}`); };

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const { default: Fastify } = await import('fastify');
const { default: rateLimit } = await import('@fastify/rate-limit');
const { authRoutes } = await import('../src/api/routes/auth.ts');
const cfg = await import('../src/api/rate-limit-config.ts');
const { generateToken } = await import('../src/auth/jwt.ts');
const bcrypt = (await import('bcryptjs')).default;

const db = getDatabase();
await db.initialize();

const PASSWORD = 'Rate-Limit-Test-42!';
const hash = await bcrypt.hash(PASSWORD, 4);
const addUser = (id, role = 'user') =>
  db.prepare(`INSERT INTO users (id, email, username, password_hash, full_name, role, status, email_verified, token_version)
              VALUES (?, ?, ?, ?, ?, ?, 'active', 1, 1)`).run(id, `${id}@example.test`, id, hash, id, role);
addUser('owner', 'owner');
addUser('alice');
addUser('bob');
addUser('carol');

const app = Fastify();
await app.register(rateLimit, { ...cfg.RATE_LIMIT_PLUGIN_OPTIONS });
await app.register(authRoutes);
await app.ready();

test.after(async () => {
  globalThis.fetch = realFetch;
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const LOOP = '127.0.0.1';
const bearer = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const login = (email, password, deviceToken) =>
  app.inject({
    method: 'POST', url: '/api/auth/login', remoteAddress: LOOP,
    payload: deviceToken === undefined ? { email, password } : { email, password, deviceToken },
  });
const changePassword = (id, currentPassword) =>
  app.inject({
    method: 'POST', url: '/api/auth/change-password', remoteAddress: LOOP, headers: bearer(id),
    payload: { currentPassword, newPassword: 'Another-Strong-Pass-43!' },
  });
const register = (email) =>
  app.inject({
    method: 'POST', url: '/api/auth/register', remoteAddress: LOOP, headers: bearer('owner'),
    payload: { email, username: email.split('@')[0].replace(/[^a-z0-9]/gi, '') + randomBytes(3).toString('hex'), password: PASSWORD, full_name: 'New User' },
  });
const assertRateLimited = (res) => {
  assert.equal(res.statusCode, 429, res.body);
  assert.equal(res.json().code, 'rate_limited');
  assert.equal(typeof res.json().error, 'string');
  assert.ok(Number(res.headers['retry-after']) > 0, 'Retry-After header');
};

test('10 successful sign-ins in a row from 127.0.0.1 all get 200 (with and without device tokens)', async () => {
  let device;
  for (let i = 0; i < 10; i++) {
    const res = await login('alice@example.test', PASSWORD, device);
    assert.equal(res.statusCode, 200, `sign-in ${i + 1}: ${res.body}`);
    device = res.json().deviceToken;
    assert.ok(device);
  }
  for (let i = 0; i < 10; i++) {
    const res = await login('bob@example.test', PASSWORD);
    assert.equal(res.statusCode, 200, `sign-in without token ${i + 1}: ${res.body}`);
  }
});

test('an attacker flooding wrong passwords from 127.0.0.1 does not stop a device-token holder', async () => {
  const first = await login('carol@example.test', PASSWORD);
  assert.equal(first.statusCode, 200, first.body);
  let device = first.json().deviceToken;

  // Spray: many emails, wrong passwords, past the flood guard.
  let lastSpray;
  for (let i = 0; i < cfg.LOGIN_FLOOD_MAX + 5; i++) {
    lastSpray = await login(`victim-${i % 40}@example.test`, 'wrong-password-1');
  }
  assertRateLimited(lastSpray);
  assert.match(lastSpray.json().message, /sign-in requests/, 'the flood guard answered, not only the throttle');
  // An attacker sending a made-up device token is not exempt.
  const fake = await login('carol@example.test', 'wrong-password-1', 'A'.repeat(43));
  assertRateLimited(fake);
  assert.match(fake.json().message, /sign-in requests/);

  // The token holder still signs in, repeatedly, from the same address.
  for (let i = 0; i < 3; i++) {
    const ok = await login('carol@example.test', PASSWORD, device);
    assert.equal(ok.statusCode, 200, ok.body);
    device = ok.json().deviceToken;
  }
});

test('change-password limits are per account, not per IP', async () => {
  for (let i = 0; i < cfg.ACCOUNT_LIMIT_MAX; i++) {
    assert.equal((await changePassword('alice', 'wrong-current-pass-1')).statusCode, 401);
  }
  assertRateLimited(await changePassword('alice', 'wrong-current-pass-1'));
  // Bob, same IP, is not affected.
  const bob = await changePassword('bob', PASSWORD);
  assert.equal(bob.statusCode, 200, bob.body);
});

test('register limits are per normalized email, not per IP', async () => {
  const target = 'new.person@example.test';
  const first = await register(target);
  assert.equal(first.statusCode, 201, first.body);
  for (let i = 1; i < cfg.ACCOUNT_LIMIT_MAX; i++) {
    const again = await register(i % 2 ? target.toUpperCase() : `  ${target}  `);
    assert.notEqual(again.statusCode, 429, again.body);
  }
  assertRateLimited(await register(target));
  // Another email from the same owner and IP still works.
  const other = await register('someone.else@example.test');
  assert.equal(other.statusCode, 201, other.body);
});

test('a missing or invalid body does not break the key generators', async () => {
  const noBody = await app.inject({ method: 'POST', url: '/api/auth/register', remoteAddress: LOOP, headers: bearer('owner') });
  assert.notEqual(noBody.statusCode, 500, noBody.body);
  const arr = await app.inject({ method: 'POST', url: '/api/auth/register', remoteAddress: LOOP, headers: bearer('owner'), payload: [1, 2] });
  assert.notEqual(arr.statusCode, 500, arr.body);
  const anon = await app.inject({ method: 'POST', url: '/api/auth/change-password', remoteAddress: LOOP, payload: {} });
  assert.equal(anon.statusCode, 401, anon.body);
});
