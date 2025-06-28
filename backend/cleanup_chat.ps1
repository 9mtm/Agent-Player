#!/usr/bin/env powershell
# 🧹 Chat Cleanup Command - DEVELOPMENT ONLY
# Usage: .\cleanup_chat.ps1 [--confirm]

param(
    [switch]$confirm = $false,
    [string]$email = "me@alarade.at",
    [string]$password = "admin123456",
    [string]$baseUrl = "http://localhost:8000"
)

Write-Host "🧹 Chat Cleanup Tool - DEVELOPMENT ONLY" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# Check if backend is running
try {
    Write-Host "📍 Checking backend server..." -ForegroundColor Cyan
    $healthCheck = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -TimeoutSec 5
    Write-Host "✅ Backend server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend server is not running on $baseUrl" -ForegroundColor Red
    Write-Host "   Please start the backend server first: python main.py" -ForegroundColor Yellow
    exit 1
}

# Confirmation prompt
if (-not $confirm) {
    Write-Host "`n⚠️  WARNING: This will DELETE ALL chat conversations and messages!" -ForegroundColor Red
    Write-Host "   This action cannot be undone." -ForegroundColor Red
    $userConfirm = Read-Host "`nType 'YES' to confirm cleanup"
    
    if ($userConfirm -ne "YES") {
        Write-Host "❌ Cleanup cancelled by user" -ForegroundColor Yellow
        exit 0
    }
}

try {
    # Step 1: Login
    Write-Host "`n🔐 Logging in..." -ForegroundColor Cyan
    $loginHeaders = @{"Content-Type" = "application/json"}
    $loginBody = @{
        "email" = $email
        "password" = $password
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Headers $loginHeaders -Body $loginBody
    $token = $loginResponse.access_token
    Write-Host "✅ Login successful" -ForegroundColor Green
    
    # Step 2: Get current conversation count
    Write-Host "`n📊 Getting current data..." -ForegroundColor Cyan
    $authHeaders = @{"Authorization" = "Bearer $token"}
    $conversationsResponse = Invoke-RestMethod -Uri "$baseUrl/chat/conversations?limit=1" -Method Get -Headers $authHeaders
    $totalConversations = $conversationsResponse.data.total
    Write-Host "📈 Current conversations: $totalConversations" -ForegroundColor Blue
    
    # Step 3: Execute cleanup
    Write-Host "`n🧹 Executing cleanup..." -ForegroundColor Red
    $cleanupResponse = Invoke-RestMethod -Uri "$baseUrl/chat/cleanup-all" -Method Post -Headers $authHeaders
    
    # Step 4: Display results
    Write-Host "`n✅ CLEANUP COMPLETED!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "📊 Cleanup Results:" -ForegroundColor White
    Write-Host "   🗂️  Conversations deleted: $($cleanupResponse.data.conversations_deleted)" -ForegroundColor Yellow
    Write-Host "   💬 Messages deleted: $($cleanupResponse.data.messages_deleted)" -ForegroundColor Yellow
    Write-Host "   📝 Total items deleted: $($cleanupResponse.data.total_deleted)" -ForegroundColor Yellow
    Write-Host "`n🎉 All chat data has been cleaned up successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "`n❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorDetail = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Details: $($errorDetail.detail)" -ForegroundColor Red
    }
    exit 1
}

Write-Host "`n🏁 Cleanup script completed." -ForegroundColor Cyan 