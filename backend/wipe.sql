-- 🔥 COMPLETE WIPE - Deletes EVERYTHING permanently
DELETE FROM messages;
DELETE FROM conversations;
DELETE FROM sqlite_sequence WHERE name IN ('messages', 'conversations');
VACUUM; 