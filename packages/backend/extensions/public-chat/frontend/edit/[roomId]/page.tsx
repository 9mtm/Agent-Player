/**
 * Edit Public Chat Room
 * Edit existing public chat room configuration
 */

'use client';

import { config } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Avatar {
  id: string;
  name: string;
  glbUrl: string;
  localGlbPath: string | null;
  previewUrl: string | null;
  isActive: boolean;
}

interface Agent {
  id: string;
  name: string;
  system_prompt: string;
}

interface RoomData {
  name: string;
  description: string;
  is_public: boolean;
  require_auth: boolean;
  embed_enabled: boolean;
  agent_id: string;
  avatar_url: string;
}

export default function EditPublicChatPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [data, setData] = useState<RoomData>({
    name: '',
    description: '',
    is_public: true,
    require_auth: false,
    embed_enabled: false,
    agent_id: '',
    avatar_url: '',
  });

  // Load room data, avatars, and agents
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const authToken = localStorage.getItem('auth_token');

        // Load room data
        const roomResponse = await fetch(`${config.backendUrl}/api/public-chat/rooms/${roomId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });

        if (!roomResponse.ok) {
          throw new Error('Failed to load room data');
        }

        const roomData = await roomResponse.json();
        setData({
          name: roomData.room.name || '',
          description: roomData.room.description || '',
          is_public: Boolean(roomData.room.is_public),
          require_auth: Boolean(roomData.room.require_auth),
          embed_enabled: Boolean(roomData.room.embed_enabled),
          agent_id: roomData.room.agent_id || '',
          avatar_url: roomData.room.avatar_url || '',
        });

        // Load avatars
        // Decode JWT to get userId
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        const userId = payload.userId;

        const avatarsResponse = await fetch(`${config.backendUrl}/api/avatars?userId=${userId}`);

        if (avatarsResponse.ok) {
          const avatarsData = await avatarsResponse.json();
          setAvatars(avatarsData.avatars || []);
        }

        // Load agents
        const agentsResponse = await fetch(`${config.backendUrl}/api/agents`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });

        if (agentsResponse.ok) {
          const agentsData = await agentsResponse.json();
          setAgents(agentsData.agents || []);
        }
      } catch (error: any) {
        console.error('[EditRoom] Failed to load data:', error);
        toast.error('Failed to load room data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [roomId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate required fields
      if (!data.name.trim()) {
        toast.error('Room name is required');
        setSaving(false);
        return;
      }

      if (!data.agent_id) {
        toast.error('Please select an AI agent');
        setSaving(false);
        return;
      }

      if (!data.avatar_url) {
        toast.error('Please select an avatar');
        setSaving(false);
        return;
      }

      // Update room
      const response = await fetch(`${config.backendUrl}/api/public-chat/rooms/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          name: data.name.trim(),
          description: data.description.trim() || null,
          is_public: data.is_public,
          require_auth: data.require_auth,
          embed_enabled: data.embed_enabled,
          agent_id: data.agent_id,
          avatar_url: data.avatar_url,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update room');
      }

      toast.success('Room updated successfully');

      // Navigate back to public chat list
      router.push('/dashboard/public-chat');
    } catch (error: any) {
      console.error('[EditRoom] Failed to update:', error);
      toast.error(error.message || 'Failed to update room');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading room data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/public-chat')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Room</h1>
          <p className="text-muted-foreground">
            Update room configuration and settings
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Basic Information</h2>

          <div className="space-y-2">
            <Label htmlFor="name">Room Name *</Label>
            <Input
              id="name"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              placeholder="Customer Support"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              placeholder="Get help from our AI assistant"
              rows={3}
            />
          </div>
        </div>

        {/* AI Agent Selection */}
        <div className="border rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">AI Agent *</h2>
            <p className="text-sm text-muted-foreground">
              Select which AI agent will respond in this room
            </p>
          </div>

          {agents.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No agents found. Please create an agent first in Agent Settings.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {agents.map(agent => {
                const isSelected = data.agent_id === agent.id;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setData({ ...data, agent_id: agent.id })}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{agent.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {agent.system_prompt || 'No description'}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Avatar Selection */}
        <div className="border rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Avatar *</h2>
            <p className="text-sm text-muted-foreground">
              Select the avatar appearance for the AI agent
            </p>
          </div>

          {avatars.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No avatars found. Please add avatars first in Avatar Settings.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {avatars.map(avatar => {
                const avatarUrl = avatar.localGlbPath || avatar.glbUrl;
                const isSelected = data.avatar_url === avatarUrl;
                const previewUrl = avatar.previewUrl ||
                  (avatarUrl?.includes('readyplayer.me') ? `${avatarUrl.replace('.glb', '.png')}` : null);

                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setData({ ...data, avatar_url: avatarUrl })}
                    className={`relative rounded-xl border-2 overflow-hidden transition-all ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary ring-offset-2'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="relative h-32 bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={avatar.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-4xl font-bold text-white">
                          {avatar.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {avatar.isActive && (
                        <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                          Active
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="h-8 w-8 text-white drop-shadow-lg" />
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-background">
                      <p className="text-sm font-medium truncate">{avatar.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Room Settings */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Room Settings</h2>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Public Room</Label>
              <p className="text-sm text-muted-foreground">
                Allow anyone to discover and join this room
              </p>
            </div>
            <Switch
              checked={data.is_public}
              onCheckedChange={(checked) => setData({ ...data, is_public: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Users must be logged in to join
              </p>
            </div>
            <Switch
              checked={data.require_auth}
              onCheckedChange={(checked) => setData({ ...data, require_auth: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Embedding</Label>
              <p className="text-sm text-muted-foreground">
                Allow this room to be embedded in other websites
              </p>
            </div>
            <Switch
              checked={data.embed_enabled}
              onCheckedChange={(checked) => setData({ ...data, embed_enabled: checked })}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/public-chat')}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
