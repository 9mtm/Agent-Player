#!/bin/bash
# Setup Local Voice Processing (faster-whisper + Coqui TTS)

echo "🎤 Setting up Local Voice Processing..."
echo ""

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $python_version"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "⬇️  Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "1. Activate environment: source venv/bin/activate"
echo "2. Test STT: python stt.py test-audio.mp3"
echo "3. Test TTS: python tts.py 'Hello World' en output.mp3"
echo ""
echo "💡 Models will be downloaded on first use (~1-2GB)"
