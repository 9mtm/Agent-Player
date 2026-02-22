-- Add background scene preference to avatar settings
ALTER TABLE avatar_settings ADD COLUMN bg_scene TEXT DEFAULT 'none';
