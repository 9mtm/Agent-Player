'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { EvaluationScoreCard } from '@/components/evaluation/EvaluationScoreCard';
import { MetricBreakdownCard } from '@/components/evaluation/MetricBreakdownCard';
import { RecommendationsCard } from '@/components/evaluation/RecommendationsCard';
import { EvaluationControls } from '@/components/evaluation/EvaluationControls';

interface EvaluationData {
    latestEvaluation: any;
    toolAccuracy: any[];
    safety: any[];
    performance: any;
}

export default function AgentEvaluationPage() {
    const params = useParams();
    const router = useRouter();
    const agentId = params.id as string;

    const [data, setData] = useState<EvaluationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/evaluation/${agentId}/dashboard?periodDays=7`);
            if (!res.ok) throw new Error('Failed to load evaluation data');
            const dashboardData = await res.json();
            setData(dashboardData);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load evaluation data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (agentId) loadDashboard();
    }, [agentId]);

    const handleEvaluationComplete = () => {
        loadDashboard();
    };

    const latestEval = data?.latestEvaluation;
    const metrics = latestEval
        ? {
              reasoning: latestEval.reasoning_score,
              toolAccuracy: latestEval.tool_accuracy_score,
              performance: latestEval.performance_score,
              costEfficiency: latestEval.cost_efficiency_score,
              safety: latestEval.safety_score,
              successRate: latestEval.success_rate,
          }
        : {};

    const strengths = latestEval?.strengths ? JSON.parse(latestEval.strengths) : [];
    const weaknesses = latestEval?.weaknesses ? JSON.parse(latestEval.weaknesses) : [];
    const recommendations = latestEval?.recommendations
        ? JSON.parse(latestEval.recommendations)
        : [];

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="mb-8">
                <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Agent Evaluation</h1>
                        <p className="text-gray-600">
                            Comprehensive quality assessment and performance metrics
                        </p>
                    </div>
                    <Button onClick={() => loadDashboard()} variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Overall Score */}
                <div className="lg:col-span-1 space-y-6">
                    <EvaluationScoreCard
                        score={latestEval?.overall_score || 0}
                        grade={latestEval?.grade || 'N/A'}
                        loading={loading}
                    />

                    <EvaluationControls
                        agentId={agentId}
                        onEvaluationComplete={handleEvaluationComplete}
                        running={running}
                    />
                </div>

                {/* Right Column - Details */}
                <div className="lg:col-span-2 space-y-6">
                    <Tabs defaultValue="metrics" className="w-full">
                        <TabsList>
                            <TabsTrigger value="metrics">Metrics</TabsTrigger>
                            <TabsTrigger value="analysis">Analysis</TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                        </TabsList>

                        <TabsContent value="metrics" className="space-y-6">
                            <MetricBreakdownCard metrics={metrics} loading={loading} />
                        </TabsContent>

                        <TabsContent value="analysis" className="space-y-6">
                            <RecommendationsCard
                                strengths={strengths}
                                weaknesses={weaknesses}
                                recommendations={recommendations}
                                loading={loading}
                            />
                        </TabsContent>

                        <TabsContent value="history" className="space-y-6">
                            <EvaluationHistoryView agentId={agentId} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

// Simple history view component
function EvaluationHistoryView({ agentId }: { agentId: string }) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const res = await fetch(`/api/evaluation/${agentId}/history?limit=10`);
                if (!res.ok) throw new Error('Failed to load history');
                const data = await res.json();
                setHistory(data.history || []);
            } catch (err: any) {
                toast.error(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, [agentId]);

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No evaluation history yet. Run an evaluation to get started.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {history.map((evaluation: any, index: number) => (
                <div
                    key={index}
                    className="p-4 border rounded-lg flex items-center justify-between hover:bg-gray-50"
                >
                    <div>
                        <div className="font-medium">
                            Evaluation #{history.length - index}
                        </div>
                        <div className="text-sm text-gray-500">
                            {new Date(evaluation.created_at).toLocaleString()}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-2xl font-bold">{evaluation.overall_score}</div>
                            <div className="text-sm text-gray-500">Grade: {evaluation.grade}</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
