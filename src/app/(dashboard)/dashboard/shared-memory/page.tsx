'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Share2, AlertTriangle, Trash2, Search, RefreshCw, Users, Globe, Lock, Star } from 'lucide-react';

interface SharedMemory {
    id: string;
    content: string;
    visibility: 'private' | 'team' | 'public';
    source_agent_id: string;
    is_team_critical: number;
    importance_score: number;
    memory_layer: string;
    created_at: string;
    access_count: number;
    user_name?: string;
}

interface DeduplicationStats {
    totalMemories: number;
    potentialDuplicates: number;
    recentRuns: any[];
}

export default function SharedMemoryPage() {
    const [sharedMemories, setSharedMemories] = useState<SharedMemory[]>([]);
    const [deduplicationStats, setDeduplicationStats] = useState<DeduplicationStats | null>(null);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
    const [deduplicationRunning, setDeduplicationRunning] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadSharedMemories(),
                loadDeduplicationStats(),
                loadAuditLogs(),
            ]);
        } catch (error: any) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const loadSharedMemories = async () => {
        try {
            const params = new URLSearchParams({
                userId: 'owner@localhost', // TODO: Get from auth context
                limit: '50',
            });

            if (visibilityFilter !== 'all') {
                params.set('visibility', visibilityFilter);
            }

            const res = await fetch(`/api/memory-sharing/shared?${params}`);
            if (!res.ok) throw new Error('Failed to load shared memories');
            const data = await res.json();
            setSharedMemories(data.memories || []);
        } catch (error: any) {
            console.error('Error loading shared memories:', error);
        }
    };

    const loadDeduplicationStats = async () => {
        try {
            const res = await fetch('/api/memory-sharing/deduplication/stats?userId=owner@localhost');
            if (!res.ok) throw new Error('Failed to load stats');
            const data = await res.json();
            setDeduplicationStats({
                totalMemories: data.totalMemories || 0,
                potentialDuplicates: data.potentialDuplicates || 0,
                recentRuns: data.recentRuns || [],
            });
        } catch (error: any) {
            console.error('Error loading stats:', error);
        }
    };

    const loadCandidates = async () => {
        try {
            const res = await fetch('/api/memory-sharing/deduplication/candidates?userId=owner@localhost&similarityThreshold=0.85');
            if (!res.ok) throw new Error('Failed to load candidates');
            const data = await res.json();
            setCandidates(data.groups || []);
        } catch (error: any) {
            console.error('Error loading candidates:', error);
        }
    };

    const loadAuditLogs = async () => {
        try {
            const res = await fetch('/api/memory-sharing/audit?limit=20');
            if (!res.ok) throw new Error('Failed to load audit logs');
            const data = await res.json();
            setAuditLogs(data.logs || []);
        } catch (error: any) {
            console.error('Error loading audit logs:', error);
        }
    };

    const handleShareMemory = async (memoryId: string, visibility: 'private' | 'team' | 'public') => {
        try {
            const res = await fetch(`/api/memory-sharing/${memoryId}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visibility }),
            });

            if (!res.ok) throw new Error('Failed to share memory');

            toast.success(`Memory visibility changed to ${visibility}`);
            await loadSharedMemories();
            await loadAuditLogs();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleMarkCritical = async (memoryId: string, critical: boolean) => {
        try {
            const res = await fetch(`/api/memory-sharing/${memoryId}/mark-critical`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ critical }),
            });

            if (!res.ok) throw new Error('Failed to mark memory');

            toast.success(critical ? 'Marked as team-critical' : 'Unmarked as team-critical');
            await loadSharedMemories();
            await loadAuditLogs();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleRunDeduplication = async () => {
        setDeduplicationRunning(true);
        try {
            const res = await fetch('/api/memory-sharing/deduplication/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'owner@localhost', similarityThreshold: 0.85 }),
            });

            if (!res.ok) throw new Error('Deduplication failed');

            const data = await res.json();
            toast.success(`Merged ${data.memoriesMerged} memories, deleted ${data.memoriesDeleted} duplicates`);
            await loadData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setDeduplicationRunning(false);
        }
    };

    const filteredMemories = sharedMemories.filter(memory =>
        memory.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const visibilityIcon = (visibility: string) => {
        switch (visibility) {
            case 'public': return <Globe className="w-4 h-4" />;
            case 'team': return <Users className="w-4 h-4" />;
            default: return <Lock className="w-4 h-4" />;
        }
    };

    const visibilityColor = (visibility: string) => {
        switch (visibility) {
            case 'public': return 'bg-green-100 text-green-800';
            case 'team': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Shared Memory</h1>
                        <p className="text-gray-600">
                            Multi-agent knowledge sharing and memory deduplication
                        </p>
                    </div>
                    <Button onClick={loadData} variant="outline" disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Shared Memories</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{sharedMemories.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Potential Duplicates</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-600">
                            {deduplicationStats?.potentialDuplicates || 0}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Team-Critical</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">
                            {sharedMemories.filter(m => m.is_team_critical).length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="shared" className="w-full">
                <TabsList>
                    <TabsTrigger value="shared">Shared Memories</TabsTrigger>
                    <TabsTrigger value="deduplication">Deduplication</TabsTrigger>
                    <TabsTrigger value="audit">Audit Log</TabsTrigger>
                </TabsList>

                {/* Shared Memories Tab */}
                <TabsContent value="shared" className="space-y-4">
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Search shared memories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={visibilityFilter} onValueChange={(value) => {
                            setVisibilityFilter(value);
                            setTimeout(() => loadSharedMemories(), 100);
                        }}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by visibility" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Visibility</SelectItem>
                                <SelectItem value="public">Public Only</SelectItem>
                                <SelectItem value="team">Team Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        {filteredMemories.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                No shared memories found. Memories will appear here when agents share their knowledge.
                            </div>
                        ) : (
                            filteredMemories.map((memory) => (
                                <Card key={memory.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className={visibilityColor(memory.visibility)}>
                                                        {visibilityIcon(memory.visibility)}
                                                        <span className="ml-1 capitalize">{memory.visibility}</span>
                                                    </Badge>
                                                    {memory.is_team_critical === 1 && (
                                                        <Badge variant="destructive">
                                                            <Star className="w-3 h-3 mr-1" />
                                                            Team-Critical
                                                        </Badge>
                                                    )}
                                                    <Badge variant="outline">
                                                        Layer: {memory.memory_layer}
                                                    </Badge>
                                                </div>
                                                <p className="text-gray-900 mb-2">{memory.content}</p>
                                                <div className="text-sm text-gray-500">
                                                    Source: Agent {memory.source_agent_id} |
                                                    Importance: {Math.round((memory.importance_score || 0.5) * 10)}/10 |
                                                    Access: {memory.access_count} times |
                                                    Created: {new Date(memory.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleMarkCritical(memory.id, memory.is_team_critical !== 1)}
                                                >
                                                    <Star className={`w-4 h-4 ${memory.is_team_critical === 1 ? 'fill-current' : ''}`} />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                {/* Deduplication Tab */}
                <TabsContent value="deduplication" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Memory Deduplication</CardTitle>
                            <CardDescription>
                                Find and merge duplicate or similar memories to keep your knowledge base clean
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <div className="font-medium">Run Deduplication</div>
                                    <div className="text-sm text-gray-600">
                                        Find similar memories and merge them automatically
                                    </div>
                                </div>
                                <Button
                                    onClick={handleRunDeduplication}
                                    disabled={deduplicationRunning}
                                >
                                    {deduplicationRunning ? 'Running...' : 'Run Now'}
                                </Button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <div className="font-medium">Find Duplicate Candidates</div>
                                    <div className="text-sm text-gray-600">
                                        Preview potential duplicates before merging
                                    </div>
                                </div>
                                <Button
                                    onClick={loadCandidates}
                                    variant="outline"
                                >
                                    Find Candidates
                                </Button>
                            </div>

                            {candidates.length > 0 && (
                                <div className="space-y-3 mt-6">
                                    <h3 className="font-medium">Duplicate Candidates ({candidates.length} groups)</h3>
                                    {candidates.map((group, index) => (
                                        <Card key={index}>
                                            <CardHeader>
                                                <CardTitle className="text-sm">Group {index + 1} ({group.length} similar memories)</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                {group.map((memory: any) => (
                                                    <div key={memory.id} className="text-sm p-2 bg-gray-50 rounded">
                                                        {memory.content.substring(0, 100)}...
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Agent: {memory.source_agent_id} | Importance: {Math.round((memory.importance_score || 0.5) * 10)}/10
                                                        </div>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {deduplicationStats && deduplicationStats.recentRuns.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="font-medium mb-3">Recent Runs</h3>
                                    <div className="space-y-2">
                                        {deduplicationStats.recentRuns.map((run: any) => (
                                            <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div>
                                                    <div className="text-sm font-medium">
                                                        {new Date(run.created_at).toLocaleString()}
                                                    </div>
                                                    <div className="text-xs text-gray-600">
                                                        Merged: {run.memories_merged} | Deleted: {run.memories_deleted} | Duration: {run.duration_ms}ms
                                                    </div>
                                                </div>
                                                <Badge variant={run.status === 'success' ? 'default' : 'destructive'}>
                                                    {run.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Audit Log Tab */}
                <TabsContent value="audit" className="space-y-4">
                    <div className="space-y-3">
                        {auditLogs.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                No audit logs yet. Actions will be logged here.
                            </div>
                        ) : (
                            auditLogs.map((log) => (
                                <Card key={log.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge>{log.action.replace(/_/g, ' ')}</Badge>
                                                    <span className="text-sm text-gray-500">
                                                        {new Date(log.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                {log.memory_content && (
                                                    <p className="text-sm text-gray-700 mt-2">
                                                        {log.memory_content.substring(0, 100)}...
                                                    </p>
                                                )}
                                                {log.old_visibility && log.new_visibility && (
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        Changed from <strong>{log.old_visibility}</strong> to <strong>{log.new_visibility}</strong>
                                                    </p>
                                                )}
                                                {log.reason && (
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        Reason: {log.reason}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
