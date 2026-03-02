'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Wrench, Zap, DollarSign, Shield, CheckCircle } from 'lucide-react';

interface Metrics {
    reasoning?: number;
    toolAccuracy?: number;
    performance?: number;
    costEfficiency?: number;
    safety?: number;
    successRate?: number;
}

interface MetricBreakdownCardProps {
    metrics: Metrics;
    loading?: boolean;
}

const METRIC_CONFIG = {
    reasoning: {
        label: 'Reasoning Quality',
        icon: Brain,
        color: 'text-purple-500',
        bgColor: 'bg-purple-100',
        description: 'Coherence and logical flow',
    },
    toolAccuracy: {
        label: 'Tool Accuracy',
        icon: Wrench,
        color: 'text-blue-500',
        bgColor: 'bg-blue-100',
        description: 'Correct tool selection',
    },
    performance: {
        label: 'Performance',
        icon: Zap,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-100',
        description: 'Response time',
    },
    costEfficiency: {
        label: 'Cost Efficiency',
        icon: DollarSign,
        color: 'text-green-500',
        bgColor: 'bg-green-100',
        description: 'Cost per task',
    },
    safety: {
        label: 'Safety',
        icon: Shield,
        color: 'text-red-500',
        bgColor: 'bg-red-100',
        description: 'No bias or harmful content',
    },
    successRate: {
        label: 'Success Rate',
        icon: CheckCircle,
        color: 'text-teal-500',
        bgColor: 'bg-teal-100',
        description: 'Task completion rate',
    },
};

export function MetricBreakdownCard({ metrics, loading = false }: MetricBreakdownCardProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Metric Breakdown</CardTitle>
                    <CardDescription>Loading metrics...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Metric Breakdown</CardTitle>
                <CardDescription>
                    Individual performance scores across 6 key metrics
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {Object.entries(METRIC_CONFIG).map(([key, config]) => {
                    const score = metrics[key as keyof Metrics];
                    const Icon = config.icon;

                    if (score === undefined || score === null) {
                        return null;
                    }

                    return (
                        <div key={key} className="space-y-2">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded ${config.bgColor}`}>
                                        <Icon className={`w-4 h-4 ${config.color}`} />
                                    </div>
                                    <div>
                                        <div className="font-medium">{config.label}</div>
                                        <div className="text-xs text-gray-500">
                                            {config.description}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-2xl font-bold">{Math.round(score)}</div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${
                                        score >= 90
                                            ? 'bg-green-500'
                                            : score >= 80
                                            ? 'bg-blue-500'
                                            : score >= 70
                                            ? 'bg-yellow-500'
                                            : score >= 60
                                            ? 'bg-orange-500'
                                            : 'bg-red-500'
                                    }`}
                                    style={{ width: `${score}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
