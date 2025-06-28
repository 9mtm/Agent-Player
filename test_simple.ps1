Write-Host "Testing API..."

$loginData = '{"email":"me@alarade.at","password":"admin123456"}'
$response = Invoke-WebRequest -Uri "http://localhost:8000/auth/login" -Method Post -Body $loginData -ContentType "application/json" -UseBasicParsing
$result = $response.Content | ConvertFrom-Json

if ($result.success) {
    Write-Host "Login: SUCCESS"
    $token = $result.data.access_token
    
    $headers = @{ Authorization = "Bearer $token" }
    $convResponse = Invoke-WebRequest -Uri "http://localhost:8000/chat/conversations" -Headers $headers -UseBasicParsing
    $convResult = $convResponse.Content | ConvertFrom-Json
    
    Write-Host "Conversations: $($convResult.data.total) found"
    Write-Host "Data: $($convResult.data | ConvertTo-Json)"
} else {
    Write-Host "Login: FAILED"
} 