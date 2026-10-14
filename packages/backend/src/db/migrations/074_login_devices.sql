-- Migration 074: sign-in device tokens (S0-Q.20 follow-up)
-- A successful sign-in returns an opaque random device token; only its
-- sha256 is stored here, bound to the (normalized) email. A caller that
-- presents a valid token is exempt from the shared per-IP and per-email
-- throttle buckets (behind a proxy every caller has the same IP); its own
-- failures are counted on this row with the same progressive delay.
-- Tokens rotate on every successful sign-in and expire after 60 days.
-- Date: 2026-10-14

CREATE TABLE IF NOT EXISTS login_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    failed_count INTEGER NOT NULL DEFAULT 0,
    last_failed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_devices_email ON login_devices(email);
CREATE INDEX IF NOT EXISTS idx_login_devices_expires ON login_devices(expires_at);
