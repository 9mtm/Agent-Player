-- Chat Cleanup SQL Script for SQLite
-- Usage: sqlite3 data/database.db < cleanup_simple.sql
-- Fixed: No explicit transaction to avoid conflicts

-- Soft delete all messages first (foreign key constraint)
UPDATE messages 
SET is_active = 0, updated_at = datetime('now') 
WHERE is_active = 1;

-- Soft delete all conversations  
UPDATE conversations 
SET is_active = 0, updated_at = datetime('now') 
WHERE is_active = 1;

-- Show results
SELECT 'Messages updated: ' || changes() as result; 