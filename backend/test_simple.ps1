# Simple Chat API Test - No Emojis
Write-Host "Testing Chat API..." -ForegroundColor Green

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
$createBody = '{"title":"PowerShell Test","agent_id":1}'

$newConv = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method POST -Headers $headers -ContentType "application/json" -Body $createBody
$convId = $newConv.data.id
Write-Host "Created conversation ID: $convId" -ForegroundColor Green

# Step 4: Send Message
Write-Host "Step 4: Send Message" -ForegroundColor Cyan
$msgBody = '{"content":"Hello from PowerShell test","sender_type":"user"}'

$msgResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations/$convId/messages" -Method POST -Headers $headers -ContentType "application/json" -Body $msgBody
Write-Host "Message sent successfully!" -ForegroundColor Green

# Step 5: Get Messages
Write-Host "Step 5: Get Messages" -ForegroundColor Cyan

$messages = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations/$convId/messages" -Method GET -Headers $headers
$msgCount = $messages.data.messages.Count
Write-Host "Found $msgCount messages" -ForegroundColor Green

Write-Host "Test Complete!" -ForegroundColor Yellow 