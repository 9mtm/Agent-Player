'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    History,
    FileText,
    Plus,
    Minus,
    Settings,
    RotateCcw,
    TrendingUp,
    TrendingDown,
    CheckCircle2
} from 'lucide-react';

interface Evolution {
    id: string;
    evolutionType: 'prompt_update' | 'capability_added' | 'capability_removed' | 'config_change';
    changeDescription: string;
    triggerReason: string;
    performanceBefore?: number;
    performanceAfter?: number;
    status: 'active' | 'rolled_back' | 'superseded';
    createdAt: string;
    rolledBackAt?: string;
}

interface EvolutionTimelineProps {
    evolutions: Evolution[];
    onRollback?: (id: string) => void;
    rolling?: boolean;
}

const EVOLUTION_CONFIG = {
    prompt_update: {
        label: 'Prompt Updated',
        icon: FileText,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
    },
    capability_added: {
        label: 'Capability Added',
        icon: Plus,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
    },
    capability_removed: {
        label: 'Capability Removed',
        icon: Minus,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
    },
    config_change: {
        label: 'Config Changed',
        icon: Settings,
        color: 'text-purple-500',
        bgColor: 'bg-purple-50',
    },
};

function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleString();
}

function ImpactBadge({ before, after }: { before?: number; after?: number }) {
    if (before === undefined || after === undefined) return null;

    const change = after - before;
    const changePercent = Math.round(change * 100);

    if (Math.abs(changePercent) < 1) {
        return (
            <Badge variant="outline" className="text-gray-600">
                No change
            </Badge>
        );
    }

    return (
        <Badge
            variant="outline"
            className={change > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}
        >
            {change > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {changePercent > 0 ? '+' : ''}{changePercent}%
        </Badge>
    );
}

export function EvolutionTimeline({ evolutions, onRollback, rolling }: EvolutionTimelineProps) {
    if (evolutions.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Evolution History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-gray-500">
                        No evolutions yet. Agent will learn and evolve as it gains experience.
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Evolution History
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {evolutions.map((evo, idx) => {
                        const config = EVOLUTION_CONFIG[evo.evolutionType];
                        const Icon = config.icon;
                        const isLast = idx === evolutions.length - 1;

                        return (
                            <div key={evo.id} className="relative">
                                {/* Timeline line */}
                                {!isLast && (
                                    <div className="absolute left-[15px] top-8 w-0.5 h-full bg-gray-200" />
                                )}

                                <div className="flex gap-3">
                                    {/* Icon */}
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bgColor} flex-shrink-0`}
                                    >
                                        <Icon className={`w-4 h-4 ${config.color}`} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 pb-4">
                                        <div className="flex items-start justify-between mb-1">
                                            <div>
                                                <div className="font-medium">{evo.changeDescription}</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {config.label} • {formatDate(evo.createdAt)}
                                                </div>
                                            </div>

                                            {evo.status === 'active' && onRollback && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => onRollback(evo.id)}
                                                    disabled={rolling}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <RotateCcw className="w-4 h-4 mr-1" />
                                                    Rollback
                                                </Button>
                                            )}
                                        </div>

                                        <div className="text-sm text-gray-600 mb-2">
                                            {evo.triggerReason}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <ImpactBadge
                                                before={evo.performanceBefore}
                                                after={evo.performanceAfter}
                                            />

                                            {evo.status === 'rolled_back' && (
                                                <Badge variant="outline" className="text-red-600">
                                                    Rolled Back
                                                </Badge>
                                            )}

                                            {evo.status === 'superseded' && (
                                                <Badge variant="outline" className="text-gray-600">
                                                    Superseded
                                                </Badge>
                                            )}

                                            {evo.status === 'active' && (
                                                <Badge variant="outline" className="text-green-600">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    Active
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
