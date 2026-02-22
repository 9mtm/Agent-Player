-- Migration 034: Account Lockout After Failed Logins
-- Fixes M-02: Track failed login attempts and implement account lockout
-- SECURITY: Prevents brute force attacks on user accounts

-- Table to track failed login attempts
CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success INTEGER NOT NULL DEFAULT 0 -- 0 = failed, 1 = success
);

-- Index for efficient lockout checks
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
    ON login_attempts(email, attempted_at DESC);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_time
    ON login_attempts(attempted_at);

-- Add lockout fields to users table
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;

-- Index for locked account queries
CREATE INDEX IF NOT EXISTS idx_users_locked_until
    ON users(locked_until) WHERE locked_until IS NOT NULL;
