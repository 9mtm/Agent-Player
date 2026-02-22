-- Migration 024: Extension SDK Support Tables
-- Enables dynamic extension system with per-extension config and migration tracking

-- Extension configuration and enable/disable state
CREATE TABLE IF NOT EXISTS extension_configs (
  extension_id  TEXT    PRIMARY KEY,
  config_json   TEXT    NOT NULL DEFAULT '{}',
  enabled       INTEGER NOT NULL DEFAULT 0,           -- boolean (0/1)
  installed_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Per-extension migration tracking (idempotent migrations)
CREATE TABLE IF NOT EXISTS extension_migrations (
  extension_id  TEXT NOT NULL,
  filename      TEXT NOT NULL,
  ran_at        TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (extension_id, filename)
);

-- Index for quick enabled extension queries
CREATE INDEX IF NOT EXISTS idx_extension_configs_enabled ON extension_configs(enabled) WHERE enabled = 1;
