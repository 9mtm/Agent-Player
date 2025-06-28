# DPRO AI Agent - System Runner
# PowerShell script for Windows users

Write-Host "🚀 DPRO AI Agent System Starter" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Function to check if a process is running on a port
function Test-Port {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
        return $connection.TcpTestSucceeded
    }
    catch {
        return $false
    }
}

# Check backend
Write-Host "🔍 Checking backend (port 8000)..." -ForegroundColor Yellow
$backendRunning = Test-Port -Port 8000

if ($backendRunning) {
    Write-Host "✅ Backend is running" -ForegroundColor Green
} else {
    Write-Host "❌ Backend not running" -ForegroundColor Red
    Write-Host "🏃 Starting backend..." -ForegroundColor Yellow
    Start-Process PowerShell -ArgumentList "-Command", "cd backend; python main.py" -WindowStyle Normal
    Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Check frontend
Write-Host "🔍 Checking frontend (port 3000)..." -ForegroundColor Yellow
$frontendRunning = Test-Port -Port 3000

if ($frontendRunning) {
    Write-Host "✅ Frontend is running" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend not running" -ForegroundColor Red
    Write-Host "🏃 Starting frontend..." -ForegroundColor Yellow
    Start-Process PowerShell -ArgumentList "-Command", "cd frontend; npm start" -WindowStyle Normal
    Write-Host "⏳ Waiting for frontend to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

# Open board page
Write-Host "🌐 Opening Board Page..." -ForegroundColor Cyan
$boardUrl = "http://localhost:3000/dashboard/board/child-agent/4"
Start-Process $boardUrl

Write-Host ""
Write-Host "🎯 System Status:" -ForegroundColor Green
Write-Host "- Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "- Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "- Board:    $boardUrl" -ForegroundColor White

Write-Host ""
Write-Host "📋 Test the Drag & Drop:" -ForegroundColor Yellow
Write-Host "1. Click 'Components' button in footer toolbar" -ForegroundColor White
Write-Host "2. Drag any component from library" -ForegroundColor White
Write-Host "3. Drop it on the board" -ForegroundColor White
Write-Host "4. Watch for success notification!" -ForegroundColor White

Write-Host ""
Write-Host "✨ Everything should be working perfectly now!" -ForegroundColor Green 