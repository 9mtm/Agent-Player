-- Migration 082: many boards per company (BOARD-03 step A)
--
-- A board now belongs to the whole company, to one department, or is shared
-- by several departments (board_departments; no rows = company board). It
-- keeps the template it was made from, a colour, a short description and
-- can be archived (never deleted).
--   template  id of the board template (company-plan style catalogue in
--             services/board-templates.ts), or 'custom'
--   color     one of the palette ids in services/board-templates.ts
-- Date: 2026-10-15

ALTER TABLE boards ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE boards ADD COLUMN template TEXT NOT NULL DEFAULT 'custom';
ALTER TABLE boards ADD COLUMN color TEXT NOT NULL DEFAULT 'blue';
ALTER TABLE boards ADD COLUMN archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1));
ALTER TABLE boards ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1);

CREATE TABLE IF NOT EXISTS board_departments (
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  PRIMARY KEY (board_id, department)
);

CREATE INDEX IF NOT EXISTS idx_board_departments_department ON board_departments (department);
