-- Migration 087: which agent wrote a chat reply (CHAT-PRO-02 I)
--
--   chat_messages.agent_id   the agent that wrote an assistant reply (NULL = the
--                            conversation's agent, as before); several agents can
--                            answer in one conversation
-- Date: 2026-10-16

ALTER TABLE chat_messages ADD COLUMN agent_id TEXT;
