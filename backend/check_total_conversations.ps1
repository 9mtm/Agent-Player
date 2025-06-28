# Check Total Conversations in Database
Write-Host "=== CHECKING TOTAL CONVERSATIONS ===" -ForegroundColor Green

# Login
$loginBody = '{"email":"me@alarade.at","password":"admin123456"}'
$response = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $response.data.access_token
$userId = $response.data.user.id
$headers = @{"Authorization" = "Bearer $token"}

Write-Host "Logged in user ID: $userId" -ForegroundColor Yellow

# Get conversations with different limits to see the real count
Write-Host "`n1. Default limit (20):" -ForegroundColor Cyan
$conv20 = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method GET -Headers $headers
Write-Host "  Count: $($conv20.data.conversations.Count)" -ForegroundColor Gray
Write-Host "  Total: $($conv20.data.total)" -ForegroundColor Gray
Write-Host "  Pages: $($conv20.data.pages)" -ForegroundColor Gray
Write-Host "  Has Next: $($conv20.data.has_next)" -ForegroundColor Gray

Write-Host "`n2. Limit 50:" -ForegroundColor Cyan
$conv50 = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations?limit=50" -Method GET -Headers $headers
Write-Host "  Count: $($conv50.data.conversations.Count)" -ForegroundColor Gray
Write-Host "  Total: $($conv50.data.total)" -ForegroundColor Gray
Write-Host "  Pages: $($conv50.data.pages)" -ForegroundColor Gray
Write-Host "  Has Next: $($conv50.data.has_next)" -ForegroundColor Gray

Write-Host "`n3. Limit 100:" -ForegroundColor Cyan
$conv100 = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations?limit=100" -Method GET -Headers $headers
Write-Host "  Count: $($conv100.data.conversations.Count)" -ForegroundColor Gray
Write-Host "  Total: $($conv100.data.total)" -ForegroundColor Gray
Write-Host "  Pages: $($conv100.data.pages)" -ForegroundColor Gray
Write-Host "  Has Next: $($conv100.data.has_next)" -ForegroundColor Gray

# Create a new conversation and check again
Write-Host "`n4. Creating new conversation..." -ForegroundColor Cyan
$createBody = '{"title":"TOTAL COUNT TEST","agent_id":1}'
$createResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method POST -Headers $headers -ContentType "application/json" -Body $createBody
$newConvId = $createResponse.data.id
Write-Host "  Created: $newConvId" -ForegroundColor Yellow

Write-Host "`n5. After creation - Limit 100:" -ForegroundColor Cyan
$convAfter = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations?limit=100" -Method GET -Headers $headers
Write-Host "  Count: $($convAfter.data.conversations.Count)" -ForegroundColor Gray
Write-Host "  Total: $($convAfter.data.total)" -ForegroundColor Gray
Write-Host "  Pages: $($convAfter.data.pages)" -ForegroundColor Gray

# Check if the total count increased
if ($convAfter.data.total -gt $conv100.data.total) {
    Write-Host "✅ Total count increased correctly!" -ForegroundColor Green
    Write-Host "  Before: $($conv100.data.total), After: $($convAfter.data.total)" -ForegroundColor Green
} else {
    Write-Host "❌ Total count did not increase!" -ForegroundColor Red
    Write-Host "  Before: $($conv100.data.total), After: $($convAfter.data.total)" -ForegroundColor Red
}

Write-Host "`nTest Complete!" -ForegroundColor Yellow 