Write-Host "🧹 CHAT SYSTEM DIAGNOSIS AND FIX" -ForegroundColor Red
Write-Host "=================================" -ForegroundColor Red

Write-Host "`n📋 STEP 1: Clean duplicate tables in SQLite Browser" -ForegroundColor Yellow
Write-Host "Copy this SQL:" -ForegroundColor Cyan

$cleanupSQL = @"
DROP TABLE IF EXISTS chat_session_history;
DROP TABLE IF EXISTS chat_sessions;
DELETE FROM sqlite_sequence WHERE name IN ('chat_sessions', 'chat_session_history');
SELECT 'Cleanup completed!' as result;
"@

Write-Host $cleanupSQL -ForegroundColor Green

Write-Host "`n📋 STEP 2: Run comprehensive test" -ForegroundColor Yellow
Write-Host "After running the SQL above, press any key to continue..." -ForegroundColor Cyan
Read-Host

Write-Host "`nRunning Python test..." -ForegroundColor Yellow

try {
    python test_complete_chat.py
    Write-Host "`n✅ Test completed! Check results above." -ForegroundColor Green
} catch {
    Write-Host "`n❌ Python test failed. Make sure Python is available." -ForegroundColor Red
    Write-Host "You can run manually: python test_complete_chat.py" -ForegroundColor Yellow
} 