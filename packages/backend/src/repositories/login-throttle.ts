/**
 * Sign-in throttle store (B2.2a): auth/account-lockout.ts behind an async
 * interface, so the login route runs on either driver.
 *
 *   sqliteLoginThrottle   auth/account-lockout.ts on SQLite (synchronous
 *                         under the hood: the rows are written by the time
 *                         the call returns)
 *   pgLoginThrottle       the same functions on PostgreSQL
 *
 * B2.2c: account-lockout.ts is one copy of the SQL (SQL steps), so both
 * stores run the same steps, each on its own driver's runner; there is no
 * SQLite-only path left.
 *
 * Not actor-scoped: it runs before there is a user (rules in account-lockout.ts).
 */

import { loginThrottleOn, PRUNE_INTERVAL_MS, type ThrottleStatus } from '../auth/account-lockout.js';
import * as pg from './pg/login-throttle.js';
import { sqliteSteps } from './sql-steps.js';

const sqlite = loginThrottleOn(sqliteSteps);
import { safeErrorFields } from '../services/safe-error-log.js';

export interface LoginThrottle {
  check(email: string, ipAddress?: string, deviceToken?: unknown, nowMs?: number): Promise<ThrottleStatus>;
  failed(email: string, ipAddress?: string, userAgent?: string, deviceToken?: unknown, nowMs?: number): Promise<void>;
  /** Records the success and returns the fresh device token. */
  succeeded(email: string, ipAddress?: string, userAgent?: string, deviceToken?: unknown, nowMs?: number): Promise<string>;
  hasValidDevice(email: string, deviceToken: unknown, nowMs?: number): Promise<boolean>;
  prune(nowMs?: number): Promise<{ attempts: number; devices: number }>;
}

export const sqliteLoginThrottle: LoginThrottle = {
  check: sqlite.check,
  failed: sqlite.failed,
  succeeded: sqlite.succeeded,
  hasValidDevice: sqlite.hasValidDevice,
  prune: sqlite.prune,
};

export const pgLoginThrottle: LoginThrottle = {
  check: pg.checkLoginThrottle,
  failed: pg.handleFailedLogin,
  succeeded: pg.handleSuccessfulLogin,
  hasValidDevice: pg.hasValidDevice,
  prune: pg.pruneLoginRecords,
};

/**
 * S0-Q.21: prune old sign-in attempts and expired device tokens once now and
 * then every PRUNE_INTERVAL_MS, through `throttle.prune` (so on the selected
 * driver; server.ts passes repositories/index.ts loginThrottle). Errors are
 * logged with safe fields only and never thrown. The timer is unref'd so it
 * never keeps the process alive. On SQLite the first prune has finished when
 * this returns (the store is synchronous under the hood).
 */
export function startLoginRecordPruning(throttle: LoginThrottle, intervalMs: number = PRUNE_INTERVAL_MS): ReturnType<typeof setInterval> {
  const run = () => {
    let pending: Promise<{ attempts: number; devices: number }>;
    try {
      pending = throttle.prune();
    } catch (err) {
      pending = Promise.reject(err);
    }
    pending.then(({ attempts, devices }) => {
      if (attempts || devices) console.log(`[Auth] Pruned ${attempts} old sign-in attempts and ${devices} expired device tokens`);
    }, (err) => {
      console.warn('[Auth] Sign-in record prune failed:', safeErrorFields(err));
    });
  };
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return timer;
}
