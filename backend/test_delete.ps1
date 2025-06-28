# Test Delete with Existing Conversation
Write-Host "Testing Delete with Existing Conversation..." -ForegroundColor Green

# Step 1: Login
Write-Host "Step 1: Login" -ForegroundColor Cyan
$loginBody = '{"email":"me@alarade.at","password":"admin123456"}'

$response = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $response.data.access_token
Write-Host "Login successful!" -ForegroundColor Green

# Step 2: Get existing conversations
Write-Host "Step 2: Get Existing Conversations" -ForegroundColor Cyan
$headers = @{"Authorization" = "Bearer $token"}

$convResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method GET -Headers $headers
$conversations = $convResponse.data.conversations
$count = $conversations.Count
Write-Host "Found $count conversations" -ForegroundColor Green

if ($count -gt 0) {
    $firstConv = $conversations[0]
    $existingId = $firstConv.id
    Write-Host "Testing with existing conversation ID: $existingId" -ForegroundColor Yellow
    Write-Host "Title: '$($firstConv.title)'" -ForegroundColor Gray
    
    # Test 3: Try to delete existing conversation
    Write-Host "Step 3: Delete Existing Conversation" -ForegroundColor Cyan
    try {
        $deleteResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations/$existingId" -Method DELETE -Headers $headers
        Write-Host "DELETE successful!" -ForegroundColor Green
        Write-Host "Response: $($deleteResponse | ConvertTo-Json)" -ForegroundColor Gray
    } catch {
        Write-Host "DELETE failed: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response body: $responseBody" -ForegroundColor Red
        }
    }
    
    # Check conversations count after delete
    Write-Host "Step 4: Check Conversations After Delete" -ForegroundColor Cyan
    $finalResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method GET -Headers $headers
    $finalCount = $finalResponse.data.conversations.Count
    Write-Host "Conversations after delete: $finalCount" -ForegroundColor Green
    
    if ($finalCount -eq ($count - 1)) {
        Write-Host "✅ DELETE worked! Count decreased from $count to $finalCount" -ForegroundColor Green
    } else {
        Write-Host "❌ DELETE may not have worked. Count stayed at $finalCount" -ForegroundColor Red
    }
} else {
    Write-Host "No existing conversations to test delete with" -ForegroundColor Red
}

Write-Host "Delete Test Complete!" -ForegroundColor Yellow 