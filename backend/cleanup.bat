@echo off
REM 🧹 Quick Chat Cleanup Batch File for Windows
title Chat Cleanup Tool

echo 🧹 Quick Chat Cleanup Starting...
echo.

REM Check if PowerShell is available
powershell -Command "exit 0" >nul 2>&1
if errorlevel 1 (
    echo ❌ PowerShell not found!
    pause
    exit /b 1
)

REM Run the quick cleanup PowerShell script
powershell -ExecutionPolicy Bypass -File "quick_cleanup.ps1"

echo.
echo 🏁 Press any key to exit...
pause >nul 