# Final Comprehensive Chat API Test
Write-Host "=== FINAL COMPREHENSIVE CHAT TEST ===" -ForegroundColor Green

# Login
Write-Host "`n1. Login" -ForegroundColor Cyan
$loginBody = '{"email":"me@alarade.at","password":"admin123456"}'
$response = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $response.data.access_token
Write-Host "✅ Login successful!" -ForegroundColor Green
$headers = @{"Authorization" = "Bearer $token"}

# Get initial count
Write-Host "`n2. Get Initial Conversations Count" -ForegroundColor Cyan
$convResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method GET -Headers $headers
$initialCount = $convResponse.data.conversations.Count
Write-Host "Initial conversations count: $initialCount" -ForegroundColor Yellow

# Create a new conversation for testing
Write-Host "`n3. Create New Test Conversation" -ForegroundColor Cyan
$createBody = '{"title":"DELETE TEST CONVERSATION","agent_id":1}'
$newConv = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method POST -Headers $headers -ContentType "application/json" -Body $createBody
$testConvId = $newConv.data.id
Write-Host "✅ Created test conversation: $testConvId" -ForegroundColor Green

# Get count after creation
Write-Host "`n4. Get Count After Creation" -ForegroundColor Cyan
$convResponse2 = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method GET -Headers $headers
$afterCreateCount = $convResponse2.data.conversations.Count
Write-Host "Count after creation: $afterCreateCount (should be $($initialCount + 1))" -ForegroundColor Yellow

# Delete the test conversation
Write-Host "`n5. Delete Test Conversation" -ForegroundColor Cyan
try {
    $deleteResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations/$testConvId" -Method DELETE -Headers $headers
    Write-Host "✅ DELETE API call successful!" -ForegroundColor Green
    Write-Host "Delete response: $($deleteResponse.message)" -ForegroundColor Gray
} catch {
    Write-Host "❌ DELETE failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Get count after deletion
Write-Host "`n6. Get Count After Deletion" -ForegroundColor Cyan
$convResponse3 = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method GET -Headers $headers
$afterDeleteCount = $convResponse3.data.conversations.Count
Write-Host "Count after deletion: $afterDeleteCount (should be $initialCount)" -ForegroundColor Yellow

# Try to access the deleted conversation
Write-Host "`n7. Try to Access Deleted Conversation" -ForegroundColor Cyan
try {
    $deletedConv = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations/$testConvId" -Method GET -Headers $headers
    Write-Host "❌ PROBLEM: Deleted conversation is still accessible!" -ForegroundColor Red
    Write-Host "Response: $($deletedConv | ConvertTo-Json)" -ForegroundColor Red
} catch {
    Write-Host "✅ GOOD: Deleted conversation is not accessible (404 error)" -ForegroundColor Green
}

# Summary
Write-Host "`n=== SUMMARY ===" -ForegroundColor Green
Write-Host "Initial count: $initialCount" -ForegroundColor White
Write-Host "After create: $afterCreateCount" -ForegroundColor White
Write-Host "After delete: $afterDeleteCount" -ForegroundColor White

if ($afterCreateCount -eq ($initialCount + 1)) {
    Write-Host "✅ CREATE worked correctly" -ForegroundColor Green
} else {
    Write-Host "❌ CREATE issue detected" -ForegroundColor Red
}

if ($afterDeleteCount -eq $initialCount) {
    Write-Host "✅ DELETE worked correctly - Soft delete is working!" -ForegroundColor Green
} else {
    Write-Host "❌ DELETE issue - Count should be $initialCount but is $afterDeleteCount" -ForegroundColor Red
}

Write-Host "`nTest Complete!" -ForegroundColor Yellow 