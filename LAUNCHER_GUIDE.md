# 🚀 Dpro Agent Player - Smart Launcher Guide

The easiest way to run Dpro Agent Player with automatic setup and management.

## 🎯 Quick Start

### Windows Users
```cmd
# Simply double-click the file or run in Command Prompt
dpro-agent-player.bat
```

### Linux/macOS Users
```bash
# Make executable and run
chmod +x dpro-agent-player.sh
./dpro-agent-player.sh
```

## 🛠️ Launcher Options

### Available Commands

| Option | Description | Example |
|--------|-------------|---------|
| `--help`, `-h` | Show help message | `./dpro-agent-player.sh --help` |
| `--backend-only` | Start only backend server | `./dpro-agent-player.sh --backend-only` |
| `--frontend-only` | Start only frontend server | `./dpro-agent-player.sh --frontend-only` |
| `--no-browser` | Don't open browser automatically | `./dpro-agent-player.sh --no-browser` |
| `--prod` | Start in production mode | `./dpro-agent-player.sh --prod` |
| `--port <PORT>` | Backend port (default: 8000) | `./dpro-agent-player.sh --port 9000` |
| `--frontend-port <PORT>` | Frontend port (default: 3000) | `./dpro-agent-player.sh --frontend-port 4000` |
| `--stop` | Stop all running services | `./dpro-agent-player.sh --stop` |

### Usage Examples

#### Development Mode (Default)
```bash
# Start both frontend and backend in development mode
./dpro-agent-player.sh

# Windows
dpro-agent-player.bat
```

#### Backend Only
```bash
# Perfect for API development or when using external frontend
./dpro-agent-player.sh --backend-only

# Windows
dpro-agent-player.bat --backend-only
```

#### Production Mode
```bash
# Build frontend and start optimized backend
./dpro-agent-player.sh --prod

# Windows
dpro-agent-player.bat --prod
```

#### Custom Ports
```bash
# Use custom ports
./dpro-agent-player.sh --port 9000 --frontend-port 4000

# Windows
dpro-agent-player.bat --port 9000 --frontend-port 4000
```

#### Silent Mode
```bash
# Start without opening browser
./dpro-agent-player.sh --no-browser

# Windows
dpro-agent-player.bat --no-browser
```

## 🎯 Features

### ✅ Automatic Setup
- **Dependency Detection**: Automatically checks for Python 3.9+ and Node.js 18+
- **Package Installation**: Installs Python packages (`pip install -r requirements.txt`)
- **Node Modules**: Installs frontend dependencies (`npm install`)
- **Error Handling**: Clear error messages with helpful suggestions

### ✅ Smart Process Management
- **Dual Process**: Manages both frontend and backend simultaneously
- **Health Checks**: Monitors service health and availability
- **Graceful Shutdown**: Clean process termination with Ctrl+C
- **Process Isolation**: Separate processes for better stability

### ✅ Browser Integration
- **Auto-Open**: Automatically opens browser when services are ready
- **Smart URLs**: Opens appropriate URLs based on mode
- **Cross-Platform**: Works on Windows, macOS, and Linux browsers

### ✅ Production Ready
- **Build Process**: Automatic frontend building for production
- **Optimization**: Production-optimized backend settings
- **Performance**: Uses Gunicorn in production when available

## 🔧 Technical Details

### System Requirements
- **Python**: 3.9 or higher
- **Node.js**: 18.0 or higher (for frontend)
- **pip**: Python package manager
- **npm**: Node.js package manager

### Directory Structure
```
Dpro-Agent-Player/
├── dpro-agent-player.bat     # Windows launcher
├── dpro-agent-player.sh      # Unix launcher
├── backend/                  # Python backend
│   ├── main.py              # Main application
│   └── requirements.txt     # Python dependencies
├── frontend/                 # React frontend
│   ├── package.json         # Node.js dependencies
│   └── src/                 # Source code
└── README.md                # Project documentation
```

### Process Management

#### Windows (.bat)
- Uses Windows Command Prompt commands
- PowerShell for health checks
- Proper Windows process handling
- Color-coded output support

#### Unix (.sh)
- Uses bash shell commands
- curl for health checks
- Signal handling (SIGTERM/SIGKILL)
- PID file management

### Logging
- **Backend Logs**: `backend.log` (Unix) or displayed in separate window (Windows)
- **Frontend Logs**: `frontend.log` (Unix) or displayed in separate window (Windows)
- **Launcher Logs**: Real-time status in launcher terminal

## 🚨 Troubleshooting

### Common Issues

#### Python Not Found
```
❌ Python not found! Please install Python 3.9+ first.
💡 Download from: https://www.python.org/downloads/
```
**Solution**: Install Python 3.9 or higher from the official website.

#### Node.js Not Found
```
❌ Node.js not found! Please install Node.js 18+ first.
💡 Download from: https://nodejs.org/
```
**Solution**: Install Node.js 18 or higher from the official website.

#### Port Already in Use
- The launcher will show a warning if ports are busy
- Use `--port` and `--frontend-port` to specify different ports
- Or stop other services using the same ports

#### Permission Denied (Unix)
```bash
# Make script executable
chmod +x dpro-agent-player.sh
```

#### Dependencies Installation Failed
- Check internet connection
- Ensure you have write permissions
- Try running as administrator (Windows) or with sudo (Unix)

### Health Check Failures
If health checks fail but services seem to be running:
- Wait a bit longer (services might still be starting)
- Check firewall settings
- Verify no other services are using the same ports

## 🛑 Stopping Services

### Manual Stop
- Press `Ctrl+C` in the launcher terminal
- The launcher will gracefully stop all services

### Command Stop (Unix only)
```bash
./dpro-agent-player.sh --stop
```

### Force Stop
If services don't stop gracefully:

#### Windows
- Close the command prompt windows
- Use Task Manager to end processes if needed

#### Unix
```bash
# Kill by port (if needed)
lsof -ti :8000 | xargs kill -9  # Backend
lsof -ti :3000 | xargs kill -9  # Frontend
```

## 🎉 Success Indicators

When everything is working correctly, you'll see:

```
🎉 Dpro Agent Player is now running!
┌─────────────────────────────────────────────────────────┐
│ 🔧 Backend API:  http://localhost:8000                     │
│ 📚 API Docs:     http://localhost:8000/docs              │
│ 🎨 Frontend UI:  http://localhost:3000                     │
│                                                         │
│ 🛡️  100% Localhost - Your data stays private           │
│ 🔐 GDPR Compliant - International privacy standards    │
│ 🤖 AI Agents Ready - OpenAI & Anthropic support       │
└─────────────────────────────────────────────────────────┘
```

## 📞 Support

If you encounter any issues:

1. **Check the logs** for detailed error information
2. **Verify system requirements** (Python 3.9+, Node.js 18+)
3. **Check internet connection** for dependency installation
4. **Review this guide** for common solutions
5. **Open an issue** on [GitHub](https://github.com/Dpro-at/Dpro-AI-Agent/issues)

---

**Made with ❤️ by the Dpro Team**

*The easiest way to run your AI Agent Player - just double-click and go!* 