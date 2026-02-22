-- Migration 016: Spotify embed URL for avatar wall panel
ALTER TABLE avatar_settings ADD COLUMN wall_spotify_url TEXT DEFAULT '';
