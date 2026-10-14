// S0-Q.21: sign-in hides account state until the password is verified, and
// old sign-in records are pruned.
// Run: node --import tsx --test test/login-account-state.test.mjs
// Uses a throwaway temp DB; time is moved by writing timestamps (no sleeps).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-login-state-'));
process.chdir(dir);
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const { default: Fastify } = await import('fastify');
const { authRoutes } = await import('../src/api/routes/auth.ts');
const throttle = await import('../src/auth/account-lockout.ts');
const throttleStore = await import('../src/repositories/login-throttle.ts');
const { getRepositories } = await import('../src/db/index.ts');
const bcrypt = (await import('bcryptjs')).default;

const db = getDatabase();
await db.initialize();

const strong = 'a-strong-passphrase-42';
const strongHash = await bcrypt.hash(strong, 4);
const publishedHash = await bcrypt.hash('mock-only', 4);
let n = 0;
const addUser = (email, { status = 'active', verified = 1, hash = strongHash } = {}) => {
  const id = `s-${++n}`;
  db.prepare(`INSERT INTO users (id, email, username, password_hash, full_name, role, status, email_verified, token_version)
              VALUES (?, ?, ?, ?, ?, 'user', ?, ?, 1)`).run(id, email, id, hash, id, status, verified);
  return id;
};

// Login routes without @fastify/rate-limit.
const app = Fastify();
await app.register(authRoutes);
await app.ready();

