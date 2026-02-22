'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useMicVAD } from '@ricky0123/vad-react';
import { Mic, MicOff, Volume2, VolumeX, X, Send } from 'lucide-react';
import { config } from '@/lib/config';

// ── Dynamic AvatarViewer (R3F — SSR off) ─────────────────────────────────────
const AvatarViewer = dynamic(
  () => import('@/components/avatar/AvatarViewer').then(m => ({ default: m.AvatarViewer })),
  { ssr: false, loading: () => <div className="w-full h-full bg-zinc-900 animate-pulse" /> },
);

// ── Expression heuristic ──────────────────────────────────────────────────────
import type { FacialExpression, LipsyncCue } from '@/components/avatar/AvatarViewer';

function detectExpression(text: string): FacialExpression {
  const t = text.toLowerCase();
  const angry = /\b(angry|frustrated|annoyed|upset|furious|rage)\b/;
  const sad   = /\b(sorry|sad|unfortunate|apolog|regret|miss you|miss you|مأسف|آسف)\b/;
  const surp  = /\b(wow|amazing|incredible|unbelievable|surprise|omg|whoa|wait what)\b/;
  const smile = /\b(great|wonderful|excellent|happy|glad|love|enjoy|congrat|perfect|awesome)\b/;
  if (angry.test(t)) return 'angry';
  if (sad.test(t))   return 'sad';
  if (surp.test(t))  return 'surprised';
  if (smile.test(t)) return 'smile';
  return null;
}

// ── Animation URLs ────────────────────────────────────────────────────────────
const IDLE_MALE   = 'https://readyplayerme-assets.s3.amazonaws.com/animations/visage/male-idle.glb';
const IDLE_FEMALE = 'https://readyplayerme-assets.s3.amazonaws.com/animations/visage/female-idle.glb';
const TALK_MALE   = '/animations/masculine/expression/M_Talking_Variations_001.glb';
const TALK_FEMALE = '/animations/feminine/expression/F_Talking_Variations_001.glb';
const THINK_MALE  = '/animations/masculine/expression/M_Standing_Expressions_002.glb';

// ── Audio helpers ─────────────────────────────────────────────────────────────
function float32ToWav(samples: Float32Array, sr = 16000): Blob {
  const len = samples.length;
  const buf = new ArrayBuffer(44 + len * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true);
  w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true);
  v.setUint16(34, 16, true); w(36, 'data');
  v.setUint32(40, len * 2, true);
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

