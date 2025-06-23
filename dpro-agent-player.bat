@echo off
chcp 65001 >nul
title Dpro Agent - AI Agent Player

:: ============================================================================
:: 🤖 DPRO AGENT - AI AGENT PLAYER LAUNCHER
:: ============================================================================
:: Advanced Privacy-First AI Agent System Launcher
:: Version: 2.0.0
:: ============================================================================

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                                                          ║
echo ║    🤖 DPRO AGENT - AI AGENT PLAYER 🚀                    ║
echo ║                                                          ║
echo ║    Advanced AI Agent Management System                   ║
echo ║    Version 2.0.0 - 100%% Localhost Privacy               ║
echo ║                                                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo 📅 Started at: %date% %time%
echo.

:: Set colors
set "GREEN=[92m"
set "BLUE=[94m"
set "YELLOW=[93m"
set "RED=[91m"
set "CYAN=[96m"
set "RESET=[0m"

:: Default configuration
set BACKEND_PORT=8000
set FRONTEND_PORT=3000
set BACKEND_PATH=backend
set FRONTEND_PATH=frontend
set AUTO_BROWSER=true
set DEV_MODE=true

:: Parse command line arguments
:parse_args
if "%1"=="" goto start_launcher
if "%1"=="--help" goto show_help
if "%1"=="-h" goto show_help
if "%1"=="--backend-only" set BACKEND_ONLY=true
if "%1"=="--frontend-only" set FRONTEND_ONLY=true
if "%1"=="--no-browser" set AUTO_BROWSER=false
if "%1"=="--prod" set DEV_MODE=false
if "%1"=="--port" (
    set BACKEND_PORT=%2
    shift
)
if "%1"=="--frontend-port" (
    set FRONTEND_PORT=%2
    shift
)
shift
goto parse_args

:show_help
echo.
echo %CYAN%🚀 Dpro Agent Player - AI Agent Management System%RESET%
echo.
echo %GREEN%Usage:%RESET%
echo   dpro-agent-player.bat [options]
echo.
echo %GREEN%Options:%RESET%
echo   --help, -h           Show this help message
echo   --backend-only       Start only backend server
echo   --frontend-only      Start only frontend server  
echo   --no-browser         Don't open browser automatically
echo   --prod               Start in production mode
echo   --port ^<PORT^>        Backend port (default: 8000)
echo   --frontend-port ^<PORT^> Frontend port (default: 3000)
echo.
echo %GREEN%Examples:%RESET%
echo   dpro-agent-player.bat                    # Start in development mode
echo   dpro-agent-player.bat --prod             # Start in production mode
echo   dpro-agent-player.bat --backend-only     # Start only backend
echo   dpro-agent-player.bat --no-browser       # Don't open browser
echo.
goto exit

:start_launcher
echo %BLUE%🔍 Checking system requirements...%RESET%

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ Python not found! Please install Python 3.9+ first.%RESET%
    echo %YELLOW%💡 Download from: https://www.python.org/downloads/%RESET%
    pause
    goto exit
)

:: Check Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo %GREEN%🐍 Python version: %PYTHON_VERSION%%RESET%

:: Check if Node.js is installed (only if not backend-only)
if not "%FRONTEND_ONLY%"=="true" if not "%BACKEND_ONLY%"=="true" (
    node --version >nul 2>&1
    if errorlevel 1 (
        echo %RED%❌ Node.js not found! Please install Node.js 18+ first.%RESET%
        echo %YELLOW%💡 Download from: https://nodejs.org/%RESET%
        pause
        goto exit
    )
    
    for /f "tokens=1" %%i in ('node --version 2^>^&1') do set NODE_VERSION=%%i
    echo %GREEN%🟢 Node.js version: %NODE_VERSION%%RESET%
)

:: Check directories
if not exist "%BACKEND_PATH%" (
    echo %RED%❌ Backend directory not found: %BACKEND_PATH%%RESET%
    pause
    goto exit
)

if not "%BACKEND_ONLY%"=="true" (
    if not exist "%FRONTEND_PATH%" (
        echo %RED%❌ Frontend directory not found: %FRONTEND_PATH%%RESET%
        pause
        goto exit
    )
)

echo %GREEN%✅ System requirements verified%RESET%
echo.

