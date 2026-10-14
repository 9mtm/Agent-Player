/**
 * Sign-in throttling (M-02, S0-Q.20)
 *
 * SECURITY: slows down password guessing per *source* instead of locking the
 * account. The old logic locked the account by email after 5 failures, so
 * anyone who knew the owner's email could lock the owner out again and again.
 *
 * Callers without a valid device token (see below) are checked against three
 * buckets, all counted from `login_attempts` within THROTTLE_WINDOW_MINUTES:
 *   - pair  (email, IP): failures since the last success of that pair.
 *   - ip    (IP, any email): all failures from that IP. Not reset by a
 *           success, so an attacker cannot clear it by signing in to an
 *           account of their own; it decays with the window.
 *   - email (email, any IP): failures from all IPs together.
 * There is no IP-based "known source" exemption: behind a proxy (the
 * same-origin app server, a tunnel) every caller is 127.0.0.1, so an IP says
 * nothing about who is calling.
 *
 * Device tokens: every successful sign-in returns a fresh opaque token
 * (DEVICE_TOKEN_BYTES random bytes, base64url) bound to the email; only its
 * sha256 is stored (`login_devices`), with a DEVICE_TOKEN_DAYS lifetime. The
 * client sends it back as `deviceToken` on the next sign-in. A caller with a
 * valid token for that email skips the pair, ip and email buckets and is
 * checked only against its own failure counter (same allowance and delays as
 * a pair), so failures by others never slow the owner's device, and a stolen
 * token still cannot guess without limit. The token rotates on each success
 * (the presented one is deleted). Lookup is by hash, so no secret is
 * compared byte by byte. The token is never logged and never written to
 * `login_attempts`.
 *
 * A bucket at or above its free allowance makes the source wait
 *   BASE_DELAY_SECONDS * 2^(failures - free), capped at MAX_DELAY_SECONDS,
 * counted from the bucket's latest failure. A source that is waiting is
 * refused before the password is checked (reply `rate_limited`), even with
 * the correct password; refused attempts are not recorded, so waiting stays
 * bounded. Nothing is written to `users` for failures: `users.locked_until`
 * and `users.failed_attempts` (from the old logic) are ignored and cleared on
 * the next successful sign-in. Unknown emails get exactly the same treatment
 * (and the same replies) as wrong passwords for known emails; only an
 * attempt row is stored, never user state.
 *
 * Client IP is Fastify's `request.ip`: no trustProxy is configured and
 * X-Forwarded-For is not read (there is no trusted proxy config yet; the
 * service binds 127.0.0.1). Exposing the backend remotely needs trustProxy
 * set to the known proxy hop so per-IP buckets see real client addresses.
 * A missing IP is one shared bucket, 'unknown'.
 *
 * B2.2c: one copy of the SQL for both drivers (SQL steps, chosen by the
 * process driver; repositories/login-throttle.ts is the async interface the
 * routes use). Column kinds (they decide the SQL form):
 *   login_attempts.attempted_at     DATETIME / timestamptz: compared with a
 *                                    bound ISO time via tsParam()
 *   login_devices.expires_at,
 *   last_failed_at, last_used_at,
 *   created_at                      TEXT 'YYYY-MM-DD HH:MM:SS' (UTC) on both:
 *                                    compared with a bound textTimestamp(ms),
 *                                    written with nowText()
 * strftime('%s', x) is epochSeconds(); the pair query's lower bound when
 * there is no success is '0000-00-00 00:00:00' on SQLite (text) and
 * '-infinity' on PostgreSQL. handleSuccessfulLogin is one transaction, so
 * the device token rotation is atomic on both drivers.
 */

import { createHash, randomBytes } from 'node:crypto';
import { epochSeconds, nowText, textTimestamp, tsParam, type Dialect } from '../db/pg/dialect.js';
import { dialect, one, run, sql, type Step, type StepRunner } from '../repositories/sql-steps.js';

