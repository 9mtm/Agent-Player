'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, ExternalLink, Settings, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

interface ChannelExtension {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  stats?: {
    totalMessages?: number;
    connected?: boolean;
  };
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<ChannelExtension[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      // Get all extensions
      const response = await fetch(`${BACKEND_URL}/api/extensions`);
      const data = await response.json();

      // Filter channel type extensions that are enabled
      const channelExts = data.extensions
        .filter((ext: any) => ext.type === 'channel' && ext.enabled)
        .map((ext: any) => ({
          id: ext.id,
          name: ext.name,
          description: ext.description,
          enabled: ext.enabled,
          configured: false, // Will check status
          stats: {},
        }));

      // Check each channel's status
      for (const channel of channelExts) {
        try {
          const statusResponse = await fetch(`${BACKEND_URL}/api/ext/${channel.id}/status`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            channel.configured = statusData.configured || false;
            channel.stats = statusData.stats || {};
          }
        } catch (err) {
          console.error(`Failed to get status for ${channel.id}:`, err);
        }
      }

      setChannels(channelExts);
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="p-8">
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No Channels Enabled</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Enable channel extensions from the Extensions page to get started
          </p>
          <Link
            href="/dashboard/extensions"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Settings className="h-4 w-4" />
            Go to Extensions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Channels</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your messaging channels and integrations
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => (
          <Link
            key={channel.id}
            href={`/dashboard/channels/${channel.id}`}
            className="group relative rounded-lg border bg-card p-6 transition-all hover:border-primary hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{channel.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {channel.description}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {channel.configured ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      Connected
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      Not Configured
                    </span>
                  </>
                )}
              </div>

              {channel.stats?.totalMessages !== undefined && (
                <div className="text-sm text-muted-foreground">
                  {channel.stats.totalMessages} messages
                </div>
              )}
            </div>

            {!channel.configured && (
              <div className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Click to configure connection
                </p>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
