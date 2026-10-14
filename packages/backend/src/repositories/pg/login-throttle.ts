/**
 * Sign-in throttling and device tokens on PostgreSQL (B2.2a).
 *
 * B2.2c: auth/account-lockout.ts is now one copy of the SQL for both drivers
 * (SQL steps), so this module has no SQL of its own any more: it is the same
 * functions bound to the PostgreSQL runner (repositories/login-throttle.ts
 * pgLoginThrottle).
 */

import { loginThrottleOn } from '../../auth/account-lockout.js';
import { pgSteps } from '../sql-steps.js';

const pg = loginThrottleOn(pgSteps);

export const checkLoginThrottle = pg.check;
export const handleFailedLogin = pg.failed;
export const handleSuccessfulLogin = pg.succeeded;
export const hasValidDevice = pg.hasValidDevice;
export const pruneLoginRecords = pg.prune;
export const recordLoginAttempt = pg.record;
