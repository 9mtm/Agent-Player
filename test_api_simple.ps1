# Test API Script
Write-Host "🔍 Testing API Endpoints..."

# Test system status
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/auth/system/status" -UseBasicParsing
    Write-Host "✅ System Status: $($response.StatusCode)"
}
catch {
    Write-Host "❌ System Status: Failed"
}

# Test login
try {
    $loginData = @{
        email = "me@alarade.at"
        password = "admin123456"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "http://localhost:8000/auth/login" -Method Post -Body $loginData -ContentType "application/json" -UseBasicParsing
    $loginResult = $response.Content | ConvertFrom-Json
    
    if ($loginResult.success) {
        Write-Host "✅ Login: Success"
        $token = $loginResult.data.access_token
        
        # Test conversations endpoint
        $headers = @{ Authorization = "Bearer $token" }
        $convResponse = Invoke-WebRequest -Uri "http://localhost:8000/chat/conversations" -Headers $headers -UseBasicParsing
        $convResult = $convResponse.Content | ConvertFrom-Json
        
        Write-Host "✅ Conversations: Found $($convResult.data.total) conversations"
        Write-Host "📋 Conversations data: $($convResult.data | ConvertTo-Json -Depth 2)"
    }
    else {
        Write-Host "❌ Login: Failed"
    }
}
catch {
    Write-Host "❌ API Test: $($_.Exception.Message)"
}

Write-Host "�� Test completed." 