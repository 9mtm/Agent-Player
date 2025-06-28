# Fixed Chat API Test
Write-Host "Testing Chat API (Fixed)..." -ForegroundColor Green

# Step 1: Login
Write-Host "Step 1: Login" -ForegroundColor Cyan
$loginBody = '{"email":"me@alarade.at","password":"admin123456"}'

$response = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $response.data.access_token
Write-Host "Login successful!" -ForegroundColor Green

# Step 2: Get Conversations
Write-Host "Step 2: Get Conversations" -ForegroundColor Cyan
$headers = @{"Authorization" = "Bearer $token"}

$convResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method GET -Headers $headers
$count = $convResponse.data.conversations.Count
Write-Host "Found $count conversations" -ForegroundColor Green

# Step 3: Create Conversation
Write-Host "Step 3: Create Conversation" -ForegroundColor Cyan
$createBody = '{"title":"PowerShell Test Fixed","agent_id":1}'

$newConv = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method POST -Headers $headers -ContentType "application/json" -Body $createBody
$convId = $newConv.data.id
Write-Host "Created conversation ID: $convId" -ForegroundColor Green

# Step 4: Send Message (Fixed with conversation_id)
Write-Host "Step 4: Send Message (Fixed)" -ForegroundColor Cyan
$msgBody = "{`"content`":`"Hello from PowerShell test (fixed)`",`"sender_type`":`"user`",`"conversation_id`":`"$convId`"}"

try {
    $msgResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations/$convId/messages" -Method POST -Headers $headers -ContentType "application/json" -Body $msgBody
    Write-Host "Message sent successfully! (Fixed)" -ForegroundColor Green
} catch {
    Write-Host "Message failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}

# Step 5: Get Messages
Write-Host "Step 5: Get Messages" -ForegroundColor Cyan

$messages = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations/$convId/messages" -Method GET -Headers $headers
$msgCount = $messages.data.messages.Count
Write-Host "Found $msgCount messages" -ForegroundColor Green

# Step 6: Test Conversation Update
Write-Host "Step 6: Update Conversation" -ForegroundColor Cyan
$updateBody = '{"title":"Updated PowerShell Test","is_pinned":true}'

try {
    $updateResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations/$convId" -Method PUT -Headers $headers -ContentType "application/json" -Body $updateBody
    Write-Host "Conversation updated successfully!" -ForegroundColor Green
} catch {
    Write-Host "Update failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 7: Test Soft Delete
Write-Host "Step 7: Test Delete (Soft Delete)" -ForegroundColor Cyan

try {
    $deleteResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations/$convId" -Method DELETE -Headers $headers
    Write-Host "Conversation deleted successfully!" -ForegroundColor Green
} catch {
    Write-Host "Delete failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Final Check
Write-Host "Final Check: Get Conversations Again" -ForegroundColor Cyan
$finalResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method GET -Headers $headers
$finalCount = $finalResponse.data.conversations.Count
Write-Host "Final conversations count: $finalCount" -ForegroundColor Green

Write-Host "Complete Test Finished!" -ForegroundColor Yellow 