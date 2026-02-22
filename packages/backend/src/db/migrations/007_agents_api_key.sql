-- Migration 007: Add api_key column to agents_config
-- Each agent can optionally store its own API key (overrides the global key)

ALTER TABLE agents_config ADD COLUMN api_key TEXT DEFAULT '';
