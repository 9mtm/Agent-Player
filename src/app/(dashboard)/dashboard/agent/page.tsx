'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Bot, Plus, Save, Trash2, Star,
  X, Loader2, Settings2, Brain,
  Globe, Zap, Shield, Eye, EyeOff, Key, MessageSquare,
  AlertTriangle, Gem, Terminal, Wrench, Home
} from 'lucide-react';
import { config } from '@/lib/config';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Capabilities {
  webSearch: boolean;
  fileOperations: boolean;
  memory: boolean;
  executeCommands: boolean;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  emoji: string;
  system_prompt: string;
  model: string;
  provider: string;
  isPrimary: boolean;
  temperature: number;
  max_tokens: number;
  api_key: string;
  apiKeySet: boolean;
  capabilities: Capabilities;
  created_at: string;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  emoji: '🤖',
  system_prompt: 'You are a helpful AI assistant.',
  model: 'claude-sonnet-4-5-20250929',
  provider: 'claude',
  temperature: 0.7,
  max_tokens: 4096,
  api_key: '',
  capabilities: { webSearch: true, fileOperations: true, memory: true, executeCommands: false } as Capabilities,
};

const EMOJI_OPTIONS = ['🤖', '🧠', '🎯', '⚡', '🔬', '🎨', '📝', '💼', '🌐', '🛡️', '🔧', '📊'];

// Helper to get provider logo
function getProviderLogo(provider: string): string | null {
  const logos: Record<string, string> = {
    'claude': '/icons/claude-logo.svg',
    'openai': '/icons/chatgpt-logo.svg',
    'google': '/icons/gemini-logo.svg',
    'gemini-cli': '/icons/gemini-logo.svg',
    'claude-cli': '/icons/claude-logo.svg',
  };
  return logos[provider] || null;
}

// ── Popular Agent Templates ────────────────────────────────────────────────────
interface AgentTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  provider: string;
  model: string;
  badge: string;
  badgeColor: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  note?: string;
}

