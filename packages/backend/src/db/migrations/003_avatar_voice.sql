-- Avatar & Voice System Tables
-- Migration: 003_avatar_voice.sql

-- Avatar Settings per user
CREATE TABLE IF NOT EXISTS avatar_settings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id INTEGER NOT NULL UNIQUE,
    rpm_avatar_url TEXT,  -- Ready Player Me avatar URL
    voice_provider TEXT DEFAULT 'openai',  -- 'openai' or 'local'
    voice_id TEXT DEFAULT 'alloy',  -- Voice ID (alloy, echo, fable, onyx, nova, shimmer)
    language_preference TEXT DEFAULT 'auto',  -- 'auto', 'ar', 'en'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Voice Messages storage
CREATE TABLE IF NOT EXISTS voice_messages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    audio_url TEXT,  -- Path to stored audio file
    language TEXT,  -- Detected language
    transcript TEXT,  -- Transcribed text
    duration_seconds REAL,  -- Audio duration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_avatar_settings_user ON avatar_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_session ON voice_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_created ON voice_messages(created_at);
