# Dpro AI Agent - Backend

FastAPI-based backend server for the Dpro AI Agent system.

## 🚀 Quick Start

### First Time Setup
```bash
.\setup_env.bat
```

### Run Server
```bash
.\run_python.bat
```

### Manual Run (Advanced)
```bash
.venv\Scripts\activate
python main.py
```

## 🔗 URLs

- **Server**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Admin**: http://localhost:8000/admin

## 📁 Important Files

- `main.py` - Main server file
- `setup_env.bat` - Environment setup
- `run_python.bat` - Quick run script
- `.env` - Configuration file
- `requirements.txt` - Python dependencies

## 🔧 Configuration

Edit `.env` file to configure:
- Database URL
- AI API keys
- Server settings
- CORS origins

## 🧪 Testing

```bash
python -c "import fastapi; print('FastAPI works!')"
```

## 📋 Requirements

- Python 3.9+
- Virtual environment (.venv)
- All packages in requirements.txt

## Features

✅ Ultra-fast authentication (no bcrypt delays)
✅ Main agents management
✅ Child agents with parent relationships
✅ Profile settings with API key management
✅ Workflow boards
✅ Comprehensive error handling
✅ Database auto-schema management
✅ WebSocket support

---

**System Status**: ✅ Ready for Production
**Version**: 2.1.0 