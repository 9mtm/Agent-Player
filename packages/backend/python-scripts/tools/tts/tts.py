#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tool: Text-to-Speech (TTS)
Engine: Google TTS via gTTS (free, no API key, multilingual, reliable)
Fallback: Microsoft Edge TTS via edge-tts

Supported languages (auto-detected or explicit):
  ar  Arabic    de  German    fr  French    es  Spanish
  it  Italian   ru  Russian   zh  Chinese   ja  Japanese
  ko  Korean    pt  Portuguese  tr  Turkish  nl  Dutch
  pl  Polish    en  English (default)

Usage:
  python tools/tts/tts.py --args-file <json_file>
  python tools/tts/tts.py <text> <voice> <output_path> [language]

Args-file JSON keys:
  text        : string  — text to speak
  voice       : string  — voice ID (alloy / echo / fable / onyx / nova / shimmer)
  outputPath  : string  — path to save the .mp3 file
  language    : string  — 'auto' (default) | BCP-47 code e.g. 'ar', 'de', 'fr'
"""

import sys
import asyncio
from pathlib import Path

# Allow running from any working directory
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from utils.common import detect_language, load_args_file, fail

# Try to import gTTS first (more reliable)
try:
    from gtts import gTTS
    USE_GTTS = True
except ImportError:
    USE_GTTS = False

# Fallback to edge-tts if gTTS not available
if not USE_GTTS:
    try:
        import edge_tts
    except ImportError:
        fail('Neither gTTS nor edge-tts is installed. Run: pip install gTTS')


# ─── Voice mapping: OpenAI voice IDs → Microsoft Neural voices ───────────────
VOICES: dict[str, str] = {
    'alloy':         'en-US-JennyNeural',
    'echo':          'en-US-GuyNeural',
    'fable':         'en-GB-SoniaNeural',
    'onyx':          'en-US-AriaNeural',
    'nova':          'en-US-AnaNeural',
    'shimmer':       'en-US-SaraNeural',
    'arabic_female': 'ar-SA-ZariyahNeural',
    'arabic_male':   'ar-SA-HamedNeural',
}

# ─── Language → best Microsoft Neural voice (natural, native pronunciation) ──
LANG_VOICES: dict[str, str] = {
    'ar': 'ar-SA-ZariyahNeural',    # Arabic (Saudi)
    'de': 'de-DE-KatjaNeural',      # German
    'fr': 'fr-FR-DeniseNeural',     # French
    'es': 'es-ES-ElviraNeural',     # Spanish (Spain)
    'it': 'it-IT-ElsaNeural',       # Italian
    'ru': 'ru-RU-SvetlanaNeural',   # Russian
    'zh': 'zh-CN-XiaoxiaoNeural',   # Chinese (Mandarin)
    'ja': 'ja-JP-NanamiNeural',     # Japanese
    'ko': 'ko-KR-SunHiNeural',      # Korean
    'pt': 'pt-BR-FranciscaNeural',  # Portuguese (Brazil)
    'tr': 'tr-TR-EmelNeural',       # Turkish
    'nl': 'nl-NL-ColetteNeural',    # Dutch
    'pl': 'pl-PL-ZofiaNeural',      # Polish
}

# ─── gTTS Language mapping (simpler codes) ──
GTTS_LANG_MAP: dict[str, str] = {
    'ar': 'ar', 'de': 'de', 'fr': 'fr', 'es': 'es', 'it': 'it',
    'ru': 'ru', 'zh': 'zh-CN', 'ja': 'ja', 'ko': 'ko', 'pt': 'pt',
    'tr': 'tr', 'nl': 'nl', 'pl': 'pl', 'en': 'en',
}

DEFAULT_VOICE = 'en-US-JennyNeural'


def resolve_voice(voice_id: str, language: str) -> str:
    """Return the correct Microsoft Neural voice for the detected language."""
    lang_voice = LANG_VOICES.get(language)
    if lang_voice:
        return lang_voice
    return VOICES.get(voice_id, DEFAULT_VOICE)


def generate_gtts(text: str, language: str, output_path: str) -> None:
    """Generate TTS using Google TTS (gTTS) - more reliable, no WebSocket"""
    lang_code = GTTS_LANG_MAP.get(language, 'en')
    tts = gTTS(text=text, lang=lang_code, slow=False)
    tts.save(output_path)


async def generate_edge(text: str, voice_id: str, output_path: str, language: str) -> None:
    """Generate TTS using Microsoft Edge TTS - requires WebSocket connection"""
    import aiohttp

    voice = resolve_voice(voice_id, language)

    # Retry mechanism for network issues
    max_retries = 3
    retry_delay = 2  # seconds

    for attempt in range(max_retries):
        try:
            # Create connector with longer timeout
            timeout = aiohttp.ClientTimeout(total=60, connect=30, sock_read=30)
            connector = aiohttp.TCPConnector(force_close=True, enable_cleanup_closed=True)

            communicate = edge_tts.Communicate(text, voice)
            # Pass custom connector and timeout
            await communicate.save(output_path, connector=connector, timeout=timeout)
            return  # Success
        except Exception as e:
            if attempt < max_retries - 1:
                print(f'Retry {attempt + 1}/{max_retries} after error: {str(e)[:100]}', file=sys.stderr)
                await asyncio.sleep(retry_delay)
            else:
                raise  # Re-raise on final attempt


async def generate(text: str, voice_id: str, output_path: str,
                   language: str = 'auto') -> None:
    if language == 'auto':
        language = detect_language(text)

    if USE_GTTS:
        # Use gTTS (Google TTS) - more reliable, no WebSocket needed
        generate_gtts(text, language, output_path)
    else:
        # Use Edge TTS (Microsoft) - requires WebSocket
        await generate_edge(text, voice_id, output_path, language)


def main() -> None:
    # ── Mode 1: --args-file <json>  (Unicode-safe for Windows) ──────────────
    if len(sys.argv) == 3 and sys.argv[1] == '--args-file':
        args        = load_args_file(sys.argv[2])
        text        = args['text']
        voice_id    = args.get('voice', 'alloy')
        output_path = args['outputPath']
        language    = args.get('language', 'auto')

    # ── Mode 2: positional args ──────────────────────────────────────────────
    elif len(sys.argv) >= 4:
        text        = sys.argv[1]
        voice_id    = sys.argv[2]
        output_path = sys.argv[3]
        language    = sys.argv[4] if len(sys.argv) > 4 else 'auto'

    else:
        print(__doc__)
        sys.exit(1)

    asyncio.run(generate(text, voice_id, output_path, language))
    print(f'OK:{output_path}')


if __name__ == '__main__':
    main()
