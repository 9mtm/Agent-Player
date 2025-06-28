-- Check cleanup results
SELECT 'Active Conversations: ' || COUNT(*) as active_conversations FROM conversations WHERE is_active = 1;
SELECT 'Active Messages: ' || COUNT(*) as active_messages FROM messages WHERE is_active = 1;
SELECT 'Deleted Conversations: ' || COUNT(*) as deleted_conversations FROM conversations WHERE is_active = 0;
SELECT 'Deleted Messages: ' || COUNT(*) as deleted_messages FROM messages WHERE is_active = 0; 