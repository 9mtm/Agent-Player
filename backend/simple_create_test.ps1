# Simple Create Test
Write-Host "=== SIMPLE CREATE TEST ===" -ForegroundColor Green

# Login
$loginBody = '{"email":"me@alarade.at","password":"admin123456"}'
$response = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $response.data.access_token
$headers = @{"Authorization" = "Bearer $token"}

Write-Host "1. Creating conversation..." -ForegroundColor Cyan
$createBody = '{"title":"SIMPLE TEST","agent_id":1}'

try {
    $createResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations" -Method POST -Headers $headers -ContentType "application/json" -Body $createBody
    Write-Host "✅ Create Response:" -ForegroundColor Green
    Write-Host ($createResponse | ConvertTo-Json -Depth 3)
    
    $convId = $createResponse.data.id
    Write-Host "Created conversation ID: $convId" -ForegroundColor Yellow
    
    # Immediately try to get this specific conversation
    Write-Host "`n2. Getting the created conversation by ID..." -ForegroundColor Cyan
    try {
        $getResponse = Invoke-RestMethod -Uri "http://localhost:8000/chat/conversations/$convId" -Method GET -Headers $headers
        Write-Host "✅ Found conversation by ID!" -ForegroundColor Green
        Write-Host "Title: '$($getResponse.data.title)'" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Cannot find conversation by ID!" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Create failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest Complete!" -ForegroundColor Yellow 