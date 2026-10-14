-- Runtime DDL (B2.2c): the settings manager table. On SQLite
-- src/settings/settings-manager.ts creates it at run time (APP_SETTINGS_SQL,
-- which must equal this file: test/pg-runtime-ddl.test.mjs); on PostgreSQL it
-- comes from migrations-pg r006. One JSON row ('agent_settings'); the API
-- keys inside are encrypted by the app. updated_at is epoch milliseconds.

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
