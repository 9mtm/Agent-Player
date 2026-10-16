-- Migration 090: chat memory (CHAT-PRO-02 E)
--
--   chat_memory_links   memories that came from a conversation:
--     kind 'remembered'   the owner chose "Remember this" on a message (memory_id set)
--     kind 'proposed'     an agent proposed a memory during the chat (proposal_id set);
--                         the owner accepts or rejects it in the chat (review hash)
--   message_id          the message it came from (a user message or an agent reply)
--   preview             the start of the saved text (secrets already removed)
-- Date: 2026-10-16

CREATE TABLE IF NOT EXISTS chat_memory_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  message_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('remembered', 'proposed')),
  memory_id TEXT,
  proposal_id TEXT,
  drawer_kind TEXT NOT NULL,
  drawer_key TEXT NOT NULL DEFAULT '',
  preview TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_memory_links_conversation ON chat_memory_links (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_memory_links_proposal ON chat_memory_links (proposal_id);