const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet 4.5',
    emoji: '🧠',
    description: 'Balanced intelligence and speed. Best for most tasks.',
    provider: 'claude',
    model: 'claude-sonnet-4-5-20250929',
    badge: 'Anthropic',
    badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    system_prompt: 'You are a helpful, knowledgeable AI assistant. You help users with a wide range of tasks including research, writing, analysis, and problem solving. Be concise, accurate, and friendly.',
    temperature: 0.7,
    max_tokens: 4096,
  },
  {
    id: 'claude-opus',
    name: 'Claude Opus 4.6',
    emoji: '🏛️',
    description: 'Most powerful model for complex, nuanced tasks.',
    provider: 'claude',
    model: 'claude-opus-4-6',
    badge: 'Anthropic',
    badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    system_prompt: 'You are an advanced AI assistant with deep reasoning capabilities. You excel at complex analysis, creative work, and nuanced problem solving. Take your time to think through problems carefully.',
    temperature: 0.8,
    max_tokens: 8192,
  },
  {
    id: 'claude-haiku',
    name: 'Claude Haiku 4.5',
    emoji: '⚡',
    description: 'Ultra-fast responses for quick queries.',
    provider: 'claude',
    model: 'claude-haiku-4-5-20251001',
    badge: 'Anthropic',
    badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    system_prompt: 'You are a fast, efficient AI assistant. Provide concise, direct answers. Prioritize speed and clarity over lengthy explanations.',
    temperature: 0.5,
    max_tokens: 2048,
  },
  {
    id: 'gpt4o',
    name: 'GPT-4o',
    emoji: '🤖',
    description: 'OpenAI flagship multimodal model.',
    provider: 'openai',
    model: 'gpt-4o',
    badge: 'OpenAI',
    badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    system_prompt: 'You are a helpful AI assistant powered by GPT-4o. You can handle text, images, and complex reasoning tasks. Be helpful, accurate, and concise.',
    temperature: 0.7,
    max_tokens: 4096,
    note: 'Requires OpenAI API key in Settings',
  },
  {
    id: 'gpt4o-mini',
    name: 'GPT-4o Mini',
    emoji: '🔋',
    description: 'Cost-efficient OpenAI model for simple tasks.',
    provider: 'openai',
    model: 'gpt-4o-mini',
    badge: 'OpenAI',
    badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    system_prompt: 'You are a helpful, efficient AI assistant. Provide clear and accurate answers while being cost-effective.',
    temperature: 0.7,
    max_tokens: 2048,
    note: 'Requires OpenAI API key in Settings',
  },
  {
    id: 'gemini-flash',
    name: 'Gemini 2.0 Flash',
    emoji: '💎',
    description: 'Google\'s fast and capable multimodal model.',
    provider: 'google',
    model: 'gemini-2.0-flash-exp',
    badge: 'Google',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    system_prompt: 'You are a helpful AI assistant powered by Google Gemini. You excel at multimodal tasks, reasoning, and providing comprehensive responses.',
    temperature: 0.7,
    max_tokens: 4096,
    note: 'Requires Google API key in Settings',
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    emoji: '🖥️',
    description: 'Use local Gemini CLI credentials (free tier via Google Account).',
    provider: 'gemini-cli',
    model: 'gemini-2.0-flash-exp',
    badge: 'Google CLI',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    system_prompt: 'You are a helpful AI assistant powered by Google Gemini via CLI authentication. Help users with coding, research, writing, and analysis.',
    temperature: 0.7,
    max_tokens: 4096,
    note: 'Requires: npm install -g @google/gemini-cli && gemini auth login',
  },
  {
    id: 'claude-cli',
    name: 'Claude CLI',
    emoji: '🔧',
    description: 'Use Claude Code CLI with local credentials (powerful agentic tools).',
    provider: 'claude-cli',
    model: 'claude-sonnet-4-5-20250929',
    badge: 'Claude CLI',
    badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    system_prompt: 'You are a helpful AI assistant powered by Claude Code CLI with full agentic capabilities. Help users with coding, file operations, system tasks, and complex problem solving.',
    temperature: 0.7,
    max_tokens: 4096,
    note: 'Requires: npm install -g @anthropic-ai/claude-code && ANTHROPIC_API_KEY',
  },
  {
    id: 'ollama-local',
    name: 'Local AI (Ollama)',
    emoji: '🏠',
    description: 'Run AI locally on your machine using Ollama.',
    provider: 'local',
    model: 'qwen2.5:latest',
    badge: 'Local',
    badgeColor: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    system_prompt: 'You are a helpful AI assistant running locally. Provide accurate and useful responses while respecting user privacy.',
    temperature: 0.7,
    max_tokens: 4096,
    note: 'Requires Ollama running at localhost:11434',
  },
];

