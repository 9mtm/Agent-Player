-- Migration 083: richer board cards (BOARD-03 step B)
--
--   board_cards.card_type   task | idea | bug | milestone | request
--   board_cards.start_date  YYYY-MM-DD or NULL (never after due_date)
--   board_cards.cover       a board colour id or NULL
--   board_labels            coloured labels of a board (name + colour)
--   board_card_labels       labels on a card
--   board_card_checklist    checklist items of a card (text, done, order)
-- Date: 2026-10-15

ALTER TABLE board_cards ADD COLUMN card_type TEXT NOT NULL DEFAULT 'task' CHECK (card_type IN ('task', 'idea', 'bug', 'milestone', 'request'));
ALTER TABLE board_cards ADD COLUMN start_date TEXT;
ALTER TABLE board_cards ADD COLUMN cover TEXT;

CREATE TABLE IF NOT EXISTS board_labels (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS board_card_labels (
  card_id TEXT NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES board_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

CREATE TABLE IF NOT EXISTS board_card_checklist (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  position INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_board_labels_board ON board_labels (board_id, position);
CREATE INDEX IF NOT EXISTS idx_board_card_checklist_card ON board_card_checklist (card_id, position);
