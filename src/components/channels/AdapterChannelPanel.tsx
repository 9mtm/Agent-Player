'use client';

import { useEffect, useState } from 'react';
import { ChannelSetupGuide } from './ChannelSetupGuide';

interface Props { channel: string; name: string; backendUrl: string; getAccessToken: () => string | null; }
export function AdapterChannelPanel({ channel, name, backendUrl, getAccessToken }: Props) {
  const [users, setUsers] = useState('');
  const [channels, setChannels] = useState('');
  const [settings, setSettings] = useState('');
  const [environment, setEnvironment] = useState('');
  const [autoReply, setAutoReply] = useState(false);
  const [destination, setDestination] = useState('');
  const [text, setText] = useState('');
  const [state, setState] = useState('disconnected');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const base = `/api/ext/agent-connect/${channel}`;
  async function request(path: string, method = 'GET', body?: unknown) {
    const token = getAccessToken();
    if (!token) throw new Error('Sign in as an owner or admin.');
    const response = await fetch(backendUrl + path, { method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Enable Agent Connect and restart the backend.');
    return result;
  }
  const list = (value: string | string[]) => Array.isArray(value) ? value.join(',') : value || '';
  useEffect(() => {
    let active = true;
    void request(base + '/config').then(result => {
      if (!active) return;
      setUsers(list(result.config.allowed_users)); setChannels(list(result.config.allowed_channels));
      setAutoReply(result.config.auto_reply === true); setLoaded(true);
    }).catch(error => { if (active) setNotice(error.message); });
    return () => { active = false; };
    // Stable page identity; credentials are read on every request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, backendUrl]);
  async function run(action: () => Promise<void>) {
    setBusy(true); setNotice('');
    try { await action(); } catch (error) { setNotice(error instanceof Error ? error.message : 'Operation failed.'); }
    finally { setBusy(false); }
  }
  const input = 'w-full rounded border bg-background p-2';
  const button = 'rounded border px-4 py-2 disabled:opacity-50';
  return <div className="mx-auto max-w-3xl space-y-5 p-6">
    <h1 className="text-2xl font-semibold">{name}</h1>
    <ChannelSetupGuide channel={channel} />
    <p>This adapter requires the optional Python runtime and its provider SDK or bridge. <a className="underline" href="https://github.com/Dpro-at/agent-connect/blob/main/docs/CHANNELS.md" target="_blank" rel="noreferrer">Setup guide</a></p>
    {notice && <p role="status" className="rounded border p-3">{notice}</p>}
    {!loaded && <button className={button} disabled={busy} onClick={() => void run(async () => {
      await request('/api/extensions/agent-connect/enable', 'POST');
      setNotice('Agent Connect enabled. Restart the backend, then reload this page.');
    })}>Enable Agent Connect</button>}
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); void run(async () => {
      const config: Record<string, unknown> = { configured: true, allowed_users: users, allowed_channels: channels, auto_reply: autoReply };
      if (settings.trim()) config.settings = JSON.parse(settings);
      if (environment.trim()) config.environment = JSON.parse(environment);
      await request(base + '/config', 'PUT', { config }); setSettings(''); setEnvironment('');
      setNotice('Saved. Connection is starting in the background.');
    }); }}>
      <label className="block">Trusted sender IDs<input className={input} value={users} onChange={event => setUsers(event.target.value)} /></label>
      <label className="block">Permitted conversation/channel IDs<input className={input} value={channels} onChange={event => setChannels(event.target.value)} /></label>
      <p className="text-sm">Both lists are required for inbound agent processing. Empty lists block messages.</p>
      <label className="block">Provider settings JSON<textarea className={input} rows={5} placeholder={'{"extra": {}}'} value={settings} onChange={event => setSettings(event.target.value)} autoComplete="off" /></label>
      <label className="block">Provider environment JSON<input className={input} type="password" autoComplete="new-password" placeholder={'{"PROVIDER_TOKEN": "..."}'} value={environment} onChange={event => setEnvironment(event.target.value)} /></label>
      <p className="text-sm">Saved provider settings and secrets are never returned to this screen. Blank fields preserve them; supplying JSON replaces that section.</p>
      <p className="text-sm">The Python runtime is set by the server operator (AGENT_CONNECT_PYTHON). Environment names must belong to this channel provider.</p>
      <label className="flex gap-2"><input type="checkbox" checked={autoReply} onChange={event => setAutoReply(event.target.checked)} />Enable primary-agent replies</label>
      <button className={button} disabled={busy || !loaded}>Save settings</button>
    </form>
    <div className="flex items-center gap-3"><span>Connection: {state}</span><button className={button} disabled={busy || !loaded} onClick={() => void run(async () => {
      const result = await request(base + '/status'); setState(result.state);
    })}>Check status</button><button className={button} disabled={busy || !loaded} onClick={() => void run(async () => {
      await request(base + '/connect', 'POST'); const result = await request(base + '/status'); setState(result.state);
    })}>Reconnect</button></div>
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); void run(async () => {
      const result = await request(base + '/send', 'POST', { channelId: destination, content: text });
      setNotice(`Adapter accepted message: ${result.messageId}`);
    }); }}>
      <h2 className="text-lg font-medium">Test message</h2>
      <input className={input} aria-label="Destination conversation ID" placeholder="Destination conversation ID" value={destination} onChange={event => setDestination(event.target.value)} />
      <textarea className={input} aria-label="Test message text" value={text} onChange={event => setText(event.target.value)} />
      <button className={button} disabled={busy || !loaded}>Send test message</button>
    </form>
    <p className="text-sm">Delivery is reported by the adapter; confirm receipt in the provider. Real-account validation remains pending.</p>
  </div>;
}
