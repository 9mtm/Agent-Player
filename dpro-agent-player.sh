#!/bin/bash

# ============================================================================
# 🤖 DPRO AGENT - AI AGENT PLAYER LAUNCHER
# ============================================================================
# Advanced Privacy-First AI Agent System Launcher
# Version: 2.0.0
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RESET='\033[0m'

# Default configuration
BACKEND_PORT=8000
FRONTEND_PORT=3000
BACKEND_PATH="backend"
FRONTEND_PATH="frontend"
AUTO_BROWSER=true
DEV_MODE=true
BACKEND_ONLY=false
FRONTEND_ONLY=false

# PID files for process management
BACKEND_PID_FILE="/tmp/dpro-backend.pid"
FRONTEND_PID_FILE="/tmp/dpro-frontend.pid"

# Function to print banner
print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║    🤖 DPRO AGENT - AI AGENT PLAYER 🚀                    ║"
    echo "║                                                          ║"
    echo "║    Advanced AI Agent Management System                   ║"
    echo "║    Version 2.0.0 - 100% Localhost Privacy               ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${RESET}"
    echo "📅 Started at: $(date)"
    echo
}

# Function to show help
show_help() {
    echo -e "${CYAN}🚀 Dpro Agent Player - AI Agent Management System${RESET}"
    echo
    echo -e "${GREEN}Usage:${RESET}"
    echo "  ./dpro-agent-player.sh [options]"
    echo
    echo -e "${GREEN}Options:${RESET}"
    echo "  --help, -h           Show this help message"
    echo "  --backend-only       Start only backend server"
    echo "  --frontend-only      Start only frontend server"
    echo "  --no-browser         Don't open browser automatically"
    echo "  --prod               Start in production mode"
    echo "  --port <PORT>        Backend port (default: 8000)"
    echo "  --frontend-port <PORT> Frontend port (default: 3000)"
    echo "  --stop               Stop all running services"
    echo
    echo -e "${GREEN}Examples:${RESET}"
    echo "  ./dpro-agent-player.sh                    # Start in development mode"
    echo "  ./dpro-agent-player.sh --prod             # Start in production mode"
    echo "  ./dpro-agent-player.sh --backend-only     # Start only backend"
    echo "  ./dpro-agent-player.sh --no-browser       # Don't open browser"
    echo "  ./dpro-agent-player.sh --stop             # Stop all services"
    echo
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    local port=$1
    if command_exists lsof; then
        lsof -i :$port >/dev/null 2>&1
    elif command_exists netstat; then
        netstat -ln | grep ":$port " >/dev/null 2>&1
    else
        return 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}⏳ Waiting for service to be ready...${RESET}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Service is ready!${RESET}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
        printf "."
    done
    
    echo
    echo -e "${YELLOW}⚠️ Service might still be starting up...${RESET}"
    return 1
}

# Function to open browser
open_browser() {
    local url=$1
    echo -e "${CYAN}🌐 Opening browser at: $url${RESET}"
    
    if command_exists xdg-open; then
        xdg-open "$url" >/dev/null 2>&1 &
    elif command_exists open; then
        open "$url" >/dev/null 2>&1 &
    elif command_exists firefox; then
        firefox "$url" >/dev/null 2>&1 &
    elif command_exists chrome; then
        chrome "$url" >/dev/null 2>&1 &
    else
        echo -e "${YELLOW}⚠️ Could not open browser automatically${RESET}"
        echo -e "${YELLOW}💡 Please open $url manually${RESET}"
    fi
}

