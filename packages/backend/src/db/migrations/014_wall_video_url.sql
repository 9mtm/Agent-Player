-- Migration 014: YouTube video URL for avatar wall panel
ALTER TABLE avatar_settings ADD COLUMN wall_video_url TEXT DEFAULT '';
