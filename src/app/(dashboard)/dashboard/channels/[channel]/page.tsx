'use client';
import { useParams } from 'next/navigation';
import { AdapterChannelPanel } from '@/components/channels/AdapterChannelPanel';
import { agentConnectChannels } from '@/lib/agent-connect-catalog';
import { config } from '@/lib/config';
const getAccessToken = () => localStorage.getItem('auth_token');
export default function AdapterChannelPage() {
  const params = useParams<{ channel: string }>();
  const channel = agentConnectChannels.find(item => item.id === params.channel);
  if (!channel) return <p className="p-6">Unknown channel.</p>;
  return <AdapterChannelPanel channel={channel.id} name={channel.label} backendUrl={config.backendUrl} getAccessToken={getAccessToken} />;
}
