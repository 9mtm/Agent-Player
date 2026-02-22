'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    MessageSquarePlus,
    MessageSquare,
    Trash2,
    PanelLeftClose,
    PanelLeftOpen,
    ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatSession {
    id: string;
    title: string;
    updatedAt: string;
}

interface ChatSidebarProps {
    currentSessionId: string | null;
}

export function ChatSidebar({ currentSessionId }: ChatSidebarProps) {
    const router = useRouter();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

    // Fetch sessions on mount and when currentSessionId changes
    useEffect(() => {
        fetchSessions();
    }, [currentSessionId]);

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/chat/history');
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions || []);
            }
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const createNewChat = async () => {
        console.log('[Sidebar] 📝 Creating new chat...');
        try {
            const res = await fetch('/api/chat/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'New Chat' }),
            });
            if (res.ok) {
                const data = await res.json();
                console.log('[Sidebar] ✅ New chat created:');
                console.log('  📌 Session ID:', data.session?.id);
                console.log('  📝 Title:', data.session?.title);
                console.log('  🤖 Model:', data.session?.model);
                console.log('  📅 Created:', data.session?.createdAt);
                // Refresh the sessions list
                fetchSessions();
                // Navigate to the new session
                router.push(`/chat/${data.session.id}`);
            } else {
                console.error('[Sidebar] ❌ Failed to create chat:', res.status);
            }
        } catch (error) {
            console.error('[Sidebar] ❌ Error creating chat:', error);
        }
    };

    const selectSession = (sessionId: string) => {
        router.push(`/chat/${sessionId}`);
    };

    const openDeleteDialog = (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSessionToDelete(sessionId);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!sessionToDelete) return;

        try {
            const res = await fetch(`/api/chat/sessions/${sessionToDelete}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setSessions(sessions.filter(s => s.id !== sessionToDelete));
                if (currentSessionId === sessionToDelete) {
                    router.push('/chat');
                }
            }
        } catch (error) {
            console.error('Failed to delete session:', error);
        } finally {
            setDeleteDialogOpen(false);
            setSessionToDelete(null);
        }
    };

    if (isCollapsed) {
        return (
            <div className="flex flex-col border-r bg-muted/30 w-12">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(false)}
                    className="m-2"
                    title="Open Sidebar"
                >
                    <PanelLeftOpen className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/')}
                    className="m-2"
                    title="Back"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={createNewChat}
                    className="m-2"
                    title="New Chat"
                >
                    <MessageSquarePlus className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col border-r bg-muted/30 w-64">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/')}
                    className="gap-1"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(true)}
                    title="Close Sidebar"
                >
                    <PanelLeftClose className="h-4 w-4" />
                </Button>
            </div>

            {/* New Chat Button */}
            <div className="p-2">
                <Button
                    onClick={createNewChat}
                    className="w-full justify-start gap-2"
                    variant="outline"
                >
                    <MessageSquarePlus className="h-4 w-4" />
                    New Chat
                </Button>
            </div>

            {/* Sessions List */}
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {isLoading ? (
                        <div className="text-sm text-muted-foreground text-center py-4">
                            Loading...
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4">
                            No chats yet
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => selectSession(session.id)}
                                className={cn(
                                    "group flex items-center justify-between gap-2 p-2 rounded-lg cursor-pointer transition-colors hover:bg-accent",
                                    currentSessionId === session.id && "bg-accent"
                                )}
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {session.title || 'New Chat'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(session.updatedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => openDeleteDialog(session.id, e)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Footer Info */}
            <div className="p-3 border-t">
                <p className="text-xs text-muted-foreground">
                    {sessions.length} {sessions.length === 1 ? 'chat' : 'chats'}
                </p>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Chat?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This chat and all its messages will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
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
