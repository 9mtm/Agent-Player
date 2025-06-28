# 🧹 Quick Chat Cleanup - No Confirmation Required
# Usage: .\quick_cleanup.ps1

Write-Host "🧹 Quick Cleanup Starting..." -ForegroundColor Yellow

try {
    # Login
    Write-Host "🔐 Logging in..." -ForegroundColor Cyan
    $loginHeaders = @{"Content-Type"="application/json"}
    $loginBody = '{"email":"me@alarade.at","password":"admin123456"}'
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method Post -Headers $loginHeaders -Body $loginBody
    
    if (-not $loginResponse.access_token) {
        Write-Host "❌ No access token received" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Login successful" -ForegroundColor Green
    
    # Cleanup
    Write-Host "🧹 Executing cleanup..." -ForegroundColor Red
    $authHeaders = @{"Authorization" = "Bearer $($loginResponse.access_token)"}
    $result = Invoke-RestMethod -Uri "http://localhost:8000/chat/cleanup-all" -Method Post -Headers $authHeaders
    
    # Results
    if ($result.success) {
        Write-Host "✅ CLEANUP COMPLETED!" -ForegroundColor Green
        Write-Host "📊 Results:" -ForegroundColor White
        Write-Host "   🗂️  Conversations: $($result.data.conversations_deleted)" -ForegroundColor Yellow
        Write-Host "   💬 Messages: $($result.data.messages_deleted)" -ForegroundColor Yellow
        Write-Host "   📝 Total: $($result.data.total_deleted)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Cleanup failed: $($result.message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        try {
            $errorDetail = $_.ErrorDetails.Message | ConvertFrom-Json
            if ($errorDetail.detail) {
                Write-Host "   Details: $($errorDetail.detail)" -ForegroundColor Red
            }
        } catch {
            Write-Host "   Raw error: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "🧹 Cleaning duplicate chat tables..." -ForegroundColor Yellow

# SQL commands to clean duplicate tables
$cleanupSQL = @"
DROP TABLE IF EXISTS chat_session_history;
DROP TABLE IF EXISTS chat_sessions;
DELETE FROM sqlite_sequence WHERE name IN ('chat_sessions', 'chat_session_history');
SELECT 'Cleanup completed!' as result;
"@

Write-Host $cleanupSQL -ForegroundColor Cyan
Write-Host "`n📋 Copy the SQL above into your SQLite browser and run it" -ForegroundColor Green
Write-Host "Then run: python test_complete_chat.py" -ForegroundColor Green 