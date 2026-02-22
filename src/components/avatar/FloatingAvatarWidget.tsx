'use client';

import {
  useRef, useState, useCallback, useEffect,
} from 'react';
import dynamic from 'next/dynamic';
import { useMicVAD } from '@ricky0123/vad-react';
import {
  Mic, MicOff, Loader2, Volume2, VolumeX,
  X, GripHorizontal, MessageCircle, Send,
  ImagePlus, MoreHorizontal, ChevronDown,
} from 'lucide-react';
import { useAvatarWidget } from '@/contexts/avatar-widget-context';
import { config } from '@/lib/config';

const AvatarViewer = dynamic(
  () => import('@/components/avatar/AvatarViewer').then(m => ({ default: m.AvatarViewer })),
  { ssr: false, loading: () => <MiniLoader /> },
);

// ── Constants ─────────────────────────────────────────────────────────────────
const LOCOMOTION_IDS = new Set(['walk', 'run', 'jog']);

const CDN_MALE_IDLE   = 'https://readyplayerme-assets.s3.amazonaws.com/animations/visage/male-idle.glb';
const CDN_FEMALE_IDLE = 'https://readyplayerme-assets.s3.amazonaws.com/animations/visage/female-idle.glb';

// Animation manifest — same IDs as avatar-viewer page
const ANIM_MANIFEST: { id: string; male: string; female: string }[] = [
  { id: 'idle',           male: CDN_MALE_IDLE,                                                                 female: CDN_FEMALE_IDLE },
  { id: 'idle_relaxed',   male: '/animations/masculine/idle/M_Standing_Idle_Variations_001.glb',              female: '/animations/feminine/idle/F_Standing_Idle_Variations_001.glb' },
  { id: 'idle_casual',    male: '/animations/masculine/idle/M_Standing_Idle_Variations_002.glb',              female: '/animations/feminine/idle/F_Standing_Idle_Variations_002.glb' },
  { id: 'talk',           male: '/animations/masculine/expression/M_Talking_Variations_001.glb',              female: '/animations/feminine/expression/F_Talking_Variations_001.glb' },
  { id: 'talk_excited',   male: '/animations/masculine/expression/M_Talking_Variations_002.glb',              female: '/animations/feminine/expression/F_Talking_Variations_002.glb' },
  { id: 'talk_explain',   male: '/animations/masculine/expression/M_Talking_Variations_004.glb',              female: '/animations/feminine/expression/F_Talking_Variations_004.glb' },
  { id: 'talk_calm',      male: '/animations/masculine/expression/M_Talking_Variations_005.glb',              female: '/animations/feminine/expression/F_Talking_Variations_005.glb' },
  { id: 'expr_happy',     male: '/animations/masculine/expression/M_Standing_Expressions_001.glb',           female: '/animations/feminine/expression/M_Standing_Expressions_001.glb' },
  { id: 'expr_think',     male: '/animations/masculine/expression/M_Standing_Expressions_002.glb',           female: '/animations/feminine/expression/M_Standing_Expressions_002.glb' },
  { id: 'expr_confident', male: '/animations/masculine/expression/M_Standing_Expressions_004.glb',           female: '/animations/feminine/expression/M_Standing_Expressions_004.glb' },
  { id: 'expr_wonder',    male: '/animations/masculine/expression/M_Standing_Expressions_005.glb',           female: '/animations/feminine/expression/M_Standing_Expressions_005.glb' },
  { id: 'expr_wave',      male: '/animations/masculine/expression/M_Standing_Expressions_006.glb',           female: '/animations/feminine/expression/M_Standing_Expressions_006.glb' },
  { id: 'expr_shrug',     male: '/animations/masculine/expression/M_Standing_Expressions_007.glb',           female: '/animations/feminine/expression/M_Standing_Expressions_007.glb' },
  { id: 'expr_nod',       male: '/animations/masculine/expression/M_Standing_Expressions_008.glb',           female: '/animations/feminine/expression/M_Standing_Expressions_006.glb' },
  { id: 'dance_hype',     male: '/animations/masculine/dance/M_Dances_001.glb',                               female: '/animations/feminine/dance/F_Dances_001.glb' },
  { id: 'dance_groove',   male: '/animations/masculine/dance/M_Dances_002.glb',                               female: '/animations/feminine/dance/F_Dances_004.glb' },
  { id: 'dance_fun',      male: '/animations/masculine/dance/M_Dances_005.glb',                               female: '/animations/feminine/dance/F_Dances_005.glb' },
  { id: 'dance_smooth',   male: '/animations/masculine/dance/M_Dances_007.glb',                               female: '/animations/feminine/dance/F_Dances_006.glb' },
  { id: 'walk',           male: '/animations/masculine/locomotion/M_Walk_001.glb',                            female: '/animations/feminine/locomotion/F_Walk_002.glb' },
  { id: 'run',            male: '/animations/masculine/locomotion/M_Run_001.glb',                             female: '/animations/feminine/locomotion/F_Run_001.glb' },
  { id: 'jog',            male: '/animations/masculine/locomotion/M_Jog_001.glb',                             female: '/animations/feminine/locomotion/F_Jog_001.glb' },
];

