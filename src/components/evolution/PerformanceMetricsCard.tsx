'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Target,
    Zap,
    AlertCircle,
    ThumbsUp,
    Wrench,
    Clock
} from 'lucide-react';

interface Metric {
    type: string;
    value: number;
    previousValue?: number;
    sampleSize: number;
    unit?: string;
}

interface PerformanceMetricsCardProps {
    metrics: {
        taskSuccessRate?: Metric;
        toolEfficiency?: Metric;
        errorRate?: Metric;
        responseQuality?: Metric;
        avgTaskDuration?: Metric;
    };
    loading?: boolean;
}

const METRIC_CONFIG = {
    taskSuccessRate: {
        label: 'Task Success',
        icon: Target,
        color: 'text-green-500',
        format: (val: number) => `${(val * 100).toFixed(1)}%`,
    },
    toolEfficiency: {
        label: 'Tool Efficiency',
        icon: Wrench,
        color: 'text-blue-500',
        format: (val: number) => `${(val * 100).toFixed(1)}%`,
    },
    errorRate: {
        label: 'Error Rate',
        icon: AlertCircle,
        color: 'text-red-500',
        format: (val: number) => `${(val * 100).toFixed(1)}%`,
        inverted: true, // Lower is better
    },
    responseQuality: {
        label: 'Response Quality',
        icon: ThumbsUp,
        color: 'text-purple-500',
        format: (val: number) => `${(val * 100).toFixed(1)}%`,
    },
    avgTaskDuration: {
        label: 'Avg Duration',
        icon: Clock,
        color: 'text-orange-500',
        format: (val: number) => `${(val / 1000).toFixed(1)}s`,
        inverted: true,
    },
};

function getTrendIcon(current: number, previous: number | undefined, inverted: boolean = false) {
    if (previous === undefined) return <Minus className="w-4 h-4 text-gray-400" />;

    const improved = inverted
        ? current < previous  // Lower is better (errors, duration)
        : current > previous; // Higher is better (success, quality)

    if (Math.abs(current - previous) < 0.01) {
        return <Minus className="w-4 h-4 text-gray-400" />;
    }

    return improved
        ? <TrendingUp className="w-4 h-4 text-green-500" />
        : <TrendingDown className="w-4 h-4 text-red-500" />;
}

export function PerformanceMetricsCard({ metrics, loading }: PerformanceMetricsCardProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Performance Metrics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-gray-500">Loading metrics...</div>
                </CardContent>
            </Card>
        );
    }

    const metricEntries = Object.entries(metrics).filter(([_, val]) => val !== undefined);

    if (metricEntries.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Performance Metrics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-gray-500">
                        No performance data yet. Run analysis to collect metrics.
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Performance Metrics
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {metricEntries.map(([key, metric]) => {
                        const config = METRIC_CONFIG[key as keyof typeof METRIC_CONFIG];
                        if (!config || !metric) return null;

                        const Icon = config.icon;
                        const trendIcon = getTrendIcon(
                            metric.value,
                            metric.previousValue,
                            config.inverted
                        );

                        return (
                            <div
                                key={key}
                                className="p-4 border rounded-lg hover:border-gray-400 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Icon className={`w-4 h-4 ${config.color}`} />
                                        <span className="text-sm font-medium text-gray-600">
                                            {config.label}
                                        </span>
                                    </div>
                                    {trendIcon}
                                </div>
                                <div className="text-2xl font-bold">
                                    {config.format(metric.value)}
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                    {metric.sampleSize} samples
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
