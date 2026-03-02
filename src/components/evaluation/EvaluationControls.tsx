'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Play, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface EvaluationControlsProps {
    agentId: string;
    onEvaluationComplete: () => void;
    running?: boolean;
}

export function EvaluationControls({
    agentId,
    onEvaluationComplete,
    running = false,
}: EvaluationControlsProps) {
    const [periodDays, setPeriodDays] = useState(7);
    const [includeReasoningAnalysis, setIncludeReasoningAnalysis] = useState(true);
    const [includeToolAccuracy, setIncludeToolAccuracy] = useState(true);
    const [includeSafetyChecks, setIncludeSafetyChecks] = useState(true);
    const [includePerformanceProfile, setIncludePerformanceProfile] = useState(true);
    const [isRunning, setIsRunning] = useState(false);

    const handleRunEvaluation = async () => {
        setIsRunning(true);
        try {
            const res = await fetch(`/api/evaluation/${agentId}/evaluate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    periodDays,
                    includeReasoningAnalysis,
                    includeToolAccuracy,
                    includeSafetyChecks,
                    includePerformanceProfile,
                }),
            });

            if (!res.ok) throw new Error('Evaluation failed');

            const data = await res.json();
            toast.success(
                `Evaluation complete! Score: ${data.overallScore}/100 (${data.grade})`
            );
            onEvaluationComplete();
        } catch (error: any) {
            toast.error(error.message || 'Failed to run evaluation');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Evaluation Controls
                </CardTitle>
                <CardDescription>
                    Run comprehensive evaluation and configure analysis options
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Time Period */}
                <div className="space-y-2">
                    <Label>Analysis Period (Days)</Label>
                    <Input
                        type="number"
                        min="1"
                        max="90"
                        value={periodDays}
                        onChange={(e) => setPeriodDays(parseInt(e.target.value) || 7)}
                        placeholder="Days"
                    />
                    <p className="text-xs text-gray-500">
                        Analyze agent performance over the last {periodDays} days
                    </p>
                </div>

                {/* Analysis Options */}
                <div className="space-y-3 border-t pt-4">
                    <Label>Analysis Components</Label>

                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-sm">Reasoning Quality</div>
                            <div className="text-xs text-gray-500">
                                Analyze response coherence and clarity
                            </div>
                        </div>
                        <Switch
                            checked={includeReasoningAnalysis}
                            onCheckedChange={setIncludeReasoningAnalysis}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-sm">Tool Accuracy</div>
                            <div className="text-xs text-gray-500">
                                Evaluate tool selection and usage
                            </div>
                        </div>
                        <Switch
                            checked={includeToolAccuracy}
                            onCheckedChange={setIncludeToolAccuracy}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-sm">Safety Checks</div>
                            <div className="text-xs text-gray-500">
                                Detect bias and harmful content
                            </div>
                        </div>
                        <Switch
                            checked={includeSafetyChecks}
                            onCheckedChange={setIncludeSafetyChecks}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-sm">Performance Profile</div>
                            <div className="text-xs text-gray-500">
                                Measure latency and cost efficiency
                            </div>
                        </div>
                        <Switch
                            checked={includePerformanceProfile}
                            onCheckedChange={setIncludePerformanceProfile}
                        />
                    </div>
                </div>

                {/* Run Button */}
                <Button
                    onClick={handleRunEvaluation}
                    disabled={isRunning || running}
                    className="w-full"
                >
                    <Play className="w-4 h-4 mr-2" />
                    {isRunning || running ? 'Running Evaluation...' : 'Run Evaluation'}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                    Evaluation typically takes 30-60 seconds depending on data volume
                </p>
            </CardContent>
        </Card>
    );
}
