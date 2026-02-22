'use client';

import { Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useMicVAD } from '@ricky0123/vad-react';
import { Mic, MicOff, Loader2, Volume2, VolumeX } from 'lucide-react';
import { config } from '@/lib/config';

const AvatarViewer = dynamic(
  () => import('@/components/avatar/AvatarViewer').then((mod) => ({ default: mod.AvatarViewer })),
  { ssr: false, loading: () => <WidgetLoader /> }
);

// ── Types ──────────────────────────────────────────────────────────────────────
type ConvMode = 'idle' | 'listening' | 'processing' | 'speaking';

const CDN_MALE_IDLE   = 'https://readyplayerme-assets.s3.amazonaws.com/animations/visage/male-idle.glb';
const CDN_FEMALE_IDLE = 'https://readyplayerme-assets.s3.amazonaws.com/animations/visage/female-idle.glb';

const TALK_ANIM_MALE   = '/animations/masculine/expression/M_Talking_Variations_001.glb';
const TALK_ANIM_FEMALE = '/animations/feminine/expression/F_Talking_Variations_001.glb';
const THINK_ANIM_MALE  = '/animations/masculine/expression/M_Standing_Expressions_002.glb';
const THINK_ANIM_FEMALE = '/animations/feminine/expression/M_Standing_Expressions_002.glb';

function WidgetLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
    </div>
  );
}

function float32ToWav(samples: Float32Array, sampleRate = 16000): Blob {
  const len = samples.length;
  const buf = new ArrayBuffer(44 + len * 2);
  const view = new DataView(buf);
  const write = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };
  write(0, 'RIFF'); view.setUint32(4, 36 + len * 2, true);
  write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); write(36, 'data');
  view.setUint32(40, len * 2, true);
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

