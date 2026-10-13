-- Migration 058: memory drawers (CORE-03)
-- Every memory belongs to exactly one drawer of its user:
--   drawer_kind  'owner' | 'project' | 'experience' | 'task' | 'people'
--   drawer_key   project slug / task (run) id / person id; '' for owner and experience
-- Existing rows keep NULL here; the server fills them in on start-up with the
-- default for their type (src/memory/drawers.ts backfillMemoryDrawers, counts
-- logged only). Until then queries derive the same default, so nothing is lost.
-- Date: 2026-10-14

ALTER TABLE memories ADD COLUMN drawer_kind TEXT;
ALTER TABLE memories ADD COLUMN drawer_key TEXT;

CREATE INDEX IF NOT EXISTS idx_memories_drawer ON memories(user_id, drawer_kind, drawer_key);
