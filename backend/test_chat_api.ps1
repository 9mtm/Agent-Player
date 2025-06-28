# Chat API Endpoints Test Script
# Tests all chat endpoints for functionality

$baseUrl = "http://localhost:8000"

Write-Host "🚀 Starting Chat API Endpoints Test" -ForegroundColor Green
Write-Host "=" * 50

# Test 1: Login
Write-Host "`n🔐 Testing Login..." -ForegroundColor Cyan
try {
    $loginBody = @{
        email = "me@alarade.at"
        password = "admin123456"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    
    if ($loginResponse.success) {
        $token = $loginResponse.data.access_token
        $userId = $loginResponse.data.user.id
        Write-Host "✅ Login successful! User ID: $userId" -ForegroundColor Green
    } else {
        Write-Host "❌ Login failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Login error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Set authorization headers
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test 2: Get Conversations
Write-Host "`n📋 Testing GET /chat/conversations..." -ForegroundColor Cyan
try {
    $conversationsResponse = Invoke-RestMethod -Uri "$baseUrl/chat/conversations" -Method GET -Headers $headers
    $conversations = $conversationsResponse.data.conversations
    Write-Host "✅ GET conversations successful! Found $($conversations.Count) conversations" -ForegroundColor Green
    
    if ($conversations.Count -gt 0) {
        $firstConv = $conversations[0]
        Write-Host "   First conversation: ID=$($firstConv.id), Title='$($firstConv.title)'" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ GET conversations failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Create Conversation
Write-Host "`n🆕 Testing POST /chat/conversations..." -ForegroundColor Cyan
try {
    $newConvBody = @{
        title = "Test Conversation $(Get-Date -Format 'HH:mm:ss')"
        agent_id = 1
    } | ConvertTo-Json

    $createResponse = Invoke-RestMethod -Uri "$baseUrl/chat/conversations" -Method POST -Headers $headers -Body $newConvBody
    
    if ($createResponse.success) {
        $newConvId = $createResponse.data.id
        Write-Host "✅ CREATE conversation successful! ID: $newConvId" -ForegroundColor Green
        Write-Host "   Title: '$($createResponse.data.title)'" -ForegroundColor Gray
    } else {
        Write-Host "❌ CREATE conversation failed!" -ForegroundColor Red
        $newConvId = $null
    }
} catch {
    Write-Host "❌ CREATE conversation error: $($_.Exception.Message)" -ForegroundColor Red
    $newConvId = $null
}

# Test 4: Get Specific Conversation
if ($newConvId) {
    Write-Host "`n📖 Testing GET /chat/conversations/$newConvId..." -ForegroundColor Cyan
    try {
        $specificConvResponse = Invoke-RestMethod -Uri "$baseUrl/chat/conversations/$newConvId" -Method GET -Headers $headers
        Write-Host "✅ GET specific conversation successful!" -ForegroundColor Green
        Write-Host "   ID: $($specificConvResponse.data.id), Title: '$($specificConvResponse.data.title)'" -ForegroundColor Gray
    } catch {
        Write-Host "❌ GET specific conversation error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 5: Update Conversation
if ($newConvId) {
    Write-Host "`n✏️ Testing PUT /chat/conversations/$newConvId..." -ForegroundColor Cyan
    try {
        $updateBody = @{
            title = "Updated Test Conversation $(Get-Date -Format 'HH:mm:ss')"
            is_pinned = $true
        } | ConvertTo-Json

        $updateResponse = Invoke-RestMethod -Uri "$baseUrl/chat/conversations/$newConvId" -Method PUT -Headers $headers -Body $updateBody
        Write-Host "✅ UPDATE conversation successful!" -ForegroundColor Green
    } catch {
        Write-Host "❌ UPDATE conversation error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 6: Get Messages
if ($newConvId) {
    Write-Host "`n💬 Testing GET /chat/conversations/$newConvId/messages..." -ForegroundColor Cyan
    try {
        $messagesResponse = Invoke-RestMethod -Uri "$baseUrl/chat/conversations/$newConvId/messages" -Method GET -Headers $headers
        $messages = $messagesResponse.data.messages
        Write-Host "✅ GET messages successful! Found $($messages.Count) messages" -ForegroundColor Green
    } catch {
        Write-Host "❌ GET messages error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 7: Send Message
if ($newConvId) {
    Write-Host "`n📤 Testing POST /chat/conversations/$newConvId/messages..." -ForegroundColor Cyan
    try {
        $messageBody = @{
            content = "Test message sent at $(Get-Date -Format 'HH:mm:ss')"
            sender_type = "user"
        } | ConvertTo-Json

        $messageResponse = Invoke-RestMethod -Uri "$baseUrl/chat/conversations/$newConvId/messages" -Method POST -Headers $headers -Body $messageBody
        
        if ($messageResponse.success) {
            $userMsg = $messageResponse.data.user_message
            $aiMsg = $messageResponse.data.ai_response
            Write-Host "✅ SEND message successful!" -ForegroundColor Green
            Write-Host "   User message ID: $($userMsg.id)" -ForegroundColor Gray
            if ($aiMsg) {
                Write-Host "   AI response ID: $($aiMsg.id)" -ForegroundColor Gray
            }
        }
    } catch {
        Write-Host "❌ SEND message error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 8: Delete Conversation  
if ($newConvId) {
    Write-Host "`n🗑️ Testing DELETE /chat/conversations/$newConvId..." -ForegroundColor Cyan
    try {
        $deleteResponse = Invoke-RestMethod -Uri "$baseUrl/chat/conversations/$newConvId" -Method DELETE -Headers $headers
        Write-Host "✅ DELETE conversation successful!" -ForegroundColor Green
    } catch {
        Write-Host "❌ DELETE conversation error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Final Check
Write-Host "`n📋 Final Status Check..." -ForegroundColor Cyan
try {
    $finalResponse = Invoke-RestMethod -Uri "$baseUrl/chat/conversations" -Method GET -Headers $headers
    $finalConversations = $finalResponse.data.conversations
    Write-Host "✅ Final conversations count: $($finalConversations.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Final check error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Chat API Test Summary:" -ForegroundColor Yellow
Write-Host "   All major endpoints tested" -ForegroundColor Gray
Write-Host "   Check above for any ❌ errors" -ForegroundColor Gray
Write-Host "   ✅ = Working, ❌ = Needs attention" -ForegroundColor Gray 