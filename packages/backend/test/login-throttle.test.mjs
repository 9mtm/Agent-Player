// S0-Q.20: sign-in failures throttle the source (email+IP, IP), never lock the account.
// Run: node --import tsx --test test/login-throttle.test.mjs
// Time is moved by ageing login_attempts rows in the temp DB (no real sleeps).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-login-throttle-'));
process.chdir(dir);
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const { default: Fastify } = await import('fastify');
const { authRoutes } = await import('../src/api/routes/auth.ts');
const throttle = await import('../src/auth/account-lockout.ts');
const { getRepositories } = await import('../src/db/index.ts');
const { repositories } = await import('../src/repositories/index.ts');
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

const login = (ip, email, password, deviceToken) =>
  app.inject({ method: 'POST', url: '/api/auth/login', remoteAddress: ip, payload: deviceToken === undefined ? { email, password } : { email, password, deviceToken } });
/** Move every recorded attempt (and device failure) `seconds` into the past. */
const age = (seconds) => {
  db.prepare(`UPDATE login_attempts SET attempted_at = datetime(attempted_at, ?)`).run(`-${seconds} seconds`);
  db.prepare(`UPDATE login_devices SET last_failed_at = datetime(last_failed_at, ?) WHERE last_failed_at IS NOT NULL`).run(`-${seconds} seconds`);
};
/** Push all earlier failures out of the throttle window (fresh start for a test). */
const freshWindow = () => age(throttle.THROTTLE_WINDOW_MINUTES * 60 * 2);
const LOOP = '127.0.0.1';
const insFail = db.prepare(`INSERT INTO login_attempts (email, success, ip_address, attempted_at) VALUES (?, 0, ?, CURRENT_TIMESTAMP)`);
/** Simulate a distributed attack on `email` (over the email-wide allowance). */
const distributed = (email) => {
  for (let i = 0; i < throttle.EMAIL_FREE_FAILURES + 10; i++) insFail.run(email, `10.77.${i >> 8}.${i & 255}`);
};
const sha256 = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
const userRow = (email) => db.prepare(`SELECT locked_until, failed_attempts FROM users WHERE email = ?`).get(email);
/** A login plus the clock (epoch seconds) just before and just after it. */
const timedLogin = async (...args) => {
  const lo = Date.now() / 1000;
  const res = await login(...args);
  return [res, lo, Date.now() / 1000];
};
/** Epoch seconds of the latest failure recorded for (email, IP). */
const lastFailure = (email, ip) => Number(db.prepare(
  `SELECT strftime('%s', MAX(attempted_at)) AS t FROM login_attempts WHERE email = ? AND ip_address = ? AND success = 0`,
).get(email, ip).t);
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

test('an attacker IP cannot block the owner\'s device; without a token the email-wide bucket applies', async () => {
  const email = 'owner@throttle.test';
  addUser(email);
  const ownerIp = '10.1.0.1';
  const first = await login(ownerIp, email, strong);
  assert.equal(first.statusCode, 200);
  const device = first.json().deviceToken;

  // One attacker IP hammering the owner's email: throttled itself after 5.
  for (let i = 0; i < 12; i++) await login('10.66.0.1', email, 'wrong-password-1');
  assert.equal((await login('10.66.0.1', email, strong)).statusCode, 429);
  // The owner's other IP is not affected (no account-wide lock).
  assert.equal((await login('10.1.0.3', email, strong)).statusCode, 200);

  distributed(email);
  // With its device token the owner still signs in; no account lock state was written.
  const ok = await login(ownerIp, email, strong, device);
  assert.equal(ok.statusCode, 200, ok.body);
  assert.ok(ok.json().token);
  assert.deepEqual({ ...userRow(email) }, { locked_until: null, failed_attempts: 0 });
  // Without a token (even from the IP that signed in before) the email-wide bucket applies.
  assert.equal((await login(ownerIp, email, strong)).statusCode, 429);
  assert.equal((await login('10.1.0.2', email, strong)).statusCode, 429);
});

