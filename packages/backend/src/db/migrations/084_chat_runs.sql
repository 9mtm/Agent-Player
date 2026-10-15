-- Migration 084: saved chat conversations with their work (CHAT-REBUILD-01)
--
--   chat_sessions.agent_id      agent the conversation talks to (NULL = primary agent)
--   chat_sessions.pinned        1 = shown first in the conversation list
--   chat_messages.parts         assistant turn as JSON: reasoning, tool calls and text in order
--   chat_messages.status        complete | stopped | error
--   chat_messages.run_id        the run that produced the message (dedupe of a retried send)
--   chat_messages.duration_ms   how long the assistant turn took
-- Date: 2026-10-15

ALTER TABLE chat_sessions ADD COLUMN agent_id TEXT;
ALTER TABLE chat_sessions ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE chat_messages ADD COLUMN parts TEXT;
ALTER TABLE chat_messages ADD COLUMN status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('complete', 'stopped', 'error'));
ALTER TABLE chat_messages ADD COLUMN run_id TEXT;
ALTER TABLE chat_messages ADD COLUMN duration_ms INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_run_role ON chat_messages(run_id, role) WHERE run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated ON chat_sessions(user_id, updated_at);