/** Failures are counted over this window; older failures no longer count. */
export const THROTTLE_WINDOW_MINUTES = 60;
/** Failures allowed per (email, IP) before a delay starts. */
export const PAIR_FREE_FAILURES = 5;
/** Failures allowed per IP (all emails together) before a delay starts. */
export const IP_FREE_FAILURES = 20;
/** Failures allowed per email (all IPs together) before callers without a device token wait. */
export const EMAIL_FREE_FAILURES = 50;
/** First delay once a bucket reaches its allowance; doubles with each further failure. */
export const BASE_DELAY_SECONDS = 30;
/** Longest single delay (15 minutes). */
export const MAX_DELAY_SECONDS = 15 * 60;
/** Failures allowed per device token before it waits (same as a pair). */
export const DEVICE_FREE_FAILURES = PAIR_FREE_FAILURES;
/** Random bytes in a device token (base64url: 43 characters). */
export const DEVICE_TOKEN_BYTES = 32;
/** Device token lifetime; a successful sign-in replaces it with a fresh one. */
export const DEVICE_TOKEN_DAYS = 60;
/** Most device tokens kept per email (oldest-used are dropped). */
export const MAX_DEVICES_PER_EMAIL = 20;
/** Longest accepted `deviceToken` input; anything else is treated as absent. */
const DEVICE_TOKEN_MAX_LENGTH = 200;
const DEVICE_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

const UNKNOWN_IP = 'unknown';

export interface ThrottleStatus {
  throttled: boolean;
  /** Seconds until this source may try again (0 when not throttled). */
  retryAfterSeconds: number;
}

export type Bucket = { count: number; last: number | null } | undefined;

export function normEmail(email: string): string {
  return String(email ?? '').trim().toLowerCase();
}

export function normIp(ip?: string | null): string {
  const v = typeof ip === 'string' ? ip.trim() : '';
  return v || UNKNOWN_IP;
}

/** Delay (seconds) for a bucket with `failures` against an allowance of `free`. */
export function delayFor(failures: number, free: number): number {
  if (failures < free) return 0;
  const exp = Math.min(failures - free, 30);
  return Math.min(BASE_DELAY_SECONDS * 2 ** exp, MAX_DELAY_SECONDS);
}

/** Seconds still to wait for one bucket (`last` = latest failure, epoch seconds). */
export function remaining(row: Bucket, free: number, nowMs: number): number {
  const delay = delayFor(row?.count ?? 0, free);
  if (!delay || row?.last == null) return 0;
  const until = (Number(row.last) + delay) * 1000;
  return until > nowMs ? Math.ceil((until - nowMs) / 1000) : 0;
}

