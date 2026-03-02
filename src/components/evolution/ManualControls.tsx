'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, BarChart3, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface ManualControlsProps {
    agentId: string;
    onAnalyze: (periodDays: number) => Promise<void>;
    onEvolve: () => Promise<void>;
    analyzing?: boolean;
    evolving?: boolean;
}

export function ManualControls({
    agentId,
    onAnalyze,
    onEvolve,
    analyzing,
    evolving,
}: ManualControlsProps) {
    const [periodDays, setPeriodDays] = useState(7);

    const handleAnalyze = async () => {
        try {
            await onAnalyze(periodDays);
            toast.success(`Performance analyzed for last ${periodDays} days`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to analyze performance');
        }
    };

    const handleEvolve = async () => {
        try {
            await onEvolve();
            toast.success('Evolution cycle completed');
        } catch (err: any) {
            toast.error(err.message || 'Failed to evolve agent');
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Manual Controls
                </CardTitle>
                <CardDescription>
                    Manually trigger analysis and evolution cycles
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Analyze Performance */}
                <div className="space-y-2">
                    <Label>Analyze Performance</Label>
                    <p className="text-sm text-gray-500 mb-2">
                        Collect and analyze performance metrics over a time period
                    </p>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Input
                                type="number"
                                min="1"
                                max="90"
                                value={periodDays}
                                onChange={(e) => setPeriodDays(parseInt(e.target.value) || 7)}
                                placeholder="Days"
                            />
                            <p className="text-xs text-gray-500 mt-1">Period (days)</p>
                        </div>
                        <Button onClick={handleAnalyze} disabled={analyzing} className="w-32">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            {analyzing ? 'Analyzing...' : 'Analyze'}
                        </Button>
                    </div>
                </div>

                <div className="border-t pt-4">
                    <Label>Trigger Evolution</Label>
                    <p className="text-sm text-gray-500 mb-2">
                        Run a full evolution cycle: analyze → learn → evolve → measure
                    </p>
                    <Button onClick={handleEvolve} disabled={evolving} className="w-full">
                        <Sparkles className="w-4 h-4 mr-2" />
                        {evolving ? 'Evolving...' : 'Evolve Agent'}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                        This will extract insights and apply improvements based on performance data
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
