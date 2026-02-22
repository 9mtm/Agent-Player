-- Fix avatar_settings user_id type mismatch
-- Migration: 004_fix_avatar_user_id.sql

-- Drop the existing avatar_settings table
DROP TABLE IF EXISTS avatar_settings;

-- Recreate with correct TEXT user_id type
CREATE TABLE IF NOT EXISTS avatar_settings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL UNIQUE,  -- Changed from INTEGER to TEXT
    rpm_avatar_url TEXT,  -- Ready Player Me avatar URL
    voice_provider TEXT DEFAULT 'openai',  -- 'openai' or 'local'
    voice_id TEXT DEFAULT 'alloy',  -- Voice ID (alloy, echo, fable, onyx, nova, shimmer)
    language_preference TEXT DEFAULT 'auto',  -- 'auto', 'ar', 'en'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_avatar_settings_user ON avatar_settings(user_id);
