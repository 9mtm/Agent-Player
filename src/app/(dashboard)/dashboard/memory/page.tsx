'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
    Brain,
    Search,
    Plus,
    Trash2,
    Star,
    Calendar,
    RefreshCw,
    Sparkles,
    FileText,
    Heart,
    MessageCircle,
    CheckSquare,
    Info,
    TrendingUp,
    Clock,
    Zap,
    Archive,
    ArrowUp,
    History
} from 'lucide-react';
import { toast } from 'sonner';

type MemoryType = 'fact' | 'preference' | 'conversation' | 'task' | 'event' | 'context' | 'insight' | 'skill' | 'relationship';
type MemoryLayer = 'working' | 'experiential' | 'factual';
type ConsolidationStatus = 'pending' | 'consolidated' | 'promoted';

interface Memory {
    id: string;
    userId: string;
    type: MemoryType;
    content: string;
    memoryLayer: MemoryLayer;
    importanceScore: number;
    consolidationStatus: ConsolidationStatus;
    accessCount: number;
    lastAccessedAt: number | null;
    expiryTimestamp: number | null;
    createdAt: string;
    metadata?: Record<string, any>;
}

interface LayerStats {
    layer: MemoryLayer;
    count: number;
    avgImportance: number;
    oldestTimestamp: number;
    newestTimestamp: number;
}

interface ConsolidationLog {
    id: number;
    runTimestamp: number;
    memoriesConsolidated: number;
    memoriesPromoted: number;
    memoriesExpired: number;
    durationMs: number;
    status: 'success' | 'failed' | 'partial';
    errorMessage: string | null;
    createdAt: string;
}

interface PromotionCandidate {
    memory: Memory;
    score: number;
    reason: string;
}

const MEMORY_TYPES: { value: MemoryType; label: string; icon: any; color: string }[] = [
    { value: 'fact', label: 'Fact', icon: FileText, color: 'text-blue-500' },
    { value: 'preference', label: 'Preference', icon: Heart, color: 'text-pink-500' },
    { value: 'conversation', label: 'Conversation', icon: MessageCircle, color: 'text-green-500' },
    { value: 'task', label: 'Task', icon: CheckSquare, color: 'text-purple-500' },
    { value: 'insight', label: 'Insight', icon: Sparkles, color: 'text-yellow-500' },
    { value: 'skill', label: 'Skill', icon: Brain, color: 'text-orange-500' },
];

const LAYER_INFO: Record<MemoryLayer, { label: string; icon: any; color: string; description: string }> = {
    working: {
        label: 'Working Memory',
        icon: Zap,
        color: 'text-yellow-500',
        description: 'Temporary session context (24h)'
    },
    experiential: {
        label: 'Experiential Memory',
        icon: TrendingUp,
        color: 'text-blue-500',
        description: 'Learned patterns (90 days)'
    },
    factual: {
        label: 'Factual Memory',
        icon: Archive,
        color: 'text-green-500',
        description: 'Permanent knowledge'
    }
};

