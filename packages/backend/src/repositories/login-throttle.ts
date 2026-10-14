/**
 * Sign-in throttle store (B2.2a): auth/account-lockout.ts behind an async
 * interface, so the login route runs on either driver.
 *
 *   sqliteLoginThrottle   auth/account-lockout.ts, unchanged (synchronous
 *                         under the hood: the rows are written by the time
 *                         the call returns)
 *   pgLoginThrottle       repositories/pg/login-throttle.ts
 *
 * Not actor-scoped: it runs before there is a user (rules in account-lockout.ts).
 */

import * as sqlite from '../auth/account-lockout.js';
import * as pg from './pg/login-throttle.js';
import type { ThrottleStatus } from '../auth/account-lockout.js';

export interface LoginThrottle {
  check(email: string, ipAddress?: string, deviceToken?: unknown, nowMs?: number): Promise<ThrottleStatus>;
  failed(email: string, ipAddress?: string, userAgent?: string, deviceToken?: unknown, nowMs?: number): Promise<void>;
  /** Records the success and returns the fresh device token. */
  succeeded(email: string, ipAddress?: string, userAgent?: string, deviceToken?: unknown, nowMs?: number): Promise<string>;
  hasValidDevice(email: string, deviceToken: unknown, nowMs?: number): Promise<boolean>;
  prune(nowMs?: number): Promise<{ attempts: number; devices: number }>;
}

export const sqliteLoginThrottle: LoginThrottle = {
  check: async (...a) => sqlite.checkLoginThrottle(...a),
  failed: async (...a) => sqlite.handleFailedLogin(...a),
  succeeded: async (...a) => sqlite.handleSuccessfulLogin(...a),
  hasValidDevice: async (...a) => sqlite.hasValidDevice(...a),
  prune: async (...a) => sqlite.pruneLoginRecords(...a),
};

export const pgLoginThrottle: LoginThrottle = {
  check: pg.checkLoginThrottle,
  failed: pg.handleFailedLogin,
  succeeded: pg.handleSuccessfulLogin,
  hasValidDevice: pg.hasValidDevice,
  prune: pg.pruneLoginRecords,
};
