/**
 * Public Chat Rooms Management Dashboard
 * Create, manage, and configure public chat rooms with AI agents
 */

'use client';

import { config } from '@/lib/config';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, MessageSquare, Users, Settings, Trash2, Share2, Code, ExternalLink, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface PublicChatRoom {
  id: string;
  name: string;
  description: string | null;
  owner_user_id: string;
  is_public: number;
  require_auth: number;
  message_count: number;
  participant_count: number;
  created_at: string;
  embed_enabled: number;
}

export default function PublicChatPage() {
  const [rooms, setRooms] = useState<PublicChatRoom[]>([]);
  const [filter, setFilter] = useState<'all' | 'my'>('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Load rooms
  const loadRooms = async () => {
    setLoading(true);
    try {
      const url = `${config.backendUrl}/api/public-chat/rooms${filter === 'my' ? '?filter=my' : ''}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load rooms');
      }

      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (error: any) {
      console.error('[PublicChat] Failed to load rooms:', error);
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [filter]);

  // Delete room
  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    if (!confirm(`Are you sure you want to delete "${roomName}"? This will delete all messages and cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${config.backendUrl}/api/public-chat/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete room');
      }

      toast.success('Room deleted successfully');
      loadRooms();
    } catch (error: any) {
      console.error('[PublicChat] Failed to delete room:', error);
      toast.error('Failed to delete room');
    }
  };

  // Copy share link
  const handleShareRoom = (roomId: string) => {
    const url = `http://localhost:41521/room/${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success('Share link copied to clipboard');
  };

  // Copy embed code
  const handleEmbedCode = async (roomId: string) => {
    try {
      const response = await fetch(`${config.backendUrl}/api/public-chat/rooms/${roomId}/embed-code`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get embed code');
      }

      const data = await response.json();
      navigator.clipboard.writeText(data.iframeCode);
      toast.success('Embed code copied to clipboard');
    } catch (error: any) {
      console.error('[PublicChat] Failed to get embed code:', error);
      toast.error('Failed to get embed code');
    }
  };

  // Filter rooms by search
  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Public Chat Rooms</h1>
          <p className="text-muted-foreground">
            Create and manage multi-user chat rooms with AI agents
          </p>
        </div>
        <Button onClick={() => window.location.href = '/dashboard/public-chat/create'}>
          <Plus className="mr-2 h-4 w-4" />
          Create Room
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All Rooms
          </Button>
          <Button
            variant={filter === 'my' ? 'default' : 'outline'}
            onClick={() => setFilter('my')}
          >
            My Rooms
          </Button>
        </div>

        <Input
          placeholder="Search rooms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading rooms...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Rooms Found</h2>
          <p className="text-muted-foreground mb-6">
            {filter === 'my'
              ? "You haven't created any rooms yet"
              : 'No public rooms available'}
          </p>
          {filter === 'my' && (
            <Button onClick={() => window.location.href = '/dashboard/public-chat/create'}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Room
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map(room => (
            <div
              key={room.id}
              className="border rounded-lg p-6 space-y-4 hover:shadow-md transition-shadow"
            >
              {/* Room Header */}
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold">{room.name}</h3>
                  <div className="flex gap-1">
                    {room.is_public ? (
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        Public
                      </span>
                    ) : (
                      <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">
                        Private
                      </span>
                    )}
                    {room.require_auth ? (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        Auth Required
                      </span>
                    ) : null}
                  </div>
                </div>
                {room.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {room.description}
                  </p>
                )}
              </div>

              {/* Room Stats */}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{room.message_count} messages</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{room.participant_count} participants</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(`/room/${room.id}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleShareRoom(room.id)}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                {room.embed_enabled ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEmbedCode(room.id)}
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                ) : null}
                {filter === 'my' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `/dashboard/public-chat/edit/${room.id}`}
                      title="Edit Room"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `/dashboard/public-chat/${room.id}/settings`}
                      title="Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteRoom(room.id, room.name)}
                      title="Delete Room"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              {/* Created Date */}
              <div className="text-xs text-muted-foreground">
                Created {new Date(room.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