function resolveAnimUrl(animId: string, gender: 'male' | 'female'): string | null {
  const entry = ANIM_MANIFEST.find(a => a.id === animId);
  return entry ? entry[gender] : null;
}

/** System prompt addition to enable animation markers */
function buildAnimSystemPrompt(): string {
  const animLines = ANIM_MANIFEST.map(a => `[ANIM:${a.id}]`).join(' | ');
  return `
ANIMATION CONTROL — always start your reply with [ANIM:id] and switch as emotion changes.
Available: ${animLines}
Format: [ANIM:id] spoken words [ANIM:id] more words
Rules: start with [ANIM:], use 2-4 markers, no markdown symbols, no emojis in text.
Examples:
[ANIM:expr_wave] Hello! [ANIM:talk] How can I help you today?
[ANIM:run] On it! [ANIM:talk_explain] Here is what I found.
[ANIM:dance_hype] Sure I can dance! [ANIM:expr_happy] Here we go!`.trim();
}

/** Extract first animation ID from AI response text */
function extractFirstAnimId(text: string): string | null {
  const match = text.match(/\[ANIM:([a-z_]+)\]/);
  return match ? match[1] : null;
}


type ConvMode = 'idle' | 'listening' | 'processing' | 'speaking';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string; // base64 data URL for display
}

function MiniLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400" />
    </div>
  );
}

// ── Audio helpers ─────────────────────────────────────────────────────────────
function float32ToWav(samples: Float32Array, sampleRate = 16000): Blob {
  const len = samples.length;
  const buf = new ArrayBuffer(44 + len * 2);
  const view = new DataView(buf);
  const w = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); view.setUint32(4, 36 + len * 2, true);
  w(8, 'WAVE'); w(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); w(36, 'data');
  view.setUint32(40, len * 2, true);
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

function cleanTTS(text: string) {
  return text
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

/**
 * Return 'auto' so Python's comprehensive language detector handles all languages
 * (German, French, Spanish, Russian, Arabic, Japanese, etc.)
 * Only force 'ar' for clearly Arabic text to avoid the rare edge case.
 */
function detectLang(t: string): string {
  const arabicChars = (t.match(/[\u0600-\u06FF]/g) || []).length;
  if (arabicChars > t.length * 0.15) return 'ar';
  return 'auto'; // let edge-tts Python script auto-detect the rest
}

/** Convert File to base64 data URL */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1.5`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-1.5 text-[11px] leading-snug ${
          isUser ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-700/80 text-gray-100 rounded-bl-sm'
        }`}
      >
        {msg.imageUrl && (
          <img src={msg.imageUrl} alt="" className="rounded-lg mb-1 max-h-24 object-cover" />
        )}
        {msg.content}
      </div>
    </div>
  );
}

