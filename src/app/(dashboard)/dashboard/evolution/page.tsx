'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Brain,
    TrendingUp,
    TrendingDown,
    Sparkles,
    Target,
    Zap,
    AlertCircle,
    RefreshCw,
    ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface AgentOverview {
    id: string;
    name: string;
    emoji: string;
    status: 'active' | 'disabled';
    evolutionEnabled: boolean;
    lastEvolved?: string;
    performanceTrend: 'up' | 'down' | 'stable';
    metrics: {
        taskSuccessRate: number;
        errorRate: number;
        pendingInsights: number;
    };
}

export default function EvolutionPage() {
    const router = useRouter();
    const [agents, setAgents] = useState<AgentOverview[]>([]);
    const [loading, setLoading] = useState(true);
    const [evolvingAll, setEvolvingAll] = useState(false);

    const loadAgents = async () => {
        setLoading(true);
        try {
            // Get all agents
            const agentsRes = await fetch('/api/agents');
            if (!agentsRes.ok) throw new Error('Failed to load agents');
            const agentsData = await agentsRes.json();

            // Load evolution status for each agent
            const agentOverviews: AgentOverview[] = await Promise.all(
                agentsData.agents.map(async (agent: any) => {
                    try {
                        const statusRes = await fetch(`/api/evolution/${agent.id}/status`);
                        if (!statusRes.ok) {
                            return {
                                id: agent.id,
                                name: agent.name,
                                emoji: agent.emoji || '🤖',
                                status: agent.active ? 'active' : 'disabled',
                                evolutionEnabled: false,
                                performanceTrend: 'stable' as const,
                                metrics: {
                                    taskSuccessRate: 0,
                                    errorRate: 0,
                                    pendingInsights: 0,
                                },
                            };
                        }

                        const status = await statusRes.json();

                        // Determine performance trend
                        const taskSuccess = status.performance?.taskSuccessRate?.value || 0;
                        const prevTaskSuccess = status.performance?.taskSuccessRate?.previousValue;
                        let trend: 'up' | 'down' | 'stable' = 'stable';
                        if (prevTaskSuccess !== undefined) {
                            if (taskSuccess > prevTaskSuccess + 0.05) trend = 'up';
                            else if (taskSuccess < prevTaskSuccess - 0.05) trend = 'down';
                        }

                        return {
                            id: agent.id,
                            name: agent.name,
                            emoji: agent.emoji || '🤖',
                            status: agent.active ? 'active' : 'disabled',
                            evolutionEnabled: status.config?.enabled || false,
                            lastEvolved: status.recentEvolutions?.[0]?.createdAt,
                            performanceTrend: trend,
                            metrics: {
                                taskSuccessRate: taskSuccess,
                                errorRate: status.performance?.errorRate?.value || 0,
                                pendingInsights: status.insights?.filter((i: any) => !i.applied).length || 0,
                            },
                        };
                    } catch (err) {
                        console.error(`Failed to load status for agent ${agent.id}:`, err);
                        return {
                            id: agent.id,
                            name: agent.name,
                            emoji: agent.emoji || '🤖',
                            status: agent.active ? 'active' : 'disabled',
                            evolutionEnabled: false,
                            performanceTrend: 'stable' as const,
                            metrics: {
                                taskSuccessRate: 0,
                                errorRate: 0,
                                pendingInsights: 0,
                            },
                        };
                    }
                })
            );

            setAgents(agentOverviews);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load agents');
        } finally {
            setLoading(false);
        }
    };

    const handleEvolveAll = async () => {
        setEvolvingAll(true);
        try {
            const res = await fetch('/api/evolution/evolve-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) throw new Error('Failed to evolve all agents');

            const data = await res.json();
            toast.success(`Evolved ${data.results?.length || 0} agents`);
            await loadAgents();
        } catch (err: any) {
            toast.error(err.message || 'Failed to evolve all agents');
        } finally {
            setEvolvingAll(false);
        }
    };

    useEffect(() => {
        loadAgents();
    }, []);

    const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
        if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
        if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
        return <Target className="w-4 h-4 text-gray-400" />;
    };

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

    const activeAgents = agents.filter((a) => a.status === 'active');
    const evolvingAgents = agents.filter((a) => a.evolutionEnabled);
    const avgSuccessRate =
        activeAgents.reduce((sum, a) => sum + a.metrics.taskSuccessRate, 0) / activeAgents.length || 0;
    const totalPendingInsights = agents.reduce((sum, a) => sum + a.metrics.pendingInsights, 0);

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <Brain className="w-8 h-8" />
                    Agent Evolution
                </h1>
                <p className="text-gray-600">
                    Monitor and manage autonomous agent learning and evolution
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Agents</p>
                                <p className="text-2xl font-bold">{agents.length}</p>
                            </div>
                            <Brain className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Evolving</p>
                                <p className="text-2xl font-bold">{evolvingAgents.length}</p>
                            </div>
                            <Sparkles className="w-8 h-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Avg Success Rate</p>
                                <p className="text-2xl font-bold">{(avgSuccessRate * 100).toFixed(0)}%</p>
                            </div>
                            <Target className="w-8 h-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Pending Insights</p>
                                <p className="text-2xl font-bold">{totalPendingInsights}</p>
                            </div>
                            <AlertCircle className="w-8 h-8 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <Button onClick={() => loadAgents()} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
                <Button onClick={handleEvolveAll} disabled={evolvingAll || evolvingAgents.length === 0}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {evolvingAll ? 'Evolving All...' : `Evolve All (${evolvingAgents.length})`}
                </Button>
            </div>

            {/* Agents List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => (
                    <Card
                        key={agent.id}
                        className="hover:border-gray-400 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/agents/${agent.id}/evolution`)}
                    >
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-2xl">{agent.emoji}</span>
                                <span className="flex-1">{agent.name}</span>
                                {getTrendIcon(agent.performanceTrend)}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                {agent.evolutionEnabled ? (
                                    <Badge variant="default" className="bg-green-600">
                                        <Zap className="w-3 h-3 mr-1" />
                                        Evolving
                                    </Badge>
                                ) : (
                                    <Badge variant="outline">Manual Only</Badge>
                                )}
                                {agent.status === 'disabled' && (
                                    <Badge variant="outline" className="text-gray-500">
                                        Disabled
                                    </Badge>
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Success Rate:</span>
                                    <span className="font-medium">
                                        {(agent.metrics.taskSuccessRate * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Error Rate:</span>
                                    <span className="font-medium">
                                        {(agent.metrics.errorRate * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Pending Insights:</span>
                                    <Badge variant="outline">{agent.metrics.pendingInsights}</Badge>
                                </div>
                            </div>

                            <Button variant="ghost" className="w-full mt-4">
                                View Details
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {agents.length === 0 && (
                <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                        No agents found. Create an agent to start using evolution features.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
