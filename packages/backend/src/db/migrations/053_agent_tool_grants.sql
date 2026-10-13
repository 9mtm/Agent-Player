-- Migration 053: per-agent tool grants (S1.2)
-- An agent may only be offered / run the tools granted here (intersected with
-- the server's exec gate and the channel policy).
--  agent_grant_profiles.source:
--    'legacy-pending'  agent existed before grants: on first use it gets the
--                      tools registered at that time that are not exec-class
--    'legacy'          seeded from 'legacy-pending'
--    'default'         created later: minimal safe set
--    'owner'           set by the owner through the grants API
--  parent_agent_id: a sub-agent's effective grants are always intersected
--  with its parent's (delegation never expands permissions).
--  agent_tool_grants.scopes: JSON, e.g. {"destinations":["123"]} for send tools.
-- Date: 2026-10-14

CREATE TABLE IF NOT EXISTS agent_grant_profiles (
  agent_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  parent_agent_id TEXT,
  updated_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_tool_grants (
  agent_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  scopes TEXT,
  granted_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (agent_id, tool_name),
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE CASCADE
);

-- Agents that exist now keep their current (non-exec) tools.
INSERT OR IGNORE INTO agent_grant_profiles (agent_id, source)
  SELECT id, 'legacy-pending' FROM agents_config;
