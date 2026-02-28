-- Migration 043: Extension Usage Statistics
-- Extension usage statistics (for analytics dashboard)

CREATE TABLE IF NOT EXISTS extension_usage_stats (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  extension_id TEXT NOT NULL,
  date DATE NOT NULL,
  api_calls INTEGER DEFAULT 0,
  storage_files INTEGER DEFAULT 0,
  storage_bytes INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(extension_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ext_usage_ext_date ON extension_usage_stats(extension_id, date DESC);

-- Note: The audit_logs table already exists (migration 035) and handles extension events.
-- The flexible event_type TEXT column supports all extension event types:
-- - extension.api.call
-- - extension.permission.denied
-- - extension.permission.granted
-- - extension.tool.registered
-- - extension.cron.registered
-- - extension.storage.accessed
