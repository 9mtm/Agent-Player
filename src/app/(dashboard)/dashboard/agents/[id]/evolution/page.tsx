'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { PerformanceMetricsCard } from '@/components/evolution/PerformanceMetricsCard';
import { InsightCard } from '@/components/evolution/InsightCard';
import { EvolutionTimeline } from '@/components/evolution/EvolutionTimeline';
import { ConfigPanel } from '@/components/evolution/ConfigPanel';
import { ManualControls } from '@/components/evolution/ManualControls';
import { PendingProposals } from '@/components/evolution/PendingProposals';
import { decisionNotice, suggestedCapabilities, type SuggestedCapability } from '@/lib/evolution/proposal-review';
import { configFromStatus, configToBackend, evolutionNotice, type EvolutionAction, type PanelEvolutionConfig } from '@/lib/evolution/evolution-requests';

/** FU-02: the proxies keep the backend status; turn a failed reply into a short notice. */
async function failure(action: EvolutionAction, res: Response): Promise<Error> {
    const data = await res.json().catch(() => ({}));
    return new Error(evolutionNotice(action, res.status, (data as { code?: unknown })?.code));
}

interface EvolutionStatus {
    agentId: string;
    config: any;
    performance: any;
    insights: any[];
    recentEvolutions: any[];
    status: string;
}

export default function AgentEvolutionPage() {
    const params = useParams();
    const router = useRouter();
    const agentId = params.id as string;

    const [status, setStatus] = useState<EvolutionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [evolving, setEvolving] = useState(false);
    const [rolling, setRolling] = useState(false);
    // FU-01: an evolve cycle files proposals; reload the pending list after it.
    const [proposalsKey, setProposalsKey] = useState(0);
    const [suggested, setSuggested] = useState<SuggestedCapability[]>([]);
    const [loadNotice, setLoadNotice] = useState<string | null>(null);
    // The status route returns the snake_case config row; the panel edits
    // camelCase (FU-02). Memoised so the panel keeps unsaved edits across renders.
    const config = useMemo(() => configFromStatus(status?.config), [status]);

    const loadStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/evolution/${encodeURIComponent(agentId)}/status`);
            if (!res.ok) throw await failure('status', res);
            const data = await res.json();
            setStatus(data);
            setLoadNotice(null);
        } catch (err: any) {
            setStatus(null);
            setLoadNotice(err.message || 'Failed to load evolution status');
            toast.error(err.message || 'Failed to load evolution status');
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async (periodDays: number) => {
        setAnalyzing(true);
        try {
            const res = await fetch(`/api/evolution/${encodeURIComponent(agentId)}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ periodDays }),
            });

            if (!res.ok) throw await failure('analyze', res);

            await loadStatus();
        } finally {
            setAnalyzing(false);
        }
    };

    const handleEvolve = async () => {
        setEvolving(true);
        try {
            const res = await fetch(`/api/evolution/${encodeURIComponent(agentId)}/evolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(res.status === 403 ? decisionNotice(403) : 'Failed to evolve agent');

            setSuggested(suggestedCapabilities(data));
            setProposalsKey((k) => k + 1);
            await loadStatus();
        } finally {
            setEvolving(false);
        }
    };

    const handleRollback = async (evolutionId: string) => {
        if (!confirm('Are you sure you want to rollback this evolution?')) return;

        setRolling(true);
        try {
            const res = await fetch(`/api/evolution/${encodeURIComponent(agentId)}/rollback/${encodeURIComponent(evolutionId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            });

            // 403 owner only; 409 stale / rollback_unsupported / already_rolled_back.
            if (!res.ok) {
                const err = await failure('rollback', res);
                if (res.status === 409) await loadStatus();
                throw err;
            }

            toast.success('Evolution rolled back');
            await loadStatus();
        } catch (err: any) {
            toast.error(err.message || 'Failed to rollback');
        } finally {
            setRolling(false);
        }
    };

    const handleSaveConfig = async (config: Partial<PanelEvolutionConfig>) => {
        // The panel edits camelCase; the backend takes the snake_case fields (FU-02).
        const res = await fetch(`/api/evolution/${encodeURIComponent(agentId)}/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configToBackend(config)),
        });

        if (!res.ok) throw await failure('config', res);

        await loadStatus();
    };

    useEffect(() => {
        if (agentId) loadStatus();
    }, [agentId]);

    if (loading) {
        return (
            <div className="p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Agent Evolution</h1>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!status) {
        return (
            <div className="p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Agent Evolution</h1>
                    <p className="text-gray-600">{loadNotice || 'Failed to load evolution status'}</p>
                </div>
            </div>
        );
    }

    const pendingInsights = (status.insights || []).filter((i) => !i.applied);
    const appliedInsights = (status.insights || []).filter((i) => i.applied);


    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="mb-8">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Agent Evolution</h1>
                        <p className="text-gray-600">
                            {status.status === 'active' ? 'Evolution is active' : 'Evolution is disabled'}
                        </p>
                    </div>
                    <Button onClick={() => loadStatus()} variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Manual Controls */}
            <ManualControls
                agentId={agentId}
                onAnalyze={handleAnalyze}
                onEvolve={handleEvolve}
                analyzing={analyzing}
                evolving={evolving}
            />

            {/* Pending proposals (FU-01) */}
            <PendingProposals
                agentId={agentId}
                refreshKey={proposalsKey}
                suggestedCapabilities={suggested}
            />

            {/* Performance Metrics */}
            <PerformanceMetricsCard
                metrics={status.performance || {}}
                loading={false}
            />

            {/* Tabs */}
            <Tabs defaultValue="insights" className="w-full">
                <TabsList>
                    <TabsTrigger value="insights">
                        Insights ({pendingInsights.length})
                    </TabsTrigger>
                    <TabsTrigger value="applied">
                        Applied ({appliedInsights.length})
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        History ({(status.recentEvolutions || []).length})
                    </TabsTrigger>
                    <TabsTrigger value="config">Configuration</TabsTrigger>
                </TabsList>

                <TabsContent value="insights" className="space-y-4">
                    {pendingInsights.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No pending insights. Run analysis to discover learning opportunities.
                        </div>
                    ) : (
                        pendingInsights.map((insight) => (
                            <InsightCard key={insight.id} insight={insight} />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="applied" className="space-y-4">
                    {appliedInsights.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No applied insights yet.
                        </div>
                    ) : (
                        appliedInsights.map((insight) => (
                            <InsightCard key={insight.id} insight={insight} />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="history">
                    <EvolutionTimeline
                        evolutions={status.recentEvolutions || []}
                        onRollback={handleRollback}
                        rolling={rolling}
                    />
                </TabsContent>

                <TabsContent value="config">
                    <ConfigPanel
                        config={config}
                        onSave={handleSaveConfig}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
