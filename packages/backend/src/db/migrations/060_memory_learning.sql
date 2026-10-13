-- Migration 060: learning approval + weekly summary (CORE-05)
-- Routine facts are saved automatically; important ones become proposals the
-- owner approves or rejects. Every add/edit/delete through the API and the
-- memory tools is versioned with actor and reason.
-- Date: 2026-10-14

-- Why a version was written ('api', 'learning:routine', 'proposal', ...).
ALTER TABLE memory_versions ADD COLUMN reason TEXT;

-- memory_file_proposals gains two sources and one status. SQLite cannot
-- change a CHECK constraint, so the table is rebuilt (rows kept as they are).
--   source  'upload' | 'file'      edited export file (CORE-04)
--           'learning'             important learned item (extraction / chat)
--           'agent'                agent tool add/edit/delete of an important memory
--   status  + 'cancelled'          withdrawn by the system (e.g. memory forgotten)
--   reasons JSON array of classification reasons (learning/agent proposals)
CREATE TABLE memory_file_proposals_v2 (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  drawer_kind TEXT NOT NULL,
  drawer_key TEXT NOT NULL DEFAULT '',
  base_hash TEXT NOT NULL,
  base_revision INTEGER NOT NULL,
  changes TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'stale', 'cancelled')),
  source TEXT NOT NULL CHECK(source IN ('upload', 'file', 'learning', 'agent')),
  note TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  decided_by TEXT,
  decided_at TEXT,
  applied_revision INTEGER,
  reasons TEXT
);

INSERT INTO memory_file_proposals_v2 (id, user_id, agent_id, drawer_kind, drawer_key, base_hash, base_revision, changes, status, source, note, created_by, created_at, decided_by, decided_at, applied_revision)
  SELECT id, user_id, agent_id, drawer_kind, drawer_key, base_hash, base_revision, changes, status, source, note, created_by, created_at, decided_by, decided_at, applied_revision
    FROM memory_file_proposals;

DROP TABLE memory_file_proposals;
ALTER TABLE memory_file_proposals_v2 RENAME TO memory_file_proposals;
CREATE INDEX IF NOT EXISTS idx_memory_file_proposals_user ON memory_file_proposals(user_id, status, created_at);

-- "What I learned this week": one record per user and period.
--   digest  JSON { drawers: [{ drawerId, total, created, updated, deleted, pending, items }], totals }
--   text    deterministic readable digest
--   model_text  optional local-model summary (only when configured)
CREATE TABLE IF NOT EXISTS memory_weekly_summaries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  digest TEXT NOT NULL,
  text TEXT NOT NULL,
  model_text TEXT,
  model TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_memory_weekly_summaries_user ON memory_weekly_summaries(user_id, period_end);
