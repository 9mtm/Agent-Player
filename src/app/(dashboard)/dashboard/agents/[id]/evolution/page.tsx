'use client';

import { useEffect, useState } from 'react';
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

    const loadStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/evolution/${agentId}/status`);
            if (!res.ok) throw new Error('Failed to load evolution status');
            const data = await res.json();
            setStatus(data);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load evolution status');
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async (periodDays: number) => {
        setAnalyzing(true);
        try {
            const res = await fetch(`/api/evolution/${agentId}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ periodDays }),
            });

            if (!res.ok) throw new Error('Failed to analyze performance');

            await loadStatus();
        } finally {
            setAnalyzing(false);
        }
    };

    const handleEvolve = async () => {
        setEvolving(true);
        try {
            const res = await fetch(`/api/evolution/${agentId}/evolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) throw new Error('Failed to evolve agent');

            const data = await res.json();
            await loadStatus();
        } finally {
            setEvolving(false);
        }
    };

    const handleRollback = async (evolutionId: string) => {
        if (!confirm('Are you sure you want to rollback this evolution?')) return;

        setRolling(true);
        try {
            const res = await fetch(`/api/evolution/${agentId}/rollback/${evolutionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) throw new Error('Failed to rollback');

            toast.success('Evolution rolled back');
            await loadStatus();
        } catch (err: any) {
            toast.error(err.message || 'Failed to rollback');
        } finally {
            setRolling(false);
        }
    };

    const handleSaveConfig = async (config: any) => {
        const res = await fetch(`/api/evolution/${agentId}/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });

        if (!res.ok) throw new Error('Failed to save configuration');

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
                    <p className="text-gray-600">Failed to load evolution status</p>
                </div>
            </div>
        );
    }

    const pendingInsights = (status.insights || []).filter((i) => !i.applied);
    const appliedInsights = (status.insights || []).filter((i) => i.applied);

    // Default config if not available
    const defaultConfig = {
        enabled: false,
        minConfidenceThreshold: 0.7,
        minSampleSize: 10,
        evolutionFrequency: 'daily' as const,
        allowedEvolutions: ['prompt_update', 'capability_added'],
        maxEvolutionsPerCycle: 3,
        rollbackOnDegradation: true,
        degradationThreshold: 0.1,
    };

    const config = status.config || defaultConfig;

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
