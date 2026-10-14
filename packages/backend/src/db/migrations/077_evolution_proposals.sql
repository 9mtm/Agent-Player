-- Migration 077: Evolution proposes prompt / PERSONALITY.md changes (S0-Q.23)
--
-- The old Evolution cycle appended text to agents_config.system_prompt, wrote
-- PERSONALITY.md and switched on capabilities by itself. Now it only files
-- pending rows here; nothing changes until the owner approves one. Evolution
-- never touches capabilities, tool grants or permissions (capability ideas
-- are returned as informational suggestions only, never stored as a change).
--   kind           'prompt_append'    append proposed_text to system_prompt
--                  'personality_text' append proposed_text to PERSONALITY.md
--   proposed_text  plain text, 1..4000 chars, stored as data (never executed)
--   base_hash      sha256 hex of the target content when the proposal was
--                  made; approval is refused (status 'stale') once it differs
--   review_hash    sha256 of what the reviewer sees (see evolution-proposals.ts)
--   applied_history_id  agent_evolution_history row written by the approval
-- Separate from personality_proposals (migration 075): that table is
-- trait-specific (proposed_traits NOT NULL, base_version of the personality
-- versions) and SQLite cannot change its CHECK constraints in place.
-- Date: 2026-10-14

CREATE TABLE IF NOT EXISTS evolution_proposals (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('prompt_append', 'personality_text')),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  proposed_text TEXT NOT NULL CHECK (length(proposed_text) BETWEEN 1 AND 4000),
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 1000),
  insight_type TEXT,
  confidence REAL,
  base_hash TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'evolution' CHECK (source IN ('evolution')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'stale', 'cancelled')),
  review_hash TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  decided_by TEXT,
  decided_at TEXT,
  decision_note TEXT CHECK (decision_note IS NULL OR length(decision_note) <= 500),
  applied_history_id TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_evolution_proposals_agent ON evolution_proposals(agent_id, status, created_at);
