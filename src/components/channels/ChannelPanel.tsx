'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChannelSetupGuide } from './ChannelSetupGuide';

type ChannelId = 'telegram' | 'discord';
interface ChannelConfig {
  bot_token?: string;
  allowed_users?: string | string[];
  allowed_channels?: string | string[];
  guild_id?: string;
  auto_reply?: boolean;
}
interface Status {
  configured: boolean;
  connected: boolean;
  state: string;
  stats: { total: number; incoming: number; outgoing: number; failed: number };
}
interface ChannelMessage {
  id: string; conversation_id: string; sender_name: string; content: string;
  timestamp: string; direction: string; state: string;
}
interface Props {
  channel: ChannelId;
  backendUrl: string;
  getAccessToken: () => string | null;
}
const list = (value?: string | string[]) => Array.isArray(value) ? value.join(',') : value || '';

/** React presentation boundary; no Next.js, database or provider SDK dependency. */
export function ChannelPanel({ channel, backendUrl, getAccessToken }: Props) {
  const name = channel === 'telegram' ? 'Telegram' : 'Discord';
  const [settings, setSettings] = useState<ChannelConfig>({});
  const [status, setStatus] = useState<Status>();
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [destination, setDestination] = useState('');
  const [text, setText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const request = useCallback(async (path: string, method = 'GET', body?: unknown) => {
    const token = getAccessToken();
    if (!token) throw new Error('Sign in with an owner or admin account to manage channels.');
    const response = await fetch(`${backendUrl}${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(response.status === 404
      ? 'Enable this extension and restart the backend, then reload this page.'
      : result.error || 'Unable to complete the channel request.');
    return result;
  }, [backendUrl, getAccessToken]);
  const refresh = useCallback(async () => {
    const [state, events] = await Promise.all([
      request(`/api/ext/${channel}/status`), request(`/api/ext/${channel}/messages?limit=30`),
    ]);
    setStatus(state);
    setMessages(events.messages || []);
  }, [channel, request]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await request(`/api/ext/${channel}/config`);
        if (active) { setSettings({ ...result.config, bot_token: '' }); setHasToken(result.hasToken === true); setLoaded(true); }
        if (active) await refresh();
      } catch (err) { if (active) setError(err instanceof Error ? err.message : 'Unable to load channel'); }
    };
    void load();
    const timer = setInterval(() => { void refresh().catch(() => {}); }, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [channel, request, refresh]);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : 'Channel operation failed'); }
    finally { setBusy(false); }
  }
  const inputStyle = 'w-full rounded border bg-background p-2';
  const buttonStyle = 'rounded border px-4 py-2 disabled:opacity-50';
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="text-3xl font-bold">{name}</h1>
        <p className="text-muted-foreground">Connect your bot, manage access, and review messages.</p>
      </div>
      {error && <p role="alert" className="rounded border border-red-500 p-3">{error}</p>}
      {notice && <p role="status" className="rounded border p-3">{notice}</p>}
      <ChannelSetupGuide channel={channel} />
      {!loaded && <button disabled={busy} className={buttonStyle} onClick={() => void run(async () => {
        const result = await request(`/api/extensions/${channel}/enable`, 'POST');
        setNotice(result.message || 'Extension enabled. Restart the backend, then reload this page.');
      })}>Enable extension</button>}
      {status && <section className="rounded border p-4">
        <p>Connection: <strong>{status.connected ? 'Connected' : status.state}</strong></p>
        <p>{status.stats.incoming} received · {status.stats.outgoing} delivered · {status.stats.failed} failed</p>
        <button disabled={busy || !status.configured} className={`${buttonStyle} mt-3`} onClick={() => void run(async () => {
          await request(`/api/ext/${channel}/connect`, 'POST'); await refresh();
        })}>Reconnect</button>
      </section>}
      <section className="rounded border p-5">
        <h2 className="mb-3 text-xl font-semibold">Bot settings</h2>
        <p className="mb-4 text-sm text-muted-foreground">{channel === 'telegram'
          ? 'Create a bot with @BotFather. This integration uses long polling; remove any existing webhook before connecting.'
          : 'Create a bot in Discord Developer Portal, enable Message Content Intent, and invite it with View Channel and Send Messages permissions. Guild text channels are supported.'}</p>
        <form className="space-y-4" onSubmit={event => {
          event.preventDefault();
          void run(async () => {
            await request(`/api/ext/${channel}/config`, 'PUT', { config: settings });
            setHasToken(true);
            setSettings(value => ({ ...value, bot_token: '' }));
            setNotice('Settings saved. The connection updates in the background.'); await refresh();
          });
        }}>
          <label className="block">Bot token
            <input className={inputStyle} type="password" autoComplete="new-password" value={settings.bot_token || ''}
              placeholder="Leave blank to keep the saved token" onChange={event => setSettings({ ...settings, bot_token: event.target.value })} />
            <span className="text-sm text-muted-foreground">{hasToken ? 'A token is saved. Leave this field blank to keep it.' : 'Paste the bot token here. It is hidden after saving.'}</span>
          </label>
          <label className="block">Allowed sender IDs
            <input className={inputStyle} value={list(settings.allowed_users)} placeholder="123456789,987654321"
              onChange={event => setSettings({ ...settings, allowed_users: event.target.value })} />
            <span className="text-sm text-muted-foreground">Only these users can send messages to the agent. An empty list blocks all incoming messages.</span>
          </label>
          {channel === 'discord' && <>
            <label className="block">Allowed channel IDs
              <input className={inputStyle} value={list(settings.allowed_channels)} onChange={event => setSettings({ ...settings, allowed_channels: event.target.value })} />
            </label>
            <label className="block">Guild ID (optional)
              <input className={inputStyle} value={settings.guild_id || ''} onChange={event => setSettings({ ...settings, guild_id: event.target.value })} />
            </label>
          </>}
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.auto_reply === true} onChange={event => setSettings({ ...settings, auto_reply: event.target.checked })} />
            Enable automatic agent replies
          </label>
          <p className="text-sm text-muted-foreground">Allowed senders use the agent runtime under the account that saves these settings. Add trusted IDs only.</p>
          <button className={buttonStyle} disabled={busy || !loaded} type="submit">Save settings</button>
        </form>
      </section>
      <section className="rounded border p-5">
        <h2 className="mb-3 text-xl font-semibold">Send a test message</h2>
        <form className="space-y-3" onSubmit={event => {
          event.preventDefault(); void run(async () => {
            await request(`/api/ext/${channel}/send`, 'POST', channel === 'telegram' ? { chatId: destination, text } : { channelId: destination, content: text });
            setNotice('Message delivered.'); setText(''); await refresh();
          });
        }}>
          <label className="block">{channel === 'telegram' ? 'Chat ID' : 'Channel ID'}
            <input className={inputStyle} required value={destination} onChange={event => setDestination(event.target.value)} />
          </label>
          <label className="block">Message
            <textarea className={inputStyle} required maxLength={channel === 'telegram' ? 4096 : 2000} value={text} onChange={event => setText(event.target.value)} />
          </label>
          <button disabled={busy || !status?.connected} className={buttonStyle}>Send message</button>
        </form>
      </section>
      <section className="rounded border p-5">
        <h2 className="mb-3 text-xl font-semibold">Recent messages</h2>
        {!messages.length && <p>No messages yet.</p>}
        <ul className="divide-y">{messages.map(message => <li key={`${message.conversation_id}:${message.id}:${message.direction}`} className="py-3">
          <p className="text-sm text-muted-foreground">{message.direction} · {message.sender_name} · {message.conversation_id} · {message.state} · {message.timestamp}</p>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </li>)}</ul>
      </section>
    </main>
  );
}