// ── VadController ─────────────────────────────────────────────────────────────
// Isolated sub-component so useMicVAD is ONLY called when vadEnabled=true.
// This prevents the "MicVAD has null stream" error that fires when destroy()
// is called on an unstarted VAD during component unmount.
interface VadControllerProps {
  listening: boolean;
  onSpeechStart: () => void;
  onSpeechEnd: (audio: Float32Array) => void;
}
function VadController({ listening, onSpeechStart, onSpeechEnd }: VadControllerProps) {
  // Stable callback refs — prevents VAD re-initialization on every render
  const onSpeechStartRef = useRef(onSpeechStart);
  const onSpeechEndRef   = useRef(onSpeechEnd);
  useEffect(() => { onSpeechStartRef.current = onSpeechStart; }, [onSpeechStart]);
  useEffect(() => { onSpeechEndRef.current   = onSpeechEnd;   }, [onSpeechEnd]);

  const vad = useMicVAD({
    startOnLoad: true,
    model: 'v5',
    baseAssetPath: '/',
    onnxWASMBasePath: '/',
    onSpeechStart: useCallback(() => onSpeechStartRef.current(), []),
    onSpeechEnd:   useCallback((audio: Float32Array) => onSpeechEndRef.current(audio), []),
    onVADMisfire: () => {},
  } as any);

  // Sync parent's listening state → pause/start VAD
  useEffect(() => {
    if (vad.loading) return;
    if (listening && !vad.listening) void vad.start();
    else if (!listening && vad.listening) void vad.pause();
  }, [listening, vad.loading, vad.listening]);

  return null;
}

