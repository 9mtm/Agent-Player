'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { VoiceInput } from '@/components/chat/VoiceInput';
import { VoicePlayer } from '@/components/chat/VoicePlayer';
import {
    SendHorizontal,
    Bot,
    User,
    Sparkles,
    Code2,
    Zap,
    Loader2,
    Square,
    ChevronDown,
    ChevronRight,
    Wrench,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import React, { useRef, useEffect, useState, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { config } from '@/lib/config';
import { createMixedStreamParser, applySpecPatch } from '@/lib/ui-web4/core';
import type { Spec, SpecStreamLine } from '@/lib/ui-web4/core';
import { SpecRenderer } from '@/lib/json-render/renderer';

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Remove [ANIM:...] tags from text to avoid duplication in chat display
 * The avatar system still receives these tags via the full message content
 */
function removeAnimationTags(text: string): string {
    return text.replace(/\[ANIM:[^\]]+\]\s*/g, '');
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
    id: string;
    name: string;
    emoji: string;
    description: string;
    model: string;
    provider: string;
    isPrimary: boolean;
}

type ToolInfo = { name: string; input: string };
type ToolResultInfo = { name: string; output: string; isError: boolean };

type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'tool_call'; step: number; tools: ToolInfo[]; results?: ToolResultInfo[] }
    | { type: 'spec'; spec: Spec };

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;          // plain text (historical messages from DB)
    blocks?: ContentBlock[];  // rich blocks (live streaming messages)
}

// ─── Tool Call Block Component ────────────────────────────────────────────────

