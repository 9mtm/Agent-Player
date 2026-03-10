# Agent Player Installer Build Script (PowerShell)
# Builds Windows .msi installer
#
# Prerequisites:
# - Rust 1.70+ installed: https://rustup.rs/
# - Tauri CLI installed: cargo install tauri-cli
# - Visual Studio 2019+ or Build Tools
# - WiX Toolset 3.11+: https://wixtoolset.org/

$ErrorActionPreference = "Stop"

$VERSION = "1.3.0"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$ROOT_DIR = Split-Path -Parent $SCRIPT_DIR
$INSTALLER_DIR = Join-Path $ROOT_DIR "installer"
$OUTPUT_DIR = Join-Path $ROOT_DIR "releases"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Agent Player Installer Build Script" -ForegroundColor Cyan
Write-Host "Version: $VERSION" -ForegroundColor Cyan
Write-Host "Platform: Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create output directory
if (-not (Test-Path $OUTPUT_DIR)) {
    New-Item -ItemType Directory -Path $OUTPUT_DIR | Out-Null
}

# Navigate to installer directory
Set-Location $INSTALLER_DIR

# Check Rust and Cargo
Write-Host "[1/6] Checking Rust and Cargo..." -ForegroundColor Yellow
try {
    $cargoVersion = cargo --version
    Write-Host "✓ Cargo found: $cargoVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Cargo not found. Please install Rust from https://rustup.rs/" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Check Tauri CLI
Write-Host "[2/6] Checking Tauri CLI..." -ForegroundColor Yellow
try {
    $tauriVersion = cargo tauri --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw
    }
    Write-Host "✓ Tauri CLI found: $tauriVersion" -ForegroundColor Green
} catch {
    Write-Host "Tauri CLI not found. Installing..." -ForegroundColor Yellow
    cargo install tauri-cli
    Write-Host "✓ Tauri CLI installed" -ForegroundColor Green
}
Write-Host ""

# Check WiX Toolset
Write-Host "[3/6] Checking WiX Toolset..." -ForegroundColor Yellow
$wixPath = "${env:ProgramFiles(x86)}\WiX Toolset v3.11\bin\candle.exe"
if (Test-Path $wixPath) {
    Write-Host "✓ WiX Toolset found" -ForegroundColor Green
} else {
    Write-Host "Warning: WiX Toolset not found at default location" -ForegroundColor Yellow
    Write-Host "If build fails, install from: https://wixtoolset.org/releases/" -ForegroundColor Yellow
}
Write-Host ""

# Install dependencies
Write-Host "[4/6] Installing Rust dependencies..." -ForegroundColor Yellow
cargo update
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Build installer
Write-Host "[5/6] Building Windows .msi installer..." -ForegroundColor Yellow
Write-Host "This may take 5-10 minutes on first build..." -ForegroundColor Cyan
cargo tauri build --bundles msi

# Find and copy MSI file
$msiFiles = Get-ChildItem -Path "target\release\bundle\msi" -Filter "*.msi" -Recurse
if ($msiFiles.Count -eq 0) {
    Write-Host "Error: MSI file not found in target\release\bundle\msi" -ForegroundColor Red
    exit 1
}

$msiFile = $msiFiles[0]
$outputFile = Join-Path $OUTPUT_DIR "agent-player-installer-$VERSION-win-x64.msi"
Copy-Item $msiFile.FullName -Destination $outputFile -Force

$fileSize = [math]::Round($msiFile.Length / 1MB, 2)
Write-Host "✓ Windows installer created: agent-player-installer-$VERSION-win-x64.msi ($fileSize MB)" -ForegroundColor Green
Write-Host ""

# Generate checksums
Write-Host "[6/6] Generating checksums..." -ForegroundColor Yellow
Set-Location $OUTPUT_DIR

$hash = Get-FileHash -Path $outputFile -Algorithm SHA256
$checksumContent = "$($hash.Hash.ToLower())  $(Split-Path $outputFile -Leaf)"
$checksumFile = "checksums-Windows.txt"
$checksumContent | Out-File -FilePath $checksumFile -Encoding ASCII

Write-Host "✓ Checksum generated" -ForegroundColor Green
Write-Host ""

# Build summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Platform: Windows" -ForegroundColor White
Write-Host "Version: $VERSION" -ForegroundColor White
Write-Host "Output directory: $OUTPUT_DIR" -ForegroundColor White
Write-Host ""
Write-Host "Generated files:" -ForegroundColor White
Get-ChildItem $OUTPUT_DIR | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  - $($_.Name) ($size MB)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "SHA256 Checksum:" -ForegroundColor White
Write-Host "  $($hash.Hash.ToLower())" -ForegroundColor Gray
Write-Host ""
Write-Host "✓ Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the installer on a clean Windows VM" -ForegroundColor White
Write-Host "2. Code sign the installer (see docs\RELEASE_CHECKLIST.md)" -ForegroundColor White
Write-Host "3. Upload to GitHub Releases" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
