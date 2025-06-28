@echo off
REM 🧹 SQLite Direct Cleanup Batch File
title SQLite Chat Cleanup

echo 🧹 SQLite Direct Cleanup Starting...
echo.

REM Check Python availability
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found!
    echo    Please install Python or use alternative method
    pause
    exit /b 1
)

REM Run Python SQLite cleanup
echo 📂 Running Python SQLite cleanup...
python cleanup_sqlite.py --force

echo.
echo 🏁 Press any key to exit...
pause >nul 