-- Migration 086: per-user interface preferences (TERM-PRO-01)
--
--   user_prefs   one JSON value per user and key (e.g. 'terminal': theme, font, cursor);
--                the server validates each key's shape before saving
-- Date: 2026-10-16

CREATE TABLE IF NOT EXISTS user_prefs (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, key)
);