function cleanTTS(t: string) {
  return t
    .replace(/\[ANIM:[a-z_]+\]/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[★☆✓✗⭐❤💯🔥💫✨⚡🎉]/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectLang(t: string) {
  return (t.match(/[\u0600-\u06FF]/g) || []).length > t.length * 0.15 ? 'ar' : 'auto';
}

// ── VAD sub-component ─────────────────────────────────────────────────────────
function VadController({
  listening,
  onSpeechStart,
  onSpeechEnd,
}: {
  listening: boolean;
  onSpeechStart: () => void;
  onSpeechEnd: (a: Float32Array) => void;
}) {
  const startRef = useRef(onSpeechStart);
  const endRef   = useRef(onSpeechEnd);
  useEffect(() => { startRef.current = onSpeechStart; }, [onSpeechStart]);
  useEffect(() => { endRef.current   = onSpeechEnd;   }, [onSpeechEnd]);

  const vad = useMicVAD({
    startOnLoad: true,
    model: 'v5',
    baseAssetPath: '/',
    onnxWASMBasePath: '/',
    onSpeechStart: useCallback(() => startRef.current(), []),
    onSpeechEnd:   useCallback((a: Float32Array) => endRef.current(a), []),
    onVADMisfire:  () => {},
  } as any);

  useEffect(() => {
    if (vad.loading) return;
    if (listening && !vad.listening) void vad.start();
    else if (!listening && vad.listening) void vad.pause();
  }, [listening, vad.loading, vad.listening]);

  return null;
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function Bubble({ role, text }: { role: 'user' | 'assistant'; text: string }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
        isUser
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : 'bg-muted text-foreground rounded-bl-sm'
      }`}>
        {text}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export interface SupportChatBlockProps {
  agentName?: string | null;
  height?: number | null;
  removable?: boolean | null;
  bgColor?: string | null;
}

export function SupportChatBlock({ agentName = 'Assistant', height = 500, removable = false, bgColor }: SupportChatBlockProps) {
  const [avatarUrl, setAvatarUrl]         = useState('');
  const [visible, setVisible]             = useState(true);
  const [muted, setMuted]                 = useState(false);
  const [micOn, setMicOn]                 = useState(false);
  const [mode, setMode]                   = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [animUrl, setAnimUrl]             = useState(IDLE_MALE);
  const [messages, setMessages]           = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [input, setInput]                 = useState('');
  const [audioEl, setAudioEl]             = useState<HTMLAudioElement | null>(null);
  const [expression, setExpression]       = useState<FacialExpression>(null);
  const [lipsyncCues, setLipsyncCues]     = useState<LipsyncCue[] | undefined>(undefined);
  const [savedBgColor, setSavedBgColor]   = useState('#09090b');
  const [savedBgScene, setSavedBgScene]   = useState<string>('none');

  const processingRef = useRef(false);
  const modeRef       = useRef(mode);
  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const totalHeight   = height ?? 500;
  const avatarHeight  = Math.round(totalHeight * 0.34);
  const gender        = avatarUrl.toLowerCase().includes('female') ? 'female' : 'male';

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { audioRef.current = audioEl; }, [audioEl]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Load avatar settings (URL + background color)
  useEffect(() => {
    // Try new multi-avatar system first, fall back to legacy settings for URL
    fetch(`${config.backendUrl}/api/avatars?userId=1`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.avatars?.length) {
          const active = data.avatars.find((a: { isActive: boolean }) => a.isActive) || data.avatars[0];
          const url = active.localGlbPath || active.glbUrl;
          if (url) setAvatarUrl(url);
        }
      })
      .catch(() => {});
    // Always load bg settings from avatar_settings
    fetch(`${config.backendUrl}/api/avatar/settings?userId=1`)
      .then(r => r.json())
      .then(d => {
        if (d.settings?.bgColor) setSavedBgColor(d.settings.bgColor);
        if (d.settings?.bgScene) setSavedBgScene(d.settings.bgScene);
        // Fallback: if no avatar from new system, use legacy URL
        if (d.settings?.rpmAvatarUrl) setAvatarUrl(prev => prev || d.settings.rpmAvatarUrl);
      })
      .catch(() => {});
  }, []);

  // Cache avatar GLB locally
  useEffect(() => {
    if (!avatarUrl || !avatarUrl.startsWith('http')) return;
    fetch(`/api/avatar-model?url=${encodeURIComponent(avatarUrl)}`)
      .then(r => r.json())
      .then(d => { if (d.localUrl) setAvatarUrl(d.localUrl); })
      .catch(() => {});
  }, [avatarUrl]);

  const audioCallback = useCallback((el: HTMLAudioElement | null) => setAudioEl(el), []);

  // Send text message
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || processingRef.current) return;
    processingRef.current = true;

    const userMsg = { role: 'user' as const, text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setMode('processing');
    setAnimUrl(gender === 'female' ? THINK_MALE : THINK_MALE);

    const resetIdle = () => {
      setMode('idle');
      setAnimUrl(gender === 'female' ? IDLE_FEMALE : IDLE_MALE);
      setExpression(null);
      setLipsyncCues(undefined);
      processingRef.current = false;
    };

    try {
      // Call backend directly — no session auth required for widget use
      // Backend always returns SSE stream; read it fully then use accumulated text
      const res = await fetch(`${config.backendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: text }], stream: true }),
      });

      let reply = '';
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
        // Read SSE stream and collect all text
        const reader = res.body?.getReader();
        const dec = new TextDecoder();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = dec.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;
              try {
                const json = JSON.parse(trimmed.slice(6));
                if (json.type === 'text' && json.content) reply += json.content;
                else if (!json.type && json.content) reply += json.content;
              } catch { /* skip */ }
            }
          }
        }
      } else {
        // Fallback: JSON response (Ollama non-stream)
        const data = await res.json();
        reply = (data.content ?? data.message?.content ?? data.message ?? '');
      }
      reply = reply.trim();
      if (!reply) { resetIdle(); return; }

      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      setAnimUrl(gender === 'female' ? TALK_FEMALE : TALK_MALE);
      setMode('speaking');

      // Detect facial expression from reply text
      setExpression(detectExpression(reply));

      if (!muted) {
        const cleaned = cleanTTS(reply);
        const lang    = detectLang(cleaned);

        // Use /api/avatar/speak — returns audio blob + X-Lipsync-Data header
        const ttsRes  = await fetch(`${config.backendUrl}/api/avatar/speak`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleaned, language: lang }),
        });

        if (ttsRes.ok) {
          // Read Rhubarb lipsync cues from header (if available)
          const lipsyncHeader = ttsRes.headers.get('X-Lipsync-Data');
          try {
            const cues: LipsyncCue[] = JSON.parse(lipsyncHeader ?? '[]');
            setLipsyncCues(cues.length > 0 ? cues : undefined);
          } catch { setLipsyncCues(undefined); }

          const blob = await ttsRes.blob();
          const url  = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioCallback(audio);
          audio.onended = () => {
            audioCallback(null);
            resetIdle();
          };
          audio.play().catch(() => {});
          return;
        }
      }
    } catch {}

    resetIdle();
  }, [gender, muted, audioCallback]);

  // VAD callbacks
  const onSpeechStart = useCallback(() => { if (!processingRef.current) setMode('listening'); }, []);
  const onSpeechEnd   = useCallback(async (audio: Float32Array) => {
    if (processingRef.current) return;
    const wav = float32ToWav(audio);
    const fd  = new FormData();
    fd.append('audio', wav, 'speech.wav');
    try {
      const r = await fetch(`${config.backendUrl}/api/stt`, { method: 'POST', body: fd });
      const d = await r.json();
      const t = (d.text ?? '').trim();
      if (t) await sendMessage(t);
      else { setMode('idle'); processingRef.current = false; }
    } catch { setMode('idle'); processingRef.current = false; }
  }, [sendMessage]);

  if (!visible) return null;

  const micRingColors: Record<string, string> = {
    idle:       'border-white/20',
    listening:  'border-green-400 animate-pulse',
    processing: 'border-yellow-400 animate-spin',
    speaking:   'border-blue-400 animate-pulse',
  };

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden border border-border bg-background shadow-md"
      style={{ height: totalHeight, width: '100%', maxWidth: 360 }}
    >
      {/* ── Avatar section (rectangle, no oval) ── */}
      <div className="relative flex-shrink-0" style={{ height: avatarHeight, background: bgColor ?? savedBgColor }}>
        {avatarUrl ? (
          <AvatarViewer
            avatarUrl={avatarUrl}
            isPlaying={mode === 'speaking'}
            audioElement={audioEl}
            animationUrl={animUrl}
            transparent={false}
            bgColor={bgColor ?? savedBgColor}
            bgScene={savedBgScene as any}
            initialPreset="bust"
            className="w-full h-full"
            facialExpression={expression}
            lipsyncCues={lipsyncCues}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30" />
          </div>
        )}

        {/* Header overlay */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <span className="text-xs font-semibold text-white/90">{agentName ?? 'Assistant'}</span>
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={() => setMuted(m => !m)}
              className="rounded-full p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            {removable && (
              <button
                onClick={() => setVisible(false)}
                className="rounded-full p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mic button — bottom center of avatar */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <div className="relative">
            <div className={`absolute inset-0 rounded-full border-2 pointer-events-none ${micRingColors[mode]}`} />
            <button
              onClick={() => setMicOn(v => !v)}
              className={`relative rounded-full p-2.5 transition-colors ${
                micOn
                  ? 'bg-green-500/90 text-white'
                  : 'bg-black/60 text-white/60 hover:text-white hover:bg-black/80'
              }`}
              title={micOn ? 'Disable mic' : 'Enable mic'}
            >
              {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Chat messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            {micOn ? 'Listening... speak now' : 'Type a message or enable the mic'}
          </p>
        )}
        {messages.map((m, i) => <Bubble key={i} role={m.role} text={m.text} />)}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Text input ── */}
      <div className="border-t border-border px-3 py-2 flex gap-2 items-center bg-background">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder="Type a message..."
          className="flex-1 text-xs bg-muted rounded-lg px-3 py-2 outline-none border-none placeholder:text-muted-foreground"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim()}
          className="rounded-lg p-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* VAD — only mounted when mic is on */}
      {micOn && (
        <VadController
          listening={mode === 'idle' || mode === 'listening'}
          onSpeechStart={onSpeechStart}
          onSpeechEnd={onSpeechEnd}
        />
      )}
    </div>
  );
}
