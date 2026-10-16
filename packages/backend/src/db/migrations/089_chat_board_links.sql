-- Migration 089: chat tasks on the board (CHAT-PRO-02 I step 2)
--
--   board_cards.conversation_id   the chat conversation a card was made from (NULL = made
--                                 on the board); the chat shows the card and its updates
--   board_card_activity           what happened to a card, in order: created, moved, done,
--                                 commented, archived; who did it (owner or agent) and a
--                                 short detail (column name or the start of a comment)
-- Date: 2026-10-16

ALTER TABLE board_cards ADD COLUMN conversation_id TEXT;
CREATE INDEX IF NOT EXISTS idx_board_cards_conversation ON board_cards (conversation_id);

CREATE TABLE IF NOT EXISTS board_card_activity (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('created', 'moved', 'done', 'comment', 'archived', 'restored')),
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('user', 'agent')),
  actor_id TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_board_card_activity_card ON board_card_activity (card_id, created_at);
