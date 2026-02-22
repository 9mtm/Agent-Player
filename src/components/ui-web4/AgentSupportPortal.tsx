'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { config } from '@/lib/config';
import { SupportChatBlock } from './SupportChatBlock';

// AvatarViewer — SSR off (Three.js)
const AvatarViewer = dynamic(
  () => import('@/components/avatar/AvatarViewer').then(m => ({ default: m.AvatarViewer })),
  { ssr: false, loading: () => <div className="w-full h-full bg-transparent" /> },
);

// ── Animation pool — assigned round-robin per agent ────────────────────────────
const ANIM_POOL = [
  'https://readyplayerme-assets.s3.amazonaws.com/animations/visage/male-idle.glb',       // 0 idle (static)
  '/animations/masculine/expression/M_Talking_Variations_001.glb',                        // 1 talking
  '/animations/masculine/expression/M_Standing_Expressions_002.glb',                      // 2 thinking/expression
  'https://readyplayerme-assets.s3.amazonaws.com/animations/visage/male-idle.glb',       // 3 idle again (if >3 agents)
  '/animations/masculine/expression/M_Talking_Variations_001.glb',                        // 4 talking again
];

// ── Types ──────────────────────────────────────────────────────────────────────
interface AgentInfo {
  id: string;
  name: string;
  description: string;
  emoji: string;
  model: string;
  provider: string;
  system_prompt: string;
}

// ── Agent picker card ──────────────────────────────────────────────────────────
function AgentCard({
  agent,
  animUrl,
  avatarUrl,
  onSelect,
}: {
  agent: AgentInfo;
  animUrl: string;
  avatarUrl: string | null;
  onSelect: () => void;
}) {
  const role = agent.description?.trim()
    || agent.system_prompt?.split('\n')[0]?.replace(/^#+\s*/, '').slice(0, 70)
    || 'AI Assistant';

  return (
    <button
      onClick={onSelect}
      className="flex flex-col rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-muted/30 transition-all duration-200 group text-left overflow-hidden w-full"
    >
      {/* Avatar preview area */}
      <div className="relative w-full bg-zinc-950" style={{ height: 140 }}>
        {avatarUrl ? (
          <AvatarViewer
            avatarUrl={avatarUrl}
            isPlaying={false}
            animationUrl={animUrl}
            transparent={true}
            initialPreset="bust"
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {agent.emoji || '🤖'}
          </div>
        )}
        {/* Online dot */}
        <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950" />
      </div>

      {/* Info */}
      <div className="px-3 py-2.5 flex flex-col gap-1 flex-1">
        <span className="font-semibold text-sm truncate">{agent.emoji} {agent.name}</span>
        <span className="text-xs text-muted-foreground line-clamp-2 leading-snug">{role}</span>
        <div className="flex items-center gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <MessageCircle className="h-3 w-3 text-primary" />
          <span className="text-xs text-primary">Start chat</span>
        </div>
      </div>
    </button>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────
export interface AgentSupportPortalProps {
  height?: number | null;
  bgColor?: string | null;
  title?: string | null;
}

export function AgentSupportPortal({ height = 560, bgColor, title = 'Choose your assistant' }: AgentSupportPortalProps) {
  const [agents, setAgents]               = useState<AgentInfo[]>([]);
  const [avatarUrl, setAvatarUrl]         = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [selectedAnim, setSelectedAnim]   = useState<string>(ANIM_POOL[0]);

  const totalHeight = height ?? 560;

  // Fetch agents + avatar URL in parallel
  useEffect(() => {
    Promise.all([
      fetch(`${config.backendUrl}/api/agents-config`).then(r => r.json()),
      fetch(`${config.backendUrl}/api/avatar/settings?userId=1`).then(r => r.json()),
    ])
      .then(([agentsData, avatarData]) => {
        const list: AgentInfo[] = Array.isArray(agentsData) ? agentsData : (agentsData.agents ?? []);
        setAgents(list);
        const url = avatarData?.settings?.rpmAvatarUrl ?? null;
        if (url) {
          // Try to get cached local GLB
          fetch(`/api/avatar-model?url=${encodeURIComponent(url)}`)
            .then(r => r.json())
            .then(d => setAvatarUrl(d.localUrl ?? url))
            .catch(() => setAvatarUrl(url));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Chat view ────────────────────────────────────────────────────────────────
  if (selectedAgent) {
    return (
      <div className="flex flex-col rounded-xl border border-border overflow-hidden shadow-md" style={{ height: totalHeight, width: '100%', maxWidth: 420 }}>
        {/* Back bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20 flex-shrink-0">
          <button
            onClick={() => setSelectedAgent(null)}
            className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">{selectedAgent.emoji} {selectedAgent.name}</span>
        </div>

        {/* SupportChatBlock fills remaining height */}
        <div className="flex-1 min-h-0">
          <SupportChatBlock
            agentName={selectedAgent.name}
            height={totalHeight - 44}
            removable={false}
            bgColor={bgColor}
          />
        </div>
      </div>
    );
  }

  // ── Picker view ──────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col rounded-xl border border-border bg-background overflow-hidden shadow-md"
      style={{ height: totalHeight, width: '100%', maxWidth: 420 }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Select an assistant to start chatting</p>
      </div>

      {/* Agent grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 rounded-2xl border border-border bg-muted/20 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && agents.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-8">
            <span className="text-4xl">🤖</span>
            <p className="text-sm">No agents configured yet.</p>
          </div>
        )}

        {!loading && agents.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {agents.map((agent, idx) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                animUrl={ANIM_POOL[idx % ANIM_POOL.length]}
                avatarUrl={avatarUrl}
                onSelect={() => {
                  setSelectedAnim(ANIM_POOL[idx % ANIM_POOL.length]);
                  setSelectedAgent(agent);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
