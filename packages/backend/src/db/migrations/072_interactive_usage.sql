-- Migration 072: usage of interactive paid model calls (R2.2)
-- Chat with the owner present is never gated by the autonomous daily cap
-- (paid_usage / DAILY_PAID_CAP_CENTS); its paid usage is recorded here so
-- GET /api/budget can show it separately. No prompts or keys are stored.
-- Date: 2026-10-14

CREATE TABLE IF NOT EXISTS interactive_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  purpose TEXT NOT NULL,
  cost_cents REAL NOT NULL DEFAULT 0,
  input_tokens INTEGER,
  output_tokens INTEGER,
  usage_source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_interactive_usage_day ON interactive_usage(day);
