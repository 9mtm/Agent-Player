-- 🧹 Remove duplicate and unnecessary chat tables
-- Keep only: conversations, messages, sessions (for auth)

-- Drop ChatSessionHistory first (has foreign key to ChatSession)
DROP TABLE IF EXISTS chat_session_history;

-- Drop ChatSession table  
DROP TABLE IF EXISTS chat_sessions;

-- Clean up sqlite_sequence for removed tables
DELETE FROM sqlite_sequence WHERE name IN ('chat_sessions', 'chat_session_history');

-- Verify remaining tables
SELECT 'Remaining chat tables:' as info;
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%chat%' OR name IN ('conversations', 'messages', 'sessions');

VACUUM; 