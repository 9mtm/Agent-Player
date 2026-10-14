-- Migration 066: small-agent read root (MCP-01b)
-- The owner-chosen directory a small-agent run may read with `read`
-- (validated at spawn and again on every attempt). NULL -> the small agent's
-- own workspace .data/workspaces/small-local-agent/ only. Never the backend
-- tree or the data directory.
-- Date: 2026-10-14

ALTER TABLE small_agent_runs ADD COLUMN read_root TEXT;
