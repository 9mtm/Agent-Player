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
    Info
} from 'lucide-react';

type MemoryType = 'fact' | 'preference' | 'conversation' | 'task' | 'event' | 'context' | 'insight' | 'skill' | 'relationship';

interface Memory {
    id: string;
    type: MemoryType;
    content: string;
    importance: number;
    createdAt: string;
    expiresAt?: string;
    metadata?: Record<string, any>;
}

const MEMORY_TYPES: { value: MemoryType; label: string; icon: any; color: string }[] = [
    { value: 'fact', label: 'Fact', icon: FileText, color: 'text-blue-500' },
    { value: 'preference', label: 'Preference', icon: Heart, color: 'text-pink-500' },
    { value: 'conversation', label: 'Conversation', icon: MessageCircle, color: 'text-green-500' },
    { value: 'task', label: 'Task', icon: CheckSquare, color: 'text-purple-500' },
    { value: 'insight', label: 'Insight', icon: Sparkles, color: 'text-yellow-500' },
    { value: 'skill', label: 'Skill', icon: Brain, color: 'text-orange-500' },
];

export default function MemoryPage() {
    const [memories, setMemories] = useState<Memory[]>([]);
    const [searchResults, setSearchResults] = useState<Memory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<MemoryType | 'all'>('all');
    const [hasSearched, setHasSearched] = useState(false);

    // Add memory state
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [newMemory, setNewMemory] = useState({
        type: 'fact' as MemoryType,
        content: '',
        importance: 5
    });

    // Delete confirm state
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Extract from text state
    const [extractText, setExtractText] = useState('');
    const [extracting, setExtracting] = useState(false);
    const [extractResult, setExtractResult] = useState<{ count: number } | null>(null);

    const loadMemories = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/memory');
            if (!res.ok) {
                if (res.status === 401) throw new Error('Please log in to view memories');
                throw new Error(`Failed to load memories (${res.status})`);
            }
            const data = await res.json();
            const list: Memory[] = Array.isArray(data) ? data : (data.memories || []);
            setMemories(list);
            if (!hasSearched) setSearchResults(list);
        } catch (err: any) {
            setError(err.message || 'Failed to load memories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMemories();
    }, []);

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults(memories);
            setHasSearched(false);
            return;
        }

        setSearching(true);
        setHasSearched(true);
        try {
            const res = await fetch('/api/memory?action=search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: searchQuery,
                    type: searchType === 'all' ? undefined : searchType,
                    limit: 50,
                    minScore: 0.3
                })
            });

            // Fall back to client-side filter if backend search fails
            if (!res.ok) {
                const filtered = memories.filter(m => {
                    const matchesText = m.content.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesType = searchType === 'all' || m.type === searchType;
                    return matchesText && matchesType;
                });
                setSearchResults(filtered);
                return;
            }

            const data = await res.json();
            const results = data.results || data.memories || [];
            setSearchResults(results.map((r: any) => r.memory || r));
        } catch {
            // Fallback to client-side filter
            const filtered = memories.filter(m =>
                m.content.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setSearchResults(filtered);
        } finally {
            setSearching(false);
        }
    };

    const handleAddMemory = async () => {
        if (!newMemory.content.trim()) return;

        setAddLoading(true);
        try {
            const res = await fetch('/api/memory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: newMemory.type,
                    content: newMemory.content,
                    importance: newMemory.importance
                })
            });

            if (!res.ok) throw new Error('Failed to save memory');

            setShowAddDialog(false);
            setNewMemory({ type: 'fact', content: '', importance: 5 });
            await loadMemories();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setAddLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/memory/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            setMemories(prev => prev.filter(m => m.id !== id));
            setSearchResults(prev => prev.filter(m => m.id !== id));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setDeleteId(null);
        }
    };

    const handleExtract = async () => {
        if (!extractText.trim()) return;

        setExtracting(true);
        setExtractResult(null);
        try {
            const res = await fetch('/api/memory?action=extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: extractText })
            });

            if (!res.ok) throw new Error('Extraction failed');

            const data = await res.json();
            const count = data.count || data.memories?.length || 0;
            setExtractResult({ count });
            if (count > 0) {
                setExtractText('');
                await loadMemories();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setExtracting(false);
        }
    };

    const stats = {
        total: memories.length,
        byType: MEMORY_TYPES.map(t => ({
            ...t,
            count: memories.filter(m => m.type === t.value).length
        }))
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
                        Agent Memory
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Persistent memory — the agent remembers things about you across conversations
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={loadMemories} variant="outline" size="sm" disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
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
                                    Manually store a memory for the agent to remember
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
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
                                    <Label>Importance (1–10)</Label>
                                    <div className="flex items-center gap-3 mt-1">
                                        <Input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={newMemory.importance}
                                            onChange={(e) => setNewMemory({ ...newMemory, importance: parseInt(e.target.value) || 5 })}
                                            className="w-24"
                                        />
                                        <span className="text-sm text-muted-foreground">Higher = more likely to be recalled</span>
                                    </div>
                                </div>

                                <Button onClick={handleAddMemory} className="w-full" disabled={addLoading || !newMemory.content.trim()}>
                                    {addLoading ? 'Saving...' : 'Save Memory'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription className="flex items-center justify-between">
                        {error}
                        <Button variant="ghost" size="sm" onClick={() => setError(null)}>Dismiss</Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <Card className="md:col-span-1">
                    <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-3xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>

                {stats.byType.map((type) => {
                    const Icon = type.icon;
                    return (
                        <Card key={type.value}>
                            <CardHeader className="pb-2 pt-4 px-4">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                    <Icon className={`w-3 h-3 ${type.color}`} />
                                    {type.label}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                                <div className="text-2xl font-bold">{type.count}</div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {stats.total === 0 && !loading && (
                <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                        No memories yet. Start chatting — the agent automatically extracts and stores memories from your conversations.
                    </AlertDescription>
                </Alert>
            )}

            {/* Main Content */}
            <Tabs defaultValue="browse" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="browse">Browse</TabsTrigger>
                    <TabsTrigger value="search">Search</TabsTrigger>
                    <TabsTrigger value="extract">Extract from Text</TabsTrigger>
                </TabsList>

                {/* Browse Tab */}
                <TabsContent value="browse" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Memories</CardTitle>
                            <CardDescription>
                                Sorted by importance — high importance memories are recalled first
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px] pr-4">
                                <div className="space-y-3">
                                    {memories
                                        .slice()
                                        .sort((a, b) => b.importance - a.importance)
                                        .map((memory) => (
                                            <MemoryCard
                                                key={memory.id}
                                                memory={memory}
                                                onDelete={() => setDeleteId(memory.id)}
                                            />
                                        ))}

                                    {memories.length === 0 && (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p>No memories stored yet</p>
                                            <p className="text-sm mt-1">Chat with the agent to start building memory</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Search Tab */}
                <TabsContent value="search" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Search Memories</CardTitle>
                            <CardDescription>
                                Find memories by content — uses keyword matching
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search memories..."
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                                    className="flex-1"
                                />
                                <select
                                    value={searchType}
                                    onChange={(e) => setSearchType(e.target.value as any)}
                                    className="p-2 border rounded-md bg-background"
                                >
                                    <option value="all">All Types</option>
                                    {MEMORY_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                                <Button onClick={handleSearch} disabled={searching}>
                                    <Search className="w-4 h-4 mr-2" />
                                    {searching ? 'Searching...' : 'Search'}
                                </Button>
                            </div>

                            <ScrollArea className="h-[500px] pr-4">
                                <div className="space-y-3">
                                    {searchResults.map((memory) => (
                                        <MemoryCard
                                            key={memory.id}
                                            memory={memory}
                                            onDelete={() => setDeleteId(memory.id)}
                                        />
                                    ))}

                                    {hasSearched && searchResults.length === 0 && (
                                        <p className="text-center text-muted-foreground py-8">
                                            No results for &quot;{searchQuery}&quot;
                                        </p>
                                    )}

                                    {!hasSearched && memories.length === 0 && (
                                        <p className="text-center text-muted-foreground py-8">
                                            No memories to search yet
                                        </p>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Extract Tab */}
                <TabsContent value="extract" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5" />
                                Extract from Text
                            </CardTitle>
                            <CardDescription>
                                Paste any text — the AI will extract facts, preferences, and important information
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <textarea
                                value={extractText}
                                onChange={(e) => setExtractText(e.target.value)}
                                placeholder="Paste a conversation, notes, or any text to extract memories from..."
                                className="w-full p-3 border rounded-md min-h-[200px] bg-background font-mono text-sm resize-none"
                            />

                            {extractResult && (
                                <Alert>
                                    <Sparkles className="w-4 h-4" />
                                    <AlertDescription>
                                        {extractResult.count > 0
                                            ? `Extracted ${extractResult.count} new memories!`
                                            : 'No new memories found in this text.'}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Button
                                onClick={handleExtract}
                                disabled={extracting || !extractText.trim()}
                                className="w-full"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                {extracting ? 'Extracting...' : 'Extract Memories'}
                            </Button>

                            <Alert>
                                <Info className="w-4 h-4" />
                                <AlertDescription className="text-sm">
                                    <strong>Tip:</strong> Memories are also extracted automatically after every chat message.
                                    Use this tab to import memories from older conversations or documents.
                                </AlertDescription>
                            </Alert>
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
                            This memory will be permanently deleted. The agent will no longer have access to this information.
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

function MemoryCard({ memory, onDelete }: { memory: Memory; onDelete: () => void }) {
    const typeInfo = MEMORY_TYPES.find(t => t.value === memory.type);
    const Icon = typeInfo?.icon || FileText;

    return (
        <div className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${typeInfo?.color || 'text-muted-foreground'}`} />
                    <Badge variant="outline" className="text-xs">{memory.type}</Badge>
                    <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs font-medium">{memory.importance}/10</span>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                    onClick={onDelete}
                >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
            </div>

            <p className="text-sm whitespace-pre-wrap leading-relaxed">{memory.content}</p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(memory.createdAt).toLocaleDateString()}
                </span>
                {memory.expiresAt && (
                    <span>Expires: {new Date(memory.expiresAt).toLocaleDateString()}</span>
                )}
            </div>
        </div>
    );
}
