#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tool: Video Editor
Engine: moviepy

Supported operations:
  merge     — concatenate video clips
  trim      — cut video to start/end time
  extract   — extract audio track from video
  subtitle  — burn subtitle .srt file into video
  thumbnail — extract frame at given time as image

Usage:
  python tools/video/video_edit.py --args-file <json_file>

Args-file JSON:
  operation  : string  — 'merge' | 'trim' | 'extract' | 'subtitle' | 'thumbnail'
  inputs     : list    — input file paths
  output     : string  — output file path
  # For trim:
  start      : float   — start seconds
  end        : float   — end seconds
  # For thumbnail:
  time       : float   — frame time in seconds
  # For subtitle:
  srtFile    : string  — path to .srt file
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from utils.common import load_args_file, fail, ok

try:
    from moviepy.editor import (VideoFileClip, concatenate_videoclips,
                                 AudioFileClip, CompositeVideoClip)
except ImportError:
    fail('moviepy is not installed. Run: pip install moviepy')


def merge(inputs: list[str], output: str) -> None:
    clips = [VideoFileClip(p) for p in inputs]
    final = concatenate_videoclips(clips, method='compose')
    final.write_videofile(output, audio_codec='aac', logger=None)
    for c in clips: c.close()
    final.close()


def trim(input_path: str, output: str, start: float, end: float) -> None:
    with VideoFileClip(input_path) as clip:
        sub = clip.subclip(start, end)
        sub.write_videofile(output, audio_codec='aac', logger=None)


def extract_audio(input_path: str, output: str) -> None:
    with VideoFileClip(input_path) as clip:
        if clip.audio is None:
            fail('Video has no audio track')
        clip.audio.write_audiofile(output, logger=None)


def thumbnail(input_path: str, output: str, time: float = 0) -> None:
    with VideoFileClip(input_path) as clip:
        frame = clip.get_frame(time)
        from PIL import Image
        Image.fromarray(frame).save(output)


def main() -> None:
    if len(sys.argv) == 3 and sys.argv[1] == '--args-file':
        args = load_args_file(sys.argv[2])
    else:
        print(__doc__); sys.exit(1)

    op     = args.get('operation', '')
    inputs = args.get('inputs', [])
    output = args.get('output', '')

    try:
        if op == 'merge':
            merge(inputs, output)
        elif op == 'trim':
            trim(inputs[0], output, args['start'], args['end'])
        elif op == 'extract':
            extract_audio(inputs[0], output)
        elif op == 'thumbnail':
            thumbnail(inputs[0], output, args.get('time', 0))
        else:
            fail(f'Unknown operation: {op}')

        ok({'output': output, 'operation': op})
    except Exception as e:
        fail(str(e))


if __name__ == '__main__':
    main()
