-- Runtime DDL (B2.2b-2): indexes of the main `credentials` table, created by
-- src/credentials/storage.ts initialize() on SQLite (CREDENTIALS_INDEXES_SQL).
-- The table itself is in schema.sql. On PostgreSQL there is no runtime DDL:
-- this file is translated into src/db/migrations-pg/r001_credentials_indexes.sql.
-- Keep it equal to the TypeScript constant (test/pg-runtime-ddl.test.mjs).

CREATE UNIQUE INDEX IF NOT EXISTS idx_credentials_name_user
  ON credentials(name, user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_skill
  ON credentials(skill_id);
CREATE INDEX IF NOT EXISTS idx_credentials_user
  ON credentials(user_id);
