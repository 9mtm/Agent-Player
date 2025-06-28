# Simple Chat Cleanup Test
Write-Host "Starting cleanup test..." -ForegroundColor Yellow

try {
    # Login
    $headers = @{"Content-Type"="application/json"}
    $body = '{"email":"me@alarade.at","password":"admin123456"}'
    $response = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method Post -Headers $headers -Body $body
    
    Write-Host "Login OK" -ForegroundColor Green
    
    # Cleanup
    $authHeaders = @{"Authorization" = "Bearer $($response.access_token)"}
    $result = Invoke-RestMethod -Uri "http://localhost:8000/chat/cleanup-all" -Method Post -Headers $authHeaders
    
    Write-Host "SUCCESS: Deleted $($result.data.total_deleted) items" -ForegroundColor Green
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
} 