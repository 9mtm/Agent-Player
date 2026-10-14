-- Migration 075: agent role/department and personality drift proposals (CORE-01c, MEM-03)
--
-- agents_config.role        'main' | 'manager' | 'specialist' | 'evaluator', or NULL
--                           (validated in services/personality.ts). Only used to
--                           pick the default personality preset when an agent is
--                           created; it never grants tools or permissions.
-- agents_config.department  free text, normalized lowercase, or NULL.
-- Existing agents keep role/department NULL and their personality unchanged.
--
-- personality_proposals: a drift of an agent's personality proposed by the
-- agent, by Evolution or by a person. Nothing changes until the owner approves
-- it; the approval appends a new agent_personality_versions row
-- (source 'evolution', based_on_version = base_version) in one transaction.
--   base_version     the current version when the proposal was made (0 = none
--                    stored yet); approval is refused (status 'stale') once the
--                    personality has moved on
--   base_traits      traits of base_version (JSON object), for the diff
--   proposed_traits  complete traits after the change (JSON object), already
--                    bounded to <= 5 points per trait, locked traits unchanged
--   evidence         JSON array of short refs (task-run ids, memory ids), max 20
--   review_hash      sha256 of what the reviewer sees (see personality-store.ts)
-- Date: 2026-10-14

ALTER TABLE agents_config ADD COLUMN role TEXT;
ALTER TABLE agents_config ADD COLUMN department TEXT;

CREATE TABLE IF NOT EXISTS personality_proposals (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  base_version INTEGER NOT NULL CHECK (base_version >= 0),
  base_traits TEXT NOT NULL,
  proposed_traits TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 1000),
  evidence TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL CHECK (source IN ('agent', 'evolution', 'owner')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'stale', 'cancelled')),
  review_hash TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  decided_by TEXT,
  decided_at TEXT,
  decision_note TEXT CHECK (decision_note IS NULL OR length(decision_note) <= 500),
  applied_version INTEGER,
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_personality_proposals_agent ON personality_proposals(agent_id, status, created_at);
