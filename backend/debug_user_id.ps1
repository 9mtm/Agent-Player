# Debug User ID Issue
Write-Host "=== DEBUGGING USER ID ISSUE ===" -ForegroundColor Green

# Login
$loginBody = '{"email":"me@alarade.at","password":"admin123456"}'
$response = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $response.data.access_token
$userId = $response.data.user.id
$headers = @{"Authorization" = "Bearer $token"}

Write-Host "Logged in user ID: $userId" -ForegroundColor Yellow

# Get conversations and see what user_id they have
Write-Host "`n1. Get conversations..." -ForegroundColor Cyan
$convResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method GET -Headers $headers
$conversations = $convResponse.data.conversations

Write-Host "Found $($conversations.Count) conversations" -ForegroundColor Yellow
Write-Host "First few conversations user_ids:" -ForegroundColor Gray
for ($i = 0; $i -lt [Math]::Min(5, $conversations.Count); $i++) {
    $conv = $conversations[$i]
    Write-Host "  Conversation $($i+1): ID=$($conv.id), Title='$($conv.title)', user_id=$($conv.user_id)" -ForegroundColor Gray
}

# Create new conversation and check its user_id
Write-Host "`n2. Create new conversation..." -ForegroundColor Cyan
$createBody = '{"title":"USER ID DEBUG TEST","agent_id":1}'
$createResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method POST -Headers $headers -ContentType "application/json" -Body $createBody
$newConv = $createResponse.data

Write-Host "New conversation created:" -ForegroundColor Green
Write-Host "  ID: $($newConv.id)" -ForegroundColor Gray
Write-Host "  Title: '$($newConv.title)'" -ForegroundColor Gray
Write-Host "  user_id: $($newConv.user_id)" -ForegroundColor Gray

# Check if user_id matches
if ($newConv.user_id -eq $userId) {
    Write-Host "✅ User IDs match! ($userId)" -ForegroundColor Green
} else {
    Write-Host "❌ User ID mismatch! Login: $userId, Created: $($newConv.user_id)" -ForegroundColor Red
}

# Get conversations again to see if new one appears
Write-Host "`n3. Get conversations again after create..." -ForegroundColor Cyan
$convResponse2 = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method GET -Headers $headers
$conversations2 = $convResponse2.data.conversations

Write-Host "Now found $($conversations2.Count) conversations" -ForegroundColor Yellow

# Check if our new conversation is in the list
$foundNew = $false
foreach ($conv in $conversations2) {
    if ($conv.id -eq $newConv.id) {
        $foundNew = $true
        Write-Host "✅ New conversation found in list!" -ForegroundColor Green
        break
    }
}

if (-not $foundNew) {
    Write-Host "❌ New conversation NOT found in list!" -ForegroundColor Red
    Write-Host "This confirms the pagination/ordering issue" -ForegroundColor Red
}

Write-Host "`nTest Complete!" -ForegroundColor Yellow 