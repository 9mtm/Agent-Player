#!/usr/bin/env python3
# Quick test for edge-tts
import asyncio
import edge_tts

async def test():
    voice = "en-US-JennyNeural"
    text = "Hello, this is a test."
    output = "test-output.mp3"

    print(f"Testing edge-tts with voice: {voice}")
    print(f"Text: {text}")

    try:
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(output)
        print(f"✅ Success! Audio saved to {output}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    asyncio.run(test())
