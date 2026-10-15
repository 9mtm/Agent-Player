-- Migration 081: task board (BOARD-01, D-COMPANY-OPS)
--
-- A kanban-style board for the company: columns (lists), cards with a
-- priority, the agents working on them, the departments taking part, and
-- comments. Cards are archived, never deleted. A card may later point to an
-- orchestrator task (task_id, a soft link: on SQLite the orchestrator lives
-- in its own database file).
--   position   ordering inside the board (columns) or the column (cards)
--   version    optimistic-concurrency token for card edits and moves
-- Date: 2026-10-15

CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS board_columns (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS board_cards (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  position INTEGER NOT NULL,
  due_date TEXT,
  task_id TEXT,
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  created_by TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS board_card_agents (
  card_id TEXT NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agents_config(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, agent_id)
);

CREATE TABLE IF NOT EXISTS board_card_departments (
  card_id TEXT NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  PRIMARY KEY (card_id, department)
);

CREATE TABLE IF NOT EXISTS board_card_comments (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  author_kind TEXT NOT NULL CHECK (author_kind IN ('user', 'agent')),
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_board_columns_board ON board_columns (board_id, position);
CREATE INDEX IF NOT EXISTS idx_board_cards_column ON board_cards (column_id, archived, position);
CREATE INDEX IF NOT EXISTS idx_board_cards_board ON board_cards (board_id, archived);
CREATE INDEX IF NOT EXISTS idx_board_card_comments_card ON board_card_comments (card_id, created_at);
CREATE INDEX IF NOT EXISTS idx_board_card_agents_agent ON board_card_agents (agent_id);
