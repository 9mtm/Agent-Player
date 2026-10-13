-- Migration 057: company-wide agent name registry (CORE-02, D-AGENT-RENAME)
-- Every name an agent was created with or renamed to is reserved here for
-- good: it is never offered or accepted again for another agent, even after
-- that agent is deleted (no foreign key, rows are never removed).
--   name_key  normalized name (services/agent-names.ts normalizeAgentName)
--   name      the name as shown
--   agent_id  the agent that holds/held it
--   reason    'existing' | 'create' | 'rename' | 'duplicate'
-- Existing agents are added on first use by the service (same normalization).
-- Date: 2026-10-14

CREATE TABLE IF NOT EXISTS used_agent_names (
  name_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  language TEXT,
  agent_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  reserved_by TEXT,
  reserved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_used_agent_names_agent ON used_agent_names(agent_id);