// ── Templates Modal ─────────────────────────────────────────────────────────────
function TemplatesModal({ onSelect, onClose }: { onSelect: (t: AgentTemplate) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" /> Popular AI Agents
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Choose a pre-configured agent to get started quickly</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AGENT_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => { onSelect(t); onClose(); }}
              className="text-left p-4 border rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
            >
              <div className="flex items-start gap-3">
                {getProviderLogo(t.provider) ? (
                  <img src={getProviderLogo(t.provider)!} alt={t.name} className="w-8 h-8 object-contain flex-shrink-0" />
                ) : (
                  <span className="text-2xl">{t.emoji}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{t.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${t.badgeColor}`}>{t.badge}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                  {t.note && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {t.note}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="px-5 py-3 border-t text-xs text-muted-foreground text-center">
          Or click <strong>New Agent</strong> to create a custom agent from scratch
        </div>
      </div>
    </div>
  );
}

// ── Agent Card ─────────────────────────────────────────────────────────────────
function AgentCard({
  agent, onEdit, onDelete, onSetPrimary, totalAgents,
}: {
  agent: Agent;
  onEdit: (a: Agent) => void;
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
  totalAgents: number;
}) {
  const router = useRouter();
  const providerBadge =
    agent.provider === 'claude'      ? { label: 'Anthropic', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' } :
    agent.provider === 'openai'      ? { label: 'OpenAI',    cls: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-300'  } :
    agent.provider === 'google'      ? { label: 'Google',    cls: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300'   } :
    agent.provider === 'gemini-cli'  ? { label: 'Gemini CLI',cls: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300'   } :
    agent.provider === 'claude-cli'  ? { label: 'Claude CLI',cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' } :
                                       { label: 'Local',     cls: 'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400'   };

  return (
    <Card className={`relative transition-all ${agent.isPrimary ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'}`}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl mt-0.5">{agent.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm font-semibold truncate">{agent.name}</CardTitle>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${providerBadge.cls}`}>{providerBadge.label}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{agent.description || 'No description'}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 px-4 pb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
            {agent.model.split('-').slice(0, 3).join('-')}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            T:{agent.temperature}
          </span>
          {agent.apiKeySet && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
              <Key className="w-2.5 h-2.5" /> Key set
            </span>
          )}
        </div>

        <div className="flex gap-1 flex-wrap">
          {agent.capabilities?.webSearch      && <span className="text-[10px] px-1.5 py-0.5 bg-green-100  dark:bg-green-900/20  text-green-700  dark:text-green-400  rounded">Web</span>}
          {agent.capabilities?.fileOperations && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100   dark:bg-blue-900/20   text-blue-700   dark:text-blue-400   rounded">Files</span>}
          {agent.capabilities?.memory         && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded">Memory</span>}
          {agent.capabilities?.executeCommands && <span className="text-[10px] px-1.5 py-0.5 bg-red-100   dark:bg-red-900/20   text-red-700   dark:text-red-400   rounded">Commands</span>}
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 rounded p-2 min-h-[34px]">
          {agent.system_prompt || <em>No system prompt</em>}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-0.5">
          <Button size="sm" variant="default" onClick={() => onEdit(agent)} className="flex-1 h-7 text-xs">
            <Settings2 className="w-3 h-3 mr-1" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/dashboard/agents/${agent.id}/files`)}
            className="h-7 px-2 text-xs"
            title="Edit PERSONALITY.md and MEMORY.md"
          >
            <Brain className="w-3 h-3" />
          </Button>
          {/* Set Primary — always visible; filled = already primary */}
          <Button
            size="sm"
            variant={agent.isPrimary ? 'default' : 'outline'}
            onClick={() => !agent.isPrimary && onSetPrimary(agent.id)}
            className={`h-7 w-7 p-0 ${agent.isPrimary ? 'bg-blue-500 hover:bg-blue-600 text-white border-0 cursor-default' : ''}`}
            title={agent.isPrimary ? 'Primary agent' : 'Set as primary'}
          >
            <Star className={`w-3 h-3 ${agent.isPrimary ? 'fill-white' : ''}`} />
          </Button>
          {(!agent.isPrimary || totalAgents === 1) && (
            <Button
              size="sm" variant="outline" onClick={() => onDelete(agent.id)}
              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:border-red-300" title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Edit Panel ─────────────────────────────────────────────────────────────────
function AgentEditPanel({
  agent, models, onSave, onClose,
}: {
  agent: Partial<Agent> & { isNew?: boolean };
  models: ModelOption[];
  onSave: (data: typeof EMPTY_FORM) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<typeof EMPTY_FORM>({
    name:         agent.name         || '',
    description:  agent.description  || '',
    emoji:        agent.emoji        || '🤖',
    system_prompt:agent.system_prompt|| 'You are a helpful AI assistant.',
    model:        agent.model        || 'claude-sonnet-4-5-20250929',
    provider:     agent.provider     || 'claude',
    temperature:  agent.temperature  ?? 0.7,
    max_tokens:   agent.max_tokens   ?? 4096,
    api_key:      '',  // Always start empty; backend keeps existing key if we send empty
    capabilities: agent.capabilities ?? { webSearch: true, fileOperations: true, memory: true, executeCommands: false },
  });
  const [saving, setSaving]         = useState(false);
  const [showApiKey, setShowApiKey]  = useState(false);
  const [tab, setTab]               = useState<'settings' | 'test'>('settings');
  // Test chat state
  const [testMessages, setTestMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [testInput, setTestInput]       = useState('');
  const [testLoading, setTestLoading]   = useState(false);
  const testBottomRef = useRef<HTMLDivElement>(null);

  const set    = (key: keyof typeof EMPTY_FORM, val: unknown) => setForm((f) => ({ ...f, [key]: val }));
  const setCap = (key: keyof Capabilities, val: boolean)      => setForm((f) => ({ ...f, capabilities: { ...f.capabilities, [key]: val } }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const handleTestSend = async () => {
    if (!testInput.trim() || testLoading || !agent.id) return;
    const userMsg = { role: 'user' as const, content: testInput.trim() };
    const updated = [...testMessages, userMsg];
    setTestMessages(updated);
    setTestInput('');
    setTestLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated, agentId: agent.id }),
      });
      if (!res.ok || !res.body) throw new Error('Request failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      setTestMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setTestMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: assistantContent };
          return copy;
        });
        testBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch {
      setTestMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to agent.' }]);
    } finally {
      setTestLoading(false);
    }
  };

  // Full model catalogue — provider-tagged
  const BUILTIN_MODELS: ModelOption[] = [
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5',  provider: 'claude'     },
    { id: 'claude-opus-4-6',            name: 'Claude Opus 4.6',    provider: 'claude'     },
    { id: 'claude-haiku-4-5-20251001',  name: 'Claude Haiku 4.5',   provider: 'claude'     },
    { id: 'gpt-4o',                     name: 'GPT-4o',              provider: 'openai'     },
    { id: 'gpt-4o-mini',                name: 'GPT-4o Mini',         provider: 'openai'     },
    { id: 'gemini-2.0-flash-exp',       name: 'Gemini 2.0 Flash',    provider: 'google'     },
    { id: 'gemini-1.5-pro',             name: 'Gemini 1.5 Pro',      provider: 'google'     },
    { id: 'gemini-2.0-flash-exp',       name: 'Gemini 2.0 Flash',    provider: 'gemini-cli' },
    { id: 'gemini-1.5-pro',             name: 'Gemini 1.5 Pro',      provider: 'gemini-cli' },
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5',   provider: 'claude-cli' },
    { id: 'claude-opus-4-6',            name: 'Claude Opus 4.6',     provider: 'claude-cli' },
    { id: 'claude-haiku-4-5-20251001',  name: 'Claude Haiku 4.5',    provider: 'claude-cli' },
    { id: 'qwen2.5:latest',             name: 'Qwen 2.5 (Local)',    provider: 'local'      },
    { id: 'llama3.1:latest',            name: 'Llama 3.1 (Local)',   provider: 'local'      },
    { id: 'mistral:latest',             name: 'Mistral (Local)',      provider: 'local'      },
  ];

  // Merge backend models (already have provider) with builtin list
  const allModels: ModelOption[] = models.length > 0
    ? [...models, ...BUILTIN_MODELS.filter((b) => !models.find((m) => m.id === b.id && m.provider === b.provider))]
    : BUILTIN_MODELS;

  // Filter to current provider only
  const filteredModels = allModels.filter((m) => m.provider === form.provider);

  // When provider changes → auto-select first matching model
  const handleProviderChange = (newProvider: string) => {
    set('provider', newProvider);
    const first = allModels.find((m) => m.provider === newProvider);
    if (first) set('model', first.id);
  };

  const PROVIDERS = [
    { id: 'claude',      label: 'Anthropic Claude',   icon: Brain },
    { id: 'openai',      label: 'OpenAI GPT',         icon: Bot },
    { id: 'google',      label: 'Google Gemini API',  icon: Gem },
    { id: 'gemini-cli',  label: 'Google Gemini CLI',  icon: Terminal },
    { id: 'claude-cli',  label: 'Claude Code CLI',    icon: Wrench },
    { id: 'local',       label: 'Local (Ollama)',     icon: Home },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-background border-l shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{form.emoji}</span>
            <div>
              <h2 className="font-semibold">{agent.isNew ? 'New Agent' : 'Edit Agent'}</h2>
              <p className="text-xs text-muted-foreground">{agent.isNew ? 'Create a specialized AI agent' : `Editing: ${agent.name}`}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs — only for existing agents */}
        {!agent.isNew && (
          <div className="flex border-b">
            <button
              onClick={() => setTab('settings')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === 'settings' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Settings
            </button>
            <button
              onClick={() => setTab('test')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${tab === 'test' ? 'border-b-2 border-green-500 text-green-600' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Test
            </button>
          </div>
        )}

        {/* Test Chat Panel */}
        {tab === 'test' && !agent.isNew && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {testMessages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-10">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Send a message to test this agent</p>
                  <p className="text-xs mt-1 opacity-70">{form.name} · {form.model}</p>
                </div>
              )}
              {testMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}>
                    {m.content || <span className="opacity-50 italic">Thinking…</span>}
                  </div>
                </div>
              ))}
              <div ref={testBottomRef} />
            </div>
            <div className="border-t p-3 flex gap-2">
              <textarea
                value={testInput}
                onChange={e => setTestInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTestSend(); } }}
                placeholder="Type a test message…"
                rows={2}
                className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button onClick={handleTestSend} disabled={testLoading || !testInput.trim()} size="sm" className="self-end h-9 px-3">
                {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send</span>}
              </Button>
            </div>
          </div>
        )}

        {/* Settings Body */}
        {(tab === 'settings' || agent.isNew) && (
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Emoji */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Icon</Label>
            <div className="flex gap-1.5 flex-wrap">
              {EMOJI_OPTIONS.map((e) => (
                <button key={e} onClick={() => set('emoji', e)}
                  className={`text-xl w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    form.emoji === e
                      ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-400'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium">Agent Name *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Code Helper, Research Assistant…" />
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium">Description</Label>
            <Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What is this agent specialized in?" />
          </div>

          {/* System Prompt */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">System Prompt</Label>
              <span className="text-[10px] text-muted-foreground">{form.system_prompt.length} chars</span>
            </div>
            <Textarea
              value={form.system_prompt}
              onChange={(e) => set('system_prompt', e.target.value)}
              placeholder="Define the agent's personality, expertise, and behavior…"
              className="min-h-[140px] text-sm font-mono resize-none"
            />
          </div>

          {/* Provider */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium">Provider</Label>
            <select
              value={form.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            {form.provider === 'gemini-cli' && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-2 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>Requires Gemini CLI installed and authenticated:<br />
                <code className="font-mono">npm install -g @google/gemini-cli</code><br />
                <code className="font-mono">gemini auth login</code></span>
              </p>
            )}
            {form.provider === 'claude-cli' && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-2 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>Requires Claude Code CLI installed and ANTHROPIC_API_KEY configured:<br />
                <code className="font-mono">npm install -g @anthropic-ai/claude-code</code><br />
                <code className="font-mono">set ANTHROPIC_API_KEY=sk-ant-...</code></span>
              </p>
            )}
          </div>

          {/* API Key — shown for providers that need one */}
          {(form.provider === 'openai' || form.provider === 'google' || form.provider === 'claude') && (
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" /> API Key
                <span className="text-[10px] font-normal text-muted-foreground">(optional — overrides global key)</span>
              </Label>

              {/* Show green badge if key already saved */}
              {(agent as any).apiKeySet && !form.api_key && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded px-3 py-2">
                  <Key className="w-3.5 h-3.5 shrink-0" />
                  API key is saved. Type a new one below to replace it, or leave empty to keep.
                </div>
              )}

              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={form.api_key}
                  onChange={(e) => set('api_key', e.target.value)}
                  placeholder={
                    (agent as any).apiKeySet
                      ? '••••••••  (leave empty to keep existing)'
                      : form.provider === 'claude' ? 'sk-ant-...'
                      : form.provider === 'openai' ? 'sk-...'
                      : form.provider === 'google' ? 'AIza...'
                      : 'Enter API key'
                  }
                  className="pr-9 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Leave empty to use the global key from Settings → AI Keys.
              </p>
            </div>
          )}

          {/* Model — filtered by selected provider */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium">AI Model</Label>
            <select
              value={form.model}
              onChange={(e) => set('model', e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {filteredModels.length > 0
                ? filteredModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)
                : <option value={form.model}>{form.model}</option>}
            </select>
            {filteredModels.length === 0 && (
              <p className="text-xs text-muted-foreground">No models found for this provider. You can type a custom model ID above.</p>
            )}
          </div>

          {/* Temperature */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Temperature</Label>
              <span className="text-xs text-muted-foreground font-mono">{form.temperature.toFixed(1)}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.1" value={form.temperature}
              onChange={(e) => set('temperature', parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Focused</span><span>Balanced</span><span>Creative</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium">Max Tokens</Label>
            <Input
              type="number" min={256} max={16000} step={256}
              value={form.max_tokens}
              onChange={(e) => set('max_tokens', parseInt(e.target.value))}
            />
          </div>

          {/* Capabilities */}
          <div className="space-y-3">
            <Label className="text-xs font-medium block">Capabilities</Label>
            {[
              { key: 'webSearch'       as const, label: 'Web Search',       desc: 'Search the internet for information' },
              { key: 'fileOperations'  as const, label: 'File Operations',  desc: 'Read and write files on disk' },
              { key: 'memory'          as const, label: 'Memory',           desc: 'Remember facts across conversations' },
              { key: 'executeCommands' as const, label: 'Execute Commands', desc: 'Run system shell commands (caution!)' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch checked={form.capabilities[key]} onCheckedChange={(v) => setCap(key, v)} />
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Footer — visible on settings tab only */}
        {(tab === 'settings' || agent.isNew) && (
          <div className="px-5 py-4 border-t flex items-center gap-2">
            <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {agent.isNew ? 'Create Agent' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AgentPage() {
  const [agents, setAgents]               = useState<Agent[]>([]);
  const [models, setModels]               = useState<ModelOption[]>([]);
  const [loading, setLoading]             = useState(true);
  const [editingAgent, setEditingAgent]   = useState<(Partial<Agent> & { isNew?: boolean }) | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const BACKEND = config.backendUrl;

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/agents`);
      if (res.ok) {
        const data = await res.json();
        const list: Agent[] = data.agents || [];
        setAgents(list);
        // Auto-set first agent as primary if none is set
        if (list.length === 1 && !list[0].isPrimary) {
          await fetch(`${BACKEND}/api/agents/${list[0].id}/set-primary`, { method: 'POST' });
          const res2 = await fetch(`${BACKEND}/api/agents`);
          if (res2.ok) setAgents((await res2.json()).agents || []);
        }
      }
    } catch { setError('Cannot connect to backend'); }
    setLoading(false);
  }, [BACKEND]);

  useEffect(() => {
    loadAgents();
    fetch(`${BACKEND}/api/models`)
      .then((r) => r.json())
      .then((d) => setModels(d.models || []))
      .catch(() => {});
  }, [BACKEND, loadAgents]);

  const handleSave = async (data: typeof EMPTY_FORM) => {
    const url    = editingAgent?.id ? `${BACKEND}/api/agents/${editingAgent.id}` : `${BACKEND}/api/agents`;
    const method = editingAgent?.id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) { setError('Failed to save agent'); return; }
    setEditingAgent(null);
    await loadAgents();
  };

  const handleDelete = async (id: string) => {
    const target = agents.find((a) => a.id === id);
    if (target?.isPrimary && agents.length > 1) { setError('Cannot delete the primary agent. Set another agent as primary first.'); return; }
    if (!confirm('Delete this agent?')) return;
    const res = await fetch(`${BACKEND}/api/agents/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Failed to delete agent');
      return;
    }
    await loadAgents();
  };

  const handleSetPrimary = async (id: string) => {
    await fetch(`${BACKEND}/api/agents/${id}/set-primary`, { method: 'POST' });
    await loadAgents();
  };


  const handleSelectTemplate = (t: AgentTemplate) => {
    setEditingAgent({
      isNew: true,
      name:         t.name,
      description:  t.description,
      emoji:        t.emoji,
      system_prompt:t.system_prompt,
      model:        t.model,
      provider:     t.provider,
      temperature:  t.temperature,
      max_tokens:   t.max_tokens,
      capabilities: { webSearch: true, fileOperations: true, memory: true, executeCommands: false },
    });
  };


  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-500" /> Agent Configuration
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage AI agents — each with its own personality, model, and capabilities.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplates(true)}>
            <Globe className="mr-2 h-4 w-4" /> Add Online Agent
          </Button>
          <Button onClick={() => setEditingAgent({ isNew: true, ...EMPTY_FORM })}>
            <Plus className="mr-2 h-4 w-4" /> New Agent
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 text-muted-foreground py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading agents…
        </div>
      ) : (
        <>
          {/* All agents in a single responsive grid */}
          {agents.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {agents.map((a) => (
                <AgentCard
                  key={a.id}
                  agent={a}
                  onEdit={setEditingAgent}
                  onDelete={handleDelete}
                  onSetPrimary={handleSetPrimary}
                  totalAgents={agents.length}
                />
              ))}
              {/* Add new card */}
              <button
                onClick={() => setEditingAgent({ isNew: true, ...EMPTY_FORM })}
                className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground hover:text-blue-500 hover:border-blue-400 transition-colors min-h-[200px]"
              >
                <Plus className="w-8 h-8" />
                <span className="text-sm font-medium">New Agent</span>
              </button>
            </div>
          )}

          {/* Empty */}
          {agents.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No agents yet</p>
              <p className="text-sm mt-1">Create your first agent to get started.</p>
              <div className="flex gap-2 justify-center mt-4">
                <Button variant="outline" onClick={() => setShowTemplates(true)}>
                  <Globe className="mr-2 h-4 w-4" /> Choose Online Agent
                </Button>
                <Button onClick={() => setEditingAgent({ isNew: true, ...EMPTY_FORM })}>
                  <Plus className="mr-2 h-4 w-4" /> Create Custom
                </Button>
              </div>
            </div>
          )}

          {/* Info card */}
          <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
            <CardContent className="py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="flex gap-2">
                  <Star className="w-4 h-4 text-blue-500 shrink-0 mt-0.5 fill-blue-400" />
                  <div>
                    <p className="font-semibold text-blue-800 dark:text-blue-300">Primary Agent</p>
                    <p className="text-xs text-blue-700 dark:text-blue-400">Handles all general conversations. Click the star icon on any card to change.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Zap className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-800 dark:text-blue-300">Specialized Agents</p>
                    <p className="text-xs text-blue-700 dark:text-blue-400">Called automatically when their expertise is needed by the orchestrator.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-800 dark:text-blue-300">Shared Memory</p>
                    <p className="text-xs text-blue-700 dark:text-blue-400">All agents share common knowledge + each has private conversation memory.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <TemplatesModal
          onSelect={handleSelectTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Edit / Create Panel */}
      {editingAgent && (
        <AgentEditPanel
          agent={editingAgent}
          models={models}
          onSave={handleSave}
          onClose={() => setEditingAgent(null)}
        />
      )}
    </div>
  );
}
