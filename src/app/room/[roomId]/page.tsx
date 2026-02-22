/**
 * Public Chat Room Page
 * Multi-user chat room with AI agent and customizable avatar viewer
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { config } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Users, Send, Settings, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// Dynamically import AvatarViewer (client-side only)
const AvatarViewer = dynamic(
  () => import('@/components/avatar/AvatarViewer').then(mod => mod.AvatarViewer),
  { ssr: false }
);

interface Room {
  id: string;
  name: string;
  description: string | null;
  owner_user_id: string;
  model: string;
  system_prompt: string | null;
  avatar_url: string | null;
  avatar_gender: string;
  bg_color: string;
  bg_scene: string;
  wall_text: string | null;
  wall_logo_url: string | null;
  wall_video_url: string | null;
  wall_layout: string | null;
  fx_state: string | null;
  is_public: number;
  require_auth: number;
  max_message_length: number;
  rate_limit_seconds: number;
  enable_voice: number;
  enable_avatar: number;
  enable_developer_mode: number;
  participant_count: number;
}

interface Message {
  id: string;
  room_id: string;
  user_id: string | null;
  username: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export default function PublicChatRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User state
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  // Chat state
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageTime = useRef<number>(0);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Verify token and get user ID
      fetch(`${config.backendUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          setUserId(data.user.id);
          setUsername(data.user.name || data.user.username || '');
        })
        .catch(() => {
          // Invalid token
          localStorage.removeItem('auth_token');
        });
    }
  }, []);

  // Load room details
  useEffect(() => {
    const loadRoom = async () => {
      try {
        const headers: HeadersInit = {};
        const token = localStorage.getItem('auth_token');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${config.backendUrl}/api/public-chat/rooms/${roomId}`, {
          headers,
        });

        if (!response.ok) {
          if (response.status === 403) {
            setError('Access denied. This is a private room.');
          } else if (response.status === 404) {
            setError('Room not found.');
          } else {
            setError('Failed to load room.');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setRoom(data.room);

        // Check if auth is required
        if (data.room.require_auth && !userId) {
          setError('This room requires login. Please sign in to continue.');
          setLoading(false);
          return;
        }

        // Show join dialog for anonymous users
        if (!userId && !hasJoined) {
          setShowJoinDialog(true);
        } else if (userId) {
          // Auto-join for authenticated users
          await joinRoom(username);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('[PublicChat] Failed to load room:', err);
        setError('Failed to load room.');
        setLoading(false);
      }
    };

    loadRoom();
  }, [roomId, userId]);

  // Load messages
  const loadMessages = async () => {
    if (!room || !hasJoined) return;

    try {
      const headers: HeadersInit = {};
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${config.backendUrl}/api/public-chat/rooms/${roomId}/messages`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('[PublicChat] Failed to load messages:', err);
    }
  };

  // Load participants
  const loadParticipants = async () => {
    if (!room || !hasJoined) return;

    try {
      const headers: HeadersInit = {};
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${config.backendUrl}/api/public-chat/rooms/${roomId}/participants`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setParticipants(data.participants || []);
      }
    } catch (err) {
      console.error('[PublicChat] Failed to load participants:', err);
    }
  };

  // Join room
  const joinRoom = async (name: string) => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${config.backendUrl}/api/public-chat/rooms/${roomId}/join`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ username: name }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || 'Failed to join room');
      }

      setHasJoined(true);
      setShowJoinDialog(false);
      toast.success('Joined room successfully');

      // Load initial data
      await Promise.all([loadMessages(), loadParticipants()]);

      // Start polling for new messages
      startPolling();
    } catch (err: any) {
      console.error('[PublicChat] Failed to join room:', err);
      toast.error('Failed to join room');
    }
  };

  // Polling for new messages
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const startPolling = () => {
    if (pollingInterval.current) return;

    pollingInterval.current = setInterval(() => {
      loadMessages();
      loadParticipants();
    }, 3000); // Poll every 3 seconds
  };

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  // Send message with SSE streaming
  const handleSendMessage = async () => {
    if (!messageInput || !messageInput.trim() || !room || sending) return;

    // Check rate limit
    const now = Date.now();
    if (now - lastMessageTime.current < room.rate_limit_seconds * 1000) {
      toast.error(`Please wait ${room.rate_limit_seconds} seconds between messages`);
      return;
    }

    // Check message length
    if (messageInput.length > room.max_message_length) {
      toast.error(`Message too long (max ${room.max_message_length} characters)`);
      return;
    }

    setSending(true);
    lastMessageTime.current = now;
    const userMessageText = messageInput;
    setMessageInput('');

    // Add user message optimistically
    const tempUserMessage: Message = {
      id: 'temp-' + Date.now(),
      room_id: roomId,
      user_id: userId,
      username: userId ? username : username,
      role: 'user',
      content: userMessageText,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    // Add placeholder for AI response
    const tempAiMessage: Message = {
      id: 'temp-ai-' + Date.now(),
      room_id: roomId,
      user_id: null,
      username: 'AI',
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempAiMessage]);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${config.backendUrl}/api/public-chat/rooms/${roomId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: userMessageText,
          username: userId ? undefined : username,
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

                // Update AI message in real-time
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === tempAiMessage.id
                      ? { ...msg, content: aiResponseText }
                      : msg
                  )
                );
              } else if (data.type === 'done') {
                // Stream completed
                console.log('[PublicChat] Stream completed');
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Reload messages to get final state from server
      setTimeout(() => loadMessages(), 1000);
    } catch (err: any) {
      console.error('[PublicChat] Failed to send message:', err);
      toast.error('Failed to send message');

      // Remove temporary messages on error
      setMessages(prev =>
        prev.filter(msg => msg.id !== tempUserMessage.id && msg.id !== tempAiMessage.id)
      );
    } finally {
      setSending(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Share room
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Room link copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-xl text-muted-foreground">{error || 'Room not found'}</p>
        <Button onClick={() => window.location.href = '/dashboard/public-chat'}>
          Back to Rooms
        </Button>
      </div>
    );
  }

  // Join dialog for anonymous users
  if (showJoinDialog && !hasJoined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="border rounded-lg p-8 max-w-md w-full space-y-4">
          <h2 className="text-2xl font-bold">{room.name}</h2>
          {room.description && (
            <p className="text-muted-foreground">{room.description}</p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Enter your name to join</label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Your name"
              onKeyDown={e => {
                if (e.key === 'Enter' && username && username.trim()) {
                  joinRoom(username);
                }
              }}
            />
          </div>

          <Button
            className="w-full"
            onClick={() => joinRoom(username)}
            disabled={!username || !username.trim()}
          >
            Join Room
          </Button>
        </div>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between bg-background">
        <div>
          <h1 className="text-2xl font-bold">{room.name}</h1>
          {room.description && (
            <p className="text-sm text-muted-foreground">{room.description}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{participants.length} online</span>
          </div>

          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>

          {userId === room.owner_user_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = `/dashboard/public-chat/${roomId}/settings`}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Avatar Viewer (Left 50%) */}
        {room.enable_avatar ? (
          <div className="w-1/2 border-r">
            <AvatarViewer
              avatarUrl={room.avatar_url || undefined}
              gender={room.avatar_gender as 'male' | 'female'}
              bgColor={room.bg_color}
              bgScene={room.bg_scene}
              wallText={room.wall_text || undefined}
              wallLogoUrl={room.wall_logo_url || undefined}
              wallVideoUrl={room.wall_video_url || undefined}
              fxState={room.fx_state ? JSON.parse(room.fx_state) : undefined}
              allowDevMode={userId === room.owner_user_id && Boolean(room.enable_developer_mode)}
            />
          </div>
        ) : null}

        {/* Chat Section (Right 50% or full width if no avatar) */}
        <div className={`${room.enable_avatar ? 'w-1/2' : 'w-full'} flex flex-col`}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === 'assistant' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-4 ${
                    message.role === 'assistant'
                      ? 'bg-green-100 dark:bg-green-900'
                      : 'bg-blue-100 dark:bg-blue-900'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">
                      {message.role === 'assistant' ? 'AI' : message.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Textarea
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                placeholder="Type your message..."
                rows={2}
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
                disabled={!messageInput || !messageInput.trim() || sending}
                size="lg"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>
                {messageInput.length} / {room.max_message_length} characters
              </span>
              <span>Press Enter to send, Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
