'use client';

import { useState, useEffect, useCallback } from 'react';
import { config } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Globe, Plus, Trash2, Upload, Users, Lock, Earth,
  Mountain, Loader2, Eye, Settings, Check, X, Bot, Edit2,
  Sparkles, Hammer, List
} from 'lucide-react';
import { toast } from 'sonner';

interface World {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  glb_file_id: string | null;
  thumbnail_file_id: string | null;
  is_public: number;
  max_players: number;
  spawn_position_x: number;
  spawn_position_y: number;
  spawn_position_z: number;
  created_at: string;
  updated_at: string;
  owner_name?: string;
  glb_url?: string;
  thumbnail_url?: string;
}

interface WorldBot {
  id: string;
  world_id: string;
  agent_id: string;
  position_x: number;
  position_y: number;
  position_z: number;
  rotation_y: number;
  animation_url: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  agent_name?: string;
  agent_emoji?: string;
  agent_avatar_url?: string;
}

interface Agent {
  id: string;
  name: string;
  emoji: string;
  avatar_url: string | null;
}

type TabType = 'my-worlds' | 'explore' | 'system' | 'world-builder' | 'bots';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  console.log('[Multiverse] 🔑 Auth Token Check:', {
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
  });
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function WorldsPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('my-worlds');

  // Worlds state
  const [worlds, setWorlds] = useState<World[]>([]);
  const [publicWorlds, setPublicWorlds] = useState<World[]>([]);
  const [systemWorlds, setSystemWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewWorldForm, setShowNewWorldForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  // New world form state
  const [newWorldName, setNewWorldName] = useState('');
  const [newWorldDesc, setNewWorldDesc] = useState('');
  const [newWorldIsPublic, setNewWorldIsPublic] = useState(false);
  const [newWorldMaxPlayers, setNewWorldMaxPlayers] = useState(10);


  // Bot management state
  const [selectedWorldForBots, setSelectedWorldForBots] = useState<string | null>(null);
  const [bots, setBots] = useState<WorldBot[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingBots, setLoadingBots] = useState(false);
  const [showAddBotForm, setShowAddBotForm] = useState(false);
  const [editingBot, setEditingBot] = useState<WorldBot | null>(null);

  // Bot form state
  const [botAgentId, setBotAgentId] = useState('');
  const [botPosX, setBotPosX] = useState(0);
  const [botPosY, setBotPosY] = useState(0);
  const [botPosZ, setBotPosZ] = useState(0);
  const [botRotY, setBotRotY] = useState(0);

  const fetchWorlds = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[Multiverse] 📡 Fetching worlds from:', `${config.backendUrl}/api/multiverse`);
      const headers = authHeaders();
      console.log('[Multiverse] 📤 Request headers:', headers);

      const res = await fetch(`${config.backendUrl}/api/multiverse`, {
        headers: headers,
      });

      console.log('[Multiverse] 📥 Response status:', res.status, res.statusText);

      if (res.ok) {
        const data = await res.json();
        console.log('[Multiverse] ✅ Worlds data:', data);
        setWorlds(data.worlds ?? []);
      } else {
        const errorText = await res.text();
        console.error('[Multiverse] ❌ Error response:', res.status, errorText);
      }
    } catch (err) {
      console.error('[Multiverse] ❌ Error fetching worlds:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPublicWorlds = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${config.backendUrl}/api/multiverse?is_public=1`);
      if (res.ok) {
        const data = await res.json();
        // Sort by newest first
        const sorted = (data.worlds ?? []).sort((a: World, b: World) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setPublicWorlds(sorted);
      }
    } catch (err) {
      console.error('[Multiverse] Error fetching public worlds:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSystemWorlds = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${config.backendUrl}/api/multiverse/system`);
      if (res.ok) {
        const data = await res.json();
        setSystemWorlds(data.worlds ?? []);
      }
    } catch (err) {
      console.error('[Multiverse] Error fetching system worlds:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorlds();
    fetchAgents();
  }, [fetchWorlds]);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${config.backendUrl}/api/agents`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents ?? []);
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  };

  const fetchBots = async (worldId: string) => {
    try {
      setLoadingBots(true);
      const res = await fetch(`${config.backendUrl}/api/multiverse/${worldId}/bots`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setBots(data.bots ?? []);
      }
    } catch (err) {
      console.error('Error fetching bots:', err);
    } finally {
      setLoadingBots(false);
    }
  };

  const handleManageBots = (worldId: string) => {
    setSelectedWorldForBots(worldId);
    setActiveTab('bots');
    fetchBots(worldId);
    setShowAddBotForm(false);
    setEditingBot(null);
  };

  const resetBotForm = () => {
    setBotAgentId('');
    setBotPosX(0);
    setBotPosY(0);
    setBotPosZ(0);
    setBotRotY(0);
  };

  const handleAddBot = async () => {
    if (!selectedWorldForBots || !botAgentId) {
      toast.error('Please select an agent');
      return;
    }

    try {
      const res = await fetch(`${config.backendUrl}/api/multiverse/${selectedWorldForBots}/bots`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: botAgentId,
          position_x: botPosX,
          position_y: botPosY,
          position_z: botPosZ,
          rotation_y: botRotY,
          is_active: 1,
        }),
      });

      if (res.ok) {
        fetchBots(selectedWorldForBots);
        setShowAddBotForm(false);
        resetBotForm();
        toast.success('Bot added successfully!');
      } else {
        toast.error('Failed to add bot');
      }
    } catch (err) {
      console.error('Error adding bot:', err);
      toast.error('Error adding bot');
    }
  };

  const handleUpdateBot = async () => {
    if (!selectedWorldForBots || !editingBot) return;

    try {
      const res = await fetch(`${config.backendUrl}/api/multiverse/${selectedWorldForBots}/bots/${editingBot.id}`, {
        method: 'PUT',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          position_x: botPosX,
          position_y: botPosY,
          position_z: botPosZ,
          rotation_y: botRotY,
        }),
      });

      if (res.ok) {
        fetchBots(selectedWorldForBots);
        setEditingBot(null);
        resetBotForm();
        toast.success('Bot updated successfully!');
      } else {
        toast.error('Failed to update bot');
      }
    } catch (err) {
      console.error('Error updating bot:', err);
      toast.error('Error updating bot');
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!selectedWorldForBots) return;
    if (!confirm('Are you sure you want to remove this bot?')) return;

    try {
      const res = await fetch(`${config.backendUrl}/api/multiverse/${selectedWorldForBots}/bots/${botId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (res.ok) {
        fetchBots(selectedWorldForBots);
        toast.success('Bot removed successfully');
      } else {
        toast.error('Failed to remove bot');
      }
    } catch (err) {
      console.error('Error deleting bot:', err);
      toast.error('Error deleting bot');
    }
  };

  const handleEditBot = (bot: WorldBot) => {
    setEditingBot(bot);
    setBotPosX(bot.position_x);
    setBotPosY(bot.position_y);
    setBotPosZ(bot.position_z);
    setBotRotY(bot.rotation_y);
    setShowAddBotForm(false);
  };

  const handleUploadWorld = async () => {
    if (!newWorldName.trim()) {
      toast.error('Please provide a name for your world');
      return;
    }

    try {
      setUploading(true);

      // Create empty world record (user will build it manually)
      const res = await fetch(`${config.backendUrl}/api/multiverse`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newWorldName,
          description: newWorldDesc || '',
          glb_file_id: null, // Empty - will be created in World Builder
          is_public: newWorldIsPublic ? 1 : 0,
          max_players: newWorldMaxPlayers,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create world');
      }

      const data = await res.json();
      const worldId = data.world.id;

      toast.success('World created! Opening builder...');

      // Open World Builder with this world ID
      window.location.href = `/world-builder?id=${worldId}`;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create world');
      setUploading(false);
    }
  };

  const handleDeleteWorld = async (id: string) => {
    if (!confirm('Are you sure you want to delete this world?')) return;

    try {
      const res = await fetch(`${config.backendUrl}/api/multiverse/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (res.ok) {
        fetchWorlds();
        toast.success('World deleted successfully');
      } else {
        toast.error('Failed to delete world');
      }
    } catch (err) {
      console.error('Error deleting world:', err);
      toast.error('Error deleting world');
    }
  };

  const handleOpenWorld = (worldId: string) => {
    window.open(`/avatar-viewer?world=${worldId}`, '_blank');
  };


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8 text-blue-500" />
            Interactive Worlds
          </h1>
          <p className="text-muted-foreground mt-1">
            Create, explore, and manage 3D worlds with AI assistance
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('my-worlds')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'my-worlds'
              ? 'border-blue-500 text-blue-500 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <List className="h-4 w-4" />
          My Worlds
        </button>
        <button
          onClick={() => {
            setActiveTab('explore');
            fetchPublicWorlds();
          }}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'explore'
              ? 'border-purple-500 text-purple-500 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Globe className="h-4 w-4" />
          Explore
        </button>
        {/* System tab - hidden for now, will be enabled later */}
        {/* <button
          onClick={() => {
            setActiveTab('system');
            fetchSystemWorlds();
          }}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'system'
              ? 'border-cyan-500 text-cyan-500 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mountain className="h-4 w-4" />
          System
        </button> */}
        <button
          onClick={() => setActiveTab('world-builder')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'world-builder'
              ? 'border-green-500 text-green-500 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Hammer className="h-4 w-4" />
          World Builder
        </button>
        <button
          onClick={() => setActiveTab('bots')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'bots'
              ? 'border-orange-500 text-orange-500 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bot className="h-4 w-4" />
          Bots
        </button>
      </div>

      {/* Tab Content */}
      {/* MY WORLDS TAB */}
      {activeTab === 'my-worlds' && (
        <div className="space-y-6">
          {/* Upload Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => setShowNewWorldForm(!showNewWorldForm)}
              className="flex items-center gap-2"
            >
              {showNewWorldForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showNewWorldForm ? 'Cancel' : 'Upload World'}
            </Button>
          </div>

          {/* New World Form */}
          {showNewWorldForm && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload New World
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="world-name">World Name *</Label>
                  <Input
                    id="world-name"
                    value={newWorldName}
                    onChange={(e) => setNewWorldName(e.target.value)}
                    placeholder="My Mountain Valley"
                  />
                </div>

                <div>
                  <Label htmlFor="world-desc">Description</Label>
                  <Textarea
                    id="world-desc"
                    value={newWorldDesc}
                    onChange={(e) => setNewWorldDesc(e.target.value)}
                    placeholder="Optional description for your world..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="world-public"
                      checked={newWorldIsPublic}
                      onChange={(e) => setNewWorldIsPublic(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="world-public" className="cursor-pointer">
                      Public (others can explore)
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label htmlFor="world-players">Max Players:</Label>
                    <Input
                      id="world-players"
                      type="number"
                      min={1}
                      max={100}
                      value={newWorldMaxPlayers}
                      onChange={(e) => setNewWorldMaxPlayers(parseInt(e.target.value))}
                      className="w-20"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleUploadWorld}
                  disabled={uploading || !newWorldName.trim()}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create World
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Worlds List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : worlds.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mountain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No worlds yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload your first 3D world and start exploring!
                </p>
                <Button onClick={() => setShowNewWorldForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First World
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {worlds.map((world) => (
                <Card key={world.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Thumbnail */}
                  <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 relative">
                    {world.thumbnail_url ? (
                      <img
                        src={world.thumbnail_url}
                        alt={world.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Mountain className="h-16 w-16 text-white/50" />
                      </div>
                    )}

                    {/* Badges overlay */}
                    <div className="absolute top-2 right-2 flex gap-2">
                      {world.is_public ? (
                        <Badge className="bg-green-500">
                          <Earth className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-500">
                          <Lock className="h-3 w-3 mr-1" />
                          Private
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{world.name}</h3>

                    {world.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {world.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {world.max_players} {world.max_players === 1 ? 'player' : 'players'}
                      </span>
                      {world.owner_name && (
                        <span>by {world.owner_name}</span>
                      )}
                      <span>{timeAgo(world.created_at)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleOpenWorld(world.id)}
                          className="flex-1"
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Explore
                        </Button>
                        <Button
                          onClick={() => handleDeleteWorld(world.id)}
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        onClick={() => handleManageBots(world.id)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Bot className="h-4 w-4 mr-1" />
                        Manage Bots
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI GENERATOR TAB */}
      {/* EXPLORE TAB - Public Worlds */}
      {activeTab === 'explore' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : publicWorlds.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Public Worlds Yet</h3>
              <p className="text-muted-foreground">Be the first to create a public world!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicWorlds.map((world) => (
                <Card key={world.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Thumbnail */}
                  <div className="relative h-48 bg-muted">
                    {world.thumbnail_url ? (
                      <img src={world.thumbnail_url} alt={world.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Globe className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>Max {world.max_players}</span>
                    </div>
                  </div>
                  {/* Content */}
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-2 truncate">{world.name}</h3>
                    {world.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{world.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      <span>By {world.owner_name}</span>
                      <span>•</span>
                      <span>{new Date(world.created_at).toLocaleDateString()}</span>
                    </div>
                    <Button
                      onClick={() => window.open(`/avatar-viewer?world=${world.id}`, '_blank')}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Join World
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SYSTEM TAB - Hidden for now, will be enabled later */}
      {/* {activeTab === 'system' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : systemWorlds.length === 0 ? (
            <div className="text-center py-12">
              <Mountain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No System Worlds</h3>
              <p className="text-muted-foreground">System worlds will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {systemWorlds.map((world) => (
                <Card key={world.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-48 bg-muted">
                    <div className="w-full h-full flex items-center justify-center">
                      <Mountain className="h-16 w-16 text-cyan-500" />
                    </div>
                    <div className="absolute top-2 left-2 bg-cyan-500/90 text-white px-2 py-1 rounded-lg text-xs font-semibold">
                      SYSTEM
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-2">{world.name}</h3>
                    {world.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{world.description}</p>
                    )}
                    <Button
                      onClick={() => window.open(`/avatar-viewer?world=${world.id}`, '_blank')}
                      className="w-full bg-cyan-600 hover:bg-cyan-700"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Enter World
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )} */}

      {/* WORLD BUILDER TAB */}
      {activeTab === 'world-builder' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hammer className="h-5 w-5 text-green-500" />
                World Builder
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manual 3D world builder with AI assistance
              </p>
            </CardHeader>
            <CardContent className="py-12 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <Hammer className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-xl font-semibold">Launch World Builder</h3>
                <p className="text-muted-foreground">
                  Open the full-screen World Builder to create and edit 3D worlds with drag-and-drop tools and AI assistance
                </p>
                <Button
                  onClick={() => window.open('/world-builder', '_blank')}
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                >
                  <Hammer className="h-5 w-5 mr-2" />
                  Open World Builder
                </Button>
                <div className="bg-muted/50 p-4 rounded-lg text-left space-y-2 mt-6">
                  <p className="text-sm font-semibold">Features:</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>✓ 3D canvas with camera controls</li>
                    <li>✓ Drag-and-drop objects (cubes, spheres, trees, houses)</li>
                    <li>✓ AI assistant panel for quick modifications</li>
                    <li>✓ Real-time preview</li>
                    <li>✓ Save & Export to GLB</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* BOTS TAB */}
      {activeTab === 'bots' && (
        <div className="space-y-6">
          {/* World Selector */}
          {!selectedWorldForBots ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-orange-500" />
                  Select a World to Manage Bots
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {worlds.map((world) => (
                    <Card
                      key={world.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleManageBots(world.id)}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2">{world.name}</h3>
                        <Button size="sm" className="w-full">
                          <Bot className="h-4 w-4 mr-1" />
                          Manage Bots
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-orange-500" />
                    Manage Bots
                    <Badge variant="outline" className="ml-2">
                      {worlds.find((w) => w.id === selectedWorldForBots)?.name}
                    </Badge>
                  </CardTitle>
                  <Button
                    onClick={() => setSelectedWorldForBots(null)}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                {/* Add Bot Button */}
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">
                    Bots in this world ({bots.length})
                  </h3>
                  {!showAddBotForm && !editingBot && (
                    <Button
                      onClick={() => {
                        setShowAddBotForm(true);
                        resetBotForm();
                      }}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Bot
                    </Button>
                  )}
                </div>

                {/* Add/Edit Bot Form */}
                {(showAddBotForm || editingBot) && (
                  <Card className="border-2 border-orange-500">
                    <CardContent className="p-4 space-y-4">
                      <h4 className="font-semibold">
                        {editingBot ? 'Edit Bot Position' : 'Add New Bot'}
                      </h4>

                      {!editingBot && (
                        <div>
                          <Label htmlFor="bot-agent">Select Agent *</Label>
                          <select
                            id="bot-agent"
                            value={botAgentId}
                            onChange={(e) => setBotAgentId(e.target.value)}
                            className="w-full p-2 border rounded-md bg-background"
                          >
                            <option value="">-- Choose an agent --</option>
                            {agents.map((agent) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.emoji} {agent.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="bot-x">Position X</Label>
                          <Input
                            id="bot-x"
                            type="number"
                            step="0.5"
                            value={botPosX}
                            onChange={(e) => setBotPosX(parseFloat(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="bot-y">Position Y</Label>
                          <Input
                            id="bot-y"
                            type="number"
                            step="0.5"
                            value={botPosY}
                            onChange={(e) => setBotPosY(parseFloat(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="bot-z">Position Z</Label>
                          <Input
                            id="bot-z"
                            type="number"
                            step="0.5"
                            value={botPosZ}
                            onChange={(e) => setBotPosZ(parseFloat(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="bot-rot">Rotation Y (degrees)</Label>
                          <Input
                            id="bot-rot"
                            type="number"
                            step="15"
                            value={botRotY}
                            onChange={(e) => setBotRotY(parseFloat(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {editingBot ? (
                          <>
                            <Button onClick={handleUpdateBot} className="flex-1">
                              <Check className="h-4 w-4 mr-1" />
                              Save Changes
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingBot(null);
                                resetBotForm();
                              }}
                              variant="outline"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={handleAddBot}
                              disabled={!botAgentId}
                              className="flex-1"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Bot
                            </Button>
                            <Button
                              onClick={() => {
                                setShowAddBotForm(false);
                                resetBotForm();
                              }}
                              variant="outline"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Bots List */}
                {loadingBots ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : bots.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No bots in this world yet</p>
                    <p className="text-sm">Click "Add Bot" to place an agent in this world</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bots.map((bot) => (
                      <Card
                        key={bot.id}
                        className={`${
                          editingBot?.id === bot.id ? 'border-2 border-orange-500' : ''
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xl">
                                {bot.agent_emoji || '🤖'}
                              </div>
                              <div>
                                <h4 className="font-semibold">{bot.agent_name || 'Unknown Agent'}</h4>
                                <p className="text-xs text-muted-foreground">
                                  Position: ({bot.position_x.toFixed(1)}, {bot.position_y.toFixed(1)}, {bot.position_z.toFixed(1)}) •
                                  Rotation: {bot.rotation_y.toFixed(0)}°
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleEditBot(bot)}
                                variant="outline"
                                size="sm"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteBot(bot.id)}
                                variant="destructive"
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
