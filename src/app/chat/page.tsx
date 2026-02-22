'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, RefreshCw, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChatIndexPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const initCalledRef = useRef(false); // Prevent double init from StrictMode

    const initChat = async (forceNew = false) => {
        // Prevent double initialization from React StrictMode
        if (!forceNew && initCalledRef.current) {
            console.log('[Chat Index] ⏭️ Skipping duplicate initChat call');
            return;
        }
        initCalledRef.current = true;

        setError(null);
        setIsLoading(true);

        console.log('[Chat Index] 🚀 Initializing chat...');

        try {
            // If not forcing new, check for existing sessions first
            if (!forceNew) {
                console.log('[Chat Index] 📋 Checking for existing sessions...');
                const historyRes = await fetch('/api/chat/history');
                if (historyRes.ok) {
                    const historyData = await historyRes.json();
                    const sessions = historyData.sessions || [];

                    // If there are existing sessions, redirect to the most recent one
                    if (sessions.length > 0) {
                        console.log('[Chat Index] ✅ Found existing session, redirecting to:', sessions[0].id);
                        router.replace(`/chat/${sessions[0].id}`);
                        return;
                    }
                    console.log('[Chat Index] 📝 No existing sessions, creating new...');
                }
            }

            // No existing sessions or forcing new, create one
            console.log('[Chat Index] 📝 Creating new session...');
            const res = await fetch('/api/chat/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'New Chat' }),
            });

            if (res.ok) {
                const data = await res.json();
                console.log('[Chat Index] ✅ Session created:', data.session.id);
                router.replace(`/chat/${data.session.id}`);
            } else {
                const errorData = await res.json().catch(() => ({}));
                setError(errorData.message || errorData.error || 'Failed to create session. Make sure the backend is running.');
            }
        } catch (error) {
            console.error('[Chat Index] ❌ Error initializing chat:', error);
            setError('Cannot connect to server. Make sure the backend is running on port 3001.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        initChat();
    }, []);

    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4 max-w-md text-center p-6">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                    <h2 className="text-lg font-semibold">Connection Error</h2>
                    <p className="text-muted-foreground">{error}</p>
                    <div className="flex gap-2 mt-2">
                        <Button onClick={() => initChat()} disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Retry
                        </Button>
                        <Button variant="outline" onClick={() => router.push('/dashboard')}>
                            Go to Dashboard
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                        Run <code className="bg-muted px-1 rounded">npm run backend:dev</code> to start the backend server.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading chat...</p>
            </div>
        </div>
    );
}
