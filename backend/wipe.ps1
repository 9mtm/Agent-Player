Write-Host "🔥 WIPING..." -ForegroundColor Red
$sql = @"
DELETE FROM messages;
DELETE FROM conversations;
DELETE FROM sqlite_sequence WHERE name IN ('messages', 'conversations');
VACUUM;
"@
Write-Host $sql -ForegroundColor Yellow
Write-Host "Copy/paste this SQL into your SQLite browser!" -ForegroundColor Cyan 