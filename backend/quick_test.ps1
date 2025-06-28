# Simple Chat API Test
Write-Host "🚀 Testing Chat API..." -ForegroundColor Green

# Step 1: Login
Write-Host "🔐 Step 1: Login" -ForegroundColor Cyan
$loginBody = '{"email":"me@alarade.at","password":"admin123456"}'
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $response.data.access_token
    Write-Host "✅ Login successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Step 2: Get Conversations
Write-Host "`n📋 Step 2: Get Conversations" -ForegroundColor Cyan
$headers = @{"Authorization" = "Bearer $token"}
try {
    $convResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method GET -Headers $headers
    $count = $convResponse.data.conversations.Count
    Write-Host "✅ Found $count conversations" -ForegroundColor Green
} catch {
    Write-Host "❌ Get conversations failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Create Conversation
Write-Host "`n🆕 Step 3: Create Conversation" -ForegroundColor Cyan
$createBody = '{"title":"PowerShell Test","agent_id":1}'
try {
    $newConv = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method POST -Headers $headers -ContentType "application/json" -Body $createBody
    $convId = $newConv.data.id
    Write-Host "✅ Created conversation ID: $convId" -ForegroundColor Green
} catch {
    Write-Host "❌ Create conversation failed: $($_.Exception.Message)" -ForegroundColor Red
    $convId = $null
}

# Step 4: Send Message (if conversation created)
if ($convId) {
    Write-Host "`n📤 Step 4: Send Message" -ForegroundColor Cyan
    $msgBody = '{"content":"Hello from PowerShell test","sender_type":"user"}'
    try {
        $msgResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations/$convId/messages" -Method POST -Headers $headers -ContentType "application/json" -Body $msgBody
        Write-Host "✅ Message sent successfully!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Send message failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 5: Get Messages (if conversation exists)
if ($convId) {
    Write-Host "`n💬 Step 5: Get Messages" -ForegroundColor Cyan
    try {
        $messages = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations/$convId/messages" -Method GET -Headers $headers
        $msgCount = $messages.data.messages.Count
        Write-Host "✅ Found $msgCount messages" -ForegroundColor Green
    } catch {
        Write-Host "❌ Get messages failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎯 Test Complete!" -ForegroundColor Yellow 