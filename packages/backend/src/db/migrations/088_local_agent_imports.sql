-- Migration 088: conversations imported from other agents on this computer (MEM-IMPORT-01)
--
--   local_agent_imports   one row per imported session: which source, when, how many
--                         memories were proposed and the import batch they went to;
--                         the session itself is named by an opaque id (never its path)
-- Date: 2026-10-16

CREATE TABLE IF NOT EXISTS local_agent_imports (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  source TEXT NOT NULL,
  batch_id TEXT,
  proposed INTEGER NOT NULL DEFAULT 0,
  archive_name TEXT,
  imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, session_id)
);
