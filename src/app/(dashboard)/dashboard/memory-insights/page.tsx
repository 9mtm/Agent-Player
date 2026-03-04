'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Sparkles,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Brain,
    Zap,
    Target
} from 'lucide-react';
import { toast } from 'sonner';

interface QualityStats {
    totalMemories: number;
    averageQuality: number;
    highQuality: number;
    mediumQuality: number;
    lowQuality: number;
    needsImprovement: number;
}

interface LowQualityMemory {
    id: string;
    type: string;
    content: string;
    quality_score: number;
    completeness_score: number;
    clarity_score: number;
    usefulness_score: number;
    created_at: string;
}

interface QualityDistribution {
    range: string;
    count: number;
}

interface EnrichmentResult {
    memoryId: string;
    enrichments: {
        tags?: string[];
        emotions?: string[];
        category?: string;
        relatedMemories?: string[];
    };
    qualityImprovement: number;
    confidence: number;
}

export default function MemoryInsightsPage() {
    const [userId] = useState('owner@localhost'); // TODO: Get from auth context
    const [stats, setStats] = useState<QualityStats | null>(null);
    const [lowQualityMemories, setLowQualityMemories] = useState<LowQualityMemory[]>([]);
    const [distribution, setDistribution] = useState<QualityDistribution[]>([]);
    const [loading, setLoading] = useState(true);
    const [enriching, setEnriching] = useState(false);
    const [selectedMemory, setSelectedMemory] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load quality stats
            const statsRes = await fetch(`http://localhost:41522/api/memory-quality/stats?userId=${userId}`);
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData.stats);
            }

            // Load low quality memories
            const lowQualityRes = await fetch(`http://localhost:41522/api/memory-quality/low-quality?userId=${userId}&limit=20`);
            if (lowQualityRes.ok) {
                const lowQualityData = await lowQualityRes.json();
                setLowQualityMemories(lowQualityData.memories);
            }

            // Load quality distribution
            const distRes = await fetch(`http://localhost:41522/api/memory-quality/distribution?userId=${userId}`);
            if (distRes.ok) {
                const distData = await distRes.json();
                setDistribution(distData.distribution);
            }
        } catch (err: any) {
            toast.error('Failed to load memory insights');
        } finally {
            setLoading(false);
        }
    };

    const handleEnrichMemory = async (memoryId: string) => {
        setEnriching(true);
        setSelectedMemory(memoryId);
        try {
            const res = await fetch(`http://localhost:41522/api/memory-quality/${memoryId}/enrich`, {
                method: 'POST'
            });

            if (!res.ok) throw new Error('Failed to enrich memory');

            const data = await res.json();
            const result = data.result as EnrichmentResult;

            toast.success(`Memory enriched! Quality improved by ${result.qualityImprovement.toFixed(1)} points`);
            await loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to enrich memory');
        } finally {
            setEnriching(false);
            setSelectedMemory(null);
        }
    };

    const handleBatchEnrich = async () => {
        setEnriching(true);
        try {
            const res = await fetch('http://localhost:41522/api/memory-quality/batch-enrich', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, limit: 10 })
            });

            if (!res.ok) throw new Error('Failed to batch enrich');

            const data = await res.json();
            toast.success(`Successfully enriched ${data.count} memories`);
            await loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to batch enrich');
        } finally {
            setEnriching(false);
        }
    };

    const getQualityColor = (score: number) => {
        if (score >= 80) return 'text-green-600 dark:text-green-400';
        if (score >= 60) return 'text-blue-600 dark:text-blue-400';
        if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getQualityBadge = (score: number) => {
        if (score >= 80) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Excellent</Badge>;
        if (score >= 60) return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">Good</Badge>;
        if (score >= 40) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">Fair</Badge>;
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Poor</Badge>;
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">Loading memory insights...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Sparkles className="h-8 w-8 text-purple-500" />
                        Memory Insights
                    </h1>
                    <p className="text-muted-foreground">Quality analysis and improvement recommendations</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadData}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={handleBatchEnrich} disabled={enriching}>
                        <Zap className="h-4 w-4 mr-2" />
                        {enriching ? 'Enriching...' : 'Auto-Improve (10)'}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Average Quality</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-bold ${getQualityColor(stats?.averageQuality || 0)}`}>
                            {stats?.averageQuality.toFixed(1)}
                        </div>
                        <Progress value={stats?.averageQuality || 0} className="mt-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            High Quality
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {stats?.highQuality || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">80+ score</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                            Medium Quality
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {stats?.mediumQuality || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">60-79 score</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            Needs Improvement
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                            {stats?.needsImprovement || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">&lt;60 score</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quality Distribution Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Quality Distribution</CardTitle>
                    <CardDescription>Distribution of memory quality scores</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {distribution.map((item) => {
                            const total = stats?.totalMemories || 1;
                            const percentage = (item.count / total) * 100;

                            return (
                                <div key={item.range} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{item.range}</span>
                                        <span className="text-muted-foreground">{item.count} memories ({percentage.toFixed(1)}%)</span>
                                    </div>
                                    <Progress value={percentage} />
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Low Quality Memories */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-orange-500" />
                        Memories Needing Improvement
                    </CardTitle>
                    <CardDescription>
                        These memories have low quality scores and could benefit from enrichment
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {lowQualityMemories.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                            <p>All memories are in good shape!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {lowQualityMemories.map((memory) => (
                                <div key={memory.id} className="p-4 border rounded-lg space-y-2">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="outline">{memory.type}</Badge>
                                                {getQualityBadge(memory.quality_score)}
                                                <span className={`text-sm font-bold ${getQualityColor(memory.quality_score)}`}>
                                                    {memory.quality_score.toFixed(1)}
                                                </span>
                                            </div>
                                            <p className="text-sm line-clamp-2">{memory.content}</p>
                                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                                <span>Completeness: {(memory.completeness_score * 100).toFixed(0)}%</span>
                                                <span>Clarity: {(memory.clarity_score * 100).toFixed(0)}%</span>
                                                <span>Usefulness: {(memory.usefulness_score * 100).toFixed(0)}%</span>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleEnrichMemory(memory.id)}
                                            disabled={enriching && selectedMemory === memory.id}
                                        >
                                            <Sparkles className="h-4 w-4 mr-1" />
                                            {enriching && selectedMemory === memory.id ? 'Enriching...' : 'Improve'}
                                        </Button>
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
