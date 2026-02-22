'use client';

import { useState, useCallback, useRef } from 'react';
import { config } from '@/lib/config';

export type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking';

interface UseVoiceConversationReturn {
  state: ConversationState;
  setState: (state: ConversationState) => void;
  isActive: boolean;
  currentAudio: HTMLAudioElement | null;
  transcribe: (audioBlob: Blob) => Promise<string>;
  speak: (text: string, voice?: string) => Promise<void>;
  stop: () => void;
  startConversation: () => void;
}

export function useVoiceConversation(): UseVoiceConversationReturn {
  const [state, setState] = useState<ConversationState>('idle');
  const [isActive, setIsActive] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Transcribe audio using backend API
   */
  const transcribe = useCallback(async (audioBlob: Blob): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      const response = await fetch(`${config.backendUrl}/api/audio/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.transcript || '';
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }, []);

  /**
   * Convert text to speech and play it
   */
  const speak = useCallback(async (text: string, voice: string = 'alloy'): Promise<void> => {
    try {
      // Request TTS
      const response = await fetch(`${config.backendUrl}/api/audio/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      });

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.statusText}`);
      }

      const data = await response.json();
      const audioUrl = `${config.backendUrl}${data.audioUrl}`;

      // Play audio
      return new Promise<void>((resolve, reject) => {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        setCurrentAudio(audio);

        audio.onended = () => {
          audioRef.current = null;
          setCurrentAudio(null);
          resolve();
        };

        audio.onerror = (error) => {
          audioRef.current = null;
          setCurrentAudio(null);
          reject(error);
        };

        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('TTS error:', error);
      throw error;
    }
  }, []);

  /**
   * Stop conversation and cleanup
   */
  const stop = useCallback(() => {
    // Stop audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setCurrentAudio(null);
    }

    // Reset state
    setIsActive(false);
    setState('idle');
  }, []);

  /**
   * Start conversation mode
   */
  const startConversation = useCallback(() => {
    setIsActive(true);
    setState('listening');
  }, []);

  return {
    state,
    setState,
    isActive,
    currentAudio,
    transcribe,
    speak,
    stop,
    startConversation,
  };
}
