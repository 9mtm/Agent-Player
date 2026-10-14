-- Migration 071: safe import of selected readable text files (CLI-02)
-- Release 1 (D-IMPORT-ROLLOUT): selected UTF-8 Markdown / plain text only.
-- Pipeline: select -> scan & redact -> immutable preview (versioned, hash
-- locked) -> owner confirm (changes create a new version) -> commit to
-- quarantine as memory proposals (owner approves them into memory).
-- Only sanitized (redacted) text is ever stored; original secret values are
-- never written to any table.
-- Date: 2026-10-14

-- memory_file_proposals gains source 'import' and a link to its import batch.
-- SQLite cannot change a CHECK constraint, so the table is rebuilt (rows kept).
CREATE TABLE memory_file_proposals_v3 (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  drawer_kind TEXT NOT NULL,
  drawer_key TEXT NOT NULL DEFAULT '',
  base_hash TEXT NOT NULL,
  base_revision INTEGER NOT NULL,
  changes TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'stale', 'cancelled')),
  source TEXT NOT NULL CHECK(source IN ('upload', 'file', 'learning', 'agent', 'import')),
  note TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  decided_by TEXT,
  decided_at TEXT,
  applied_revision INTEGER,
  reasons TEXT,
  import_batch_id TEXT
);

INSERT INTO memory_file_proposals_v3 (id, user_id, agent_id, drawer_kind, drawer_key, base_hash, base_revision, changes, status, source, note, created_by, created_at, decided_by, decided_at, applied_revision, reasons)
  SELECT id, user_id, agent_id, drawer_kind, drawer_key, base_hash, base_revision, changes, status, source, note, created_by, created_at, decided_by, decided_at, applied_revision, reasons
    FROM memory_file_proposals;

DROP TABLE memory_file_proposals;
ALTER TABLE memory_file_proposals_v3 RENAME TO memory_file_proposals;
CREATE INDEX IF NOT EXISTS idx_memory_file_proposals_user ON memory_file_proposals(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_memory_file_proposals_import ON memory_file_proposals(import_batch_id);

-- One import (batch). status:
--   preview      versions can still be revised; nothing is in memory
--   committed    proposals created (quarantine); the owner reviews them
--   cancelled    preview discarded before commit (preview rows removed)
--   rolled_back  committed batch undone: its not-approved proposals removed
--   expired      preview not committed in time (preview rows removed)
CREATE TABLE IF NOT EXISTS memory_import_batches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK(source_kind IN ('claude-code', 'codex', 'chatgpt', 'text')),
  status TEXT NOT NULL DEFAULT 'preview' CHECK(status IN ('preview', 'committed', 'cancelled', 'rolled_back', 'expired')),
  latest_version INTEGER NOT NULL DEFAULT 1,
  options TEXT NOT NULL DEFAULT '{}',
  committed_version INTEGER,
  committed_hash TEXT,
  operation_key TEXT,
  receipt TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL,
  committed_at TEXT,
  closed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_memory_import_batches_user ON memory_import_batches(user_id, status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_import_batches_opkey ON memory_import_batches(user_id, operation_key) WHERE operation_key IS NOT NULL;

-- Immutable preview versions: rows are only inserted, never updated.
-- files / items / summary are JSON with sanitized text only.
-- content_hash = sha256 over (batch id, version, files, items).
CREATE TABLE IF NOT EXISTS memory_import_previews (
  batch_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  parent_version INTEGER,
  content_hash TEXT NOT NULL,
  files TEXT NOT NULL,
  items TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (batch_id, version)
);

-- Owner setting: optional redaction of e-mail addresses and phone numbers.
CREATE TABLE IF NOT EXISTS memory_import_settings (
  user_id TEXT PRIMARY KEY,
  redact_emails INTEGER NOT NULL DEFAULT 0,
  redact_phones INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
