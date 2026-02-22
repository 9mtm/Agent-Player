'use client';

import { useEffect, useRef } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { useVoiceConversation } from '@/hooks/useVoiceConversation';

interface VoiceConversationModeProps {
  onTranscript: (text: string) => void;
  onSendMessage: (text: string) => Promise<string>;
  className?: string;
}

export function VoiceConversationMode({
  onTranscript,
  onSendMessage,
  className = '',
}: VoiceConversationModeProps) {
  const {
    state,
    setState,
    isActive,
    transcribe,
    speak,
    stop,
    startConversation,
  } = useVoiceConversation();

  const processingRef = useRef(false);

  // Voice Activity Detection
  const vad = useMicVAD({
    startOnLoad: false,
    onSpeechStart: () => {
      if (isActive && !processingRef.current) {
        console.log('[VAD] Speech started');
      }
    },
    onSpeechEnd: async (audio) => {
      if (!isActive || processingRef.current) return;

      processingRef.current = true;
      console.log('[VAD] Speech ended, processing...');

      try {
        // Convert audio to blob
        const audioBlob = new Blob([audio], { type: 'audio/wav' });

        // Transcribe
        setState('processing');
        const transcript = await transcribe(audioBlob);
        console.log('[VAD] Transcript:', transcript);

        if (!transcript || transcript.trim().length === 0) {
          console.log('[VAD] Empty transcript, resuming listening');
          setState('listening');
          processingRef.current = false;
          return;
        }

        // Show transcript to user
        onTranscript(transcript);

        // Send to chat and get response
        const response = await onSendMessage(transcript);
        console.log('[VAD] Agent response:', response);

        // Speak the response
        setState('speaking');
        await speak(response);

        // Resume listening if conversation is still active
        if (isActive) {
          setState('listening');
        }
      } catch (error) {
        console.error('[VAD] Error:', error);
        setState('listening');
      } finally {
        processingRef.current = false;
      }
    },
    onVADMisfire: () => {
      console.log('[VAD] Misfire detected');
    },
  });

  // Start/stop VAD based on conversation state
  useEffect(() => {
    if (isActive && state === 'listening') {
      vad.start();
    } else {
      vad.pause();
    }

    return () => {
      vad.pause();
    };
  }, [isActive, state]);

  const toggleConversation = () => {
    if (isActive) {
      vad.pause();
      stop();
    } else {
      startConversation();
    }
  };

  return (
    <div className={`voice-conversation ${className}`}>
      {/* Idle State - Start Button */}
      {state === 'idle' && (
        <button
          onClick={toggleConversation}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          <MicOff className="w-5 h-5" />
          <span>Start Voice Conversation</span>
        </button>
      )}

      {/* Listening State */}
      {state === 'listening' && (
        <div className="flex flex-col items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-500">
          <div className="flex items-center gap-2">
            <Mic className={`w-6 h-6 text-blue-500 ${vad.userSpeaking ? 'animate-pulse' : ''}`} />
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {vad.userSpeaking ? 'Listening... Speak now' : 'Ready to listen'}
            </p>
          </div>

          {/* Waveform visualization */}
          {vad.userSpeaking && (
            <div className="flex items-center gap-1 h-8">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-blue-500 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}

          <button
            onClick={toggleConversation}
            className="px-3 py-1.5 text-sm rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Stop Conversation
          </button>
        </div>
      )}

      {/* Processing State */}
      {state === 'processing' && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-500">
          <Loader2 className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-spin" />
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
            Processing your message...
          </p>
        </div>
      )}

      {/* Speaking State */}
      {state === 'speaking' && (
        <div className="flex flex-col items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-500">
          <div className="flex items-center gap-2">
            <Volume2 className="w-6 h-6 text-green-500 animate-pulse" />
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Agent is speaking...
            </p>
          </div>
          <p className="text-xs text-green-600 dark:text-green-400">
            Will resume listening after response
          </p>
        </div>
      )}
    </div>
  );
}