export default function MemoryPage() {
    const [memories, setMemories] = useState<Memory[]>([]);
    const [layerStats, setLayerStats] = useState<LayerStats[]>([]);
    const [consolidationLogs, setConsolidationLogs] = useState<ConsolidationLog[]>([]);
    const [promotionCandidates, setPromotionCandidates] = useState<PromotionCandidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeLayer, setActiveLayer] = useState<MemoryLayer | 'all'>('all');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [promoting, setPromoting] = useState(false);
    const [consolidating, setConsolidating] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Memory[]>([]);
    const [searching, setSearching] = useState(false);

    // Add memory state
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newMemory, setNewMemory] = useState({
        type: 'fact' as MemoryType,
        content: '',
        layer: 'factual' as MemoryLayer,
        importance: 0.5
    });

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        await Promise.all([
            loadMemories(),
            loadLayerStats(),
            loadConsolidationLogs(),
            loadPromotionCandidates()
        ]);
    };

    const loadMemories = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/memory');
            if (!res.ok) throw new Error('Failed to load memories');
            const data = await res.json();
            const list = data.memories || [];
            setMemories(list);
            setSearchResults(list);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadLayerStats = async () => {
        try {
            const res = await fetch('/api/memory/layers/stats');
            if (res.ok) {
                const data = await res.json();
                setLayerStats(data.stats || []);
            }
        } catch (err) {
            console.error('Failed to load layer stats:', err);
        }
    };

    const loadConsolidationLogs = async () => {
        try {
            const res = await fetch('/api/memory/layers/logs');
            if (res.ok) {
                const data = await res.json();
                setConsolidationLogs(data.logs || []);
            }
        } catch (err) {
            console.error('Failed to load consolidation logs:', err);
        }
    };

    const loadPromotionCandidates = async () => {
        try {
            const res = await fetch('/api/memory/layers/candidates');
            if (res.ok) {
                const data = await res.json();
                setPromotionCandidates(data.candidates || []);
            }
        } catch (err) {
            console.error('Failed to load promotion candidates:', err);
        }
    };

    const handlePromoteMemory = async (memoryId: string, targetLayer: MemoryLayer) => {
        setPromoting(true);
        try {
            const res = await fetch('/api/memory/layers/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memoryId, targetLayer })
            });

            if (!res.ok) throw new Error('Failed to promote memory');

            const data = await res.json();
            toast.success(data.message || `Memory promoted to ${targetLayer}`);
            await loadAllData();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setPromoting(false);
        }
    };

    const handleManualConsolidate = async () => {
        setConsolidating(true);
        try {
            const res = await fetch('/api/memory/layers/consolidate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) throw new Error('Failed to consolidate');

            const data = await res.json();
            toast.success(data.message || 'Consolidation completed');
            await loadAllData();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setConsolidating(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/memory?id=${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete');
            toast.success('Memory deleted');
            setMemories(prev => prev.filter(m => m.id !== id));
            setSearchResults(prev => prev.filter(m => m.id !== id));
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setDeleteId(null);
        }
    };

    const handleAddMemory = async () => {
        if (!newMemory.content.trim()) return;

        try {
            const res = await fetch('/api/memory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: newMemory.type,
                    content: newMemory.content,
                    importance: newMemory.importance,
                    layer: newMemory.layer
                })
            });

            if (!res.ok) throw new Error('Failed to save memory');

            toast.success('Memory saved');
            setShowAddDialog(false);
            setNewMemory({ type: 'fact', content: '', layer: 'factual', importance: 0.5 });
            await loadAllData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const filteredMemories = activeLayer === 'all'
        ? searchResults
        : searchResults.filter(m => m.memoryLayer === activeLayer);

    const getLayerStat = (layer: MemoryLayer) => layerStats.find(s => s.layer === layer);

    const formatTimestamp = (ts: number) => {
        return new Date(ts).toLocaleString();
    };

    const getTimeUntilExpiry = (expiryTs: number | null) => {
        if (!expiryTs) return null;
        const now = Date.now();
        const diff = expiryTs - now;
        if (diff <= 0) return 'Expired';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        return `${hours}h remaining`;
    };

    if (loading && memories.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Loading memories...</p>
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
                        <Brain className="w-8 h-8" />
                        Multi-Tier Memory System
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Three-layer memory architecture: Working → Experiential → Factual
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={loadAllData} variant="outline" size="sm" disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={handleManualConsolidate} variant="outline" size="sm" disabled={consolidating}>
                        <Archive className="w-4 h-4 mr-2" />
                        {consolidating ? 'Consolidating...' : 'Consolidate Now'}
                    </Button>
                    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Memory
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Memory</DialogTitle>
                                <DialogDescription>
                                    Manually store a memory in the multi-tier system
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div>
                                    <Label>Layer</Label>
                                    <select
                                        value={newMemory.layer}
                                        onChange={(e) => setNewMemory({ ...newMemory, layer: e.target.value as MemoryLayer })}
                                        className="w-full p-2 border rounded-md mt-1 bg-background"
                                    >
                                        <option value="working">Working (24h)</option>
                                        <option value="experiential">Experiential (90 days)</option>
                                        <option value="factual">Factual (Permanent)</option>
                                    </select>
                                </div>

                                <div>
                                    <Label>Type</Label>
                                    <select
                                        value={newMemory.type}
                                        onChange={(e) => setNewMemory({ ...newMemory, type: e.target.value as MemoryType })}
                                        className="w-full p-2 border rounded-md mt-1 bg-background"
                                    >
                                        {MEMORY_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <Label>Content</Label>
                                    <textarea
                                        value={newMemory.content}
                                        onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                                        placeholder="Enter memory content..."
                                        className="w-full p-2 border rounded-md mt-1 min-h-[100px] bg-background resize-none"
                                    />
                                </div>

                                <div>
                                    <Label>Importance (0-1)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={newMemory.importance}
                                        onChange={(e) => setNewMemory({ ...newMemory, importance: parseFloat(e.target.value) || 0.5 })}
                                    />
                                </div>

                                <Button onClick={handleAddMemory} className="w-full" disabled={!newMemory.content.trim()}>
                                    Save Memory
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Layer Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['working', 'experiential', 'factual'] as MemoryLayer[]).map(layer => {
                    const stat = getLayerStat(layer);
                    const info = LAYER_INFO[layer];
                    const Icon = info.icon;
                    return (
                        <Card key={layer} className={activeLayer === layer ? 'border-primary' : ''}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Icon className={`w-4 h-4 ${info.color}`} />
                                    {info.label}
                                </CardTitle>
                                <CardDescription className="text-xs">{info.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{stat?.count || 0}</div>
                                {stat && stat.count > 0 && (
                                    <div className="text-xs text-muted-foreground mt-2">
                                        Avg Importance: {stat.avgImportance.toFixed(2)}
                                    </div>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-3"
                                    onClick={() => setActiveLayer(activeLayer === layer ? 'all' : layer)}
                                >
                                    {activeLayer === layer ? 'Show All' : 'Filter'}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="browse" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="browse">Browse Memories</TabsTrigger>
                    <TabsTrigger value="candidates">Promotion Candidates ({promotionCandidates.length})</TabsTrigger>
                    <TabsTrigger value="logs">Consolidation Logs ({consolidationLogs.length})</TabsTrigger>
                </TabsList>

                {/* Browse Tab */}
                <TabsContent value="browse" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {activeLayer === 'all' ? 'All Memories' : `${LAYER_INFO[activeLayer].label}`}
                            </CardTitle>
                            <CardDescription>
                                Showing {filteredMemories.length} memories
                                {activeLayer !== 'all' && ' in this layer'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px] pr-4">
                                <div className="space-y-3">
                                    {filteredMemories
                                        .slice()
                                        .sort((a, b) => b.importanceScore - a.importanceScore)
                                        .map((memory) => (
                                            <MemoryCard
                                                key={memory.id}
                                                memory={memory}
                                                onDelete={() => setDeleteId(memory.id)}
                                                onPromote={handlePromoteMemory}
                                                promoting={promoting}
                                            />
                                        ))}

                                    {filteredMemories.length === 0 && (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p>No memories in this layer</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Promotion Candidates Tab */}
                <TabsContent value="candidates" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Promotion Candidates</CardTitle>
                            <CardDescription>
                                Memories eligible for promotion to the next layer
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px] pr-4">
                                <div className="space-y-3">
                                    {promotionCandidates.map((candidate, idx) => (
                                        <div key={idx} className="p-4 border rounded-lg">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{candidate.memory.memoryLayer}</Badge>
                                                    <ArrowUp className="w-3 h-3 text-green-500" />
                                                    <Badge className="bg-green-500">
                                                        {candidate.memory.memoryLayer === 'working' ? 'experiential' : 'factual'}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">Score: {candidate.score.toFixed(2)}</span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handlePromoteMemory(
                                                        candidate.memory.id,
                                                        candidate.memory.memoryLayer === 'working' ? 'experiential' : 'factual'
                                                    )}
                                                    disabled={promoting}
                                                >
                                                    <ArrowUp className="w-3 h-3 mr-1" />
                                                    Promote
                                                </Button>
                                            </div>
                                            <p className="text-sm mb-2">{candidate.memory.content}</p>
                                            <p className="text-xs text-muted-foreground">{candidate.reason}</p>
                                        </div>
                                    ))}

                                    {promotionCandidates.length === 0 && (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p>No promotion candidates at the moment</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Consolidation Logs Tab */}
                <TabsContent value="logs" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Consolidation Logs</CardTitle>
                            <CardDescription>
                                History of automatic memory consolidations (runs daily at 3 AM)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px] pr-4">
                                <div className="space-y-3">
                                    {consolidationLogs.map((log) => (
                                        <div key={log.id} className="p-4 border rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <History className="w-4 h-4" />
                                                    <span className="text-sm font-medium">
                                                        {formatTimestamp(log.runTimestamp)}
                                                    </span>
                                                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                                                        {log.status}
                                                    </Badge>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {log.durationMs}ms
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <span className="text-muted-foreground">Consolidated:</span>
                                                    <span className="ml-2 font-medium">{log.memoriesConsolidated}</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Promoted:</span>
                                                    <span className="ml-2 font-medium text-green-500">{log.memoriesPromoted}</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Expired:</span>
                                                    <span className="ml-2 font-medium text-red-500">{log.memoriesExpired}</span>
                                                </div>
                                            </div>
                                            {log.errorMessage && (
                                                <Alert variant="destructive" className="mt-2">
                                                    <AlertDescription className="text-xs">
                                                        {log.errorMessage}
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </div>
                                    ))}

                                    {consolidationLogs.length === 0 && (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p>No consolidation logs yet</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Delete Confirm Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Memory?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This memory will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteId && handleDelete(deleteId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function MemoryCard({
    memory,
    onDelete,
    onPromote,
    promoting
}: {
    memory: Memory;
    onDelete: () => void;
    onPromote: (memoryId: string, targetLayer: MemoryLayer) => void;
    promoting: boolean;
}) {
    const typeInfo = MEMORY_TYPES.find(t => t.value === memory.type);
    const layerInfo = LAYER_INFO[memory.memoryLayer];
    const Icon = typeInfo?.icon || FileText;
    const LayerIcon = layerInfo.icon;

    const getTimeUntilExpiry = (expiryTs: number | null) => {
        if (!expiryTs) return null;
        const now = Date.now();
        const diff = expiryTs - now;
        if (diff <= 0) return 'Expired';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    };

    const canPromote = memory.memoryLayer !== 'factual';
    const nextLayer = memory.memoryLayer === 'working' ? 'experiential' : 'factual';

    return (
        <div className="p-4 border rounded-lg hover:bg-muted/30 transition-colors group">
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <Icon className={`w-4 h-4 ${typeInfo?.color || 'text-muted-foreground'}`} />
                    <Badge variant="outline" className="text-xs">{memory.type}</Badge>
                    <div className="flex items-center gap-1">
                        <LayerIcon className={`w-3 h-3 ${layerInfo.color}`} />
                        <Badge variant="secondary" className="text-xs">{memory.memoryLayer}</Badge>
                    </div>
                    <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs font-medium">{memory.importanceScore.toFixed(2)}</span>
                    </div>
                    {memory.expiryTimestamp && (
                        <Badge variant="destructive" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {getTimeUntilExpiry(memory.expiryTimestamp)}
                        </Badge>
                    )}
                    {memory.accessCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                            {memory.accessCount} accesses
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {canPromote && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                            onClick={() => onPromote(memory.id, nextLayer)}
                            disabled={promoting}
                            title={`Promote to ${nextLayer}`}
                        >
                            <ArrowUp className="w-3.5 h-3.5 text-green-500" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                        onClick={onDelete}
                    >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                </div>
            </div>

            <p className="text-sm whitespace-pre-wrap leading-relaxed mb-2">{memory.content}</p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(memory.createdAt).toLocaleDateString()}
                </span>
                <Badge variant="outline" className="text-xs">
                    {memory.consolidationStatus}
                </Badge>
            </div>
        </div>
    );
}
