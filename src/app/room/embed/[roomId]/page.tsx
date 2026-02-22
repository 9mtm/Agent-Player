/**
 * Embeddable Public Chat Widget
 * Minimal chat interface for embedding in external websites
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { config as appConfig } from '@/lib/config';

interface Room {
  id: string;
  name: string;
  max_message_length: number;
  rate_limit_seconds: number;
  embed_enabled: number;
}

interface Message {
  id: string;
  username: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export default function EmbedChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const size = (searchParams.get('size') || 'medium') as 'small' | 'medium' | 'large' | 'full';
  const theme = searchParams.get('theme') || 'auto';

  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [username, setUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageTime = useRef<number>(0);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Size configurations
  const sizeConfig = {
    small: { height: 'h-[400px]', inputRows: 1 },
    medium: { height: 'h-[600px]', inputRows: 2 },
    large: { height: 'h-[800px]', inputRows: 3 },
    full: { height: 'h-screen', inputRows: 2 },
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  // Load room
  useEffect(() => {
    const loadRoom = async () => {
      try {
        const response = await fetch(`${appConfig.backendUrl}/api/public-chat/rooms/${roomId}`);

        if (!response.ok) {
          throw new Error('Room not found or embedding disabled');
        }

        const data = await response.json();

        if (!data.room.embed_enabled) {
          throw new Error('Embedding is disabled for this room');
        }

        setRoom(data.room);
        setLoading(false);
      } catch (err: any) {
        console.error('[Embed] Failed to load room:', err);
        setLoading(false);
      }
    };

    loadRoom();
  }, [roomId]);

  // Load messages
  const loadMessages = async () => {
    if (!hasJoined) return;

    try {
      const response = await fetch(`${appConfig.backendUrl}/api/public-chat/rooms/${roomId}/messages`);

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('[Embed] Failed to load messages:', err);
    }
  };

  // Join room
  const joinRoom = async (name: string) => {
    try {
      const response = await fetch(`${appConfig.backendUrl}/api/public-chat/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name }),
      });

      if (!response.ok) {
        throw new Error('Failed to join room');
      }

      setHasJoined(true);
      await loadMessages();
      startPolling();
    } catch (err: any) {
      console.error('[Embed] Failed to join room:', err);
      toast.error('Failed to join room');
    }
  };

  // Start polling
  const startPolling = () => {
    if (pollingInterval.current) return;

    pollingInterval.current = setInterval(() => {
      loadMessages();
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  // Send message with SSE streaming
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !room || sending) return;

    // Check rate limit
    const now = Date.now();
    if (now - lastMessageTime.current < room.rate_limit_seconds * 1000) {
      toast.error(`Please wait ${room.rate_limit_seconds} seconds`);
      return;
    }

    if (messageInput.length > room.max_message_length) {
      toast.error(`Message too long`);
      return;
    }

    setSending(true);
    lastMessageTime.current = now;
    const userMessageText = messageInput;
    setMessageInput('');

    // Add user message optimistically
    const tempUserMessage: Message = {
      id: 'temp-' + Date.now(),
      username,
      role: 'user',
      content: userMessageText,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    // Add placeholder for AI
    const tempAiMessage: Message = {
      id: 'temp-ai-' + Date.now(),
      username: 'AI',
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempAiMessage]);

    try {
      const response = await fetch(`${appConfig.backendUrl}/api/public-chat/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: userMessageText,
          username,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Parse SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let aiResponseText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'content') {
                aiResponseText += data.content;
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === tempAiMessage.id
                      ? { ...msg, content: aiResponseText }
                      : msg
                  )
                );
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      setTimeout(() => loadMessages(), 1000);
    } catch (err: any) {
      console.error('[Embed] Failed to send message:', err);
      toast.error('Failed to send message');
      setMessages(prev =>
        prev.filter(msg => msg.id !== tempUserMessage.id && msg.id !== tempAiMessage.id)
      );
    } finally {
      setSending(false);
    }
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${config.height}`}>
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className={`flex items-center justify-center ${config.height}`}>
        <p className="text-sm text-muted-foreground">Room not found or embedding disabled</p>
      </div>
    );
  }

  // Join screen
  if (!hasJoined) {
    return (
      <div className={`flex items-center justify-center ${config.height} p-4`}>
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold">{room.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">Enter your name to join</p>
          </div>

          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2 border rounded-md"
            onKeyDown={e => {
              if (e.key === 'Enter' && username.trim()) {
                joinRoom(username);
              }
            }}
          />

          <button
            onClick={() => joinRoom(username)}
            disabled={!username.trim()}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
          >
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  // Chat interface
  return (
    <div className={`flex flex-col ${config.height}`}>
      {/* Header */}
      <div className="border-b px-4 py-3 bg-background">
        <h3 className="font-semibold text-sm">{room.name}</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-xs text-center text-muted-foreground">No messages yet</p>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'assistant' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'assistant'
                    ? 'bg-green-100 dark:bg-green-900'
                    : 'bg-blue-100 dark:bg-blue-900'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold">
                    {message.role === 'assistant' ? 'AI' : message.username}
                  </span>
                  <span className="text-xs opacity-60">
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            rows={config.inputRows}
            className="resize-none"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={sending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || sending}
            size="sm"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground mt-1">
          {messageInput.length} / {room.max_message_length}
        </div>
      </div>
    </div>
  );
}
