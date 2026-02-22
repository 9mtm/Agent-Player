@echo off
REM Setup Local Voice Processing (faster-whisper + Coqui TTS)

echo.
echo 🎤 Setting up Local Voice Processing...
echo.

REM Check Python version
python --version
echo.

REM Create virtual environment
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔌 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo ⬇️  Installing dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo ✅ Setup complete!
echo.
echo 📚 Next steps:
echo 1. Activate environment: venv\Scripts\activate.bat
echo 2. Test STT: python stt.py test-audio.mp3
echo 3. Test TTS: python tts.py "مرحبا" ar output.mp3
echo.
echo 💡 Models will be downloaded on first use (~1-2GB)
echo.

pause
