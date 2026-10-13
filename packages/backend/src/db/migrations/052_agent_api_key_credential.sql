-- Migration 052: agent provider keys live in the encrypted credentials store (S1.1)
-- agents_config.api_key (plaintext) is replaced by a reference to a credential.
-- Existing plaintext keys are moved by the server at startup
-- (credentials/authority.ts migrateAgentApiKeys) and the column is then left empty.
-- Date: 2026-10-14

ALTER TABLE agents_config ADD COLUMN api_key_credential_id TEXT;
