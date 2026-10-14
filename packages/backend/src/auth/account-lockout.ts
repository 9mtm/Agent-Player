/**
 * Sign-in throttling (M-02, S0-Q.20)
 *
 * SECURITY: slows down password guessing per *source* instead of locking the
 * account. The old logic locked the account by email after 5 failures, so
 * anyone who knew the owner's email could lock the owner out again and again.
 *
 * Buckets (all counted from `login_attempts` within THROTTLE_WINDOW_MINUTES):
 *   - pair  (email, IP): failures since the last success of that pair.
 *   - ip    (IP, any email): all failures from that IP. Not reset by a
 *           success, so an attacker cannot clear it by signing in to an
 *           account of their own; it decays with the window.
 *   - email (email, any IP): failures from all IPs. Applies only to sources
 *           that have never signed in successfully for that email, so a
 *           distributed attack slows new sources but never the owner's known
 *           IP ("known source" = an IP with a recorded success for the email).
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
 * Client IP is Fastify's `request.ip` (no trustProxy is configured; the
 * service binds 127.0.0.1). A missing IP is one shared bucket, 'unknown'.
 */

import { getDatabase } from '../db/index.js';

/** Failures are counted over this window; older failures no longer count. */
export const THROTTLE_WINDOW_MINUTES = 60;
/** Failures allowed per (email, IP) before a delay starts. */
export const PAIR_FREE_FAILURES = 5;
/** Failures allowed per IP (all emails together) before a delay starts. */
export const IP_FREE_FAILURES = 20;
/** Failures allowed per email (all IPs together) before new sources wait. */
export const EMAIL_FREE_FAILURES = 50;
/** First delay once a bucket reaches its allowance; doubles with each further failure. */
export const BASE_DELAY_SECONDS = 30;
/** Longest single delay (15 minutes). */
export const MAX_DELAY_SECONDS = 15 * 60;

const UNKNOWN_IP = 'unknown';

export interface ThrottleStatus {
  throttled: boolean;
  /** Seconds until this source may try again (0 when not throttled). */
  retryAfterSeconds: number;
}

type Bucket = { count: number; last: number | null } | undefined;

function normEmail(email: string): string {
  return String(email ?? '').trim().toLowerCase();
}

function normIp(ip?: string | null): string {
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
function remaining(row: Bucket, free: number, nowMs: number): number {
  const delay = delayFor(row?.count ?? 0, free);
  if (!delay || row?.last == null) return 0;
  const until = (Number(row.last) + delay) * 1000;
  return until > nowMs ? Math.ceil((until - nowMs) / 1000) : 0;
}

/**
 * Record a sign-in attempt. attempted_at stays CURRENT_TIMESTAMP (SQLite's
 * 'YYYY-MM-DD HH:MM:SS', UTC); every comparison goes through datetime(?).
 */
export function recordLoginAttempt(
  email: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string
): void {
  getDatabase().execute(
    `INSERT INTO login_attempts (email, success, ip_address, user_agent, attempted_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    normEmail(email),
    success ? 1 : 0,
    normIp(ipAddress),
    userAgent || null
  );
}

/** Whether this (email, IP) has signed in successfully before (rows kept 30 days). */
export function isKnownSource(email: string, ipAddress?: string): boolean {
  return !!getDatabase().queryOne(
    `SELECT 1 AS ok FROM login_attempts WHERE email = ? AND ip_address = ? AND success = 1 LIMIT 1`,
    normEmail(email),
    normIp(ipAddress)
  );
}

/**
 * Whether this source must wait before trying to sign in as `email`.
 * Never looks at the account and never writes, so the answer is the same
 * for known and unknown emails.
 */
export function checkLoginThrottle(email: string, ipAddress?: string, nowMs: number = Date.now()): ThrottleStatus {
  const db = getDatabase();
  const e = normEmail(email);
  const ip = normIp(ipAddress);
  const cutoff = new Date(nowMs - THROTTLE_WINDOW_MINUTES * 60_000).toISOString();

  const pair = db.queryOne(
    `SELECT COUNT(*) AS count, CAST(strftime('%s', MAX(attempted_at)) AS INTEGER) AS last
       FROM login_attempts
      WHERE email = ? AND ip_address = ? AND success = 0
        AND attempted_at > datetime(?)
        AND attempted_at > COALESCE(
          (SELECT MAX(attempted_at) FROM login_attempts WHERE email = ? AND ip_address = ? AND success = 1),
          '0000-00-00 00:00:00')`,
    e, ip, cutoff, e, ip
  ) as Bucket;

  const byIp = db.queryOne(
    `SELECT COUNT(*) AS count, CAST(strftime('%s', MAX(attempted_at)) AS INTEGER) AS last
       FROM login_attempts
      WHERE ip_address = ? AND success = 0 AND attempted_at > datetime(?)`,
    ip, cutoff
  ) as Bucket;

  let wait = Math.max(remaining(pair, PAIR_FREE_FAILURES, nowMs), remaining(byIp, IP_FREE_FAILURES, nowMs));

  const byEmail = db.queryOne(
    `SELECT COUNT(*) AS count, CAST(strftime('%s', MAX(attempted_at)) AS INTEGER) AS last
       FROM login_attempts
      WHERE email = ? AND success = 0 AND attempted_at > datetime(?)`,
    e, cutoff
  ) as Bucket;
  const emailWait = remaining(byEmail, EMAIL_FREE_FAILURES, nowMs);
  if (emailWait > 0 && !isKnownSource(e, ip)) wait = Math.max(wait, emailWait);

  return { throttled: wait > 0, retryAfterSeconds: wait };
}

/**
 * Record a failed sign-in (wrong password or unknown email). Only an attempt
 * row is written; never account state.
 */
export function handleFailedLogin(email: string, ipAddress?: string, userAgent?: string): void {
  recordLoginAttempt(email, false, ipAddress, userAgent);
}

/**
 * Record a successful sign-in: resets this (email, IP) counter, marks the IP
 * as a known source for the email, and clears any lock left by the old logic.
 */
export function handleSuccessfulLogin(email: string, ipAddress?: string, userAgent?: string): void {
  recordLoginAttempt(email, true, ipAddress, userAgent);
  getDatabase().execute(
    `UPDATE users SET locked_until = NULL, failed_attempts = 0
      WHERE lower(email) = ? AND (locked_until IS NOT NULL OR failed_attempts != 0)`,
    normEmail(email)
  );
}

/** Remove attempts older than 30 days (run periodically). */
export function cleanupOldAttempts(): void {
  getDatabase().execute(
    `DELETE FROM login_attempts WHERE attempted_at < datetime('now', '-30 days')`
  );
}
