-- Migration 015: Per-panel position/size/sound layout config for wall panels
ALTER TABLE avatar_settings ADD COLUMN wall_layout TEXT DEFAULT '{}';