test('delays grow per (email, IP) on repeated failures', async () => {
  const email = 'pair@throttle.test';
  addUser(email);
  const ip = '10.2.0.1';
  await fails(ip, email, throttle.PAIR_FREE_FAILURES);
  const first = (await throttle.checkLoginThrottle(email, ip));
  assert.ok(first.throttled);
  assert.ok(first.retryAfterSeconds > 25 && first.retryAfterSeconds <= 30, String(first.retryAfterSeconds));

  age(31);
  await fails(ip, email, 1);
  const second = (await throttle.checkLoginThrottle(email, ip));
  assert.ok(second.retryAfterSeconds > 55 && second.retryAfterSeconds <= 60, String(second.retryAfterSeconds));

  age(61);
  await fails(ip, email, 1);
  const third = (await throttle.checkLoginThrottle(email, ip));
  assert.ok(third.retryAfterSeconds > 115 && third.retryAfterSeconds <= 120, String(third.retryAfterSeconds));

  // Another IP for the same email is not affected.
  assert.equal((await throttle.checkLoginThrottle(email, '10.2.0.2')).throttled, false);
  assert.equal((await login('10.2.0.2', email, strong)).statusCode, 200);
});

test('delays grow per IP across different emails', async () => {
  const ip = '10.3.0.1';
  for (let i = 0; i < throttle.IP_FREE_FAILURES; i++) {
    // different (unknown) emails, so the pair bucket never fills
    assert.equal((await login(ip, `spray-${i}@throttle.test`, 'wrong-password-1')).statusCode, 401);
  }
  const first = (await throttle.checkLoginThrottle('someone-else@throttle.test', ip));
  assert.ok(first.throttled);
  assert.ok(first.retryAfterSeconds <= 30);
  assert.equal((await login(ip, 'yet-another@throttle.test', 'x')).statusCode, 429);

  age(31);
  assert.equal((await login(ip, 'spray-next@throttle.test', 'wrong-password-1')).statusCode, 401);
  const second = (await throttle.checkLoginThrottle('someone-else@throttle.test', ip));
  assert.ok(second.retryAfterSeconds > 30 && second.retryAfterSeconds <= 60, String(second.retryAfterSeconds));
  // A different IP is unaffected.
  assert.equal((await throttle.checkLoginThrottle('someone-else@throttle.test', '10.3.0.2')).throttled, false);
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
  // CORE-01d: machine code, byte-identical for both branches.
  assert.deepEqual(a.json(), { error: 'Unauthorized', code: 'invalid_credentials', message: 'Invalid email or password' });
  assert.equal(db.prepare(`SELECT COUNT(*) AS c FROM users`).get().c, usersBefore);
  assert.equal(db.prepare(`SELECT COUNT(*) AS c FROM users WHERE email = ?`).get('ghost@throttle.test').c, 0);
  assert.deepEqual({ ...userRow(known) }, { locked_until: null, failed_attempts: 0 });
});

