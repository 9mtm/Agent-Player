#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tool: Text-to-Speech (TTS) using Google TTS
Engine: gTTS (free, multilingual, more reliable than edge-tts)

Usage:
  python tools/tts/tts_gtts.py --args-file <json_file>
"""

import sys
from pathlib import Path

# Allow running from any working directory
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from utils.common import detect_language, load_args_file, fail

try:
    from gtts import gTTS
except ImportError:
    fail('gTTS is not installed. Run: pip install gTTS')


# Language mapping
LANG_MAP = {
    'ar': 'ar',  # Arabic
    'de': 'de',  # German
    'fr': 'fr',  # French
    'es': 'es',  # Spanish
    'it': 'it',  # Italian
    'ru': 'ru',  # Russian
    'zh': 'zh-CN',  # Chinese
    'ja': 'ja',  # Japanese
    'ko': 'ko',  # Korean
    'pt': 'pt',  # Portuguese
    'tr': 'tr',  # Turkish
    'nl': 'nl',  # Dutch
    'pl': 'pl',  # Polish
    'en': 'en',  # English
}


def generate(text: str, language: str = 'auto') -> str:
    """Generate speech and return output path"""
    if language == 'auto':
        language = detect_language(text)

    # Map to gTTS language code
    lang_code = LANG_MAP.get(language, 'en')

    # Generate TTS
    tts = gTTS(text=text, lang=lang_code, slow=False)
    return tts


def main() -> None:
    # Load args from JSON file
    if len(sys.argv) == 3 and sys.argv[1] == '--args-file':
        args = load_args_file(sys.argv[2])
        text = args['text']
        output_path = args['outputPath']
        language = args.get('language', 'auto')
    else:
        print(__doc__)
        sys.exit(1)

    # Generate and save
    try:
        tts = generate(text, language)
        tts.save(output_path)
        print(f'OK:{output_path}')
    except Exception as e:
        print(f'ERROR: {str(e)}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