function* recordAttemptStep(email: string, success: boolean, ipAddress?: string, userAgent?: string): Step<void> {
  yield* run(
    `INSERT INTO login_attempts (email, success, ip_address, user_agent, attempted_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    normEmail(email),
    success ? 1 : 0,
    normIp(ipAddress),
    userAgent || null
  );
}

/**
 * Record a sign-in attempt. attempted_at stays CURRENT_TIMESTAMP (SQLite's
 * 'YYYY-MM-DD HH:MM:SS', UTC; timestamptz on PostgreSQL); every comparison
 * goes through tsParam().
 */
export function recordLoginAttempt(
  email: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  return sql().read(recordAttemptStep(email, success, ipAddress, userAgent));
}

/** The `deviceToken` input if well-formed (string, <= 200 chars, base64url), else null. */
export function parseDeviceToken(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  if (input.length === 0 || input.length > DEVICE_TOKEN_MAX_LENGTH) return null;
  return DEVICE_TOKEN_PATTERN.test(input) ? input : null;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

type Device = { id: number; failed_count: number; last_failed: number | null };

/** The unexpired device row for this token and email, or null. */
function* findDevice(email: string, deviceToken: unknown, nowMs: number): Step<Device | null> {
  const token = parseDeviceToken(deviceToken);
  if (!token) return null;
  const d = yield* dialect();
  const row = yield* one<Device>(
    `SELECT id, failed_count, ${epochSeconds(d, 'last_failed_at', 'text')} AS last_failed
       FROM login_devices
      WHERE token_hash = ? AND email = ? AND expires_at > ?`,
    hashToken(token), normEmail(email), textTimestamp(nowMs)
  );
  return row ?? null;
}

/** Whether `deviceToken` is a valid, unexpired device token for `email`. */
export async function hasValidDevice(email: string, deviceToken: unknown, nowMs: number = Date.now()): Promise<boolean> {
  return (await sql().read(findDevice(email, deviceToken, nowMs))) !== null;
}

/** The pair query's lower bound when the pair never succeeded. */
function noSuccessYet(d: Dialect): string {
  return d === 'postgres' ? `'-infinity'::timestamptz` : `'0000-00-00 00:00:00'`;
}

function* checkStep(email: string, ipAddress: string | undefined, deviceToken: unknown, nowMs: number): Step<ThrottleStatus> {
  const d = yield* dialect();
  const e = normEmail(email);
  const ip = normIp(ipAddress);
  const cutoffMs = nowMs - THROTTLE_WINDOW_MINUTES * 60_000;
  const cutoff = new Date(cutoffMs).toISOString();

  const device = yield* findDevice(e, deviceToken, nowMs);
  if (device) {
    // Only this device's own failures count (inside the window).
    const inWindow = device.last_failed != null && device.last_failed * 1000 > cutoffMs;
    const wait = remaining(
      { count: inWindow ? device.failed_count : 0, last: device.last_failed },
      DEVICE_FREE_FAILURES,
      nowMs
    );
    return { throttled: wait > 0, retryAfterSeconds: wait };
  }

  const bucket = `SELECT COUNT(*) AS count, ${epochSeconds(d, 'MAX(attempted_at)')} AS last FROM login_attempts`;
  const pair = (yield* one<NonNullable<Bucket>>(
    `${bucket}
      WHERE email = ? AND ip_address = ? AND success = 0
        AND attempted_at > ${tsParam(d)}
        AND attempted_at > COALESCE(
          (SELECT MAX(attempted_at) FROM login_attempts WHERE email = ? AND ip_address = ? AND success = 1),
          ${noSuccessYet(d)})`,
    e, ip, cutoff, e, ip
  )) as Bucket;

  const byIp = (yield* one<NonNullable<Bucket>>(
    `${bucket} WHERE ip_address = ? AND success = 0 AND attempted_at > ${tsParam(d)}`,
    ip, cutoff
  )) as Bucket;

  const byEmail = (yield* one<NonNullable<Bucket>>(
    `${bucket} WHERE email = ? AND success = 0 AND attempted_at > ${tsParam(d)}`,
    e, cutoff
  )) as Bucket;

  const wait = Math.max(
    remaining(pair, PAIR_FREE_FAILURES, nowMs),
    remaining(byIp, IP_FREE_FAILURES, nowMs),
    remaining(byEmail, EMAIL_FREE_FAILURES, nowMs)
  );
  return { throttled: wait > 0, retryAfterSeconds: wait };
}

/**
 * Whether this source must wait before trying to sign in as `email`.
 * Never looks at the account and never writes, so the answer is the same
 * for known and unknown emails.
 */
export function checkLoginThrottle(
  email: string,
  ipAddress?: string,
  deviceToken?: unknown,
  nowMs: number = Date.now()
): Promise<ThrottleStatus> {
  return sql().read(checkStep(email, ipAddress, deviceToken, nowMs));
}

function* failedStep(email: string, ipAddress: string | undefined, userAgent: string | undefined, deviceToken: unknown, nowMs: number): Step<void> {
  const d = yield* dialect();
  yield* recordAttemptStep(email, false, ipAddress, userAgent);
  const device = yield* findDevice(email, deviceToken, nowMs);
  if (device) {
    yield* run(
      `UPDATE login_devices
          SET failed_count = CASE WHEN last_failed_at IS NOT NULL AND last_failed_at > ? THEN failed_count + 1 ELSE 1 END,
              last_failed_at = ${nowText(d)}
        WHERE id = ?`,
      textTimestamp(nowMs - THROTTLE_WINDOW_MINUTES * 60_000),
      device.id
    );
  }
}

/**
 * Record a failed sign-in (wrong password or unknown email). Writes an
 * attempt row (never the device token) and, for a valid device token, bumps
 * that device's own counter. Never writes account state.
 */
export function handleFailedLogin(
  email: string,
  ipAddress?: string,
  userAgent?: string,
  deviceToken?: unknown,
  nowMs: number = Date.now()
): Promise<void> {
  return sql().read(failedStep(email, ipAddress, userAgent, deviceToken, nowMs));
}

/** Issue a new device token for `email`; only its hash is stored. */
function* issueDeviceToken(email: string, nowMs: number): Step<string> {
  const d = yield* dialect();
  const token = randomBytes(DEVICE_TOKEN_BYTES).toString('base64url');
  yield* run(
    `INSERT INTO login_devices (email, token_hash, created_at, last_used_at, expires_at)
     VALUES (?, ?, ${nowText(d)}, ${nowText(d)}, ?)`,
    normEmail(email),
    hashToken(token),
    textTimestamp(nowMs + DEVICE_TOKEN_DAYS * 86_400_000)
  );
  return token;
}

function* succeededStep(email: string, ipAddress: string | undefined, userAgent: string | undefined, deviceToken: unknown, nowMs: number): Step<string> {
  const e = normEmail(email);
  yield* recordAttemptStep(e, true, ipAddress, userAgent);
  yield* run(
    `UPDATE users SET locked_until = NULL, failed_attempts = 0
      WHERE lower(email) = ? AND (locked_until IS NOT NULL OR failed_attempts != 0)`,
    e
  );
  const device = yield* findDevice(e, deviceToken, nowMs);
  if (device) yield* run(`DELETE FROM login_devices WHERE id = ?`, device.id);
  yield* run(`DELETE FROM login_devices WHERE expires_at <= ?`, textTimestamp(nowMs));
  const fresh = yield* issueDeviceToken(e, nowMs);
  yield* run(
    `DELETE FROM login_devices WHERE email = ? AND id NOT IN (
       SELECT id FROM login_devices WHERE email = ? ORDER BY last_used_at DESC, id DESC LIMIT ?)`,
    e, e, MAX_DEVICES_PER_EMAIL
  );
  return fresh;
}

/**
 * Record a successful sign-in: resets this (email, IP) counter, clears any
 * lock left by the old logic, retires the presented device token (if any)
 * and returns a fresh device token for the client to keep (one transaction).
 */
export function handleSuccessfulLogin(
  email: string,
  ipAddress?: string,
  userAgent?: string,
  deviceToken?: unknown,
  nowMs: number = Date.now()
): Promise<string> {
  return sql().tx(() => succeededStep(email, ipAddress, userAgent, deviceToken, nowMs));
}

/** Attempt rows are kept this long (far longer than THROTTLE_WINDOW_MINUTES). */
export const ATTEMPT_RETENTION_DAYS = 30;
/** How often the background prune runs. */
export const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Delete `login_attempts` rows older than ATTEMPT_RETENTION_DAYS and expired
 * `login_devices` rows. Returns how many rows went from each table.
 */
function* pruneStep(nowMs: number): Step<{ attempts: number; devices: number }> {
  const d = yield* dialect();
  const attempts = yield* run(
    `DELETE FROM login_attempts WHERE attempted_at < ${tsParam(d)}`,
    new Date(nowMs - ATTEMPT_RETENTION_DAYS * 86_400_000).toISOString()
  );
  const devices = yield* run(`DELETE FROM login_devices WHERE expires_at <= ?`, textTimestamp(nowMs));
  return { attempts: attempts.changes, devices: devices.changes };
}

export function pruneLoginRecords(nowMs: number = Date.now()): Promise<{ attempts: number; devices: number }> {
  return sql().read(pruneStep(nowMs));
}

/**
 * The throttle functions on one runner (repositories/login-throttle.ts binds
 * the SQLite and the PostgreSQL store to their own driver). The exported
 * functions above use the process driver.
 */
export function loginThrottleOn(runner: StepRunner) {
  return {
    check: (email: string, ipAddress?: string, deviceToken?: unknown, nowMs: number = Date.now()) =>
      runner.read(checkStep(email, ipAddress, deviceToken, nowMs)),
    failed: (email: string, ipAddress?: string, userAgent?: string, deviceToken?: unknown, nowMs: number = Date.now()) =>
      runner.read(failedStep(email, ipAddress, userAgent, deviceToken, nowMs)),
    succeeded: (email: string, ipAddress?: string, userAgent?: string, deviceToken?: unknown, nowMs: number = Date.now()) =>
      runner.tx(() => succeededStep(email, ipAddress, userAgent, deviceToken, nowMs)),
    hasValidDevice: async (email: string, deviceToken: unknown, nowMs: number = Date.now()) =>
      (await runner.read(findDevice(email, deviceToken, nowMs))) !== null,
    prune: (nowMs: number = Date.now()) => runner.read(pruneStep(nowMs)),
    record: (email: string, success: boolean, ipAddress?: string, userAgent?: string) =>
      runner.read(recordAttemptStep(email, success, ipAddress, userAgent)),
  };
}

// The background prune timer (S0-Q.21) is repositories/login-throttle.ts
// startLoginRecordPruning: it runs through the selected driver's throttle store.
