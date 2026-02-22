'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, MessageSquare, Send, Settings as SettingsIcon, BookOpen, ExternalLink, AlertTriangle, Check } from 'lucide-react';
import Link from 'next/link';
import { SpecRenderer } from '@/lib/json-render/renderer';
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

interface ChannelStatus {
  configured: boolean;
  connected: boolean;
  stats: {
    total: number;
    incoming: number;
    outgoing: number;
  };
}

interface Message {
  id: string;
  channel_id: string;
  author_username: string;
  content: string;
  timestamp: string;
  direction: 'incoming' | 'outgoing';
}

export default function DiscordChannelPage() {
  const [status, setStatus] = useState<ChannelStatus | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [settingsUI, setSettingsUI] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get extension manifest for settingsUI
      const extResponse = await fetch(`${BACKEND_URL}/api/extensions`);
      const extData = await extResponse.json();
      const discordExt = extData.extensions.find((e: any) => e.id === 'discord');
      if (discordExt?.settingsUI) {
        setSettingsUI(discordExt.settingsUI);
      }

      // Get current config
      const configResponse = await fetch(`${BACKEND_URL}/api/extensions/discord/config`);
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfig(configData.config || {});
      }

      // Get status
      const statusResponse = await fetch(`${BACKEND_URL}/api/ext/discord/status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setStatus(statusData);

        // If configured, get messages
        if (statusData.configured) {
          const messagesResponse = await fetch(`${BACKEND_URL}/api/ext/discord/messages?limit=20`);
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            setMessages(messagesData.messages || []);
          }
        } else {
          setShowSettings(true); // Auto-show settings if not configured
        }
      }
    } catch (error) {
      console.error('Failed to fetch Discord data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (formData: Record<string, any>) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/extensions/discord/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: formData }),
      });

      if (response.ok) {
        setConfig(formData);
        setShowSettings(false);
        fetchData(); // Refresh data
        return { success: true, message: 'Discord settings saved successfully!' };
      } else {
        return { success: false, message: 'Failed to save settings' };
      }
    } catch (err) {
      console.error('Save failed:', err);
      return { success: false, message: 'Failed to save settings' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/channels"
            className="rounded-lg p-2 hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Discord</h1>
            <p className="text-sm text-muted-foreground">
              Discord bot integration
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <BookOpen className="mr-2 inline-block h-4 w-4" />
            {showInstructions ? 'Hide Guide' : 'Setup Guide'}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <SettingsIcon className="mr-2 inline-block h-4 w-4" />
            {showSettings ? 'Hide Settings' : 'Settings'}
          </button>
        </div>
      </div>

      {/* Setup Instructions */}
      {showInstructions && (
        <div className="mb-6 rounded-lg border border-blue-500/50 bg-blue-500/5 p-6">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Discord Bot Setup Guide</h2>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg bg-card p-4">
              <h3 className="mb-2 font-semibold text-blue-600">Step 1: Create Discord Application</h3>
              <ol className="ml-4 space-y-2 text-sm">
                <li>1. Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">Discord Developer Portal <ExternalLink className="h-3 w-3" /></a></li>
                <li>2. Click <strong>"New Application"</strong></li>
                <li>3. Enter a name for your bot (e.g., "Agent Player Bot")</li>
                <li>4. Click <strong>"Create"</strong></li>
              </ol>
            </div>

            <div className="rounded-lg bg-card p-4">
              <h3 className="mb-2 font-semibold text-blue-600">Step 2: Get Bot Token</h3>
              <ol className="ml-4 space-y-2 text-sm">
                <li>1. In your application, go to <strong>"Bot"</strong> section (left sidebar)</li>
                <li>2. Click <strong>"Add Bot"</strong> → Confirm with <strong>"Yes, do it!"</strong></li>
                <li>3. Under Token section, click <strong>"Reset Token"</strong></li>
                <li>4. Click <strong>"Copy"</strong> to copy your bot token</li>
                <li className="flex items-start gap-1">5. <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-500 flex-shrink-0" /> <span><strong>Keep this token secret!</strong> Never share it publicly</span></li>
              </ol>
            </div>

            <div className="rounded-lg bg-card p-4">
              <h3 className="mb-2 font-semibold text-blue-600">Step 3: Get Client ID</h3>
              <ol className="ml-4 space-y-2 text-sm">
                <li>1. Go to <strong>"OAuth2"</strong> section (left sidebar)</li>
                <li>2. Under <strong>"Client information"</strong>, copy your <strong>Client ID</strong></li>
              </ol>
            </div>

            <div className="rounded-lg bg-card p-4">
              <h3 className="mb-2 font-semibold text-blue-600">Step 4: Get Guild ID (Server ID)</h3>
              <ol className="ml-4 space-y-2 text-sm">
                <li>1. Open Discord app</li>
                <li>2. Go to <strong>User Settings</strong> → <strong>Advanced</strong></li>
                <li>3. Enable <strong>"Developer Mode"</strong></li>
                <li>4. Right-click your server name → <strong>"Copy ID"</strong></li>
              </ol>
            </div>

            <div className="rounded-lg bg-card p-4">
              <h3 className="mb-2 font-semibold text-blue-600">Step 5: Add Bot to Server</h3>
              <ol className="ml-4 space-y-2 text-sm">
                <li>1. Go to <strong>"OAuth2"</strong> → <strong>"URL Generator"</strong></li>
                <li>2. Under <strong>Scopes</strong>, select: <code className="rounded bg-muted px-1">bot</code></li>
                <li>3. Under <strong>Bot Permissions</strong>, select:
                  <ul className="ml-4 mt-1 space-y-1">
                    <li className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Read Messages/View Channels</li>
                    <li className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Send Messages</li>
                    <li className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Read Message History</li>
                  </ul>
                </li>
                <li>4. Copy the generated URL at the bottom</li>
                <li>5. Open the URL in browser and select your server</li>
                <li>6. Click <strong>"Authorize"</strong></li>
              </ol>
            </div>

            <div className="rounded-lg bg-card p-4">
              <h3 className="mb-2 font-semibold text-blue-600">Step 6: Configure Below</h3>
              <p className="text-sm text-muted-foreground">
                Now paste your <strong>Bot Token</strong>, <strong>Client ID</strong>, and <strong>Guild ID</strong> in the Settings form below and click Save.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Card */}
      {status && (
        <div className="mb-6 rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status.configured ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <div>
                    <h3 className="font-semibold">Connected</h3>
                    <p className="text-sm text-muted-foreground">
                      Discord bot is configured
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-amber-500" />
                  <div>
                    <h3 className="font-semibold">Not Configured</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure Discord bot settings to get started
                    </p>
                  </div>
                </>
              )}
            </div>

            {status.configured && (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{status.stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{status.stats.incoming}</div>
                  <div className="text-xs text-muted-foreground">Received</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{status.stats.outgoing}</div>
                  <div className="text-xs text-muted-foreground">Sent</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && settingsUI && (
        <div className="mb-6 rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold">Configuration</h2>
          <SpecRenderer
            spec={{
              ...settingsUI,
              initialValues: config,
              onSubmit: handleSaveConfig,
            }}
            loading={false}
          />
        </div>
      )}

      {/* Messages List */}
      {!showSettings && status?.configured && (
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Recent Messages</h2>
          </div>

          {messages.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                No messages yet
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 ${
                    msg.direction === 'outgoing' ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${
                      msg.direction === 'outgoing'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      {msg.direction === 'outgoing' ? (
                        <Send className="h-4 w-4" />
                      ) : (
                        <MessageSquare className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {msg.author_username || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
