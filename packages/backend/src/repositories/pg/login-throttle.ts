/**
 * Sign-in throttling and device tokens on PostgreSQL (B2.2a): the queries of
 * auth/account-lockout.ts (M-02, S0-Q.20/21) on the translated schema. The
 * rules, constants and pure helpers are imported from account-lockout.ts, so
 * only the SQL differs.
 *
 * Column kinds in the translated schema (they decide the SQL form):
 *   login_attempts.attempted_at          timestamptz -> compared with a bound
 *                                         ISO time, tsParam() = (?)::timestamptz
 *   login_devices.expires_at,
 *   last_failed_at, last_used_at,
 *   created_at                           text 'YYYY-MM-DD HH:MM:SS' (UTC) ->
 *                                         compared as text with a bound
 *                                         textTimestamp(ms), written with nowText()
 * strftime('%s', x) -> epochSeconds(); the SQLite pair query's
 * COALESCE(..., '0000-00-00 00:00:00') -> '-infinity' (not a valid timestamptz).
 *
 * handleSuccessfulLogin runs in one transaction here, so the device token
 * rotation (old token deleted, new one stored, excess pruned) is atomic.
 */

import { randomBytes } from 'node:crypto';
import { pgOne, pgRun, withPgTransaction } from '../../db/pg/pool.js';
import { epochSeconds, nowText, textTimestamp, tsParam } from '../../db/pg/dialect.js';
import {
  DEVICE_FREE_FAILURES, DEVICE_TOKEN_BYTES, DEVICE_TOKEN_DAYS, EMAIL_FREE_FAILURES, IP_FREE_FAILURES,
  MAX_DEVICES_PER_EMAIL, PAIR_FREE_FAILURES, THROTTLE_WINDOW_MINUTES, ATTEMPT_RETENTION_DAYS,
  hashToken, normEmail, normIp, parseDeviceToken, remaining,
  type Bucket, type ThrottleStatus,
} from '../../auth/account-lockout.js';

const PG = 'postgres' as const;
const iso = (ms: number) => new Date(ms).toISOString();

type Device = { id: number; failed_count: number; last_failed: number | null };

