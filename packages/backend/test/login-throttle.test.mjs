// S0-Q.20: sign-in failures throttle the source (email+IP, IP), never lock the account.
// Run: node --import tsx --test test/login-throttle.test.mjs
// Time is moved by ageing login_attempts rows in the temp DB (no real sleeps).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-login-throttle-'));
process.chdir(dir);
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const { default: Fastify } = await import('fastify');
const { authRoutes } = await import('../src/api/routes/auth.ts');
const throttle = await import('../src/auth/account-lockout.ts');
const bcrypt = (await import('bcryptjs')).default;

const db = getDatabase();
await db.initialize();

const strong = 'a-strong-passphrase-42';
const strongHash = await bcrypt.hash(strong, 4);
let n = 0;
const addUser = (email) => {
  const id = `u-${++n}`;
  db.prepare(`INSERT INTO users (id, email, username, password_hash, full_name, role, status, email_verified, token_version)
              VALUES (?, ?, ?, ?, ?, 'user', 'active', 1, 1)`).run(id, email, id, strongHash, id);
  return id;
};

// Login routes without @fastify/rate-limit, so only the throttle is exercised.
const app = Fastify();
await app.register(authRoutes);
await app.ready();

test.after(async () => {
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const login = (ip, email, password) =>
  app.inject({ method: 'POST', url: '/api/auth/login', remoteAddress: ip, payload: { email, password } });
/** Move every recorded attempt `seconds` into the past. */
const age = (seconds) =>
  db.prepare(`UPDATE login_attempts SET attempted_at = datetime(attempted_at, ?)`).run(`-${seconds} seconds`);
const userRow = (email) => db.prepare(`SELECT locked_until, failed_attempts FROM users WHERE email = ?`).get(email);
const fails = async (ip, email, count) => {
  for (let i = 0; i < count; i++) assert.equal((await login(ip, email, 'wrong-password-1')).statusCode, 401);
};

test('delayFor: grows by doubling from the allowance, capped', () => {
  const { delayFor, BASE_DELAY_SECONDS, MAX_DELAY_SECONDS } = throttle;
  assert.equal(delayFor(4, 5), 0);
  assert.equal(delayFor(5, 5), BASE_DELAY_SECONDS);
  assert.equal(delayFor(6, 5), BASE_DELAY_SECONDS * 2);
  assert.equal(delayFor(7, 5), BASE_DELAY_SECONDS * 4);
  assert.equal(delayFor(500, 5), MAX_DELAY_SECONDS);
});

test('an attacker IP cannot block the owner from the owner\'s known IP', async () => {
  const email = 'owner@throttle.test';
  addUser(email);
  const ownerIp = '10.1.0.1';
  assert.equal((await login(ownerIp, email, strong)).statusCode, 200); // known source

  // One attacker IP hammering the owner's email: throttled itself after 5.
  for (let i = 0; i < 12; i++) await login('10.66.0.1', email, 'wrong-password-1');
  assert.equal((await login('10.66.0.1', email, strong)).statusCode, 429);
  // A distributed attack: many failures from many IPs (over the email-wide allowance).
  const ins = db.prepare(`INSERT INTO login_attempts (email, success, ip_address, attempted_at) VALUES (?, 0, ?, CURRENT_TIMESTAMP)`);
  for (let i = 0; i < throttle.EMAIL_FREE_FAILURES + 10; i++) ins.run(email, `10.77.${i >> 8}.${i & 255}`);

  // The owner's known IP still signs in, and no account lock state was written.
  const ok = await login(ownerIp, email, strong);
  assert.equal(ok.statusCode, 200, ok.body);
  assert.ok(ok.json().token);
  assert.deepEqual({ ...userRow(email) }, { locked_until: null, failed_attempts: 0 });

  // A brand-new source for that email waits while the distributed attack lasts (documented trade-off).
  assert.equal((await login('10.1.0.2', email, strong)).statusCode, 429);
});

test('delays grow per (email, IP) on repeated failures', async () => {
  const email = 'pair@throttle.test';
  addUser(email);
  const ip = '10.2.0.1';
  await fails(ip, email, throttle.PAIR_FREE_FAILURES);
  const first = throttle.checkLoginThrottle(email, ip);
  assert.ok(first.throttled);
  assert.ok(first.retryAfterSeconds > 25 && first.retryAfterSeconds <= 30, String(first.retryAfterSeconds));

  age(31);
  await fails(ip, email, 1);
  const second = throttle.checkLoginThrottle(email, ip);
  assert.ok(second.retryAfterSeconds > 55 && second.retryAfterSeconds <= 60, String(second.retryAfterSeconds));

  age(61);
  await fails(ip, email, 1);
  const third = throttle.checkLoginThrottle(email, ip);
  assert.ok(third.retryAfterSeconds > 115 && third.retryAfterSeconds <= 120, String(third.retryAfterSeconds));

  // Another IP for the same email is not affected.
  assert.equal(throttle.checkLoginThrottle(email, '10.2.0.2').throttled, false);
  assert.equal((await login('10.2.0.2', email, strong)).statusCode, 200);
});

test('delays grow per IP across different emails', async () => {
  const ip = '10.3.0.1';
  for (let i = 0; i < throttle.IP_FREE_FAILURES; i++) {
    // different (unknown) emails, so the pair bucket never fills
    assert.equal((await login(ip, `spray-${i}@throttle.test`, 'wrong-password-1')).statusCode, 401);
  }
  const first = throttle.checkLoginThrottle('someone-else@throttle.test', ip);
  assert.ok(first.throttled);
  assert.ok(first.retryAfterSeconds <= 30);
  assert.equal((await login(ip, 'yet-another@throttle.test', 'x')).statusCode, 429);

  age(31);
  assert.equal((await login(ip, 'spray-next@throttle.test', 'wrong-password-1')).statusCode, 401);
  const second = throttle.checkLoginThrottle('someone-else@throttle.test', ip);
  assert.ok(second.retryAfterSeconds > 30 && second.retryAfterSeconds <= 60, String(second.retryAfterSeconds));
  // A different IP is unaffected.
  assert.equal(throttle.checkLoginThrottle('someone-else@throttle.test', '10.3.0.2').throttled, false);
});

test('unknown email and wrong password for a known email get identical replies; no user state for unknown', async () => {
  const known = 'known@throttle.test';
  addUser(known);
  const usersBefore = db.prepare(`SELECT COUNT(*) AS c FROM users`).get().c;
  const a = await login('10.4.0.1', known, 'wrong-password-1');
  const b = await login('10.4.0.2', 'ghost@throttle.test', 'wrong-password-1');
  assert.equal(a.statusCode, 401);
  assert.equal(b.statusCode, a.statusCode);
  assert.equal(b.body, a.body);
  assert.equal(db.prepare(`SELECT COUNT(*) AS c FROM users`).get().c, usersBefore);
  assert.equal(db.prepare(`SELECT COUNT(*) AS c FROM users WHERE email = ?`).get('ghost@throttle.test').c, 0);
  assert.deepEqual({ ...userRow(known) }, { locked_until: null, failed_attempts: 0 });
});

test('a throttled reply is the same for known and unknown emails', async () => {
  const known = 'known2@throttle.test';
  addUser(known);
  await fails('10.5.0.1', known, throttle.PAIR_FREE_FAILURES);
  await fails('10.5.0.2', 'ghost2@throttle.test', throttle.PAIR_FREE_FAILURES);
  const a = await login('10.5.0.1', known, strong); // even the right password
  const b = await login('10.5.0.2', 'ghost2@throttle.test', strong);
  assert.equal(a.statusCode, 429);
  assert.equal(b.statusCode, 429);
  assert.equal(b.body, a.body);
  assert.equal(a.json().code, 'rate_limited');
  assert.equal(b.headers['retry-after'], a.headers['retry-after']);
  for (const word of ['locked', 'account', 'exist']) assert.ok(!a.body.toLowerCase().includes(word), a.body);
  assert.deepEqual({ ...userRow(known) }, { locked_until: null, failed_attempts: 0 });
});

test('after the delay a correct login from the throttled source succeeds and resets its counter', async () => {
  const email = 'reset@throttle.test';
  addUser(email);
  const ip = '10.6.0.1';
  await fails(ip, email, throttle.PAIR_FREE_FAILURES);
  assert.equal((await login(ip, email, strong)).statusCode, 429);
  age(31);
  assert.equal((await login(ip, email, strong)).statusCode, 200);
  // Counter reset: the next failures start from zero again.
  await fails(ip, email, throttle.PAIR_FREE_FAILURES - 1);
  assert.equal(throttle.checkLoginThrottle(email, ip).throttled, false);
  assert.equal((await login(ip, email, strong)).statusCode, 200);
});

test('a lock left by the old logic (users.locked_until in the future) does not block, and is cleared', async () => {
  const email = 'oldlock@throttle.test';
  addUser(email);
  db.prepare(`UPDATE users SET locked_until = ?, failed_attempts = 5 WHERE email = ?`)
    .run(new Date(Date.now() + 3600_000).toISOString(), email);
  const res = await login('10.7.0.1', email, strong);
  assert.equal(res.statusCode, 200, res.body);
  assert.deepEqual({ ...userRow(email) }, { locked_until: null, failed_attempts: 0 });
});

test('a missing IP is one shared bucket and email case does not split buckets', async () => {
  const email = 'NoIp@Throttle.test';
  for (let i = 0; i < throttle.PAIR_FREE_FAILURES; i++) throttle.handleFailedLogin(email, undefined);
  assert.ok(throttle.checkLoginThrottle('noip@throttle.test', '').throttled);
  assert.ok(throttle.checkLoginThrottle(email, 'unknown').throttled);
  const row = db.prepare(`SELECT DISTINCT email, ip_address FROM login_attempts WHERE email = ?`).all('noip@throttle.test');
  assert.deepEqual(row.map((r) => ({ ...r })), [{ email: 'noip@throttle.test', ip_address: 'unknown' }]);
});