function ToolCallBlock({ block }: { block: ContentBlock & { type: 'tool_call' } }) {
    const [open, setOpen] = useState(false);
    const hasResults = block.results && block.results.length > 0;
    const hasError = block.results?.some(r => r.isError);

    return (
        <div className="my-2 rounded-xl border border-border bg-muted/40 overflow-hidden text-xs">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted/60 transition-colors text-left"
            >
                {hasResults ? (
                    hasError ? (
                        <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                    ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )
                ) : (
                    <Wrench className="w-3.5 h-3.5 text-primary animate-pulse shrink-0" />
                )}
                <span className="font-mono text-muted-foreground">
                    Step {block.step}:&nbsp;
                </span>
                <span className="font-medium text-foreground truncate">
                    {block.tools.map(t => t.name).join(', ')}
                </span>
                <span className="ml-auto shrink-0 text-muted-foreground">
                    {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </span>
            </button>

            {open && (
                <div className="border-t border-border divide-y divide-border">
                    {block.tools.map((t, i) => {
                        const result = block.results?.[i];
                        return (
                            <div key={i} className="px-3 py-2 space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <Wrench className="w-3 h-3 text-primary shrink-0" />
                                    <span className="font-mono font-semibold text-primary">{t.name}</span>
                                </div>
                                {t.input && t.input !== '{}' && (
                                    <pre className="bg-background rounded p-2 overflow-x-auto text-[11px] text-muted-foreground whitespace-pre-wrap break-words">
                                        {t.input}
                                    </pre>
                                )}
                                {result && (
                                    <div className={cn(
                                        "rounded p-2 text-[11px] whitespace-pre-wrap break-words",
                                        result.isError
                                            ? "bg-destructive/10 text-destructive"
                                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                    )}>
                                        {result.output || '(no output)'}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Message Content Renderer ─────────────────────────────────────────────────

function MessageContent({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
    if (message.blocks && message.blocks.length > 0) {
        return (
            <div className="space-y-1">
                {message.blocks.map((block, i) => {
                    if (block.type === 'text') {
                        return block.text ? (
                            <div key={i} className="whitespace-pre-wrap break-words">
                                {removeAnimationTags(block.text)}
                            </div>
                        ) : null;
                    }
                    if (block.type === 'tool_call') {
                        return <ToolCallBlock key={i} block={block} />;
                    }
                    if (block.type === 'spec') {
                        return <SpecRenderer key={i} spec={block.spec} loading={isStreaming} />;
                    }
                    return null;
                })}
            </div>
        );
    }
    return <div className="whitespace-pre-wrap break-words">{removeAnimationTags(message.content)}</div>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ChatPageInner({ params }: { params: Promise<{ sessionId: string }> }) {
    const { sessionId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedAgentId = searchParams.get('agentId');
    const [agents, setAgents] = useState<Agent[]>([]);
    const [currentAgentId, setCurrentAgentId] = useState<string>('');
    const [isLoadingAgents, setIsLoadingAgents] = useState(true);
    const [inputValue, setInputValue] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { user, isLoading: isCheckingAuth } = useAuth();

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Fetch agents on mount
    useEffect(() => {
        if (isCheckingAuth) return;
        async function fetchAgents() {
            try {
                const res = await fetch('/api/agents');
                const data = await res.json();
                if (data.agents && data.agents.length > 0) {
                    setAgents(data.agents);
                    const fromUrl = preselectedAgentId && data.agents.find((a: Agent) => a.id === preselectedAgentId);
                    const lastUsedId = typeof window !== 'undefined' ? localStorage.getItem('lastAgentId') : null;
                    const fromStorage = lastUsedId && data.agents.find((a: Agent) => a.id === lastUsedId);
                    const primary = data.agents.find((a: Agent) => a.isPrimary) || data.agents[0];
                    setCurrentAgentId((fromUrl || fromStorage || primary).id);
                }
            } catch (e) {
                console.error('Failed to fetch agents', e);
            } finally {
                setIsLoadingAgents(false);
            }
        }
        fetchAgents();
    }, [isCheckingAuth]);

    // Load session from URL on mount
    useEffect(() => {
        if (isCheckingAuth) return;
        if (sessionId) {
            loadSession(sessionId);
        }
    }, [isCheckingAuth, sessionId]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [messages]);

    const loadSession = async (id: string) => {
        try {
            const res = await fetch(`/api/chat/sessions/${id}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error('[Chat] Error loading session:', error);
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (isLoading) {
            handleStop();
            return;
        }

        if (!inputValue?.trim()) return;

        const userMessage = inputValue.trim();
        setInputValue('');
        setIsLoading(true);

        const newUserMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: userMessage,
        };
        setMessages(prev => [...prev, newUserMessage]);

        try {
            const abortController = new AbortController();
            abortControllerRef.current = abortController;

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, newUserMessage],
                    agentId: currentAgentId || undefined,
                    sessionId,
                }),
                signal: abortController.signal,
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error('Chat API failed: ' + errorText);
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            const assistantMessageId = `assistant-${Date.now()}`;

            // Working state for the streaming message
            let textAccum = '';
            let blocks: ContentBlock[] = [];
            let lineBuffer = '';

            // ui-web4: spec built progressively from JSON patch operations
            let currentSpec: Spec = { root: '', elements: {} };

            function updateMessage() {
                setMessages(prev => {
                    const without = prev.filter(m => m.id !== assistantMessageId);
                    return [...without, { id: assistantMessageId, role: 'assistant' as const, content: textAccum, blocks: [...blocks] }];
                });
            }

            // Mixed stream parser: splits text into plain text lines vs spec patches
            const mixedParser = createMixedStreamParser({
                onText: (text: string) => {
                    if (!text.trim()) return;
                    textAccum += text + '\n';
                    const lastIdx = blocks.length - 1;
                    if (lastIdx >= 0 && blocks[lastIdx].type === 'text') {
                        blocks = [...blocks.slice(0, lastIdx), { type: 'text' as const, text: (blocks[lastIdx] as { type: 'text'; text: string }).text + text + '\n' }];
                    } else {
                        blocks = [...blocks, { type: 'text' as const, text: text + '\n' }];
                    }
                    updateMessage();
                },
                onPatch: (patch: SpecStreamLine) => {
                    currentSpec = { ...applySpecPatch(currentSpec, patch) };
                    const specIdx = blocks.findIndex(b => b.type === 'spec');
                    if (specIdx >= 0) {
                        blocks = blocks.map((b, i) => i === specIdx ? { type: 'spec' as const, spec: { ...currentSpec } } : b);
                    } else {
                        blocks = [...blocks, { type: 'spec' as const, spec: { ...currentSpec } }];
                    }
                    updateMessage();
                },
            });

            function applyEvent(json: any) {
                const type = json.type;

                if (type === 'tool_start') {
                    blocks = [...blocks, { type: 'tool_call' as const, step: json.step, tools: json.tools ?? [] }];
                    updateMessage();
                } else if (type === 'tool_result') {
                    blocks = blocks.map(b => b.type === 'tool_call' && b.step === json.step ? { ...b, results: json.results } : b);
                    updateMessage();
                } else if (type === 'text') {
                    // Feed text through the mixed parser (handles spec fences automatically)
                    mixedParser.push(json.content ?? '');
                } else if (type === 'error') {
                    blocks = [...blocks, { type: 'text' as const, text: `\n\nError: ${json.error}` }];
                    updateMessage();
                }
                // 'done' — stream ends naturally
            }

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    lineBuffer += decoder.decode(value, { stream: true });

                    // Split on double-newline (SSE event boundary)
                    const events = lineBuffer.split('\n\n');
                    lineBuffer = events.pop() ?? '';

                    for (const event of events) {
                        for (const line of event.split('\n')) {
                            if (!line.startsWith('data:')) continue;
                            const raw = line.slice(5).trim();
                            if (!raw) continue;
                            try {
                                const json = JSON.parse(raw);
                                if (!json.type) {
                                    // Old format: {content, done}
                                    if (!json.done && json.content !== undefined) {
                                        applyEvent({ type: 'text', content: json.content });
                                    }
                                } else {
                                    if (json.type !== 'done') applyEvent(json);
                                }
                            } catch { /* ignore */ }
                        }
                    }
                }
                // Flush any remaining buffered text through the parser
                mixedParser.flush();
            }

            // Update session title with first message
            if (messages.length === 0 && sessionId) {
                await fetch(`/api/chat/sessions/${sessionId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '')
                    }),
                });
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('[Chat] Request aborted by user');
            } else {
                console.error('[Chat] Error:', error);
                setMessages(prev => [...prev, {
                    id: `error-${Date.now()}`,
                    role: 'assistant',
                    content: 'Sorry, there was an error processing your message. Please try again.',
                }]);
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleAgentChange = (agentId: string) => {
        setCurrentAgentId(agentId);
        if (typeof window !== 'undefined') {
            localStorage.setItem('lastAgentId', agentId);
        }
    };

    const suggestions = [
        { icon: <Code2 className="w-4 h-4" />, text: "Write a React component for a dashboard" },
        { icon: <Zap className="w-4 h-4" />, text: "Explain how workflows work in this system" },
        { icon: <Sparkles className="w-4 h-4" />, text: "Help me write better TypeScript code" },
    ];

    if (isCheckingAuth) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-background">
            {/* Sidebar */}
            <ChatSidebar currentSessionId={sessionId} />

            {/* Main Chat Area */}
            <div className="flex flex-1 flex-col">
                {/* Header */}
                <header className="flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Bot className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="font-semibold text-lg">
                                {agents.find(a => a.id === currentAgentId)?.name || 'AI Assistant'}
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                {agents.find(a => a.id === currentAgentId)?.model || 'Agent Player'}
                            </p>
                        </div>
                    </div>
                    {agents.length > 0 && (
                        <select
                            value={currentAgentId}
                            onChange={e => handleAgentChange(e.target.value)}
                            disabled={isLoadingAgents}
                            className="text-sm border rounded-md px-3 py-1.5 bg-background hover:bg-muted focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            {agents.map(agent => (
                                <option key={agent.id} value={agent.id}>
                                    {agent.emoji} {agent.name}{agent.isPrimary ? ' ★' : ''}
                                </option>
                            ))}
                        </select>
                    )}
                </header>

                {/* Chat Messages */}
                <div className="flex-1 overflow-hidden relative" ref={scrollAreaRef}>
                    <ScrollArea className="h-full">
                        <div className="max-w-4xl mx-auto py-8 px-6 flex flex-col gap-6">
                            {/* Empty State */}
                            {messages.length === 0 && (
                                <div className="flex flex-1 flex-col items-center justify-center text-center space-y-8 min-h-[500px]">
                                    <div className="bg-gradient-to-tr from-primary/20 to-purple-500/20 p-6 rounded-full ring-1 ring-border shadow-lg">
                                        <Bot className="h-16 w-16 text-primary" />
                                    </div>
                                    <div className="space-y-3 max-w-lg">
                                        <h2 className="text-3xl font-bold tracking-tight">
                                            How can I help you today?
                                        </h2>
                                        <p className="text-muted-foreground text-lg">
                                            Ask me anything. I'm ready to help.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
                                        {suggestions.map((s, i) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setInputValue(s.text);
                                                    if (inputRef.current) inputRef.current.focus();
                                                }}
                                                className="flex flex-col items-start gap-3 p-5 rounded-xl border-2 bg-card hover:bg-accent/50 hover:border-primary/50 transition-all text-left group"
                                            >
                                                <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 text-primary transition-colors">
                                                    {s.icon}
                                                </div>
                                                <span className="text-sm font-medium text-foreground">
                                                    {s.text}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Messages */}
                            {messages.map((m, idx) => (
                                <div
                                    key={m.id}
                                    className={cn(
                                        "flex w-full gap-4",
                                        m.role === 'user' ? "flex-row-reverse" : "flex-row"
                                    )}
                                >
                                    {/* Avatar */}
                                    <div className={cn(
                                        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-sm",
                                        m.role === 'user'
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-border"
                                    )}>
                                        {m.role === 'user' ? (
                                            <User className="w-5 h-5" />
                                        ) : (
                                            <Bot className="w-5 h-5" />
                                        )}
                                    </div>

                                    {/* Message Bubble */}
                                    <div className="max-w-[75%] flex flex-col gap-3">
                                        <div className={cn(
                                            "px-6 py-4 shadow-sm text-sm leading-relaxed",
                                            m.role === 'user'
                                                ? "rounded-3xl rounded-tr-md bg-primary text-primary-foreground"
                                                : "rounded-3xl rounded-tl-md bg-card border-2 text-card-foreground"
                                        )}>
                                            <MessageContent message={m} isStreaming={isLoading && idx === messages.length - 1} />
                                        </div>

                                        {/* Voice Player for assistant messages */}
                                        {m.role === 'assistant' && m.content && (
                                            <VoicePlayer
                                                text={removeAnimationTags(m.content)}
                                                backendUrl={config.backendUrl}
                                                voice="alloy"
                                                autoPlay={false}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Loading Indicator */}
                            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                                <div className="flex w-full gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-2 border-border flex items-center justify-center">
                                        <Bot className="w-5 h-5 animate-pulse" />
                                    </div>
                                    <div className="flex items-center gap-2 h-12 px-5 bg-card border-2 border-border rounded-3xl rounded-tl-md shadow-sm">
                                        <div className="flex gap-1.5">
                                            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="h-8" />
                        </div>
                    </ScrollArea>
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
                </div>

                {/* Input Area */}
                <div className="px-6 pb-6 pt-3">
                    <div className="max-w-4xl mx-auto space-y-4">
                        <form
                            onSubmit={handleSendMessage}
                            className="flex items-end gap-2 bg-card border border-border rounded-2xl px-4 py-3 shadow-sm focus-within:shadow-md focus-within:border-primary/50 transition-all"
                        >
                            <Textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={`Message ${agents.find(a => a.id === currentAgentId)?.name || 'AI Assistant'}...`}
                                className="min-h-[24px] max-h-[200px] w-full resize-none border-0 bg-transparent py-3 px-4 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                rows={1}
                                style={{ height: 'auto' }}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                                }}
                            />

                            <VoiceInput
                                onTranscript={(text) => setInputValue(text)}
                                backendUrl={config.backendUrl}
                            />

                            <Button
                                type="submit"
                                size="icon"
                                disabled={!inputValue?.trim() && !isLoading}
                                className={cn(
                                    "h-10 w-10 rounded-2xl transition-all shrink-0",
                                    inputValue?.trim() || isLoading
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                                        : "bg-muted text-muted-foreground hover:bg-muted"
                                )}
                                title={isLoading ? "Stop generating" : "Send message"}
                            >
                                {isLoading ? (
                                    <Square className="h-5 w-5" />
                                ) : (
                                    <SendHorizontal className="h-5 w-5" />
                                )}
                            </Button>
                        </form>
                        <p className="text-center text-xs text-muted-foreground mt-3">
                            AI can make mistakes. Verify important information.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ChatPage({ params }: { params: Promise<{ sessionId: string }> }) {
    return (
        <Suspense fallback={null}>
            <ChatPageInner params={params} />
        </Suspense>
    );
}