export async function recordLoginAttempt(email: string, success: boolean, ipAddress?: string, userAgent?: string): Promise<void> {
  await pgRun(
    `INSERT INTO login_attempts (email, success, ip_address, user_agent, attempted_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    normEmail(email), success ? 1 : 0, normIp(ipAddress), userAgent || null,
  );
}

async function findDevice(email: string, deviceToken: unknown, nowMs: number): Promise<Device | null> {
  const token = parseDeviceToken(deviceToken);
  if (!token) return null;
  const row = await pgOne<Device>(
    `SELECT id, failed_count, ${epochSeconds(PG, 'last_failed_at', 'text')} AS last_failed
       FROM login_devices
      WHERE token_hash = ? AND email = ? AND expires_at > ?`,
    hashToken(token), normEmail(email), textTimestamp(nowMs),
  );
  return row ?? null;
}

export async function hasValidDevice(email: string, deviceToken: unknown, nowMs: number = Date.now()): Promise<boolean> {
  return (await findDevice(email, deviceToken, nowMs)) !== null;
}

const BUCKET_SELECT = `SELECT COUNT(*) AS count, ${epochSeconds(PG, 'MAX(attempted_at)')} AS last FROM login_attempts`;

export async function checkLoginThrottle(email: string, ipAddress?: string, deviceToken?: unknown, nowMs: number = Date.now()): Promise<ThrottleStatus> {
  const e = normEmail(email);
  const ip = normIp(ipAddress);
  const cutoffMs = nowMs - THROTTLE_WINDOW_MINUTES * 60_000;
  const cutoff = iso(cutoffMs);

  const device = await findDevice(e, deviceToken, nowMs);
  if (device) {
    const inWindow = device.last_failed != null && device.last_failed * 1000 > cutoffMs;
    const wait = remaining({ count: inWindow ? device.failed_count : 0, last: device.last_failed }, DEVICE_FREE_FAILURES, nowMs);
    return { throttled: wait > 0, retryAfterSeconds: wait };
  }

  const pair = await pgOne<NonNullable<Bucket>>(
    `${BUCKET_SELECT}
      WHERE email = ? AND ip_address = ? AND success = 0
        AND attempted_at > ${tsParam(PG)}
        AND attempted_at > COALESCE(
          (SELECT MAX(attempted_at) FROM login_attempts WHERE email = ? AND ip_address = ? AND success = 1),
          '-infinity'::timestamptz)`,
    e, ip, cutoff, e, ip,
  );
  const byIp = await pgOne<NonNullable<Bucket>>(
    `${BUCKET_SELECT} WHERE ip_address = ? AND success = 0 AND attempted_at > ${tsParam(PG)}`,
    ip, cutoff,
  );
  const byEmail = await pgOne<NonNullable<Bucket>>(
    `${BUCKET_SELECT} WHERE email = ? AND success = 0 AND attempted_at > ${tsParam(PG)}`,
    e, cutoff,
  );

  const wait = Math.max(
    remaining(pair, PAIR_FREE_FAILURES, nowMs),
    remaining(byIp, IP_FREE_FAILURES, nowMs),
    remaining(byEmail, EMAIL_FREE_FAILURES, nowMs),
  );
  return { throttled: wait > 0, retryAfterSeconds: wait };
}

export async function handleFailedLogin(email: string, ipAddress?: string, userAgent?: string, deviceToken?: unknown, nowMs: number = Date.now()): Promise<void> {
  await recordLoginAttempt(email, false, ipAddress, userAgent);
  const device = await findDevice(email, deviceToken, nowMs);
  if (device) {
    await pgRun(
      `UPDATE login_devices
          SET failed_count = CASE WHEN last_failed_at IS NOT NULL AND last_failed_at > ? THEN failed_count + 1 ELSE 1 END,
              last_failed_at = ${nowText(PG)}
        WHERE id = ?`,
      textTimestamp(nowMs - THROTTLE_WINDOW_MINUTES * 60_000), device.id,
    );
  }
}

async function issueDeviceToken(email: string, nowMs: number): Promise<string> {
  const token = randomBytes(DEVICE_TOKEN_BYTES).toString('base64url');
  await pgRun(
    `INSERT INTO login_devices (email, token_hash, created_at, last_used_at, expires_at)
     VALUES (?, ?, ${nowText(PG)}, ${nowText(PG)}, ?)`,
    normEmail(email), hashToken(token), textTimestamp(nowMs + DEVICE_TOKEN_DAYS * 86_400_000),
  );
  return token;
}

export async function handleSuccessfulLogin(email: string, ipAddress?: string, userAgent?: string, deviceToken?: unknown, nowMs: number = Date.now()): Promise<string> {
  const e = normEmail(email);
  return withPgTransaction(async () => {
    await recordLoginAttempt(e, true, ipAddress, userAgent);
    await pgRun(
      `UPDATE users SET locked_until = NULL, failed_attempts = 0
        WHERE lower(email) = ? AND (locked_until IS NOT NULL OR failed_attempts != 0)`,
      e,
    );
    const device = await findDevice(e, deviceToken, nowMs);
    if (device) await pgRun(`DELETE FROM login_devices WHERE id = ?`, device.id);
    await pgRun(`DELETE FROM login_devices WHERE expires_at <= ?`, textTimestamp(nowMs));
    const fresh = await issueDeviceToken(e, nowMs);
    await pgRun(
      `DELETE FROM login_devices WHERE email = ? AND id NOT IN (
         SELECT id FROM login_devices WHERE email = ? ORDER BY last_used_at DESC, id DESC LIMIT ?)`,
      e, e, MAX_DEVICES_PER_EMAIL,
    );
    return fresh;
  });
}

export async function pruneLoginRecords(nowMs: number = Date.now()): Promise<{ attempts: number; devices: number }> {
  const attempts = await pgRun(
    `DELETE FROM login_attempts WHERE attempted_at < ${tsParam(PG)}`,
    iso(nowMs - ATTEMPT_RETENTION_DAYS * 86_400_000),
  );
  const devices = await pgRun(`DELETE FROM login_devices WHERE expires_at <= ?`, textTimestamp(nowMs));
  return { attempts: attempts.changes, devices: devices.changes };
}
