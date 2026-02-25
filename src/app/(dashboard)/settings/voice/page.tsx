'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Volume2, Play, Loader2, Check, X, Plus, Key, Mic, User, Users, Eye, EyeOff, Globe, Upload, Sparkles } from 'lucide-react';
import { config } from '@/lib/config';

// ── Types ──────────────────────────────────────────────────────────────────────
interface TtsProvider {
  id: string;
  name: string;
  logo: string | null;
  description: string;
  type: 'cloud' | 'local';
  requiresKey: boolean;
  apiKeyLabel?: string;
  apiKeyPlaceholder?: string;
  docsUrl?: string;
  voices: VoiceEntry[];
}

interface VoiceEntry {
  id: string;
  name: string;
  lang: string;
  gender: 'male' | 'female' | 'neutral';
  preview?: string; // sample text for preview
}

// ── Static provider + voice catalog ───────────────────────────────────────────
const PROVIDERS: TtsProvider[] = [
  {
    id: 'edge-tts',
    name: 'Microsoft Edge TTS',
    logo: null,
    description: 'RECOMMENDED: Free, high-quality voices powered by Microsoft — Fast (2-3s) and no API key needed.',
    type: 'local',
    requiresKey: false,
    voices: [
      { id: 'en-US-AriaNeural',    name: 'Aria (US)',       lang: 'en-US', gender: 'female' },
      { id: 'en-US-GuyNeural',     name: 'Guy (US)',        lang: 'en-US', gender: 'male'   },
      { id: 'en-GB-SoniaNeural',   name: 'Sonia (UK)',      lang: 'en-GB', gender: 'female' },
      { id: 'en-AU-NatashaNeural', name: 'Natasha (AU)',    lang: 'en-AU', gender: 'female' },
      { id: 'ar-SA-ZariyahNeural', name: 'Zariyah (AR-SA)', lang: 'ar-SA', gender: 'female' },
      { id: 'ar-EG-SalmaNeural',   name: 'Salma (AR-EG)',   lang: 'ar-EG', gender: 'female' },
      { id: 'ar-EG-ShakirNeural',  name: 'Shakir (AR-EG)',  lang: 'ar-EG', gender: 'male'   },
      { id: 'fr-FR-DeniseNeural',  name: 'Denise (FR)',     lang: 'fr-FR', gender: 'female' },
      { id: 'de-DE-KatjaNeural',   name: 'Katja (DE)',      lang: 'de-DE', gender: 'female' },
      { id: 'es-ES-ElviraNeural',  name: 'Elvira (ES)',     lang: 'es-ES', gender: 'female' },
    ],
  },
  {
    id: 'qwen',
    name: 'Qwen3-TTS',
    logo: null,
    description: 'ADVANCED: FREE professional TTS by Alibaba — Voice cloning, emotional control, 10 languages. ⚠️ Requires GPU for fast generation (7-10s), very slow on CPU (150+s).',
    type: 'local',
    requiresKey: false,
    voices: [
      { id: 'qwen-default-en-f', name: 'Default English (F)', lang: 'en', gender: 'female' },
      { id: 'qwen-default-en-m', name: 'Default English (M)', lang: 'en', gender: 'male' },
      { id: 'qwen-default-ar-f', name: 'Default Arabic (F)',  lang: 'ar', gender: 'female' },
      { id: 'qwen-default-ar-m', name: 'Default Arabic (M)',  lang: 'ar', gender: 'male' },
      { id: 'qwen-default-zh-f', name: 'Default Chinese (F)', lang: 'zh', gender: 'female' },
      { id: 'qwen-default-zh-m', name: 'Default Chinese (M)', lang: 'zh', gender: 'male' },
      { id: 'qwen-default-fr-f', name: 'Default French (F)',  lang: 'fr', gender: 'female' },
      { id: 'qwen-default-de-f', name: 'Default German (F)',  lang: 'de', gender: 'female' },
      { id: 'qwen-default-es-f', name: 'Default Spanish (F)', lang: 'es', gender: 'female' },
      { id: 'qwen-default-ja-f', name: 'Default Japanese (F)',lang: 'ja', gender: 'female' },
      { id: 'clone',             name: 'Voice Clone',        lang: 'multi', gender: 'neutral' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI TTS',
    logo: '/icons/chatgpt-logo.svg',
    description: 'Natural-sounding voices via the OpenAI Audio API. Requires an OpenAI API key.',
    type: 'cloud',
    requiresKey: true,
    apiKeyLabel: 'OpenAI API Key',
    apiKeyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    voices: [
      { id: 'alloy',   name: 'Alloy',   lang: 'multi', gender: 'neutral' },
      { id: 'echo',    name: 'Echo',    lang: 'multi', gender: 'male'    },
      { id: 'fable',   name: 'Fable',   lang: 'multi', gender: 'neutral' },
      { id: 'onyx',    name: 'Onyx',    lang: 'multi', gender: 'male'    },
      { id: 'nova',    name: 'Nova',    lang: 'multi', gender: 'female'  },
      { id: 'shimmer', name: 'Shimmer', lang: 'multi', gender: 'female'  },
    ],
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    logo: null,
    description: 'Ultra-realistic voice cloning and synthesis. Premium quality, requires an API key.',
    type: 'cloud',
    requiresKey: true,
    apiKeyLabel: 'ElevenLabs API Key',
    apiKeyPlaceholder: 'el-...',
    docsUrl: 'https://elevenlabs.io/app/api-keys',
    voices: [
      { id: 'Rachel',  name: 'Rachel',  lang: 'en',    gender: 'female' },
      { id: 'Domi',    name: 'Domi',    lang: 'en',    gender: 'female' },
      { id: 'Bella',   name: 'Bella',   lang: 'en',    gender: 'female' },
      { id: 'Antoni',  name: 'Antoni',  lang: 'en',    gender: 'male'   },
      { id: 'Elli',    name: 'Elli',    lang: 'en',    gender: 'female' },
      { id: 'Josh',    name: 'Josh',    lang: 'en',    gender: 'male'   },
      { id: 'Arnold',  name: 'Arnold',  lang: 'en',    gender: 'male'   },
      { id: 'Adam',    name: 'Adam',    lang: 'en',    gender: 'male'   },
    ],
  },
  {
    id: 'google',
    name: 'Google Cloud TTS',
    logo: '/icons/gemini-logo.svg',
    description: 'WaveNet and Neural2 voices from Google Cloud. Requires a Google API key.',
    type: 'cloud',
    requiresKey: true,
    apiKeyLabel: 'Google Cloud API Key',
    apiKeyPlaceholder: 'AIza...',
    docsUrl: 'https://console.cloud.google.com/apis/credentials',
    voices: [
      { id: 'en-US-Neural2-A', name: 'Neural2-A (US)',    lang: 'en-US', gender: 'male'   },
      { id: 'en-US-Neural2-C', name: 'Neural2-C (US)',    lang: 'en-US', gender: 'female' },
      { id: 'en-GB-Neural2-A', name: 'Neural2-A (UK)',    lang: 'en-GB', gender: 'female' },
      { id: 'ar-XA-Wavenet-A', name: 'WaveNet-A (AR)',    lang: 'ar',    gender: 'female' },
      { id: 'ar-XA-Wavenet-B', name: 'WaveNet-B (AR)',    lang: 'ar',    gender: 'male'   },
      { id: 'fr-FR-Neural2-A', name: 'Neural2-A (FR)',    lang: 'fr-FR', gender: 'female' },
      { id: 'de-DE-Neural2-A', name: 'Neural2-A (DE)',    lang: 'de-DE', gender: 'female' },
    ],
  },
];

const GENDER_LABEL = { male: 'Male', female: 'Female', neutral: 'Neutral' };

// ── Voice Settings Page ────────────────────────────────────────────────────────
export default function VoiceSettingsPage() {
  const [activeProvider, setActiveProvider] = useState('edge-tts');
  const [selectedVoice, setSelectedVoice]   = useState('en-US-AriaNeural');
  const [apiKeys, setApiKeys]               = useState<Record<string, string>>({});
  const [showKey, setShowKey]               = useState<Record<string, boolean>>({});
  const [autoDetectLang, setAutoDetectLang] = useState(true);
  const [defaultLang, setDefaultLang]       = useState('en');
  const [speed, setSpeed]                   = useState(1.0);
  const [previewText, setPreviewText]       = useState('Hello! I am your AI assistant. How can I help you today?');
  const [previewing, setPreviewing]         = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [cloneFile, setCloneFile]           = useState<File | null>(null);
  const [cloneUploading, setCloneUploading] = useState(false);
  const [cloneAudioUrl, setCloneAudioUrl]   = useState<string | null>(null);
  const [emotion, setEmotion]               = useState('');
  const [loading, setLoading]               = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const provider = PROVIDERS.find((p) => p.id === activeProvider)!;
  const voices   = provider?.voices ?? [];

  // Preview text samples for each language
  const PREVIEW_TEXTS: Record<string, string> = {
    'en': 'Hello! I am your AI assistant. How can I help you today?',
    'en-US': 'Hello! I am your AI assistant. How can I help you today?',
    'en-GB': 'Hello! I am your AI assistant. How may I help you today?',
    'en-AU': 'G\'day! I am your AI assistant. How can I help you today?',
    'ar': 'مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟',
    'ar-SA': 'مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟',
    'ar-EG': 'أهلاً! أنا مساعدك الذكي. إزاي أقدر أساعدك النهاردة؟',
    'fr': 'Bonjour! Je suis votre assistant IA. Comment puis-je vous aider aujourd\'hui?',
    'fr-FR': 'Bonjour! Je suis votre assistant IA. Comment puis-je vous aider aujourd\'hui?',
    'de': 'Hallo! Ich bin Ihr KI-Assistent. Wie kann ich Ihnen heute helfen?',
    'de-DE': 'Hallo! Ich bin Ihr KI-Assistent. Wie kann ich Ihnen heute helfen?',
    'es': '¡Hola! Soy tu asistente de IA. ¿Cómo puedo ayudarte hoy?',
    'es-ES': '¡Hola! Soy tu asistente de IA. ¿Cómo puedo ayudarte hoy?',
    'zh': '你好！我是您的人工智能助手。今天我能为您做些什么？',
    'ja': 'こんにちは！私はあなたのAIアシスタントです。今日はどのようにお手伝いできますか？',
    'multi': 'Hello! I am your AI assistant. How can I help you today?',
  };

  // Auto-update preview text when voice changes
  useEffect(() => {
    const currentVoice = voices.find((v) => v.id === selectedVoice);
    if (currentVoice) {
      const lang = currentVoice.lang;
      const newPreviewText = PREVIEW_TEXTS[lang] || PREVIEW_TEXTS['en'];
      setPreviewText(newPreviewText);
    }
  }, [selectedVoice, voices]);

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch(`${config.backendUrl}/api/avatar/settings?userId=1`);
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (data.settings) {
          const { voiceProvider, voiceId, languagePreference } = data.settings;
          if (voiceProvider) setActiveProvider(voiceProvider);
          if (voiceId) setSelectedVoice(voiceId);
          if (languagePreference) {
            if (languagePreference === 'auto') {
              setAutoDetectLang(true);
            } else {
              setAutoDetectLang(false);
              setDefaultLang(languagePreference);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load voice settings:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Auto-select first voice when switching provider (only after initial load)
  useEffect(() => {
    if (loading) return; // Don't auto-select during initial load
    const firstVoice = PROVIDERS.find((p) => p.id === activeProvider)?.voices[0];
    if (firstVoice) setSelectedVoice(firstVoice.id);
  }, [activeProvider, loading]);

  const handleCloneUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCloneFile(file);
    setCloneUploading(true);

    try {
      // Upload reference audio to backend
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${config.backendUrl}/api/storage/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      if (data.file?.filepath) {
        setCloneAudioUrl(data.file.filepath);
      }
    } catch (err) {
      console.error('Clone upload failed:', err);
      setCloneFile(null);
    } finally {
      setCloneUploading(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      console.log('[Preview] Starting TTS generation...', {
        provider: activeProvider,
        voice: selectedVoice,
        language: autoDetectLang ? 'auto' : defaultLang,
        hasEmotion: !!emotion,
        hasReference: !!cloneAudioUrl,
      });

      const res = await fetch(`${config.backendUrl}/api/audio/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: previewText,
          voice: selectedVoice,
          language: autoDetectLang ? 'auto' : defaultLang,
          provider: activeProvider,
          emotion: emotion || undefined,
          referenceAudio: cloneAudioUrl || undefined,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Preview] TTS failed:', res.status, errorText);
        alert(`Preview failed (${res.status}): ${errorText}`);
        setPreviewing(false);
        return;
      }

      const data = await res.json();
      console.log('[Preview] TTS response:', data);

      if (data.audioUrl) {
        const fullAudioUrl = `${config.backendUrl}${data.audioUrl}`;
        console.log('[Preview] Fetching audio:', fullAudioUrl);

        // Fetch audio as blob to avoid CORS issues (same pattern as Avatar Viewer)
        const audioRes = await fetch(fullAudioUrl);
        if (!audioRes.ok) {
          throw new Error(`Failed to fetch audio: ${audioRes.status}`);
        }

        const blob = await audioRes.blob();
        const blobUrl = URL.createObjectURL(blob);
        console.log('[Preview] Playing audio from blob:', blobUrl);

        if (audioRef.current) {
          audioRef.current.pause();
          // Revoke old blob URL to prevent memory leaks
          if (audioRef.current.src.startsWith('blob:')) {
            URL.revokeObjectURL(audioRef.current.src);
          }
          audioRef.current = null;
        }

        audioRef.current = new Audio(blobUrl);

        audioRef.current.onerror = (e) => {
          console.error('[Preview] Audio playback error:', e);
          alert('Failed to play audio. Check console for details.');
          setPreviewing(false);
        };

        audioRef.current.onended = () => {
          console.log('[Preview] Audio playback finished');
          setPreviewing(false);
          // Revoke blob URL after playback
          URL.revokeObjectURL(blobUrl);
        };

        await audioRef.current.play();
        console.log('[Preview] Audio playing...');
      } else {
        console.error('[Preview] No audioUrl in response');
        alert('No audio URL returned from server');
        setPreviewing(false);
      }
    } catch (err) {
      console.error('[Preview] Error:', err);
      alert(`Preview error: ${err instanceof Error ? err.message : String(err)}`);
      setPreviewing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${config.backendUrl}/api/avatar/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '1',
          voiceProvider: activeProvider,
          voiceId: selectedVoice,
          languagePreference: autoDetectLang ? 'auto' : defaultLang,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Volume2 className="h-8 w-8 text-green-500" /> Voice Settings
          </h2>
          <p className="text-muted-foreground mt-1">
            Choose a TTS provider and voice for your AI assistant. Preview voices before saving.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || saved}>
          {saved ? <><Check className="w-4 h-4 mr-2" /> Saved!</> : saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {saved ? '' : 'Save Settings'}
        </Button>
      </div>

      {/* Provider selection */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => setActiveProvider(p.id)}
            className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium ${
              activeProvider === p.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {p.logo ? (
              <img src={p.logo} alt={p.name} className="w-8 h-8 object-contain" />
            ) : (
              <Volume2 className="w-8 h-8" />
            )}
            <span className="text-xs font-semibold text-center leading-tight">{p.name}</span>
            <span className={`absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded font-bold ${
              p.type === 'local' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
            }`}>
              {p.type === 'local' ? 'FREE' : 'API'}
            </span>
          </button>
        ))}
      </div>

      {/* Provider detail */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {provider.logo ? (
              <img src={provider.logo} alt={provider.name} className="w-5 h-5 object-contain" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
            {provider.name}
            {provider.type === 'local' && (
              <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full font-normal ml-1">No API key needed</span>
            )}
          </CardTitle>
          <CardDescription>{provider.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Key input (for cloud providers) */}
          {provider.requiresKey && (
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Key className="w-3 h-3" /> {provider.apiKeyLabel}
                </Label>
                {provider.docsUrl && (
                  <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-blue-500 hover:underline">
                    Get API key →
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  type={showKey[provider.id] ? 'text' : 'password'}
                  value={apiKeys[provider.id] || ''}
                  onChange={(e) => setApiKeys((k) => ({ ...k, [provider.id]: e.target.value }))}
                  placeholder={provider.apiKeyPlaceholder}
                  className="flex-1"
                />
                <Button
                  variant="outline" size="sm"
                  onClick={() => setShowKey((s) => ({ ...s, [provider.id]: !s[provider.id] }))}
                >
                  {showKey[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Voice grid */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Select Voice</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {voices.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVoice(v.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-all ${
                    selectedVoice === v.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-xs truncate">{v.name}</p>
                    <p className="text-[10px] text-muted-foreground">{GENDER_LABEL[v.gender]} · {v.lang}</p>
                  </div>
                  {selectedVoice === v.id && <Check className="w-3 h-3 text-blue-500 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Cloning (Qwen3-TTS only) */}
          {activeProvider === 'qwen' && selectedVoice === 'clone' && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <Label className="text-xs font-medium">Voice Cloning (3+ seconds required)</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a clear audio sample (3-10 seconds) to clone any voice. Works in any language!
              </p>
              <div className="flex flex-col gap-2">
                <label htmlFor="clone-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed rounded-lg p-4 hover:border-purple-500 transition-colors text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {cloneFile ? cloneFile.name : 'Click to upload audio (MP3, WAV, M4A)'}
                    </p>
                    {cloneUploading && <Loader2 className="w-4 h-4 mx-auto mt-2 animate-spin" />}
                  </div>
                  <input
                    id="clone-upload"
                    type="file"
                    accept="audio/*"
                    onChange={handleCloneUpload}
                    className="hidden"
                  />
                </label>
                {cloneFile && (
                  <Button variant="ghost" size="sm" onClick={() => { setCloneFile(null); setCloneAudioUrl(null); }}>
                    <X className="w-3 h-3 mr-1" /> Remove
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Emotion Control (Qwen3-TTS only) */}
          {activeProvider === 'qwen' && selectedVoice !== 'clone' && (
            <div className="border-t pt-4 space-y-3">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-purple-500" /> Emotion/Tone (Optional)
              </Label>

              {/* Quick emotion presets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: '', label: 'Default', icon: '😐' },
                  { id: 'cheerful and energetic', label: 'Cheerful', icon: '😊' },
                  { id: 'professional and calm', label: 'Professional', icon: '💼' },
                  { id: 'warm and friendly', label: 'Friendly', icon: '🤗' },
                  { id: 'excited and enthusiastic', label: 'Excited', icon: '🎉' },
                  { id: 'sad and melancholic', label: 'Sad', icon: '😢' },
                  { id: 'serious and formal', label: 'Serious', icon: '🎯' },
                  { id: 'gentle and soothing', label: 'Gentle', icon: '🌸' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setEmotion(preset.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                      emotion === preset.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-base">{preset.icon}</span>
                    <span className="font-medium">{preset.label}</span>
                  </button>
                ))}
              </div>

              {/* Custom emotion input */}
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Or write custom emotion:</Label>
                <Input
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value)}
                  placeholder='e.g., "very happy with a British accent", "tired and sleepy"'
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  AI will adjust tone, prosody, and emotion based on your description.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Language & Speed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Mic className="w-4 h-4" /> Language & Speed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-detect language</p>
              <p className="text-xs text-muted-foreground">Automatically switch between Arabic and English based on text</p>
            </div>
            <Switch checked={autoDetectLang} onCheckedChange={setAutoDetectLang} />
          </div>

          {!autoDetectLang && (
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium">Default language</Label>
              <select
                value={defaultLang}
                onChange={(e) => setDefaultLang(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="es">Spanish</option>
              </select>
            </div>
          )}

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Speech Speed</Label>
              <span className="text-xs text-muted-foreground font-mono">{speed.toFixed(1)}x</span>
            </div>
            <input
              type="range" min="0.5" max="2.0" step="0.1"
              value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full accent-green-500"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0.5x Slow</span><span>1.0x Normal</span><span>2.0x Fast</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Volume2 className="w-4 h-4" /> Preview Voice</CardTitle>
          <CardDescription>Type text and listen to how your selected voice sounds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Enter text to preview…"
              className="flex-1"
            />
            <Button onClick={handlePreview} disabled={previewing || !previewText.trim()} variant="outline">
              {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Using: <strong>{provider.name}</strong> · Voice: <strong>{voices.find((v) => v.id === selectedVoice)?.name ?? selectedVoice}</strong>
          </p>
        </CardContent>
      </Card>

      {/* Save button at bottom */}
      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} disabled={saving || saved} size="lg">
          {saved ? <><Check className="w-4 h-4 mr-2" /> Saved!</> : saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : 'Save Voice Settings'}
        </Button>
      </div>
    </div>
  );
}
