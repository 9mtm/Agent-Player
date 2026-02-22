'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

interface Agent {
  id: string;
  name: string;
  type: string;
  model?: string;
  status: 'online' | 'offline';
  error?: string;
  version?: string;
}

interface AgentsStatusData {
  agents: Agent[];
  activeAgent: string | null;
  provider: string;
}

export function AgentsStatus() {
  const [data, setData] = useState<AgentsStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
    // Refresh every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/agents/status`);
      const result = await response.json();

      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to load agents status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agents Status</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agents Status</CardTitle>
        <CardDescription>
          Active agents and their connection status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.agents.map((agent) => (
          <div
            key={agent.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              agent.id === data.activeAgent
                ? 'border-primary bg-primary/5'
                : 'border-border'
            }`}
          >
            <div className="flex items-center space-x-3">
              {/* Status indicator */}
              <div
                className={`w-2 h-2 rounded-full ${
                  agent.status === 'online'
                    ? 'bg-green-500 animate-pulse'
                    : 'bg-red-500'
                }`}
              />

              <div>
                <div className="flex items-center space-x-2">
                  <p className="font-medium">{agent.name}</p>
                  {agent.id === data.activeAgent && (
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                {agent.model && (
                  <p className="text-sm text-muted-foreground">{agent.model}</p>
                )}
                {agent.error && (
                  <p className="text-sm text-red-500">{agent.error}</p>
                )}
                {agent.version && (
                  <p className="text-xs text-muted-foreground">v{agent.version}</p>
                )}
              </div>
            </div>

            <Badge
              variant={agent.status === 'online' ? 'default' : 'destructive'}
            >
              {agent.status}
            </Badge>
          </div>
        ))}

        {data.agents.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No agents configured. Go to Settings to add agents.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
