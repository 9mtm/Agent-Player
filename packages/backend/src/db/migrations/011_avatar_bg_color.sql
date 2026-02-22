-- Add background color preference to avatar settings
ALTER TABLE avatar_settings ADD COLUMN bg_color TEXT DEFAULT '#09090b';
