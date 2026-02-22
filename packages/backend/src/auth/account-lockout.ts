/**
 * Account Lockout Service
 * SECURITY: Prevents brute force attacks by locking accounts after failed login attempts (M-02)
 */

import { getDatabase } from '../db/index.js';

// SECURITY: Configuration for account lockout
const MAX_FAILED_ATTEMPTS = 5; // Lock account after 5 failed attempts
const LOCKOUT_DURATION_MINUTES = 15; // Lock for 15 minutes
const ATTEMPT_WINDOW_MINUTES = 15; // Track attempts in last 15 minutes

/**
 * Record a login attempt (success or failure)
 * @param email User email
 * @param success Whether login was successful
 * @param ipAddress Optional IP address
 * @param userAgent Optional user agent
 */
export function recordLoginAttempt(
    email: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string
): void {
    const db = getDatabase();

    db.execute(
        `INSERT INTO login_attempts (email, success, ip_address, user_agent, attempted_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        email,
        success ? 1 : 0,
        ipAddress || null,
        userAgent || null
    );
}

/**
 * Check if an account is currently locked
 * @param email User email
 * @returns Object with isLocked flag and lockedUntil timestamp
 */
export function checkAccountLock(email: string): {
    isLocked: boolean;
    lockedUntil: Date | null;
    remainingMinutes: number;
} {
    const db = getDatabase();

    // Check if user has an active lock
    const user = db.query(
        `SELECT locked_until, failed_attempts FROM users WHERE email = ?`,
        email
    ) as any;

    if (user && user.locked_until) {
        const lockedUntil = new Date(user.locked_until);
        const now = new Date();

        if (lockedUntil > now) {
            const remainingMs = lockedUntil.getTime() - now.getTime();
            const remainingMinutes = Math.ceil(remainingMs / 60000);

            return {
                isLocked: true,
                lockedUntil,
                remainingMinutes,
            };
        } else {
            // Lock expired, clear it
            db.execute(
                `UPDATE users SET locked_until = NULL, failed_attempts = 0 WHERE email = ?`,
                email
            );
        }
    }

    return {
        isLocked: false,
        lockedUntil: null,
        remainingMinutes: 0,
    };
}

/**
 * Get recent failed login attempts for an email
 * @param email User email
 * @returns Number of failed attempts in the last ATTEMPT_WINDOW_MINUTES
 * SECURITY: Uses parameterized date calculation to prevent SQL injection (C-06)
 */
export function getRecentFailedAttempts(email: string): number {
    const db = getDatabase();

    // SECURITY: Calculate cutoff time in JavaScript (C-06)
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - ATTEMPT_WINDOW_MINUTES);

    const result = db.query(
        `SELECT COUNT(*) as count FROM login_attempts
         WHERE email = ?
         AND success = 0
         AND attempted_at > ?`,
        email,
        cutoffTime.toISOString()
    ) as any;

    return result?.count || 0;
}

/**
 * Lock an account after too many failed attempts
 * @param email User email
 * SECURITY: Uses parameterized date calculation to prevent SQL injection (C-06)
 */
export function lockAccount(email: string): void {
    const db = getDatabase();

    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);

    // SECURITY: Calculate cutoff time in JavaScript (C-06)
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - ATTEMPT_WINDOW_MINUTES);

    db.execute(
        `UPDATE users
         SET locked_until = ?,
             failed_attempts = (SELECT COUNT(*) FROM login_attempts WHERE email = ? AND success = 0 AND attempted_at > ?)
         WHERE email = ?`,
        lockUntil.toISOString(),
        email,
        cutoffTime.toISOString(),
        email
    );
}

/**
 * Handle failed login attempt
 * SECURITY: Tracks attempt and locks account if threshold exceeded (M-02)
 * @param email User email
 * @param ipAddress Optional IP address
 * @param userAgent Optional user agent
 * @returns Object indicating if account should be locked
 */
export function handleFailedLogin(
    email: string,
    ipAddress?: string,
    userAgent?: string
): {
    shouldLock: boolean;
    failedAttempts: number;
    remainingAttempts: number;
} {
    // Record the failed attempt
    recordLoginAttempt(email, false, ipAddress, userAgent);

    // Get recent failed attempts
    const failedAttempts = getRecentFailedAttempts(email);

    // Check if we should lock the account
    const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;

    if (shouldLock) {
        lockAccount(email);
    }

    return {
        shouldLock,
        failedAttempts,
        remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - failedAttempts),
    };
}

/**
 * Handle successful login
 * SECURITY: Clears failed attempts and unlocks account (M-02)
 * @param email User email
 * @param ipAddress Optional IP address
 * @param userAgent Optional user agent
 */
export function handleSuccessfulLogin(
    email: string,
    ipAddress?: string,
    userAgent?: string
): void {
    const db = getDatabase();

    // Record successful attempt
    recordLoginAttempt(email, true, ipAddress, userAgent);

    // Clear lockout and failed attempts
    db.execute(
        `UPDATE users SET locked_until = NULL, failed_attempts = 0 WHERE email = ?`,
        email
    );
}

/**
 * Cleanup old login attempts (run periodically)
 * Removes attempts older than 30 days
 */
export function cleanupOldAttempts(): void {
    const db = getDatabase();

    db.execute(
        `DELETE FROM login_attempts WHERE attempted_at < datetime('now', '-30 days')`
    );
}
