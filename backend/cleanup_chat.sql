-- 🧹 Chat Cleanup SQL Script
-- Direct SQLite cleanup for development

-- Start transaction
BEGIN TRANSACTION;

-- Show current counts before cleanup
.print "📊 Before cleanup:"
SELECT 
    'Conversations: ' || COUNT(*) as count 
FROM conversations 
WHERE is_active = 1;

SELECT 
    'Messages: ' || COUNT(*) as count 
FROM messages 
WHERE is_active = 1;

-- Delete all messages first (foreign key constraint)
UPDATE messages 
SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
WHERE is_active = 1;

-- Delete all conversations
UPDATE conversations 
SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
WHERE is_active = 1;

-- Show results
.print ""
.print "✅ Cleanup completed!"
.print "📊 After cleanup:"
SELECT 
    'Active Conversations: ' || COUNT(*) as result 
FROM conversations 
WHERE is_active = 1;

SELECT 
    'Active Messages: ' || COUNT(*) as result 
FROM messages 
WHERE is_active = 1;

-- Show total deleted items
SELECT 
    'Total Conversations Deleted: ' || COUNT(*) as deleted 
FROM conversations 
WHERE is_active = 0;

SELECT 
    'Total Messages Deleted: ' || COUNT(*) as deleted 
FROM messages 
WHERE is_active = 0;

-- Commit the transaction
COMMIT;

.print ""
.print "🎉 Database cleanup completed successfully!" 