test('a throttled reply is the same for known and unknown emails', async () => {
  const known = 'known2@throttle.test';
  addUser(known);
  await fails('10.5.0.1', known, throttle.PAIR_FREE_FAILURES);
  await fails('10.5.0.2', 'ghost2@throttle.test', throttle.PAIR_FREE_FAILURES);
  const [a, aLo, aHi] = await timedLogin('10.5.0.1', known, strong); // even the right password
  const [b, bLo, bHi] = await timedLogin('10.5.0.2', 'ghost2@throttle.test', strong);
  assert.equal(a.statusCode, 429);
  assert.equal(b.statusCode, 429);
  assert.equal(b.body, a.body);
  assert.equal(a.json().code, 'rate_limited');
  // Retry-After counts down from each source's own last failure. Bracket the expected
  // value with the clock before/after each request, so slow bcrypt under load cannot
  // make two sources' failures (and so their Retry-After) drift apart and flake.
  for (const [res, ip, email, lo, hi] of [[a, '10.5.0.1', known, aLo, aHi], [b, '10.5.0.2', 'ghost2@throttle.test', bLo, bHi]]) {
    const until = lastFailure(email, ip) + throttle.BASE_DELAY_SECONDS;
    const got = Number(res.headers['retry-after']);
    assert.ok(got >= Math.ceil(until - hi) && got <= Math.ceil(until - lo), `${email}: ${got} not in [${until - hi}, ${until - lo}]`);
  }
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
  assert.equal((await throttle.checkLoginThrottle(email, ip)).throttled, false);
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
  for (let i = 0; i < throttle.PAIR_FREE_FAILURES; i++) await throttle.handleFailedLogin(email, undefined);
  assert.ok((await throttle.checkLoginThrottle('noip@throttle.test', '')).throttled);
  assert.ok((await throttle.checkLoginThrottle(email, 'unknown')).throttled);
  const row = db.prepare(`SELECT DISTINCT email, ip_address FROM login_attempts WHERE email = ?`).all('noip@throttle.test');
  assert.deepEqual(row.map((r) => ({ ...r })), [{ email: 'noip@throttle.test', ip_address: 'unknown' }]);
});

// --- device tokens (proxy: every caller is 127.0.0.1) ----------------------

test('all traffic from 127.0.0.1: attacker failures do not block an owner with a valid device token; token rotates', async () => {
  freshWindow();
  const email = 'proxied-owner@throttle.test';
  addUser(email);
  const first = await login(LOOP, email, strong);
  assert.equal(first.statusCode, 200);
  const t1 = first.json().deviceToken;
  assert.match(t1, /^[A-Za-z0-9_-]{43,}$/);

  // Attacker through the same proxy: fills the pair, IP and email buckets.
  for (let i = 0; i < 8; i++) await login(LOOP, email, 'wrong-password-1');
  for (let i = 0; i < throttle.IP_FREE_FAILURES; i++) await login(LOOP, `spray-loop-${i}@throttle.test`, 'wrong-password-1');
  distributed(email);
  assert.equal((await login(LOOP, email, strong)).statusCode, 429); // no token: throttled
  assert.equal((await login(LOOP, 'someone@throttle.test', strong)).statusCode, 429); // IP bucket

  const ok = await login(LOOP, email, strong, t1);
  assert.equal(ok.statusCode, 200, ok.body);
  const t2 = ok.json().deviceToken;
  assert.ok(t2 && t2 !== t1, 'token rotates on success');
  assert.equal((await throttle.hasValidDevice(email, t1)), false, 'old token retired');
  assert.equal((await throttle.hasValidDevice(email, t2)), true);
  assert.equal((await login(LOOP, email, strong, t1)).statusCode, 429, 'retired token gives no exemption');
});

test('without a token, the owner\'s earlier success from 127.0.0.1 does not exempt an attacker from the email bucket', async () => {
  freshWindow();
  const email = 'shared-ip@throttle.test';
  addUser(email);
  assert.equal((await login(LOOP, email, strong)).statusCode, 200);
  distributed(email);
  const st = (await throttle.checkLoginThrottle(email, LOOP));
  assert.ok(st.throttled, 'a loopback IP is never a known source');
  assert.equal((await login(LOOP, email, 'guess-1')).statusCode, 429);
});

test('invalid, expired or other-email tokens give no exemption', async () => {
  freshWindow();
  const email = 'tok@throttle.test';
  const other = 'tok-other@throttle.test';
  addUser(email);
  addUser(other);
  const mine = (await login(LOOP, email, strong)).json().deviceToken;
  const theirs = (await login(LOOP, other, strong)).json().deviceToken;
  const expired = (await login(LOOP, email, strong, mine)).json().deviceToken; // rotates `mine`
  const valid = (await login(LOOP, email, strong)).json().deviceToken;
  db.prepare(`UPDATE login_devices SET expires_at = datetime('now', '-1 minute') WHERE token_hash = ?`).run(sha256(expired));
  distributed(email);

  for (const token of [randomBytes(32).toString('base64url'), expired, theirs, mine]) {
    assert.equal((await throttle.hasValidDevice(email, token)), false);
    assert.equal((await login(LOOP, email, strong, token)).statusCode, 429);
  }
  assert.equal((await login(LOOP, email, strong, valid)).statusCode, 200);
});

