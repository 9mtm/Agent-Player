#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tool: Speech-to-Text (STT)
Engine: faster-whisper (local, free, CPU/GPU, multilingual)

Usage:
  python tools/stt/stt.py <audio_file>
  python tools/stt/stt.py --args-file <json_file>

Args-file JSON keys:
  audioPath   : string  — path to the audio file
  model       : string  — model size: tiny | base | small | medium (default: small)
  language    : string  — force language code, or null for auto-detect

Output (stdout JSON):
  { "text": "...", "language": "ar", "duration": 3.14 }
"""

import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from utils.common import load_args_file, fail

try:
    from faster_whisper import WhisperModel
except ImportError:
    fail('faster-whisper is not installed. Run: pip install faster-whisper')


# ─── Default settings ─────────────────────────────────────────────────────────
DEFAULT_MODEL   = 'small'   # tiny/base/small/medium/large-v2/large-v3
DEFAULT_DEVICE  = 'cpu'     # 'cuda' if you have an NVIDIA GPU
DEFAULT_COMPUTE = 'int8'    # 'float16' for GPU


def transcribe(audio_path: str, model_size: str = DEFAULT_MODEL,
               language: str | None = None) -> dict:
    model = WhisperModel(model_size, device=DEFAULT_DEVICE, compute_type=DEFAULT_COMPUTE)

    segments, info = model.transcribe(
        audio_path,
        language=language or None,
        beam_size=5,
        best_of=5,
        temperature=0.0,
    )

    text = ' '.join(seg.text for seg in segments).strip()
    return {
        'text':     text,
        'language': info.language,
        'duration': round(info.duration, 2),
    }


def main() -> None:
    # ── Mode 1: --args-file ──────────────────────────────────────────────────
    if len(sys.argv) == 3 and sys.argv[1] == '--args-file':
        args       = load_args_file(sys.argv[2])
        audio_path = args['audioPath']
        model_size = args.get('model', DEFAULT_MODEL)
        language   = args.get('language', None)

    # ── Mode 2: positional ───────────────────────────────────────────────────
    elif len(sys.argv) >= 2:
        audio_path = sys.argv[1]
        model_size = DEFAULT_MODEL
        language   = None

    else:
        print(__doc__)
        sys.exit(1)

    try:
        result = transcribe(audio_path, model_size, language)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        fail(str(e))


if __name__ == '__main__':
    main()