// ── Main widget ───────────────────────────────────────────────────────────────
export function FloatingAvatarWidget() {
  const { isOpen, close } = useAvatarWidget();

  // Drag
  const [pos, setPos] = useState({ x: 24, y: -1 });
  const dragging      = useRef(false);
  const dragStart     = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  useEffect(() => {
    if (pos.y === -1 && typeof window !== 'undefined') {
      setPos({ x: window.innerWidth - 280, y: window.innerHeight - 480 });
    }
  }, [pos.y]);

  const onDragStart = (e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
  };
  const onDragMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;
    const newX = Math.max(0, Math.min(window.innerWidth  - 240, dragStart.current.px + e.clientX - dragStart.current.mx));
    const newY = Math.max(0, Math.min(window.innerHeight - 480, dragStart.current.py + e.clientY - dragStart.current.my));
    setPos({ x: newX, y: newY });
  }, []);
  const onDragEnd = useCallback(() => {
    dragging.current = false;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
  }, [onDragMove]);

  // Avatar URL + appearance
  const [avatarUrl, setAvatarUrl] = useState('');
  const [gender] = useState<'male' | 'female'>('male');
  const [bgColor, setBgColor] = useState('#09090b');
  const [bgScene, setBgScene] = useState('none');

  // Agents + session — loaded once on first open
  const [selectedAgentId, setSelectedAgentId]   = useState('');
  const [sessionId, setSessionId]               = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load avatar settings
    fetch(`${config.backendUrl}/api/avatar/settings?userId=1`)
      .then(r => r.json())
      .then(data => {
        const url = data.settings?.rpmAvatarUrl;
        if (data.settings?.bgColor) setBgColor(data.settings.bgColor);
        if (data.settings?.bgScene) setBgScene(data.settings.bgScene);
        if (!url) return;
        fetch(`/api/avatar-model?url=${encodeURIComponent(url)}`)
          .then(r => r.json())
          .then(d => setAvatarUrl(d.localUrl || url))
          .catch(() => setAvatarUrl(url));
      }).catch(() => {});

    // Load agents + create/reuse a session
    if (selectedAgentId) return; // already loaded
    fetch(`${config.backendUrl}/api/agents`)
      .then(r => r.json())
      .then(async data => {
        const agents: any[] = data.agents || [];
        const primary = agents.find((a: any) => a.isPrimary) || agents[0];
        if (!primary) return;
        setSelectedAgentId(primary.id);

        // Create a dedicated session for widget conversations (shows in sidebar)
        const sessRes = await fetch(`${config.backendUrl}/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: '🎭 Avatar Chat' }),
        });
        if (sessRes.ok) {
          const sessData = await sessRes.json();
          const id = sessData.session?.id || sessData.id;
          if (id) setSessionId(id);
        }
      }).catch(() => {});
  }, [isOpen, selectedAgentId]);

  // Conversation
  const [mode, setMode]             = useState<ConvMode>('idle');
  const [isMuted, setIsMuted]       = useState(false);
  const [vadEnabled, setVAD]        = useState(false);
  const [animUrl, setAnimUrl]       = useState(CDN_MALE_IDLE);
  const currentAnimIdRef            = useRef<string>('idle');

  const setAnim = useCallback((id: string, g: 'male' | 'female') => {
    const url = resolveAnimUrl(id, g);
    if (url) { setAnimUrl(url); currentAnimIdRef.current = id; }
  }, []);
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [showChat, setShowChat]     = useState(false);
  const [showMore, setShowMore]     = useState(false);
  const [textInput, setTextInput]   = useState('');
  const [pendingImage, setPendingImage] = useState<{ file: File; dataUrl: string } | null>(null);

  const [audioEl, setAudioEl]       = useState<HTMLAudioElement | null>(null);
  const [micError, setMicError]     = useState<string | null>(null);
  const audioCallbackRef            = useCallback((el: HTMLAudioElement | null) => setAudioEl(el), []);
  const processingRef               = useRef(false);
  const modeRef                     = useRef<ConvMode>('idle');
  const audioRef                    = useRef<HTMLAudioElement | null>(null);
  const [vadListening, setVadListening] = useState(true);
  const fileInputRef                = useRef<HTMLInputElement>(null);
  const chatEndRef                  = useRef<HTMLDivElement>(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { audioRef.current = audioEl; }, [audioEl]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!isOpen) {
      setVAD(false); setMode('idle');
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    }
  }, [isOpen]);

  // ── Send to AI + TTS ────────────────────────────────────────────────────────
  const runChat = useCallback(async (userText: string, imageDataUrl?: string) => {
    setMode('processing');
    setAnim('expr_think', gender);

    // Build message payload (multimodal if image present)
    const userMsg: any = imageDataUrl
      ? {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageDataUrl.split(',')[1] } },
            { type: 'text', text: userText || 'What do you see in this image?' },
          ],
        }
      : { role: 'user', content: userText };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [userMsg],
          agentId: selectedAgentId || undefined,
          sessionId: sessionId || undefined,
          // Do NOT send systemPrompt — let the backend use the agent's full prompt
          // (which includes tools, skills, memory context, etc.)
          // Append animation instructions on top of whatever the agent's prompt is
          systemPromptAppend: buildAnimSystemPrompt(),
        }),
      });
      if (!res.ok) throw new Error('AI error');

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let sseLineBuffer = '';
      let full = ''; // accumulated plain text from SSE content fields
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseLineBuffer += decoder.decode(value, { stream: true });
        const lines = sseLineBuffer.split('\n');
        sseLineBuffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(trimmed.slice(6));
            const chunk = (json.type === 'text' && json.content)
              ? json.content
              : (!json.type && json.content ? json.content : '');
            if (chunk) full += chunk;
          } catch { /* skip */ }
        }
      }

      // Parse animation from first [ANIM:] marker
      const firstAnimId = extractFirstAnimId(full);

      const clean = cleanTTS(full);
      setMessages(prev => [...prev, { role: 'assistant', content: clean || full }]);

      if (!clean) { setMode('idle'); processingRef.current = false; return; }

      const lang = detectLang(clean);
      const ttsRes = await fetch(`${config.backendUrl}/api/audio/tts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, language: lang }),
      });
      if (!ttsRes.ok) { setMode('idle'); processingRef.current = false; return; }
      const ttsData = await ttsRes.json();
      if (!ttsData.success || !ttsData.audioUrl) { setMode('idle'); processingRef.current = false; return; }

      const audioRes = await fetch(`${config.backendUrl}${ttsData.audioUrl}`);
      const blob = await audioRes.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Set speaking animation: prefer the one from AI response, fallback to talk
      setAnim(firstAnimId || 'talk', gender);

      if (audioEl) {
        if (audioEl.src.startsWith('blob:')) URL.revokeObjectURL(audioEl.src);
        audioEl.src = blobUrl;
        audioEl.muted = isMuted;
        setMode('speaking');
        try { await audioEl.play(); } catch {}
      }
    } catch {
      setMode('idle');
    } finally {
      processingRef.current = false;
    }
  }, [audioEl, isMuted, gender, selectedAgentId, sessionId, setAnim]);

  const handleEnded = useCallback(() => {
    setAnim('idle', gender);
    setMode(vadEnabled ? 'listening' : 'idle');
    if (vadEnabled) setVadListening(true);
  }, [gender, vadEnabled, setAnim]);

  // ── Text send ───────────────────────────────────────────────────────────────
  const sendText = useCallback(async () => {
    const text = textInput.trim();
    const img  = pendingImage;
    if (!text && !img) return;
    if (processingRef.current) return;
    processingRef.current = true;

    setMessages(prev => [...prev, { role: 'user', content: text || '📷 Image', imageUrl: img?.dataUrl }]);
    setTextInput('');
    setPendingImage(null);

    await runChat(text, img?.dataUrl);
  }, [textInput, pendingImage, runChat]);

  // ── Image pick ──────────────────────────────────────────────────────────────
  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToBase64(file);
    setPendingImage({ file, dataUrl });
    e.target.value = '';
  };

  // ── Voice pipeline ───────────────────────────────────────────────────────────
  const runPipeline = useCallback(async (audio: Float32Array) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setMode('processing');
    try {
      const wav = float32ToWav(audio);
      const form = new FormData();
      form.append('file', wav, 'speech.wav');
      const sttRes = await fetch(`${config.backendUrl}/api/audio/transcribe`, { method: 'POST', body: form });
      if (!sttRes.ok) throw new Error('STT failed');
      const sttData = await sttRes.json();
      const text = sttData.transcript?.trim();
      if (!text) { setMode(vadEnabled ? 'listening' : 'idle'); processingRef.current = false; return; }
      setMessages(prev => [...prev, { role: 'user', content: text }]);
      await runChat(text);
    } catch {
      setMode(vadEnabled ? 'listening' : 'idle');
      processingRef.current = false;
    }
  }, [vadEnabled, runChat]);

  // Callbacks forwarded to VadController (stable via useCallback)
  const handleVadSpeechStart = useCallback(() => {
    if (modeRef.current === 'speaking') {
      const a = audioRef.current;
      if (a) { a.pause(); a.src = ''; }
      setMode('idle');
    }
    if (modeRef.current !== 'processing') setMode('listening');
  }, []);

  const handleVadSpeechEnd = useCallback((audio: Float32Array) => {
    setVadListening(false); // pause VAD while processing
    runPipeline(audio);
  }, [runPipeline]);

  const toggleVAD = async () => {
    if (vadEnabled) {
      setVAD(false);
      setMode('idle');
      setMicError(null);
    } else {
      // Request mic permission explicitly so browser shows the dialog
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release the track immediately — VadController will open its own stream
        stream.getTracks().forEach(t => t.stop());
        setMicError(null);
      } catch (err: any) {
        const isDenied =
          err?.name === 'NotAllowedError' ||
          err?.name === 'PermissionDeniedError' ||
          err?.name === 'SecurityError';
        setMicError(
          isDenied
            ? 'Mic access denied. Allow microphone in browser settings and try again.'
            : `Could not access microphone: ${err?.message || 'Unknown error'}`
        );
        return;
      }
      setVadListening(true);
      setVAD(true);
      setMode('listening');
    }
  };

  // Ring colors
  const ringStyle: Record<ConvMode, string> = {
    idle:       'box-shadow: 0 0 0 2px rgba(99,102,241,0.3)',
    listening:  '0 0 0 3px rgba(34,197,94,0.7)',
    processing: '0 0 0 3px rgba(234,179,8,0.7)',
    speaking:   '0 0 0 3px rgba(59,130,246,0.7)',
  };

  if (!isOpen || pos.y === -1) return null;

  return (
    <>
      {/* VadController only mounts when voice is enabled — prevents destroy() error on navigation */}
      {vadEnabled && (
        <VadController
          listening={vadListening}
          onSpeechStart={handleVadSpeechStart}
          onSpeechEnd={handleVadSpeechEnd}
        />
      )}
    <div
      className="fixed z-[9999] select-none"
      style={{ left: pos.x, top: pos.y, width: 248 }}
    >
      <div
        className="flex flex-col rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(10, 15, 30, 0.93)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.25)',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* ── Drag handle ── */}
        <div
          className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing"
          onPointerDown={onDragStart}
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <GripHorizontal className="w-4 h-4 text-gray-600" />
          <div className="w-8 h-1 rounded-full bg-gray-700" />
          <button
            onClick={close}
            onPointerDown={e => e.stopPropagation()}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-700/60 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        {/* ── Avatar canvas ── */}
        <div className="flex justify-center pt-2 px-3">
          <div
            className="relative overflow-hidden"
            style={{
              width: 210,
              height: 240,
              borderRadius: '50% 50% 45% 45% / 40% 40% 60% 60%',
              background: 'radial-gradient(ellipse at 50% 30%, #1e293b 0%, #0c1120 100%)',
              boxShadow: mode === 'idle'
                ? '0 0 0 2px rgba(99,102,241,0.3)'
                : mode === 'listening'
                ? '0 0 0 3px rgba(34,197,94,0.7)'
                : mode === 'processing'
                ? '0 0 0 3px rgba(234,179,8,0.7)'
                : '0 0 0 3px rgba(59,130,246,0.7)',
            }}
          >
            {avatarUrl ? (
              <AvatarViewer
                avatarUrl={avatarUrl}
                isPlaying={mode === 'speaking'}
                audioElement={audioEl}
                animationUrl={animUrl}
                avatarY={-1.6}
                initialPreset="bust"
                stripRootMotion={LOCOMOTION_IDS.has(currentAnimIdRef.current)}
                bgColor={bgColor}
                bgScene={bgScene as any}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <span className="text-4xl">🎭</span>
                <p className="text-[10px] text-gray-500 text-center px-4">Set avatar in Settings</p>
              </div>
            )}

            {/* Speaking wave */}
            {mode === 'speaking' && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-1 rounded-full bg-blue-400 opacity-80"
                    style={{ height: `${8 + Math.sin(i * 1.2) * 8}px`, animation: `pulse 0.8s ease-in-out ${i * 0.1}s infinite alternate` }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Status label ── */}
        <p className="text-center text-[10px] text-gray-600 mt-1.5">
          {mode === 'idle'       && 'Ready'}
          {mode === 'listening'  && 'Listening…'}
          {mode === 'processing' && 'Thinking…'}
          {mode === 'speaking'   && 'Speaking…'}
        </p>

        {/* ── Mic error ── */}
        {micError && (
          <div
            className="mx-3 mt-2 px-3 py-2 rounded-xl text-[10px] text-red-400 leading-snug"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            🎤 {micError}
          </div>
        )}

        {/* ── Chat history ── */}
        {showChat && (
          <div className="mx-3 mt-2 rounded-xl overflow-hidden" style={{ background: 'rgba(15,23,42,0.7)', maxHeight: 140 }}>
            <div className="overflow-y-auto p-2" style={{ maxHeight: 140 }}>
              {messages.length === 0 ? (
                <p className="text-[10px] text-gray-600 text-center py-3">Send a message or use the mic</p>
              ) : (
                messages.map((m, i) => <Bubble key={i} msg={m} />)
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}

        {/* ── Image preview ── */}
        {pendingImage && (
          <div className="mx-3 mt-2 relative">
            <img src={pendingImage.dataUrl} alt="" className="w-full h-20 object-cover rounded-xl" />
            <button
              onClick={() => setPendingImage(null)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        )}

        {/* ── Input row (when chat is open) ── */}
        {showChat && (
          <div className="mx-3 mt-2 flex items-center gap-1.5">
            {/* Image attach */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center transition-colors hover:bg-gray-700/60"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              title="Attach image"
            >
              <ImagePlus className="w-3.5 h-3.5 text-gray-400" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />

            {/* Text input */}
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendText(); }}
              placeholder="Type a message…"
              disabled={mode === 'processing' || mode === 'speaking'}
              className="flex-1 min-w-0 bg-gray-800/80 border border-gray-700/50 rounded-full px-3 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
            />

            {/* Send */}
            <button
              onClick={sendText}
              disabled={(!textInput.trim() && !pendingImage) || mode === 'processing' || mode === 'speaking'}
              className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              {mode === 'processing'
                ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                : <Send className="w-3.5 h-3.5 text-white" />}
            </button>
          </div>
        )}

        {/* ── Main controls ── */}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Chat toggle (important — always visible) */}
          <button
            onClick={() => setShowChat(s => !s)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              showChat ? 'bg-indigo-600 shadow-[0_0_12px_rgba(99,102,241,0.5)]' : 'bg-gray-800/60 hover:bg-gray-700/60'
            }`}
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            title="Chat"
          >
            <MessageCircle className="w-4 h-4 text-white" />
          </button>

          {/* Mic (main action) */}
          <button
            onClick={toggleVAD}
            disabled={mode === 'processing'}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: vadEnabled
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              boxShadow: vadEnabled
                ? '0 0 20px rgba(239,68,68,0.5)'
                : '0 0 20px rgba(99,102,241,0.4)',
            }}
            title={vadEnabled ? 'Stop mic' : 'Start voice'}
          >
            {mode === 'processing'
              ? <Loader2 className="w-5 h-5 text-white animate-spin" />
              : vadEnabled
                ? <MicOff className="w-5 h-5 text-white" />
                : <Mic className="w-5 h-5 text-white" />}
          </button>

          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setShowMore(s => !s)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                showMore ? 'bg-gray-700' : 'bg-gray-800/60 hover:bg-gray-700/60'
              }`}
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              title="More"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>

            {/* More dropdown */}
            {showMore && (
              <div
                className="absolute bottom-12 right-0 rounded-2xl overflow-hidden z-10 py-1"
                style={{
                  background: 'rgba(15,23,42,0.97)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  minWidth: 140,
                }}
              >
                {/* Mute */}
                <button
                  onClick={() => { if (audioEl) audioEl.muted = !isMuted; setIsMuted(m => !m); setShowMore(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-700/50 transition-colors text-left"
                >
                  {isMuted
                    ? <VolumeX className="w-3.5 h-3.5 text-gray-400" />
                    : <Volume2 className="w-3.5 h-3.5 text-gray-400" />}
                  <span className="text-[11px] text-gray-300">{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                {/* Clear chat */}
                <button
                  onClick={() => { setMessages([]); setShowMore(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-700/50 transition-colors text-left"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[11px] text-gray-300">Clear chat</span>
                </button>

                {/* Open full viewer */}
                <a
                  href={avatarUrl ? `/avatar-viewer?url=${encodeURIComponent(avatarUrl)}` : '/settings/avatar'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowMore(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-700/50 transition-colors text-left"
                >
                  <span className="text-[11px] text-gray-300">Full viewer ↗</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden audio */}
      <audio ref={audioCallbackRef} onEnded={handleEnded} muted={isMuted} />

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
    </>
  );
}
