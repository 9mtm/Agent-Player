-- Migration 059: memory files with reviewed edit proposals (CORE-04)
-- The database stays canonical. Each drawer is exported to a readable
-- Markdown file; an edited file comes back only as a proposal that the owner
-- approves (applied as a new version) or rejects (nothing changes).
-- Date: 2026-10-14

-- Append-only history of memory changes made through reviewed proposals.
--   version          per memory, 1..n
--   drawer_revision  per drawer (user + kind + key); one approved proposal = +1
--   change           'baseline' (state before the first recorded change),
--                    'create' | 'update' | 'delete'
CREATE TABLE IF NOT EXISTS memory_versions (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  drawer_kind TEXT NOT NULL,
  drawer_key TEXT NOT NULL DEFAULT '',
  drawer_revision INTEGER NOT NULL,
  version INTEGER NOT NULL,
  change TEXT NOT NULL CHECK(change IN ('baseline', 'create', 'update', 'delete')),
  type TEXT,
  content TEXT,
  importance_score REAL,
  proposal_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(memory_id, version)
);

CREATE INDEX IF NOT EXISTS idx_memory_versions_drawer
  ON memory_versions(user_id, drawer_kind, drawer_key, drawer_revision);

-- Proposed changes to one drawer, computed from an edited export file.
--   base_hash  hash of the drawer content the file was exported from
--   changes    JSON array of { op: 'add'|'update'|'delete', ... }
CREATE TABLE IF NOT EXISTS memory_file_proposals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  drawer_kind TEXT NOT NULL,
  drawer_key TEXT NOT NULL DEFAULT '',
  base_hash TEXT NOT NULL,
  base_revision INTEGER NOT NULL,
  changes TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'stale')),
  source TEXT NOT NULL CHECK(source IN ('upload', 'file')),
  note TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  decided_by TEXT,
  decided_at TEXT,
  applied_revision INTEGER
);

CREATE INDEX IF NOT EXISTS idx_memory_file_proposals_user ON memory_file_proposals(user_id, status, created_at);