function cleanTextForTTS(text: string): string {
  return text
    .replace(/\[ANIM:[a-z_]+\]/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_{1,2}(.+?)_{1,2}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[\s]*[-*•]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[★☆✓✗✔✘⭐❤💯🔥💫✨⚡🎉🎊]/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectLang(text: string): string {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  if (arabicChars > text.length * 0.15) return 'ar';
  return 'auto'; // let Python edge-tts detect German, French, Spanish, etc.
}

// ── Status ring around the mic button ─────────────────────────────────────────
function StatusRing({ mode }: { mode: ConvMode }) {
  const colors: Record<ConvMode, string> = {
    idle:       'border-gray-600',
    listening:  'border-green-500 animate-pulse',
    processing: 'border-yellow-500 animate-spin',
    speaking:   'border-blue-500 animate-pulse',
  };
  return (
    <div className={`absolute inset-0 rounded-full border-2 pointer-events-none ${colors[mode]}`} />
  );
}

// ── Widget content ─────────────────────────────────────────────────────────────
function WidgetContent() {
  const searchParams = useSearchParams();
  const rawAvatarUrl = searchParams.get('url') || '';
  const preset       = (searchParams.get('preset') as 'bust' | 'face') || 'bust';
  const gender       = (searchParams.get('gender') as 'male' | 'female') || 'male';
  const bgParam      = searchParams.get('bg') || null;

  const [avatarUrl, setAvatarUrl] = useState('');
  const [mode, setMode]           = useState<ConvMode>('idle');
  const [isMuted, setIsMuted]     = useState(false);
  const [vadEnabled, setVadEnabled] = useState(false);
  const [animUrl, setAnimUrl]     = useState(gender === 'male' ? CDN_MALE_IDLE : CDN_FEMALE_IDLE);
  const [lastText, setLastText]   = useState('');

  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const audioCallbackRef = useCallback((el: HTMLAudioElement | null) => setAudioElement(el), []);
  const processingRef = useRef(false);
  const modeRef       = useRef<ConvMode>('idle');
  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const vadRef        = useRef<ReturnType<typeof useMicVAD> | null>(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { audioRef.current = audioElement; }, [audioElement]);

  // Cache check
  useEffect(() => {
    if (!rawAvatarUrl) return;
    if (!rawAvatarUrl.startsWith('http')) { setAvatarUrl(rawAvatarUrl); return; }
    fetch(`/api/avatar-model?url=${encodeURIComponent(rawAvatarUrl)}`)
      .then(r => r.json())
      .then(data => {
        setAvatarUrl(data.localUrl || rawAvatarUrl);
        if (!data.localUrl) {
          fetch('/api/avatar-model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ glbUrl: rawAvatarUrl }),
          }).catch(() => {});
        }
      })
      .catch(() => setAvatarUrl(rawAvatarUrl));
  }, [rawAvatarUrl]);

  // Run chat + TTS
  const runChat = useCallback(async (userText: string) => {
    setMode('processing');
    setLastText('');
    const thinkUrl = gender === 'male' ? THINK_ANIM_MALE : THINK_ANIM_FEMALE;
    setAnimUrl(thinkUrl);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userText }],
          systemPrompt: `You are a helpful assistant. Reply naturally and concisely in 1-3 sentences. Reply in the same language as the user.`,
        }),
      });
      if (!res.ok) throw new Error('AI error');

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      const cleanText = cleanTextForTTS(fullText);
      setLastText(cleanText);

      if (!cleanText) { setMode('idle'); processingRef.current = false; return; }

      const lang = detectLang(cleanText);
      const ttsRes = await fetch(`${config.backendUrl}/api/audio/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, language: lang }),
      });
      if (!ttsRes.ok) { setMode('idle'); processingRef.current = false; return; }

      const ttsData = await ttsRes.json();
      if (!ttsData.success || !ttsData.audioUrl) { setMode('idle'); processingRef.current = false; return; }

      const audioRes = await fetch(`${config.backendUrl}${ttsData.audioUrl}`);
      const blob = await audioRes.blob();
      const blobUrl = URL.createObjectURL(blob);

      const talkUrl = gender === 'male' ? TALK_ANIM_MALE : TALK_ANIM_FEMALE;
      setAnimUrl(talkUrl);

      if (audioElement) {
        if (audioElement.src.startsWith('blob:')) URL.revokeObjectURL(audioElement.src);
        audioElement.src = blobUrl;
        audioElement.muted = isMuted;
        setMode('speaking');
        try { await audioElement.play(); } catch { /* autoplay blocked */ }
      }
    } catch {
      setMode('idle');
    } finally {
      processingRef.current = false;
    }
  }, [audioElement, isMuted, gender]);

  const handleAudioEnded = useCallback(() => {
    const idleUrl = gender === 'male' ? CDN_MALE_IDLE : CDN_FEMALE_IDLE;
    setAnimUrl(idleUrl);
    setMode(vadEnabled ? 'listening' : 'idle');
    if (vadEnabled) vadRef.current?.start();
  }, [gender, vadEnabled]);

  // Voice pipeline
  const runPipeline = useCallback(async (audio: Float32Array) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setMode('processing');
    try {
      const wavBlob = float32ToWav(audio);
      const form = new FormData();
      form.append('file', wavBlob, 'speech.wav');
      const sttRes = await fetch(`${config.backendUrl}/api/audio/transcribe`, { method: 'POST', body: form });
      if (!sttRes.ok) throw new Error('STT failed');
      const sttData = await sttRes.json();
      const userText = sttData.transcript?.trim();
      if (!userText) { setMode(vadEnabled ? 'listening' : 'idle'); processingRef.current = false; return; }
      await runChat(userText);
    } catch {
      setMode(vadEnabled ? 'listening' : 'idle');
      processingRef.current = false;
    }
  }, [vadEnabled, runChat]);

  const vad = useMicVAD({
    startOnLoad: false,
    model: 'v5',
    baseAssetPath: '/',
    onnxWASMBasePath: '/',
    onSpeechStart: () => {
      if (modeRef.current === 'speaking') {
        const audio = audioRef.current;
        if (audio) { audio.pause(); audio.src = ''; }
        setMode('idle');
      }
      if (modeRef.current !== 'processing') setMode('listening');
    },
    onSpeechEnd: (audio) => {
      vadRef.current?.pause();
      runPipeline(audio);
    },
  });
  vadRef.current = vad;

  const toggleVAD = () => {
    if (vadEnabled) { vadRef.current?.pause(); setVadEnabled(false); setMode('idle'); }
    else            { vadRef.current?.start(); setVadEnabled(true);  setMode('listening'); }
  };

  const micLabel: Record<ConvMode, string> = {
    idle:       'Tap to speak',
    listening:  'Listening…',
    processing: 'Thinking…',
    speaking:   'Speaking…',
  };

  return (
    <div
      className="relative flex flex-col items-center justify-end w-full h-screen"
      style={{ userSelect: 'none', background: bgParam || '#0a0a0a' }}
    >
      {/* ── 3D canvas — full background ── */}
      <div
        className="absolute inset-0 overflow-hidden"
      >
        {avatarUrl ? (
          <AvatarViewer
            avatarUrl={avatarUrl}
            isPlaying={mode === 'speaking'}
            audioElement={audioElement}
            animationUrl={animUrl}
            avatarY={preset === 'face' ? -2.0 : -1.5}
            transparent={false}
            initialPreset={preset === 'face' ? 'face' : 'bust'}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400" />
          </div>
        )}
      </div>

      {/* ── Last spoken text ── */}
      {lastText && mode !== 'listening' && (
        <div
          className="relative z-10 mb-2 mx-2 px-3 py-1.5 rounded-xl text-xs text-white text-center leading-snug max-w-[220px]"
          style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)' }}
        >
          {lastText.length > 80 ? lastText.slice(0, 80) + '…' : lastText}
        </div>
      )}

      {/* ── Controls row ── */}
      <div className="relative z-10 flex items-center gap-3 mb-1">
        {/* Mute button */}
        <button
          onClick={() => { if (audioElement) audioElement.muted = !isMuted; setIsMuted(m => !m); }}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted
            ? <VolumeX className="w-3.5 h-3.5 text-gray-400" />
            : <Volume2 className="w-3.5 h-3.5 text-gray-300" />}
        </button>

        {/* Main mic button */}
        <div className="relative">
          <button
            onClick={toggleVAD}
            disabled={mode === 'processing'}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-60"
            style={{
              background: vadEnabled
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              boxShadow: vadEnabled
                ? '0 0 16px rgba(239,68,68,0.5), 0 4px 12px rgba(0,0,0,0.4)'
                : '0 0 16px rgba(99,102,241,0.5), 0 4px 12px rgba(0,0,0,0.4)',
            }}
            title={vadEnabled ? 'Stop' : 'Start voice chat'}
          >
            {mode === 'processing'
              ? <Loader2 className="w-6 h-6 text-white animate-spin" />
              : vadEnabled
                ? <MicOff className="w-6 h-6 text-white" />
                : <Mic className="w-6 h-6 text-white" />
            }
          </button>
          <StatusRing mode={mode} />
        </div>

        {/* Spacer to balance layout */}
        <div className="w-8" />
      </div>

      {/* ── Status label ── */}
      <p className="relative z-10 text-[10px] text-gray-500 mb-0.5">
        {micLabel[mode]}
      </p>

      {/* Hidden audio */}
      <audio
        ref={audioCallbackRef}
        onEnded={handleAudioEnded}
        muted={isMuted}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AvatarWidgetPage() {
  return (
    <div
      className="w-screen h-screen overflow-hidden"
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={<WidgetLoader />}>
        <WidgetContent />
      </Suspense>
    </div>
  );
}
