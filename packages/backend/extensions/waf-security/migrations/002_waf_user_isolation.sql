-- Migration 002: WAF Security - User Isolation & Rate Limiting
-- Adds authentication, user scoping, and rate limiting to WAF scanner

-- Add user_id column to waf_scans table for user isolation
ALTER TABLE waf_scans ADD COLUMN user_id TEXT;

-- Backfill existing scans with default user ID
UPDATE waf_scans SET user_id = '1' WHERE user_id IS NULL;

-- Create index for user-scoped queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_waf_scans_user_id ON waf_scans(user_id, created_at DESC);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS waf_rate_limits (
  user_id TEXT PRIMARY KEY,
  concurrent_scans INTEGER DEFAULT 0,
  last_scan_at DATETIME,
  daily_scan_count INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT (date('now')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for rate limit checks
CREATE INDEX IF NOT EXISTS idx_waf_rate_limits_user ON waf_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_waf_rate_limits_date ON waf_rate_limits(last_reset_date);
