-- Migration 078: fix the voice_messages foreign key (B2.2d-14)
-- Purpose: 003 declared `session_id REFERENCES sessions(id)`, but there is no
-- `sessions` table (chat sessions live in chat_sessions). With foreign keys ON
-- every INSERT into voice_messages failed with "no such table: main.sessions",
-- so no TTS voice message was ever recorded.
-- The table is rebuilt without that reference (session_id stays a plain
-- column, as in the PostgreSQL schema). Existing rows (none could have been
-- written) are kept.
-- Date: 2026-10-15

CREATE TABLE voice_messages_new (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    audio_url TEXT,  -- Path to stored audio file
    language TEXT,  -- Detected language
    transcript TEXT,  -- Transcribed text
    duration_seconds REAL,  -- Audio duration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO voice_messages_new (id, session_id, message_id, audio_url, language, transcript, duration_seconds, created_at)
SELECT id, session_id, message_id, audio_url, language, transcript, duration_seconds, created_at
FROM voice_messages;

DROP TABLE voice_messages;
ALTER TABLE voice_messages_new RENAME TO voice_messages;

CREATE INDEX IF NOT EXISTS idx_voice_messages_session ON voice_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_created ON voice_messages(created_at);
