-- Migration 070: bind MCP tool grants to one server instance + tool version (M1 follow-up)
-- mcp_server_tools.fingerprint: hash of (server id, server generation, tool
-- name, input schema, annotations). mcp_servers.generation is a random id
-- created on add and renewed whenever the launch spec / URL changes.
-- mcp_grant_bindings: the fingerprint a grant was given for. A grant of an
-- MCP tool only counts while its binding matches the tool's current
-- fingerprint, so a re-created server with the same name, a changed launch
-- or URL, or a changed tool schema needs a fresh grant from the owner.
-- Date: 2026-10-14

ALTER TABLE mcp_servers ADD COLUMN generation TEXT;
ALTER TABLE mcp_server_tools ADD COLUMN fingerprint TEXT;

CREATE TABLE IF NOT EXISTS mcp_grant_bindings (
  agent_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  server_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  granted_by TEXT,
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (agent_id, tool_name)
);
CREATE INDEX IF NOT EXISTS idx_mcp_grant_bindings_tool ON mcp_grant_bindings(tool_name);
