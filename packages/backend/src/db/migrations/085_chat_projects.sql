-- Migration 085: chat projects (CHAT-PRO-02 A)
--
--   chat_projects            a project of one user: name, slug (memory drawer key),
--                            folder on this computer the agent may read, optional git repo URL
--   chat_sessions.project_id the project a conversation belongs to (NULL = none)
-- Date: 2026-10-15

CREATE TABLE IF NOT EXISTS chat_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  folder TEXT,
  repo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, slug)
);

ALTER TABLE chat_sessions ADD COLUMN project_id TEXT;
CREATE INDEX IF NOT EXISTS idx_chat_sessions_project ON chat_sessions(project_id);
