-- Migration 080: per-agent memory scope and permission modes (CORE-PERMS-01, D-AGENT-PERMS)
--
-- One row per agent, set by the owner on the hire page or the agent card.
--   memory_read    JSON list of drawer kinds the agent may read
--                  (owner | project | experience | task | people)
--   memory_write   JSON list of drawer kinds it may write (a subset of memory_read)
--   shared_memory  1 = may see memories other agents shared with the team
--   modes          JSON object category -> 'off' | 'ask' | 'allow' for
--                  browser, network, message, delete, install, money, settings
--   version        optimistic-concurrency token (PUT with expectedVersion / If-Match)
-- No row = the behaviour before this migration (every drawer, browser and
-- network allowed, the risky categories ask). New agents get a row with
-- every category on 'ask'.
-- Date: 2026-10-15

CREATE TABLE IF NOT EXISTS agent_permissions (
  agent_id TEXT PRIMARY KEY REFERENCES agents_config(id) ON DELETE CASCADE,
  memory_read TEXT NOT NULL,
  memory_write TEXT NOT NULL,
  shared_memory INTEGER NOT NULL DEFAULT 0 CHECK (shared_memory IN (0, 1)),
  modes TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
