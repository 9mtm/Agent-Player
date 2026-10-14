-- Runtime DDL (B2.2b-2): the credential vault table. On SQLite
-- src/encryption/credential-vault.ts creates it as `credentials` in its own
-- file (.data/encryption/credentials.db); on PostgreSQL it lives in the main
-- database, where `credentials` is taken, as `vault_credentials`.
-- vaultSchemaSql('vault_credentials') must equal this file
-- (test/pg-runtime-ddl.test.mjs); translated into migrations-pg r002.

CREATE TABLE IF NOT EXISTS vault_credentials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  service TEXT,
  owner_id TEXT NOT NULL,
  owner_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_accessed_at TEXT,
  access_count INTEGER DEFAULT 0,
  expires_at TEXT,
  tags TEXT,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_cred_owner ON vault_credentials(owner_id, owner_type);
CREATE INDEX IF NOT EXISTS idx_cred_type ON vault_credentials(type);
CREATE INDEX IF NOT EXISTS idx_cred_service ON vault_credentials(service);
CREATE INDEX IF NOT EXISTS idx_cred_name ON vault_credentials(name);
