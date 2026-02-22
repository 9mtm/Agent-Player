'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Loader2, Volume2 } from 'lucide-react';

interface VoicePlayerProps {
  text: string;
  backendUrl: string;
  voice?: string;
  /** When true, generates and plays audio immediately on mount (for live voice mode only) */
  autoPlay?: boolean;
  className?: string;
}

export function VoicePlayer({
  text,
  backendUrl,
  voice = 'alloy',
  autoPlay = false,
  className = '',
}: VoicePlayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Only auto-generate + play when explicitly requested (live voice mode)
  useEffect(() => {
    if (autoPlay) {
      generateAudio(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  const generateAudio = async (playAfter = false) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch(`${backendUrl}/api/audio/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      });

      if (!response.ok) throw new Error('TTS failed');

      const data = await response.json();
      const url = `${backendUrl}${data.audioUrl}`;
      setAudioUrl(url);

      // Play immediately after generation if requested
      if (playAfter) {
        // Small delay to let the audio element pick up the new src
        setTimeout(() => audioRef.current?.play(), 100);
      }
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayClick = async () => {
    if (!audioUrl) {
      // First click: generate then play
      await generateAudio(true);
      return;
    }
    togglePlayPause();
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    isPlaying ? audioRef.current.pause() : audioRef.current.play();
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setProgress(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => { setIsPlaying(false); setProgress(0); };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const t = parseFloat(e.target.value);
    audioRef.current.currentTime = t;
    setProgress(t);
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = 'agent-response.mp3';
    a.click();
  };

  const formatTime = (s: number) => {
    if (!isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  // Compact "play" button shown inline when audio not yet generated
  if (!audioUrl && !isLoading) {
    return (
      <button
        onClick={handlePlayClick}
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors ${className}`}
        title="Listen to this message"
      >
        <Volume2 className="w-3.5 h-3.5" />
        <span>Listen</span>
      </button>
    );
  }

  if (isLoading) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs text-gray-400 ${className}`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Generating audio...</span>
      </div>
    );
  }

  return (
    <div className={`voice-player mt-1 ${className}`}>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
        />
      )}

      <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs">
        <button
          onClick={togglePlayPause}
          className="p-1.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors flex-shrink-0"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-px" />}
        </button>

        <input
          type="range"
          min="0"
          max={duration || 0}
          value={progress}
          onChange={handleSeek}
          className="flex-1 h-1 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #3b82f6 ${(progress / (duration || 1)) * 100}%, #d1d5db ${(progress / (duration || 1)) * 100}%)`,
          }}
        />

        <span className="text-gray-500 font-mono min-w-[4rem] text-right">
          {formatTime(progress)} / {formatTime(duration)}
        </span>

        <button
          onClick={downloadAudio}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Download"
        >
          <Download className="w-3 h-3 text-gray-500" />
        </button>
      </div>
    </div>
  );
}
