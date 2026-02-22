'use client';

import { useState, useEffect, useCallback } from 'react';
import { config } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

interface ActivityEntry {
  id: string;
  agent_id: string | null;
  task_id: string | null;
  action_type: 'task_started' | 'tool_called' | 'task_completed' | 'task_failed';
  tool_name: string | null;
  summary: string | null;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  emoji: string;
}

const ACTION_STYLES: Record<string, { label: string; color: string }> = {
  task_started:    { label: 'started',   color: 'bg-blue-100 text-blue-700' },
  tool_called:     { label: 'used tool', color: 'bg-purple-100 text-purple-700' },
  task_completed:  { label: 'done',      color: 'bg-green-100 text-green-700' },
  task_failed:     { label: 'failed',    color: 'bg-red-100 text-red-700' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface AgentActivityFeedProps {
  agentId?: string;
  limit?: number;
  showHeader?: boolean;
  pollInterval?: number;
}

export function AgentActivityFeed({
  agentId,
  limit = 30,
  showHeader = true,
  pollInterval = 5000,
}: AgentActivityFeedProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [agents, setAgents] = useState<Map<string, Agent>>(new Map());

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (agentId) params.set('agentId', agentId);

    const [activityRes, agentsRes] = await Promise.all([
      fetch(`${config.backendUrl}/api/agent-activity?${params}`),
      fetch(`${config.backendUrl}/api/agents`),
    ]);

    if (activityRes.ok) {
      const data = await activityRes.json();
      setEntries(data.activity ?? []);
    }

    if (agentsRes.ok) {
      const data = await agentsRes.json();
      const map = new Map<string, Agent>();
      for (const a of data.agents ?? []) map.set(a.id, a);
      setAgents(map);
    }
  }, [agentId, limit]);

  useEffect(() => {
    load();
    const interval = setInterval(load, pollInterval);
    return () => clearInterval(interval);
  }, [load, pollInterval]);

  const content = (
    <div className="space-y-2 overflow-y-auto max-h-[500px]">
      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-6">No activity yet</p>
      )}
      {entries.map(entry => {
        const agent = entry.agent_id ? agents.get(entry.agent_id) : undefined;
        const style = ACTION_STYLES[entry.action_type] ?? { label: entry.action_type, color: 'bg-slate-100 text-slate-700' };

        return (
          <div key={entry.id} className="flex gap-2 items-start text-xs">
            {/* Agent emoji or fallback icon */}
            <span className="text-base leading-none mt-0.5 shrink-0">
              {agent?.emoji ?? '🤖'}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-medium">{agent?.name ?? 'Agent'}</span>
                <Badge className={`text-[10px] py-0 px-1.5 ${style.color}`}>
                  {style.label}
                </Badge>
                {entry.tool_name && (
                  <span className="font-mono text-muted-foreground">{entry.tool_name}</span>
                )}
              </div>
              {entry.summary && (
                <p className="text-muted-foreground truncate mt-0.5">{entry.summary}</p>
              )}
            </div>

            <span className="text-muted-foreground shrink-0 mt-0.5">{timeAgo(entry.created_at)}</span>
          </div>
        );
      })}
    </div>
  );

  if (!showHeader) return content;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden pt-0">
        {content}
      </CardContent>
    </Card>
  );
}