test('failures under a valid token are throttled with growing delay', async () => {
  freshWindow();
  const email = 'stolen@throttle.test';
  addUser(email);
  let tok = (await login(LOOP, email, strong)).json().deviceToken;
  for (let i = 0; i < throttle.DEVICE_FREE_FAILURES; i++) {
    assert.equal((await login(LOOP, email, 'wrong-password-1', tok)).statusCode, 401);
  }
  const st = (await throttle.checkLoginThrottle(email, LOOP, tok));
  assert.ok(st.throttled && st.retryAfterSeconds <= 30);
  assert.equal((await login(LOOP, email, strong, tok)).statusCode, 429);
  age(31);
  assert.equal((await login(LOOP, email, 'wrong-password-1', tok)).statusCode, 401);
  const st2 = (await throttle.checkLoginThrottle(email, LOOP, tok));
  assert.ok(st2.retryAfterSeconds > 30 && st2.retryAfterSeconds <= 60, String(st2.retryAfterSeconds));
  age(61);
  const ok = await login(LOOP, email, strong, tok);
  assert.equal(ok.statusCode, 200);
  tok = ok.json().deviceToken;
  assert.equal((await throttle.checkLoginThrottle(email, LOOP, tok)).throttled, false, 'fresh token, fresh counter');
});

test('only a hash of the device token is stored, and never in login_attempts', async () => {
  freshWindow();
  const email = 'hash@throttle.test';
  addUser(email);
  const tok = (await login(LOOP, email, strong)).json().deviceToken;
  const rows = db.prepare(`SELECT * FROM login_devices WHERE email = ?`).all(email);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].token_hash, sha256(tok));
  for (const v of Object.values(rows[0])) assert.notEqual(v, tok);
  await login(LOOP, email, 'wrong-password-1', tok);
  const dump = JSON.stringify(db.prepare(`SELECT * FROM login_attempts`).all());
  assert.ok(!dump.includes(tok));
  // lifetime is about DEVICE_TOKEN_DAYS
  const days = db.prepare(`SELECT julianday(expires_at) - julianday(created_at) AS d FROM login_devices WHERE email = ?`).get(email).d;
  assert.ok(Math.abs(days - throttle.DEVICE_TOKEN_DAYS) < 0.01, String(days));
});

test('a malformed device token is ignored (treated as absent)', async () => {
  freshWindow();
  const { parseDeviceToken } = throttle;
  for (const bad of ['a'.repeat(201), 'has space', 'plus+slash/', '', 123, {}, null, ['x']]) {
    assert.equal(parseDeviceToken(bad), null);
  }
  assert.equal(parseDeviceToken('abc_DEF-123'), 'abc_DEF-123');

  const email = 'malformed@throttle.test';
  addUser(email);
  const ok = await login(LOOP, email, strong, 'not a token!');
  assert.equal(ok.statusCode, 200);
  distributed(email);
  const withBad = await login(LOOP, email, strong, { evil: true });
  const without = await login(LOOP, email, strong);
  assert.equal(withBad.statusCode, 429);
  assert.equal(withBad.body, without.body);
});

test('signIn runs the password compare for unknown emails too', async () => {
  const usersRepo = getRepositories().users;
  const original = usersRepo.verifyPassword;
  const calls = [];
  usersRepo.verifyPassword = async (user, password) => { calls.push(user.password_hash); return original.call(usersRepo, user, password); };
  try {
    const res = await repositories.identity.signIn('nobody-at-all@throttle.test', 'some-guess');
    assert.equal(res.status, 'unknown');
    assert.equal(calls.length, 1);
    assert.match(calls[0], /^\$2[aby]\$12\$/);
  } finally {
    usersRepo.verifyPassword = original;
  }
});
