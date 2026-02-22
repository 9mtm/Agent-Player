'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Volume2, Play, Loader2, Check, X, Plus, Key, Mic, User, Users, Eye, EyeOff, Globe } from 'lucide-react';
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
    description: 'Free, high-quality voices powered by Microsoft — no API key needed.',
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const provider = PROVIDERS.find((p) => p.id === activeProvider)!;
  const voices   = provider?.voices ?? [];

  // Auto-select first voice when switching provider
  useEffect(() => {
    const firstVoice = PROVIDERS.find((p) => p.id === activeProvider)?.voices[0];
    if (firstVoice) setSelectedVoice(firstVoice.id);
  }, [activeProvider]);

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const res = await fetch(`${config.backendUrl}/api/audio/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: previewText,
          voice: selectedVoice,
          language: autoDetectLang ? undefined : defaultLang,
          provider: activeProvider,
        }),
      });
      if (!res.ok) throw new Error('Preview failed');
      const data = await res.json();
      if (data.audioUrl) {
        if (audioRef.current) audioRef.current.pause();
        audioRef.current = new Audio(`${config.backendUrl}${data.audioUrl}`);
        audioRef.current.play();
        audioRef.current.onended = () => setPreviewing(false);
      }
    } catch {
      setPreviewing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${config.backendUrl}/api/avatar/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1,
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
