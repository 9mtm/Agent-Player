'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, Award, Bot } from 'lucide-react';
import { toast } from 'sonner';

interface AgentEvaluation {
    agent_id: string;
    agent_name: string;
    overall_score: number;
    grade: string;
    last_evaluated: string;
}

export default function EvaluationOverviewPage() {
    const router = useRouter();
    const [overview, setOverview] = useState<AgentEvaluation[]>([]);
    const [loading, setLoading] = useState(true);

    const loadOverview = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/evaluation/overview');
            if (!res.ok) throw new Error('Failed to load overview');
            const data = await res.json();
            setOverview(data.overview || []);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load evaluation overview');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOverview();
    }, []);

    const getGradeColor = (grade: string) => {
        if (!grade) return 'bg-gray-100 text-gray-600';
        if (grade.startsWith('A')) return 'bg-green-100 text-green-700';
        if (grade.startsWith('B')) return 'bg-blue-100 text-blue-700';
        if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-700';
        if (grade.startsWith('D')) return 'bg-orange-100 text-orange-700';
        return 'bg-red-100 text-red-700';
    };

    const avgScore =
        overview.length > 0
            ? overview.reduce((sum, agent) => sum + (agent.overall_score || 0), 0) /
              overview.filter((a) => a.overall_score).length
            : 0;

    const evaluatedCount = overview.filter((a) => a.overall_score).length;

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Agent Evaluation Overview</h1>
                        <p className="text-gray-600">
                            Quality assessment and performance metrics for all agents
                        </p>
                    </div>
                    <Button onClick={() => loadOverview()} variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Total Agents
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Bot className="w-8 h-8 text-blue-500" />
                            <span className="text-3xl font-bold">{overview.length}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Evaluated
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Award className="w-8 h-8 text-green-500" />
                            <span className="text-3xl font-bold">{evaluatedCount}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Average Score
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-8 h-8 text-purple-500" />
                            <span className="text-3xl font-bold">
                                {avgScore > 0 ? Math.round(avgScore) : 'N/A'}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Agents List */}
            <Card>
                <CardHeader>
                    <CardTitle>All Agents</CardTitle>
                    <CardDescription>
                        Click on an agent to view detailed evaluation metrics
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="animate-pulse space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-24 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    ) : overview.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Bot className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p>No agents found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {overview.map((agent) => (
                                <div
                                    key={agent.agent_id}
                                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() =>
                                        router.push(`/dashboard/agents/${agent.agent_id}/evaluation`)
                                    }
                                >
                                    <div className="flex items-center justify-between">
                                        {/* Agent Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <Bot className="w-6 h-6 text-gray-400" />
                                                <div>
                                                    <div className="font-medium text-lg">
                                                        {agent.agent_name || 'Unnamed Agent'}
                                                    </div>
                                                    {agent.last_evaluated ? (
                                                        <div className="text-sm text-gray-500">
                                                            Last evaluated:{' '}
                                                            {new Date(
                                                                agent.last_evaluated
                                                            ).toLocaleDateString()}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-500">
                                                            Not evaluated yet
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Score & Grade */}
                                        {agent.overall_score ? (
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className="text-3xl font-bold">
                                                        {agent.overall_score}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        / 100
                                                    </div>
                                                </div>
                                                <Badge
                                                    className={`text-lg px-4 py-2 ${getGradeColor(
                                                        agent.grade
                                                    )}`}
                                                >
                                                    {agent.grade}
                                                </Badge>
                                            </div>
                                        ) : (
                                            <Button variant="outline" size="sm">
                                                Run Evaluation
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
