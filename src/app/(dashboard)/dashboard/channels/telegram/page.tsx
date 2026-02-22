'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, MessageSquare, Send, Settings as SettingsIcon, BookOpen, ExternalLink, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { SpecRenderer } from '@/lib/json-render/renderer';
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;
const CHANNEL_ID = 'telegram';
const CHANNEL_NAME = 'Telegram';

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
  chat_id?: string;
  from_username?: string;
  text: string;
  timestamp: string;
  direction: 'incoming' | 'outgoing';
}

export default function TelegramChannelPage() {
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
      const extResponse = await fetch(`${BACKEND_URL}/api/extensions`);
      const extData = await extResponse.json();
      const ext = extData.extensions.find((e: any) => e.id === CHANNEL_ID);
      if (ext?.settingsUI) {
        setSettingsUI(ext.settingsUI);
      }

      const configResponse = await fetch(`${BACKEND_URL}/api/extensions/${CHANNEL_ID}/config`);
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfig(configData.config || {});
      }

      const statusResponse = await fetch(`${BACKEND_URL}/api/ext/${CHANNEL_ID}/status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setStatus(statusData);

        if (statusData.configured) {
          const messagesResponse = await fetch(`${BACKEND_URL}/api/ext/${CHANNEL_ID}/messages?limit=20`);
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            setMessages(messagesData.messages || []);
          }
        } else {
          setShowSettings(true);
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${CHANNEL_NAME} data:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (formData: Record<string, any>) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/extensions/${CHANNEL_ID}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: formData }),
      });

      if (response.ok) {
        setConfig(formData);
        setShowSettings(false);
        fetchData();
        return { success: true, message: `${CHANNEL_NAME} settings saved successfully!` };
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
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/channels" className="rounded-lg p-2 hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{CHANNEL_NAME}</h1>
            <p className="text-sm text-muted-foreground">Telegram bot integration</p>
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
            <h2 className="text-xl font-semibold">Telegram Bot Setup Guide</h2>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg bg-card p-4">
              <h3 className="mb-2 font-semibold text-blue-600">Step 1: Create Bot with BotFather</h3>
              <ol className="ml-4 space-y-2 text-sm">
                <li>1. Open Telegram app</li>
                <li>2. Search for <strong>@BotFather</strong> (official bot from Telegram)</li>
                <li>3. Start conversation and send command: <code className="rounded bg-muted px-1">/newbot</code></li>
                <li>4. Enter a <strong>name</strong> for your bot (e.g., "Agent Player Bot")</li>
                <li>5. Enter a <strong>username</strong> for your bot (must end with "bot", e.g., "agentplayer_bot")</li>
                <li>6. BotFather will send you the <strong>Bot Token</strong></li>
                <li className="flex items-start gap-1">7. <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-500 flex-shrink-0" /> <span><strong>Keep this token secret!</strong> Never share it publicly</span></li>
              </ol>
            </div>

            <div className="rounded-lg bg-card p-4">
              <h3 className="mb-2 font-semibold text-blue-600">Step 2: Set Bot Privacy (Optional)</h3>
              <ol className="ml-4 space-y-2 text-sm">
                <li>1. In BotFather conversation, send: <code className="rounded bg-muted px-1">/setprivacy</code></li>
                <li>2. Select your bot</li>
                <li>3. Choose <strong>"Disable"</strong> to allow bot to read all group messages</li>
                <li>4. Or choose <strong>"Enable"</strong> if bot should only see @mentions</li>
              </ol>
            </div>

            <div className="rounded-lg bg-card p-4">
              <h3 className="mb-2 font-semibold text-blue-600">Step 3: Get User ID for Allowed Users (Optional)</h3>
              <ol className="ml-4 space-y-2 text-sm">
                <li>1. Search for <strong>@userinfobot</strong> on Telegram</li>
                <li>2. Start conversation - it will reply with your User ID</li>
                <li>3. Copy the ID (e.g., <code className="rounded bg-muted px-1">123456789</code>)</li>
                <li>4. You can add multiple IDs separated by commas</li>
              </ol>
            </div>

            <div className="rounded-lg bg-card p-4">
              <h3 className="mb-2 font-semibold text-blue-600">Step 4: Configure Webhook (Advanced)</h3>
              <ol className="ml-4 space-y-2 text-sm">
                <li>1. After saving settings below, you'll need to set webhook URL</li>
                <li>2. Use Telegram API: <code className="rounded bg-muted px-1">https://api.telegram.org/bot&lt;TOKEN&gt;/setWebhook?url=&lt;YOUR_WEBHOOK_URL&gt;</code></li>
                <li>3. Or use long polling mode (no webhook needed)</li>
              </ol>
            </div>

            <div className="rounded-lg bg-card p-4">
              <h3 className="mb-2 font-semibold text-blue-600">Step 5: Configure Below</h3>
              <p className="text-sm text-muted-foreground">
                Paste your <strong>Bot Token</strong> from BotFather in the Settings form below and click Save.
              </p>
            </div>
          </div>
        </div>
      )}

      {status && (
        <div className="mb-6 rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status.configured ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <div>
                    <h3 className="font-semibold">Connected</h3>
                    <p className="text-sm text-muted-foreground">{CHANNEL_NAME} bot is configured</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-amber-500" />
                  <div>
                    <h3 className="font-semibold">Not Configured</h3>
                    <p className="text-sm text-muted-foreground">Configure {CHANNEL_NAME} bot settings to get started</p>
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

      {!showSettings && status?.configured && (
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Recent Messages</h2>
          </div>

          {messages.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">No messages yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {messages.map((msg) => (
                <div key={msg.id} className={`p-4 ${msg.direction === 'outgoing' ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${
                      msg.direction === 'outgoing' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {msg.direction === 'outgoing' ? <Send className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{msg.from_username || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{msg.text}</p>
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
