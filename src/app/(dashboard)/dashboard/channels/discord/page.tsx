'use client';

import { ChannelPanel } from '@/components/channels/ChannelPanel';
import { config } from '@/lib/config';

const getAccessToken = () => localStorage.getItem('auth_token');
export default function DiscordChannelPage() {
  return <ChannelPanel channel="discord" backendUrl={config.backendUrl} getAccessToken={getAccessToken} />;
}