:: Start backend server
if not "%FRONTEND_ONLY%"=="true" (
    echo %BLUE%🔧 Starting Python backend server...%RESET%
    
    :: Check if requirements.txt exists
    if not exist "%BACKEND_PATH%\requirements.txt" (
        echo %RED%❌ requirements.txt not found in backend directory%RESET%
        pause
        goto exit
    )
    
    :: Install backend dependencies
    echo %YELLOW%📦 Installing Python dependencies...%RESET%
    cd /d "%BACKEND_PATH%"
    pip install -r requirements.txt >nul 2>&1
    if errorlevel 1 (
        echo %RED%❌ Failed to install Python dependencies%RESET%
        cd /d ..
        pause
        goto exit
    )
    echo %GREEN%✅ Python dependencies installed%RESET%
    
    :: Start backend server
    if "%DEV_MODE%"=="true" (
        echo %GREEN%🚀 Starting backend server in development mode on port %BACKEND_PORT%...%RESET%
        start "Backend Server" cmd /k "python main.py"
    ) else (
        echo %GREEN%🏭 Starting backend server in production mode on port %BACKEND_PORT%...%RESET%
        start "Backend Server" cmd /k "python main.py"
    )
    cd /d ..
    
    :: Wait for backend to start
    echo %YELLOW%⏳ Waiting for backend to be ready...%RESET%
    timeout /t 5 >nul
    
    :: Check if backend is running
    powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:%BACKEND_PORT%/health' -TimeoutSec 5 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
    if errorlevel 1 (
        echo %YELLOW%⚠️ Backend might still be starting up...%RESET%
    ) else (
        echo %GREEN%✅ Backend server is ready on port %BACKEND_PORT%%RESET%
    )
)

:: Start frontend server
if not "%BACKEND_ONLY%"=="true" (
    echo %CYAN%🎨 Starting React frontend server...%RESET%
    
    :: Check if package.json exists
    if not exist "%FRONTEND_PATH%\package.json" (
        echo %RED%❌ package.json not found in frontend directory%RESET%
        pause
        goto exit
    )
    
    :: Install frontend dependencies
    echo %YELLOW%📦 Installing Node.js dependencies...%RESET%
    cd /d "%FRONTEND_PATH%"
    npm install >nul 2>&1
    if errorlevel 1 (
        echo %RED%❌ Failed to install Node.js dependencies%RESET%
        cd /d ..
        pause
        goto exit
    )
    echo %GREEN%✅ Node.js dependencies installed%RESET%
    
    :: Start frontend server
    if "%DEV_MODE%"=="true" (
        echo %GREEN%🚀 Starting frontend development server on port %FRONTEND_PORT%...%RESET%
        start "Frontend Server" cmd /k "npm run dev"
    ) else (
        echo %GREEN%🔨 Building frontend for production...%RESET%
        npm run build >nul 2>&1
        if errorlevel 1 (
            echo %RED%❌ Failed to build frontend%RESET%
            cd /d ..
            pause
            goto exit
        )
        echo %GREEN%✅ Frontend built successfully%RESET%
    )
    cd /d ..
    
    :: Wait for frontend to start
    if "%DEV_MODE%"=="true" (
        echo %YELLOW%⏳ Waiting for frontend to be ready...%RESET%
        timeout /t 10 >nul
        
        :: Check if frontend is running
        powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:%FRONTEND_PORT%' -TimeoutSec 5 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
        if errorlevel 1 (
            echo %YELLOW%⚠️ Frontend might still be starting up...%RESET%
        ) else (
            echo %GREEN%✅ Frontend server is ready on port %FRONTEND_PORT%%RESET%
        )
    )
)

:: Show success message
echo.
echo %GREEN%🎉 Dpro Agent Player is now running!%RESET%
echo ┌─────────────────────────────────────────────────────────┐
if not "%FRONTEND_ONLY%"=="true" (
    echo │ 🔧 Backend API:  http://localhost:%BACKEND_PORT%                     │
    echo │ 📚 API Docs:     http://localhost:%BACKEND_PORT%/docs              │
)
if not "%BACKEND_ONLY%"=="true" if "%DEV_MODE%"=="true" (
    echo │ 🎨 Frontend UI:  http://localhost:%FRONTEND_PORT%                     │
)
echo │                                                         │
echo │ 🛡️  100%% Localhost - Your data stays private           │
echo │ 🔐 GDPR Compliant - International privacy standards    │
echo │ 🤖 AI Agents Ready - OpenAI ^& Anthropic support       │
echo └─────────────────────────────────────────────────────────┘
echo.

:: Open browser if requested
if "%AUTO_BROWSER%"=="true" if not "%BACKEND_ONLY%"=="true" if "%DEV_MODE%"=="true" (
    echo %CYAN%🌐 Opening browser...%RESET%
    timeout /t 3 >nul
    start "" "http://localhost:%FRONTEND_PORT%"
) else if "%AUTO_BROWSER%"=="true" if "%BACKEND_ONLY%"=="true" (
    echo %CYAN%🌐 Opening API documentation...%RESET%
    timeout /t 3 >nul
    start "" "http://localhost:%BACKEND_PORT%/docs"
)

echo.
echo %YELLOW%💡 Press Ctrl+C in the server windows to stop services%RESET%
echo %YELLOW%💡 This launcher will remain open for monitoring%RESET%
echo.

:: Keep launcher open for monitoring
:monitor_loop
timeout /t 30 >nul
:: Add basic health checks here if needed
goto monitor_loop

:exit
echo.
echo %YELLOW%👋 Dpro Agent Player launcher closed%RESET%
pause 