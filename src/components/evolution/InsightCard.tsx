'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Sparkles,
    CheckCircle2,
    XCircle,
    TrendingUp,
    Lightbulb,
    ArrowUp,
    Calendar
} from 'lucide-react';

interface Insight {
    id: string;
    insightType: 'success_pattern' | 'failure_pattern' | 'optimization' | 'new_capability';
    title: string;
    description: string;
    confidence: number;
    applied: boolean;
    appliedAt?: string;
    impactScore?: number;
    createdAt: string;
}

interface InsightCardProps {
    insight: Insight;
    onApply?: (id: string) => void;
    applying?: boolean;
}

const INSIGHT_CONFIG = {
    success_pattern: {
        label: 'Success Pattern',
        icon: CheckCircle2,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
    },
    failure_pattern: {
        label: 'Failure Pattern',
        icon: XCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
    },
    optimization: {
        label: 'Optimization',
        icon: TrendingUp,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
    },
    new_capability: {
        label: 'New Capability',
        icon: Lightbulb,
        color: 'text-purple-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
    },
};

function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
}

export function InsightCard({ insight, onApply, applying }: InsightCardProps) {
    const config = INSIGHT_CONFIG[insight.insightType];
    const Icon = config.icon;

    const confidencePercent = Math.round(insight.confidence * 100);
    const confidenceColor =
        insight.confidence >= 0.8
            ? 'text-green-600 bg-green-100'
            : insight.confidence >= 0.6
            ? 'text-yellow-600 bg-yellow-100'
            : 'text-red-600 bg-red-100';

    return (
        <Card className={`${config.bgColor} ${config.borderColor} border-l-4`}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${config.color}`} />
                        <span className="font-medium">{insight.title}</span>
                    </div>
                    <Badge variant="outline" className={confidenceColor}>
                        {confidencePercent}% confidence
                    </Badge>
                </div>

                <p className="text-sm text-gray-700 mb-3">{insight.description}</p>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(insight.createdAt)}
                        </div>
                        {insight.applied && insight.impactScore !== undefined && (
                            <div className="flex items-center gap-1">
                                <ArrowUp className="w-3 h-3 text-green-500" />
                                +{Math.round(insight.impactScore * 100)}% impact
                            </div>
                        )}
                    </div>

                    {insight.applied ? (
                        <Badge variant="default" className="bg-green-600">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Applied
                        </Badge>
                    ) : (
                        onApply && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onApply(insight.id)}
                                disabled={applying || insight.confidence < 0.7}
                            >
                                Apply Insight
                            </Button>
                        )
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