test.after(async () => {
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

let ipSeq = 0;
/** A fresh source per call, so throttle buckets never interfere between cases. */
const nextIp = () => `10.21.${(++ipSeq) >> 8}.${ipSeq & 255}`;
const login = (email, password, ip = nextIp()) =>
  app.inject({ method: 'POST', url: '/api/auth/login', remoteAddress: ip, payload: { email, password } });
const failures = (email) =>
  db.prepare(`SELECT COUNT(*) AS c FROM login_attempts WHERE email = ? AND success = 0`).get(email).c;

/** Count bcrypt comparisons made by signIn (the same work on every path). */
async function countCompares(fn) {
  const repo = getRepositories().users;
  const orig = repo.verifyPassword;
  let calls = 0;
  repo.verifyPassword = async (...args) => { calls++; return orig.apply(repo, args); };
  try { return { res: await fn(), calls }; } finally { repo.verifyPassword = orig; }
}

async function sameAsUnknown(email, password) {
  const unknown = await countCompares(() => login('nobody-' + (++n) + '@state.test', password));
  const known = await countCompares(() => login(email, password));
  assert.equal(known.res.statusCode, 401, known.res.body);
  assert.equal(known.res.statusCode, unknown.res.statusCode);
  assert.deepEqual(known.res.json(), unknown.res.json());
  assert.equal(known.res.body, unknown.res.body, 'byte-identical bodies');
  assert.equal(known.res.json().code, 'invalid_credentials');
  assert.equal(known.res.headers['content-type'], unknown.res.headers['content-type']);
  assert.equal(known.res.headers['retry-after'], undefined);
  assert.equal(known.calls, 1, 'bcrypt ran for the known account');
  assert.equal(unknown.calls, 1, 'bcrypt ran for the unknown email');
  return known.res;
}

test('inactive, unverified and system accounts with a wrong password look like an unknown email and record a failure', async () => {
  addUser('suspended@state.test', { status: 'suspended' });
  addUser('unverified@state.test', { verified: 0 });
  for (const email of ['suspended@state.test', 'unverified@state.test', 'system@agent-player.local']) {
    const before = failures(email);
    const res = await sameAsUnknown(email, 'wrong-password-1');
    assert.equal(res.json().code, 'invalid_credentials');
    assert.equal(failures(email), before + 1, `failure row for ${email}`);
  }
});

test('inactive account with the right password gets 403 account_inactive, counted as a failure', async () => {
  const email = 'disabled@state.test';
  addUser(email, { status: 'suspended' });
  const res = await login(email, strong);
  assert.equal(res.statusCode, 403, res.body);
  assert.deepEqual(res.json(), { error: 'Forbidden', code: 'account_inactive', message: 'Account access denied' });
  assert.equal(failures(email), 1);
});

test('a refused account cannot be used as an unthrottled password oracle', async () => {
  const email = 'oracle@state.test';
  addUser(email, { status: 'suspended' });
  const ip = nextIp();
  for (let i = 0; i < throttle.PAIR_FREE_FAILURES; i++) {
    assert.equal((await login(email, strong, ip)).statusCode, 403);
  }
  const res = await login(email, strong, ip);
  assert.equal(res.statusCode, 429, res.body);
  assert.equal(res.json().code, 'rate_limited');
});

test('published-password account: wrong password -> generic 401; the published password -> 403 published_password', async () => {
  const email = 'mock@state.test';
  addUser(email, { hash: publishedHash });
  const wrong = await sameAsUnknown(email, 'wrong-password-1');
  assert.equal(wrong.json().code, 'invalid_credentials');
  assert.equal(failures(email), 1);

  const res = await login(email, 'mock-only');
  assert.equal(res.statusCode, 403, res.body);
  assert.equal(res.json().code, 'published_password');
  assert.equal(res.json().token, undefined);
  assert.equal(failures(email), 2, 'published password counts as a failure');
});

test('a normal account with the right password still signs in', async () => {
  const email = 'ok@state.test';
  addUser(email);
  const res = await login(email, strong);
  assert.equal(res.statusCode, 200, res.body);
  assert.ok(res.json().token);
  assert.equal(failures(email), 0);
});

test('prune: removes attempts older than 30 days and expired device tokens, keeps fresh ones', () => {
  const now = Date.parse('2026-10-14T12:00:00Z');
  const at = (ms) => new Date(ms).toISOString().replace('T', ' ').slice(0, 19);
  db.prepare(`DELETE FROM login_attempts`).run();
  db.prepare(`DELETE FROM login_devices`).run();
  const insA = db.prepare(`INSERT INTO login_attempts (email, success, ip_address, attempted_at) VALUES (?, 0, '10.0.0.1', ?)`);
  insA.run('old@prune.test', at(now - 31 * 86_400_000));
  insA.run('fresh@prune.test', at(now - 29 * 86_400_000));
  insA.run('today@prune.test', at(now - 60_000));
  const insD = db.prepare(`INSERT INTO login_devices (email, token_hash, created_at, last_used_at, expires_at) VALUES (?, ?, ?, ?, ?)`);
  insD.run('old@prune.test', 'a'.repeat(64), at(now - 70 * 86_400_000), at(now - 70 * 86_400_000), at(now - 1000));
  insD.run('fresh@prune.test', 'b'.repeat(64), at(now), at(now), at(now + 86_400_000));

  assert.deepEqual(throttle.pruneLoginRecords(now), { attempts: 1, devices: 1 });
  assert.deepEqual(db.prepare(`SELECT email FROM login_attempts ORDER BY email`).all().map((r) => r.email), ['fresh@prune.test', 'today@prune.test']);
  assert.deepEqual(db.prepare(`SELECT email FROM login_devices`).all().map((r) => r.email), ['fresh@prune.test']);
  assert.deepEqual(throttle.pruneLoginRecords(now), { attempts: 0, devices: 0 });
});

test('startLoginRecordPruning runs once immediately, returns an unref\'d timer and never throws', () => {
  db.prepare(`INSERT INTO login_attempts (email, success, ip_address, attempted_at) VALUES ('gone@prune.test', 0, '10.0.0.1', datetime('now', '-40 days'))`).run();
  const timer = throttleStore.startLoginRecordPruning(throttleStore.sqliteLoginThrottle, 60 * 60 * 1000);
  try {
    assert.equal(timer.hasRef(), false);
    assert.equal(db.prepare(`SELECT COUNT(*) AS c FROM login_attempts WHERE email = 'gone@prune.test'`).get().c, 0);
  } finally {
    clearInterval(timer);
  }
});
