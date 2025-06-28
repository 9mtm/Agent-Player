-- 🧹 Clean up duplicate/unused chat tables
-- Run this in SQLite Browser

-- Remove unused chat tables
DROP TABLE IF EXISTS chat_session_history;
DROP TABLE IF EXISTS chat_sessions;

-- Clean sequence counters
DELETE FROM sqlite_sequence WHERE name IN ('chat_sessions', 'chat_session_history');

-- Verify tables
SELECT 'Remaining tables:' as info;
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name; 