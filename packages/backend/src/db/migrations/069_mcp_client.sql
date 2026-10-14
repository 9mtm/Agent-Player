-- Migration 069: MCP client (M1)
-- mcp_servers: MCP servers the owner added. stdio servers (command + args,
-- run in a dedicated folder with a minimal environment) or http/sse servers
-- (URL; loopback only unless allow_remote). Secret env/header values live in
-- the credential manager (secret_credential_id); only their names are here.
-- A stdio server only starts when the server env enables exec tools AND
-- approved_launch_hash equals launch_hash (owner approval of exactly this
-- command/args/env names).
-- mcp_server_tools: tools discovered with tools/list (validated, size
-- limited). requires_approval: owner override (NULL = derived from the
-- server's annotations: read-only tools run without approval, all others
-- need the S1.3 approval).
-- Date: 2026-10-14

CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  transport TEXT NOT NULL CHECK (transport IN ('stdio', 'http', 'sse')),
  command TEXT,
  args TEXT,
  url TEXT,
  allow_remote INTEGER NOT NULL DEFAULT 0,
  env_names TEXT,
  header_names TEXT,
  secret_credential_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 0,
  launch_hash TEXT,
  approved_launch_hash TEXT,
  approved_by TEXT,
  approved_at TEXT,
  timeout_ms INTEGER NOT NULL DEFAULT 30000,
  max_result_bytes INTEGER NOT NULL DEFAULT 65536,
  status TEXT NOT NULL DEFAULT 'new',
  last_error TEXT,
  last_discovered_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mcp_server_tools (
  server_id TEXT NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  registry_name TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  input_schema TEXT NOT NULL,
  annotations TEXT,
  requires_approval INTEGER,
  discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (server_id, tool_name)
);
