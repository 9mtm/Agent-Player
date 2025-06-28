# 🧹 SQLite Direct Cleanup - Fastest Method
# Usage: .\sql_cleanup.ps1

Write-Host "🧹 SQLite Direct Cleanup Starting..." -ForegroundColor Yellow

# Check if SQLite3 is available
$sqliteCmd = Get-Command sqlite3 -ErrorAction SilentlyContinue
if (-not $sqliteCmd) {
    Write-Host "❌ sqlite3 command not found!" -ForegroundColor Red
    Write-Host "   Please install SQLite3 or use the web interface." -ForegroundColor Yellow
    exit 1
}

# Check database file
$dbPath = "data/database.db"
if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Database file not found: $dbPath" -ForegroundColor Red
    exit 1
}

Write-Host "📂 Database: $dbPath" -ForegroundColor Cyan

try {
    # Show current counts
    Write-Host "`n📊 Before cleanup:" -ForegroundColor Cyan
    $conversationCount = sqlite3 $dbPath "SELECT COUNT(*) FROM conversations WHERE is_active = 1;"
    $messageCount = sqlite3 $dbPath "SELECT COUNT(*) FROM messages WHERE is_active = 1;"
    Write-Host "   Conversations: $conversationCount" -ForegroundColor Blue
    Write-Host "   Messages: $messageCount" -ForegroundColor Blue
    
    # Execute cleanup
    Write-Host "`n🧹 Executing SQL cleanup..." -ForegroundColor Red
    sqlite3 $dbPath @"
BEGIN TRANSACTION;
UPDATE messages SET is_active = 0, updated_at = datetime('now') WHERE is_active = 1;
UPDATE conversations SET is_active = 0, updated_at = datetime('now') WHERE is_active = 1;
COMMIT;
"@
    
    # Show results
    Write-Host "`n✅ CLEANUP COMPLETED!" -ForegroundColor Green
    Write-Host "📊 After cleanup:" -ForegroundColor Cyan
    $activeConversations = sqlite3 $dbPath "SELECT COUNT(*) FROM conversations WHERE is_active = 1;"
    $activeMessages = sqlite3 $dbPath "SELECT COUNT(*) FROM messages WHERE is_active = 1;"
    Write-Host "   Active Conversations: $activeConversations" -ForegroundColor Blue
    Write-Host "   Active Messages: $activeMessages" -ForegroundColor Blue
    
    $totalDeleted = [int]$conversationCount + [int]$messageCount
    Write-Host "`n🎉 Total items cleaned: $totalDeleted" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
} 