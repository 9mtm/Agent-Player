-- 🧹 REMOVE DUPLICATE CHAT TABLES

-- Drop unnecessary tables
DROP TABLE IF EXISTS chat_session_history;
DROP TABLE IF EXISTS chat_sessions;

-- Clean up sequence counters
DELETE FROM sqlite_sequence WHERE name IN ('chat_sessions', 'chat_session_history'); 