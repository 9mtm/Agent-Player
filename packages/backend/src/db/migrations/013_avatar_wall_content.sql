-- Migration 013: Wall content (text + logo) for avatar background scenes
ALTER TABLE avatar_settings ADD COLUMN wall_text TEXT DEFAULT '';
ALTER TABLE avatar_settings ADD COLUMN wall_logo_url TEXT DEFAULT '';