# Function to stop services
stop_services() {
    echo -e "${YELLOW}🛑 Stopping Dpro Agent Player services...${RESET}"
    
    # Stop backend
    if [ -f "$BACKEND_PID_FILE" ]; then
        local backend_pid=$(cat "$BACKEND_PID_FILE")
        if kill -0 "$backend_pid" 2>/dev/null; then
            echo "🛑 Stopping backend server (PID: $backend_pid)..."
            kill -TERM "$backend_pid" 2>/dev/null
            sleep 2
            if kill -0 "$backend_pid" 2>/dev/null; then
                kill -KILL "$backend_pid" 2>/dev/null
            fi
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    
    # Stop frontend
    if [ -f "$FRONTEND_PID_FILE" ]; then
        local frontend_pid=$(cat "$FRONTEND_PID_FILE")
        if kill -0 "$frontend_pid" 2>/dev/null; then
            echo "🛑 Stopping frontend server (PID: $frontend_pid)..."
            kill -TERM "$frontend_pid" 2>/dev/null
            sleep 2
            if kill -0 "$frontend_pid" 2>/dev/null; then
                kill -KILL "$frontend_pid" 2>/dev/null
            fi
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    
    # Kill any remaining processes on our ports
    if port_in_use $BACKEND_PORT; then
        echo "🧹 Cleaning up backend port $BACKEND_PORT..."
        if command_exists lsof; then
            lsof -ti :$BACKEND_PORT | xargs kill -9 2>/dev/null || true
        fi
    fi
    
    if port_in_use $FRONTEND_PORT; then
        echo "🧹 Cleaning up frontend port $FRONTEND_PORT..."
        if command_exists lsof; then
            lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
        fi
    fi
    
    echo -e "${GREEN}✅ All services stopped${RESET}"
}

# Function to handle cleanup on exit
cleanup() {
    echo
    echo -e "${YELLOW}🧹 Cleaning up...${RESET}"
    stop_services
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --backend-only)
            BACKEND_ONLY=true
            shift
            ;;
        --frontend-only)
            FRONTEND_ONLY=true
            shift
            ;;
        --no-browser)
            AUTO_BROWSER=false
            shift
            ;;
        --prod)
            DEV_MODE=false
            shift
            ;;
        --port)
            BACKEND_PORT="$2"
            shift 2
            ;;
        --frontend-port)
            FRONTEND_PORT="$2"
            shift 2
            ;;
        --stop)
            stop_services
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${RESET}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Print banner
print_banner

# Check system requirements
echo -e "${BLUE}🔍 Checking system requirements...${RESET}"

# Check Python
if ! command_exists python3 && ! command_exists python; then
    echo -e "${RED}❌ Python not found! Please install Python 3.9+ first.${RESET}"
    exit 1
fi

# Use python3 if available, otherwise python
PYTHON_CMD="python3"
if ! command_exists python3; then
    PYTHON_CMD="python"
fi

# Check Python version
PYTHON_VERSION=$($PYTHON_CMD --version 2>&1)
echo -e "${GREEN}🐍 $PYTHON_VERSION${RESET}"

# Check Node.js (only if not backend-only)
if [ "$BACKEND_ONLY" != true ]; then
    if ! command_exists node; then
        echo -e "${RED}❌ Node.js not found! Please install Node.js 18+ first.${RESET}"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}🟢 Node.js version: $NODE_VERSION${RESET}"
fi

# Check directories
if [ ! -d "$BACKEND_PATH" ]; then
    echo -e "${RED}❌ Backend directory not found: $BACKEND_PATH${RESET}"
    exit 1
fi

if [ "$BACKEND_ONLY" != true ] && [ ! -d "$FRONTEND_PATH" ]; then
    echo -e "${RED}❌ Frontend directory not found: $FRONTEND_PATH${RESET}"
    exit 1
fi

echo -e "${GREEN}✅ System requirements verified${RESET}"
echo

# Start backend server
if [ "$FRONTEND_ONLY" != true ]; then
    echo -e "${BLUE}🔧 Starting Python backend server...${RESET}"
    
    # Check requirements.txt
    if [ ! -f "$BACKEND_PATH/requirements.txt" ]; then
        echo -e "${RED}❌ requirements.txt not found in backend directory${RESET}"
        exit 1
    fi
    
    # Install backend dependencies
    echo -e "${YELLOW}📦 Installing Python dependencies...${RESET}"
    cd "$BACKEND_PATH"
    $PYTHON_CMD -m pip install -r requirements.txt >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install Python dependencies${RESET}"
        exit 1
    fi
    echo -e "${GREEN}✅ Python dependencies installed${RESET}"
    
    # Start backend
    echo -e "${GREEN}🚀 Starting backend server on port $BACKEND_PORT...${RESET}"
    if [ "$DEV_MODE" = true ]; then
        nohup $PYTHON_CMD main.py > ../backend.log 2>&1 &
    else
        nohup $PYTHON_CMD main.py > ../backend.log 2>&1 &
    fi
    
    BACKEND_PID=$!
    echo $BACKEND_PID > "$BACKEND_PID_FILE"
    cd ..
    
    # Wait for backend to be ready
    wait_for_service "http://localhost:$BACKEND_PORT/health"
    
    echo -e "${GREEN}✅ Backend server is ready on port $BACKEND_PORT${RESET}"
