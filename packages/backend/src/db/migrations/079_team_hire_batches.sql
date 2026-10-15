-- Migration 079: batch hire for company setup (ONBOARD-TEAM-02)
--
-- The owner hires a whole planned company (up to 1000 agents) in one batch.
-- team_hire_batches holds the reviewed plan; team_hire_batch_items has one
-- row per planned person. Running the batch creates the pending items a few
-- at a time; each item's agent and its 'created' mark are written in the
-- same transaction, so a reload or a second run never creates a duplicate.
--   id           client-chosen batch id (idempotent create)
--   fingerprint  sha256 of the normalized plan; the same id with another
--                plan is refused
--   status       pending | created | failed (error_code says why)
--   name         filled when the agent is created (names are reserved then)
-- Date: 2026-10-15

CREATE TABLE IF NOT EXISTS team_hire_batches (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  language TEXT NOT NULL,
  total INTEGER NOT NULL CHECK (total >= 1),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS team_hire_batch_items (
  batch_id TEXT NOT NULL REFERENCES team_hire_batches(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL CHECK (seq >= 1),
  department TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'specialist', 'evaluator')),
  title TEXT NOT NULL,
  preset TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'created', 'failed')),
  agent_id TEXT,
  name TEXT,
  error_code TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (batch_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_team_hire_batch_items_status ON team_hire_batch_items (batch_id, status, seq);
CREATE INDEX IF NOT EXISTS idx_team_hire_batches_owner ON team_hire_batches (owner_id, created_at);
