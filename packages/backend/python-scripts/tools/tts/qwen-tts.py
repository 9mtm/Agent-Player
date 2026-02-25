"""
Qwen3-TTS Integration Script
Generates high-quality speech from text using Alibaba's Qwen3-TTS model
Supports voice cloning from 3-second audio samples
"""

import sys
import json
import argparse
import warnings
warnings.filterwarnings('ignore')

def main():
    parser = argparse.ArgumentParser(description='Qwen3-TTS Generator')
    parser.add_argument('--args-file', type=str, help='JSON file with arguments')
    parser.add_argument('--text', type=str, help='Text to synthesize')
    parser.add_argument('--voice', type=str, default='default', help='Voice ID or "clone" for voice cloning')
    parser.add_argument('--output', type=str, help='Output audio file path')
    parser.add_argument('--language', type=str, default='auto', help='Language code (en, ar, zh, etc.)')
    parser.add_argument('--reference-audio', type=str, help='Path to reference audio for voice cloning (3+ seconds)')
    parser.add_argument('--emotion', type=str, help='Emotion/tone instruction (e.g., "cheerful", "sad", "professional")')

    args = parser.parse_args()

    # Load args from JSON file if provided
    if args.args_file:
        with open(args.args_file, 'r', encoding='utf-8') as f:
            json_args = json.load(f)
            args.text = json_args.get('text', args.text)
            args.voice = json_args.get('voice', args.voice)
            args.output = json_args.get('outputPath', args.output)
            args.language = json_args.get('language', args.language)
            args.reference_audio = json_args.get('referenceAudio', args.reference_audio)
            args.emotion = json_args.get('emotion', args.emotion)

    if not args.text:
        print(json.dumps({'error': 'No text provided'}), file=sys.stderr)
        sys.exit(1)

    try:
        import torch
        import soundfile as sf
        from qwen_tts import Qwen3TTSModel

        # Determine which model to use based on mode
        if args.voice == 'clone' and args.reference_audio:
            # Voice Cloning Mode
            print(f"[Qwen3-TTS] Loading voice cloning model...", file=sys.stderr)
            model_name = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"

            model = Qwen3TTSModel.from_pretrained(
                model_name,
                device_map="auto",
                dtype=torch.float16,  # Use float16 for CPU/GPU compatibility
            )

            print(f"[Qwen3-TTS] Voice cloning from: {args.reference_audio}", file=sys.stderr)

            # Generate with voice cloning
            wavs, sr = model.generate_voice_clone(
                text=args.text,
                language=map_language(args.language),
                ref_audio=args.reference_audio,
                ref_text="",  # Auto-transcribe if empty
            )

        elif args.emotion:
            # Voice Design Mode (with emotion control)
            print(f"[Qwen3-TTS] Loading voice design model...", file=sys.stderr)
            model_name = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"

            model = Qwen3TTSModel.from_pretrained(
                model_name,
                device_map="auto",
                dtype=torch.float16,
            )

            print(f"[Qwen3-TTS] Voice design with emotion: {args.emotion}", file=sys.stderr)

            # Generate with emotional control
            wavs, sr = model.generate_voice_design(
                text=args.text,
                language=map_language(args.language),
                instruct=args.emotion,
            )

        else:
            # Standard Custom Voice Mode
            print(f"[Qwen3-TTS] Loading custom voice model...", file=sys.stderr)
            model_name = "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"

            model = Qwen3TTSModel.from_pretrained(
                model_name,
                device_map="auto",
                dtype=torch.float16,
            )

            # Map voice ID to speaker name
            speaker_name = map_speaker(args.voice, args.language)
            print(f"[Qwen3-TTS] Using speaker: {speaker_name}", file=sys.stderr)

            # Generate standard voice
            wavs, sr = model.generate_custom_voice(
                text=args.text,
                language=map_language(args.language),
                speaker=speaker_name,
            )

        # Save audio file
        sf.write(args.output, wavs[0].cpu().numpy() if hasattr(wavs[0], 'cpu') else wavs[0], sr)

        # Return success
        output = {
            'success': True,
            'outputPath': args.output,
            'sampleRate': sr
        }
        print(json.dumps(output))

    except ImportError as e:
        error_msg = (
            "Qwen3-TTS not installed. Please run:\n"
            "pip install -U qwen-tts torch soundfile\n\n"
            "For GPU support:\n"
            "pip install -U qwen-tts[gpu]"
        )
        print(json.dumps({'error': error_msg, 'details': str(e)}), file=sys.stderr)
        sys.exit(1)

    except Exception as e:
        print(json.dumps({'error': f'TTS generation failed: {str(e)}'}), file=sys.stderr)
        sys.exit(1)

def map_language(lang_code):
    """Map language codes to Qwen3-TTS language names"""
    lang_map = {
        'en': 'English',
        'ar': 'Arabic',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'de': 'German',
        'fr': 'French',
        'ru': 'Russian',
        'pt': 'Portuguese',
        'es': 'Spanish',
        'it': 'Italian',
        'auto': 'English',  # Default
    }
    return lang_map.get(lang_code, 'English')

def map_speaker(voice_id, language):
    """Map voice IDs to Qwen3-TTS speaker names

    Supported speakers: aiden, dylan, eric, ono_anna, ryan, serena, sohee, uncle_fu, vivian
    """
    # Chinese voices → uncle_fu
    if 'zh' in voice_id or language == 'Chinese':
        return "uncle_fu"

    # Japanese/Korean voices → ono_anna, sohee
    elif 'ja' in voice_id:
        return "ono_anna"
    elif 'ko' in voice_id:
        return "sohee"

    # Arabic voices → ono_anna (neutral)
    elif 'ar' in voice_id or language == 'Arabic':
        return "ono_anna"

    # English and other languages → ryan (male) or serena (female)
    elif '-m' in voice_id:
        return "ryan"  # Male voice
    else:
        return "serena"  # Female voice (default)

if __name__ == '__main__':
    main()
