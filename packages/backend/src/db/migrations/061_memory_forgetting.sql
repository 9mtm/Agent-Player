-- Migration 061: forgetting rules (CORE-07)
-- "Forget this" removes a memory completely: its row, the text of every
-- version, index rows, readable copies and exports. Only a tombstone stays:
-- a memory_versions row with change 'forget' (memory id, user, drawer,
-- time, actor; no text). Retention runs (task TTL, experience consolidation)
-- are explicit, owner-scoped and recorded.
-- Date: 2026-10-14

-- memory_versions gains change 'forget'. SQLite cannot change a CHECK
-- constraint, so the table is rebuilt (rows kept as they are).
CREATE TABLE memory_versions_v2 (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  drawer_kind TEXT NOT NULL,
  drawer_key TEXT NOT NULL DEFAULT '',
  drawer_revision INTEGER NOT NULL,
  version INTEGER NOT NULL,
  change TEXT NOT NULL CHECK(change IN ('baseline', 'create', 'update', 'delete', 'forget')),
  type TEXT,
  content TEXT,
  importance_score REAL,
  proposal_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  reason TEXT,
  UNIQUE(memory_id, version)
);

INSERT INTO memory_versions_v2 (id, memory_id, user_id, drawer_kind, drawer_key, drawer_revision, version, change, type, content, importance_score, proposal_id, created_by, created_at, reason)
  SELECT id, memory_id, user_id, drawer_kind, drawer_key, drawer_revision, version, change, type, content, importance_score, proposal_id, created_by, created_at, reason
    FROM memory_versions;

DROP TABLE memory_versions;
ALTER TABLE memory_versions_v2 RENAME TO memory_versions;
CREATE INDEX IF NOT EXISTS idx_memory_versions_drawer
  ON memory_versions(user_id, drawer_kind, drawer_key, drawer_revision);
CREATE INDEX IF NOT EXISTS idx_memory_versions_memory ON memory_versions(memory_id, version);

-- Retention settings per owner account. Off until the owner turns it on.
--   task_ttl_days          task drawer details are summarized and forgotten
--                          this many days after the task ended
--   experience_after_days  experience items older than this (importance < 8)
--                          are consolidated into one summary per type
--   experience_min_group   at least this many items before consolidating
CREATE TABLE IF NOT EXISTS memory_retention_config (
  user_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0, 1)),
  task_ttl_days INTEGER NOT NULL DEFAULT 90,
  experience_after_days INTEGER NOT NULL DEFAULT 180,
  experience_min_group INTEGER NOT NULL DEFAULT 3,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Every retention run (job or manual, dry run or not), with counts only.
CREATE TABLE IF NOT EXISTS memory_retention_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  dry_run INTEGER NOT NULL DEFAULT 0,
  actor TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_memory_retention_runs_user ON memory_retention_runs(user_id, created_at);
