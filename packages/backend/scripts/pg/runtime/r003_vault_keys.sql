-- Runtime DDL (B2.2b-2): the key manager table. On SQLite
-- src/encryption/key-manager.ts creates it as `keys` in its own file
-- (.data/encryption/keys.db); on PostgreSQL it lives in the main database as
-- `vault_keys`. keysSchemaSql('vault_keys') must equal this file
-- (test/pg-runtime-ddl.test.mjs); translated into migrations-pg r003.
-- Only key metadata and data keys wrapped by the master key are stored; the
-- master key itself never is (env / key file, as on SQLite).

CREATE TABLE IF NOT EXISTS vault_keys (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  encrypted_key TEXT,
  kdf_config TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  last_used_at TEXT,
  active INTEGER DEFAULT 1,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_keys_type ON vault_keys(type);
CREATE INDEX IF NOT EXISTS idx_keys_active ON vault_keys(active);