fi

# Start frontend server
if [ "$BACKEND_ONLY" != true ]; then
    echo -e "${CYAN}🎨 Starting React frontend server...${RESET}"
    
    # Check package.json
    if [ ! -f "$FRONTEND_PATH/package.json" ]; then
        echo -e "${RED}❌ package.json not found in frontend directory${RESET}"
        exit 1
    fi
    
    # Install frontend dependencies
    echo -e "${YELLOW}📦 Installing Node.js dependencies...${RESET}"
    cd "$FRONTEND_PATH"
    npm install >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install Node.js dependencies${RESET}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js dependencies installed${RESET}"
    
    # Start frontend
    if [ "$DEV_MODE" = true ]; then
        echo -e "${GREEN}🚀 Starting frontend development server on port $FRONTEND_PORT...${RESET}"
        nohup npm run dev > ../frontend.log 2>&1 &
        FRONTEND_PID=$!
        echo $FRONTEND_PID > "$FRONTEND_PID_FILE"
        
        # Wait for frontend to be ready
        wait_for_service "http://localhost:$FRONTEND_PORT"
        
        echo -e "${GREEN}✅ Frontend server is ready on port $FRONTEND_PORT${RESET}"
    else
        echo -e "${GREEN}🔨 Building frontend for production...${RESET}"
        npm run build >/dev/null 2>&1
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Failed to build frontend${RESET}"
            exit 1
        fi
        echo -e "${GREEN}✅ Frontend built successfully${RESET}"
    fi
    cd ..
fi

# Show success message
echo
echo -e "${GREEN}🎉 Dpro Agent Player is now running!${RESET}"
echo "┌─────────────────────────────────────────────────────────┐"
if [ "$FRONTEND_ONLY" != true ]; then
    echo "│ 🔧 Backend API:  http://localhost:$BACKEND_PORT                     │"
    echo "│ 📚 API Docs:     http://localhost:$BACKEND_PORT/docs              │"
fi
if [ "$BACKEND_ONLY" != true ] && [ "$DEV_MODE" = true ]; then
    echo "│ 🎨 Frontend UI:  http://localhost:$FRONTEND_PORT                     │"
fi
echo "│                                                         │"
echo "│ 🛡️  100% Localhost - Your data stays private           │"
echo "│ 🔐 GDPR Compliant - International privacy standards    │"
echo "│ 🤖 AI Agents Ready - OpenAI & Anthropic support       │"
echo "└─────────────────────────────────────────────────────────┘"
echo

# Open browser if requested
if [ "$AUTO_BROWSER" = true ]; then
    if [ "$BACKEND_ONLY" != true ] && [ "$DEV_MODE" = true ]; then
        sleep 3
        open_browser "http://localhost:$FRONTEND_PORT"
    elif [ "$BACKEND_ONLY" = true ]; then
        sleep 3
        open_browser "http://localhost:$BACKEND_PORT/docs"
    fi
fi

echo
echo -e "${YELLOW}💡 Press Ctrl+C to stop all services${RESET}"
echo -e "${YELLOW}💡 Logs are available in backend.log and frontend.log${RESET}"
echo

# Monitor loop
while true; do
    sleep 30
    
    # Check if processes are still running
    if [ "$FRONTEND_ONLY" != true ] && [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
            echo -e "${RED}❌ Backend process has stopped unexpectedly${RESET}"
            break
        fi
    fi
    
    if [ "$BACKEND_ONLY" != true ] && [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
            echo -e "${RED}❌ Frontend process has stopped unexpectedly${RESET}"
            break
        fi
    fi
done

# Cleanup on exit
cleanup 