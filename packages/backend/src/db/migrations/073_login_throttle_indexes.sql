-- Migration 073: indexes for per-source sign-in throttling (S0-Q.20)
-- Sign-in failures are now counted per (email, IP) and per IP instead of
-- locking the account by email; these indexes keep those lookups cheap.
-- users.locked_until / failed_attempts stay for compatibility but are no
-- longer written on failures (cleared on the next successful sign-in).
-- Date: 2026-10-14

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time
    ON login_attempts(ip_address, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_ip_time
    ON login_attempts(email, ip_address, success, attempted_at DESC);
