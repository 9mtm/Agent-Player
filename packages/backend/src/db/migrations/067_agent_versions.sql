-- Migration 067: optimistic concurrency for agents and their tool grants (BE-UI-01)
-- agents_config.version goes up by one on every change of a user-visible
-- field (any writer, via trigger; heartbeat/key-reference updates do not
-- count). PUT /api/agents/:id compares it with `expectedVersion` / If-Match
-- and answers 409 on a mismatch.
-- agent_grant_profiles.version goes up on every grants replacement
-- (setAgentGrants); PUT /api/agents/:id/tool-grants compares it the same way.
-- Date: 2026-10-14

ALTER TABLE agents_config ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE TRIGGER IF NOT EXISTS trg_agents_config_version
AFTER UPDATE OF name, description, emoji, system_prompt, model, provider, temperature, max_tokens, capabilities, is_primary
ON agents_config
WHEN NEW.version = OLD.version
BEGIN
  UPDATE agents_config SET version = OLD.version + 1 WHERE id = NEW.id;
END;

ALTER TABLE agent_grant_profiles ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
