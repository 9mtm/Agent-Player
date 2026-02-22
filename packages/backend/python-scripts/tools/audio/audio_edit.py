#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tool: Audio Editor
Engine: pydub + ffmpeg

Supported operations:
  merge     — merge multiple audio files into one
  trim      — trim audio to start/end time (seconds)
  normalize — normalize volume level
  convert   — convert format (mp3/wav/ogg/flac)
  speed     — change playback speed

Usage:
  python tools/audio/audio_edit.py --args-file <json_file>

Args-file JSON:
  operation  : string  — 'merge' | 'trim' | 'normalize' | 'convert' | 'speed'
  inputs     : list    — list of input file paths
  output     : string  — output file path
  format     : string  — output format (mp3, wav, ogg) — default: mp3
  # For trim:
  start      : float   — start time in seconds
  end        : float   — end time in seconds
  # For speed:
  rate       : float   — speed multiplier (0.5 = half speed, 2.0 = double)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from utils.common import load_args_file, fail, ok

try:
    from pydub import AudioSegment
except ImportError:
    fail('pydub is not installed. Run: pip install pydub')


def merge(inputs: list[str], output: str, fmt: str = 'mp3') -> None:
    combined = AudioSegment.empty()
    for path in inputs:
        combined += AudioSegment.from_file(path)
    combined.export(output, format=fmt)


def trim(input_path: str, output: str, start: float, end: float,
         fmt: str = 'mp3') -> None:
    audio = AudioSegment.from_file(input_path)
    trimmed = audio[int(start * 1000):int(end * 1000)]
    trimmed.export(output, format=fmt)


def normalize(input_path: str, output: str, fmt: str = 'mp3',
              target_dbfs: float = -14.0) -> None:
    audio = AudioSegment.from_file(input_path)
    change = target_dbfs - audio.dBFS
    normalized = audio.apply_gain(change)
    normalized.export(output, format=fmt)


def convert(input_path: str, output: str, fmt: str = 'mp3') -> None:
    AudioSegment.from_file(input_path).export(output, format=fmt)


def change_speed(input_path: str, output: str, rate: float,
                 fmt: str = 'mp3') -> None:
    audio = AudioSegment.from_file(input_path)
    fast = audio._spawn(audio.raw_data,
                        overrides={'frame_rate': int(audio.frame_rate * rate)})
    fast = fast.set_frame_rate(audio.frame_rate)
    fast.export(output, format=fmt)


def main() -> None:
    if len(sys.argv) == 3 and sys.argv[1] == '--args-file':
        args = load_args_file(sys.argv[2])
    else:
        print(__doc__); sys.exit(1)

    op     = args.get('operation', '')
    inputs = args.get('inputs', [])
    output = args.get('output', '')
    fmt    = args.get('format', 'mp3')

    try:
        if op == 'merge':
            merge(inputs, output, fmt)
        elif op == 'trim':
            trim(inputs[0], output, args['start'], args['end'], fmt)
        elif op == 'normalize':
            normalize(inputs[0], output, fmt, args.get('targetDbfs', -14.0))
        elif op == 'convert':
            convert(inputs[0], output, fmt)
        elif op == 'speed':
            change_speed(inputs[0], output, args['rate'], fmt)
        else:
            fail(f'Unknown operation: {op}')

        ok({'output': output, 'operation': op})
    except Exception as e:
        fail(str(e))


if __name__ == '__main__':
    main()
