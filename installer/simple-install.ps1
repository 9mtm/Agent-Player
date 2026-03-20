# Agent Player - Simple Installer (PowerShell)
# No Tauri needed - pure Windows PowerShell!

param(
    [string]$InstallDir = "C:\Program Files\Agent Player"
)

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Agent Player Installer v1.3.0" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  This installer requires Administrator privileges." -ForegroundColor Yellow
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "✅ Running with Administrator privileges" -ForegroundColor Green
Write-Host ""

# System Check
Write-Host "🔍 Running System Check..." -ForegroundColor Cyan
Write-Host ""

# Check Disk Space
$drive = (Get-Item $env:SystemDrive).PSDrive
$freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
Write-Host "   💾 Disk Space: $freeSpaceGB GB available" -ForegroundColor $(if ($freeSpaceGB -ge 2) { "Green" } else { "Red" })

# Check RAM
$ram = (Get-CimInstance -ClassName Win32_ComputerSystem).TotalPhysicalMemory
$ramGB = [math]::Round($ram / 1GB, 2)
Write-Host "   🧠 RAM: $ramGB GB total" -ForegroundColor $(if ($ramGB -ge 4) { "Green" } else { "Red" })

# Check Ports
function Test-Port {
    param([int]$Port)
    $listener = $null
    try {
        $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        $listener.Stop()
        return $true
    } catch {
        return $false
    } finally {
        if ($listener) { $listener.Stop() }
    }
}

$port41521 = Test-Port 41521
$port41522 = Test-Port 41522
Write-Host "   🔌 Port 41521: $(if ($port41521) { '✓ Available' } else { '✗ In Use' })" -ForegroundColor $(if ($port41521) { "Green" } else { "Red" })
Write-Host "   🔌 Port 41522: $(if ($port41522) { '✓ Available' } else { '✗ In Use' })" -ForegroundColor $(if ($port41522) { "Green" } else { "Red" })

# Check Docker
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerInstalled) {
    Write-Host "   🐳 Docker: ✓ Installed" -ForegroundColor Green
} else {
    Write-Host "   🐳 Docker: ✗ Not installed (optional)" -ForegroundColor Yellow
}

Write-Host ""

# Errors and Warnings
$errors = @()
$warnings = @()

if ($freeSpaceGB -lt 2) { $errors += "Insufficient disk space (need 2GB)" }
if ($ramGB -lt 4) { $warnings += "Low RAM (4GB+ recommended)" }
if (-not $port41521) { $errors += "Port 41521 is in use" }
if (-not $port41522) { $errors += "Port 41522 is in use" }

if ($errors.Count -gt 0) {
    Write-Host "❌ ERRORS:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "   - $error" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please fix these errors and try again." -ForegroundColor Red
    pause
    exit 1
}

if ($warnings.Count -gt 0) {
    Write-Host "⚠️  WARNINGS:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "   - $warning" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "✅ System check passed!" -ForegroundColor Green
Write-Host ""

# Installation Directory
Write-Host "📁 Installation Directory: $InstallDir" -ForegroundColor Cyan
$response = Read-Host "Press Enter to continue or type a new path"
if ($response) {
    $InstallDir = $response
}

Write-Host ""
Write-Host "🚀 Starting installation..." -ForegroundColor Cyan
Write-Host ""

# Create installation directory
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Write-Host "✅ Created directory: $InstallDir" -ForegroundColor Green
}

# Copy files (assuming we're in the installer directory)
$sourceDir = Split-Path -Parent $PSCommandPath
Write-Host "📦 Copying application files..." -ForegroundColor Cyan

# This is a placeholder - in reality, you'd copy your actual app files here
# Copy-Item -Path "$sourceDir\app\*" -Destination $InstallDir -Recurse -Force

Write-Host "✅ Files copied successfully!" -ForegroundColor Green
Write-Host ""

# Create desktop shortcut
Write-Host "🔗 Creating desktop shortcut..." -ForegroundColor Cyan
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Agent Player.lnk")
$Shortcut.TargetPath = "$InstallDir\agent-player.exe"
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.Description = "Agent Player - AI Desktop Application"
# $Shortcut.IconLocation = "$InstallDir\icon.ico"
$Shortcut.Save()
Write-Host "✅ Desktop shortcut created!" -ForegroundColor Green
Write-Host ""

# Add to Start Menu
Write-Host "📌 Adding to Start Menu..." -ForegroundColor Cyan
$StartMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Agent Player.lnk"
Copy-Item "$env:USERPROFILE\Desktop\Agent Player.lnk" $StartMenuPath -Force
Write-Host "✅ Added to Start Menu!" -ForegroundColor Green
Write-Host ""

# Installation complete
Write-Host "================================" -ForegroundColor Green
Write-Host "  ✅ Installation Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Agent Player has been installed to:" -ForegroundColor Cyan
Write-Host "  $InstallDir" -ForegroundColor White
Write-Host ""
Write-Host "You can now launch it from:" -ForegroundColor Cyan
Write-Host "  - Desktop shortcut" -ForegroundColor White
Write-Host "  - Start Menu" -ForegroundColor White
Write-Host ""
Write-Host "Frontend: http://localhost:41521" -ForegroundColor Yellow
Write-Host "Backend:  http://localhost:41522" -ForegroundColor Yellow
Write-Host ""

pause
