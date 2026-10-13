'use client';
import Link from 'next/link';
import { agentConnectChannels } from '@/lib/agent-connect-catalog';
export default function AgentConnectCatalogPage() {
  return <div className="space-y-5 p-6">
    <h1 className="text-2xl font-semibold">Agent Connect</h1>
    <p>{agentConnectChannels.length} bundled integrations. Telegram and Discord use Node.js; additional adapters require the optional Python runtime and provider setup.</p>
    <p>Enable the Agent Connect extension and restart the backend before configuring additional adapters. No accounts are activated automatically.</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{agentConnectChannels.map(channel => <Link key={channel.id} className="rounded border p-4" href={channel.id === 'slack' || channel.id === 'whatsapp' ? `/dashboard/channels/adapters/${channel.id}` : `/dashboard/channels/${channel.id}`}>
      <h2 className="font-medium">{channel.label}</h2><p className="text-sm">{channel.runtime === 'node-or-python' ? 'Node.js; optional Python adapter' : 'Python adapter; provider setup required'}</p>
    </Link>)}</div>
  </div>;
}
