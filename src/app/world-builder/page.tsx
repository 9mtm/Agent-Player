'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Hammer, Save, Eye, Download, Box, Circle, Square,
  CircleDot, Image as ImageIcon, Home, Trees, Sparkles,
  Trash2, Move, RotateCw, Maximize2, Loader2, Palette,
  Grid3x3, Mountain, Waves, Wind, Droplet, Triangle, Flower2,
  Bot, Plus, Edit, MapPin, Zap, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { config } from '@/lib/config';
import dynamic from 'next/dynamic';

const WorldCanvas3D = dynamic(() => import('@/components/world-builder/WorldCanvas3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <Loader2 className="h-12 w-12 text-white/50 animate-spin" />
    </div>
  ),
});

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function WorldBuilderPage() {
  const searchParams = useSearchParams();
  const worldId = searchParams?.get('id');

  const [worldName, setWorldName] = useState('');
  const [worldDescription, setWorldDescription] = useState('');
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [aiCommand, setAiCommand] = useState('');
  const [objects, setObjects] = useState<any[]>([]);
  const [aiHistory, setAiHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState(288); // 72 * 4 = 288px (w-72)
  const [isResizing, setIsResizing] = useState(false);

  // Bot management state
  const [bots, setBots] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [botsLoading, setBotsLoading] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);

  // World settings
  const [groundType, setGroundType] = useState<'color' | 'grid' | 'terrain' | 'sea' | 'desert'>('grid');
  const [groundColor, setGroundColor] = useState('#2a2a2a');
  const [worldSize, setWorldSize] = useState(50);

  // Helper function to change ground type with logging
  const changeGroundType = (newType: 'color' | 'grid' | 'terrain' | 'sea' | 'desert') => {
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║  USER CLICKED: Ground Type Change            ║');
    console.log('╠═══════════════════════════════════════════════╣');
    console.log(`  Previous: ${groundType}`);
    console.log(`  New:      ${newType}`);
    console.log('╚═══════════════════════════════════════════════╝');
    setGroundType(newType);
  };
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  // Sidebar tabs
  const [activeTab, setActiveTab] = useState<'tools' | 'ground' | 'size' | 'controls' | 'bots'>('tools');

  // Preview mode
  const [previewMode, setPreviewMode] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Load existing world if ID is provided in URL
  useEffect(() => {
    if (worldId) {
      console.log('[World Builder] World ID found in URL:', worldId);
      loadWorld(worldId);
      loadBots(worldId);
    } else {
      console.log('[World Builder] No world ID - starting fresh');
    }
  }, [worldId]);

  // Load agents list for bot creation
  useEffect(() => {
    loadAgents();
  }, []);

  // Load user's avatar (using same method as Avatar Settings page)
  useEffect(() => {
    const loadUserAvatar = async () => {
      try {
        console.log('[World Builder] 🔍 Starting avatar load...');
        console.log('[World Builder] 🔍 Backend URL:', config.backendUrl);

        // Extract userId from JWT token (same as Avatar Settings page)
        const authToken = localStorage.getItem('auth_token');
        if (!authToken) {
          console.warn('[World Builder] ❌ No auth token found');
          return;
        }

        let userId: string;
        try {
          const payload = JSON.parse(atob(authToken.split('.')[1]));
          userId = payload.userId;
          console.log('[World Builder] ✅ Extracted userId from JWT:', userId);
        } catch (error) {
          console.error('[World Builder] ❌ Failed to decode auth token:', error);
          return;
        }

        // Call /api/avatars?userId={userId} (same as Avatar Settings page)
        const res = await fetch(`${config.backendUrl}/api/avatars?userId=${userId}`);
        console.log('[World Builder] 🔍 Avatars API response status:', res.status);

        if (res.ok) {
          const data = await res.json();
          console.log('[World Builder] ✅ Avatars API response:', JSON.stringify(data, null, 2));

          if (data.success && data.avatars && data.avatars.length > 0) {
            // Find the active avatar
            const activeAvatar = data.avatars.find((a: any) => a.isActive);

            if (activeAvatar) {
              console.log('[World Builder] ✅ Found active avatar:', activeAvatar);

              // Use localGlbPath if available, otherwise use glbUrl
              const avatarPath = activeAvatar.localGlbPath || activeAvatar.glbUrl;
              console.log('[World Builder] 🔍 Avatar path:', avatarPath);

              if (avatarPath) {
                // If it's a full URL (starts with http), use it directly
                // Otherwise, prepend backend URL for local paths
                const fullAvatarUrl = avatarPath.startsWith('http')
                  ? avatarPath
                  : `${config.backendUrl}${avatarPath}`;

                console.log('[World Builder] ✅ Full Avatar URL:', fullAvatarUrl);
                setAvatarUrl(fullAvatarUrl);
                console.log('[World Builder] ✅ Avatar URL set in state!');
              } else {
                console.warn('[World Builder] ❌ Active avatar has no glbUrl or localGlbPath');
              }
            } else {
              console.warn('[World Builder] ❌ No active avatar found in avatars list');
              console.log('[World Builder] 🔍 Available avatars:', data.avatars.map((a: any) => ({ id: a.id, name: a.name, isActive: a.isActive })));
            }
          } else {
            console.warn('[World Builder] ❌ No avatars found for user');
          }
        } else {
          const errorText = await res.text();
          console.error('[World Builder] ❌ Avatars API failed!');
          console.error('[World Builder] ❌ Status:', res.status);
          console.error('[World Builder] ❌ Error:', errorText);
        }
      } catch (err) {
        console.error('[World Builder] ❌ Exception loading avatar:', err);
        console.error('[World Builder] ❌ Error details:', JSON.stringify(err, null, 2));
      }
    };

    loadUserAvatar();
  }, []);

  const loadWorld = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${config.backendUrl}/api/world-builder/${id}`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        throw new Error('Failed to load world');
      }

      const data = await res.json();
      setWorldName(data.world.name || '');
      setWorldDescription(data.world.description || '');
      setObjects(data.world.objects || []);
      toast.success('World loaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to load world');
    } finally {
      setLoading(false);
    }
  };

  const loadBots = async (id: string) => {
    try {
      setBotsLoading(true);
      const res = await fetch(`${config.backendUrl}/api/multiverse/${id}/bots`, {
        headers: authHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setBots(data.bots || []);
      }
    } catch (err) {
      console.error('Failed to load bots:', err);
    } finally {
      setBotsLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const res = await fetch(`${config.backendUrl}/api/agents`, {
        headers: authHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  };

  const handleAddBot = async (agentId: string) => {
    if (!worldId) {
      toast.error('Please save the world first');
      return;
    }

    try {
      const res = await fetch(`${config.backendUrl}/api/multiverse/${worldId}/bots`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
          position_x: 3,
          position_y: 0,
          position_z: 3,
          rotation_y: 0,
          behavior_type: 'idle',
          movement_speed: 1.0,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to add bot');
      }

      const data = await res.json();
      setBots([...bots, data.bot]);
      toast.success('Bot added successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add bot');
    }
  };

  const handleUpdateBot = async (botId: string, updates: any) => {
    if (!worldId) return;

    try {
      const res = await fetch(`${config.backendUrl}/api/multiverse/${worldId}/bots/${botId}`, {
        method: 'PUT',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error('Failed to update bot');
      }

      const data = await res.json();
      setBots(bots.map(b => b.id === botId ? data.bot : b));
      toast.success('Bot updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update bot');
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!worldId) return;

    if (!confirm('Delete this bot?')) return;

    try {
      const res = await fetch(`${config.backendUrl}/api/multiverse/${worldId}/bots/${botId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!res.ok) {
        throw new Error('Failed to delete bot');
      }

      setBots(bots.filter(b => b.id !== botId));
      setSelectedBotId(null);
      toast.success('Bot deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete bot');
    }
  };

  const tools = [
    // Basic Shapes
    { id: 'cube', name: 'Box', icon: Box, color: 'bg-blue-500' },
    { id: 'sphere', name: 'Sphere', icon: Circle, color: 'bg-green-500' },
    { id: 'cylinder', name: 'Cylinder', icon: CircleDot, color: 'bg-purple-500' },
    { id: 'plane', name: 'Plane', icon: Square, color: 'bg-gray-500' },

    // Terrain Objects
    { id: 'mountain', name: 'Mountain', icon: Mountain, color: 'bg-stone-600' },
    { id: 'hill', name: 'Hill', icon: Triangle, color: 'bg-green-600' },
    { id: 'rock', name: 'Rock', icon: Circle, color: 'bg-gray-600' },
    { id: 'water_patch', name: 'Water Patch', icon: Droplet, color: 'bg-blue-600' },
    { id: 'bush', name: 'Bush', icon: Flower2, color: 'bg-green-500' },
    { id: 'tree', name: 'Tree', icon: Trees, color: 'bg-green-700' },

    // Buildings & Objects
    { id: 'house', name: 'House', icon: Home, color: 'bg-orange-500' },
    { id: 'image', name: 'Image', icon: ImageIcon, color: 'bg-pink-500' },

    // Delete Tool
    { id: 'delete', name: 'Delete', icon: Trash2, color: 'bg-red-600' },
  ];

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
    toast.info(`Selected: ${tools.find(t => t.id === toolId)?.name}`);
  };

  const handleAddObject = (position?: [number, number, number]) => {
    if (!selectedTool) {
      toast.error('Please select a tool first');
      return;
    }

    const newObject = {
      id: `obj_${Date.now()}`,
      type: selectedTool,
      position: position || [0, 0, 0], // Use clicked position or center
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#ffffff',
    };

    setObjects([...objects, newObject]);
    const toolName = tools.find(t => t.id === selectedTool)?.name || selectedTool;
    toast.success(`${toolName} added to world`);
  };

  // Handle clicking on the ground to place object
  const handleGroundClick = (position: [number, number, number]) => {
    // Don't place object if Delete tool is selected
    if (selectedTool === 'delete') {
      return;
    }

    if (!selectedTool) {
      toast.info('Select a tool first, then click to place it');
      return;
    }
    console.log('[World Builder] Ground clicked at position:', position);
    handleAddObject(position);
  };

  // Handle object deletion (works with both Delete tool click and right-click)
  const handleObjectDelete = (objectId: string) => {
    const deletedObject = objects.find(obj => obj.id === objectId);
    if (!deletedObject) {
      console.warn('[World Builder] Object not found:', objectId);
      return;
    }

    setObjects(objects.filter(obj => obj.id !== objectId));
    const objectType = deletedObject.type;
    const toolName = tools.find(t => t.id === objectType)?.name || objectType;
    toast.success(`${toolName} deleted`);
    console.log('[World Builder] Deleted object:', objectId);
  };

  const handleAICommand = async () => {
    if (!aiCommand.trim()) {
      toast.error('Please enter a command');
      return;
    }

    try {
      // Add to history
      setAiHistory([...aiHistory, `⏳ ${aiCommand}`]);
      toast.info('🤖 AI is processing your command...');

      // Get first available agent
      if (agents.length === 0) {
        toast.error('No agents available. Please create an agent first.');
        return;
      }

      const defaultAgent = agents[0];

      // Call AI world generator
      const res = await fetch(`${config.backendUrl}/api/world-generator/ai`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiCommand,
          agent_id: defaultAgent.id,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate from AI command');
      }

      const data = await res.json();

      // Update history with success
      setAiHistory(prev => [...prev.slice(0, -1), `✓ ${aiCommand}`]);

      // TODO: Parse AI response and add objects to scene
      // For now, just show success
      toast.success('✨ AI command executed! (Objects generation coming soon)');
      setAiCommand('');
    } catch (err: any) {
      // Update history with error
      setAiHistory(prev => [...prev.slice(0, -1), `❌ ${aiCommand}`]);
      toast.error(err.message || 'Failed to execute AI command');
    }
  };

  const handleSave = async () => {
    console.log('[World Builder] 💾 Save button clicked!');
    console.log('[World Builder] 🔍 worldName:', worldName);
    console.log('[World Builder] 🔍 worldDescription:', worldDescription);
    console.log('[World Builder] 🔍 objects count:', objects.length);
    console.log('[World Builder] 🔍 objects:', objects);

    if (!worldName.trim()) {
      console.warn('[World Builder] ❌ World name is empty!');
      toast.error('Please enter a world name');
      return;
    }

    try {
      setSaving(true);

      const worldData = {
        name: worldName,
        description: worldDescription,
        objects,
      };

      console.log('[World Builder] 🔍 World data to save:', JSON.stringify(worldData, null, 2));
      console.log('[World Builder] 🔍 Current worldId:', worldId);
      console.log('[World Builder] 🔍 Auth headers:', authHeaders());

      let savedWorldId = worldId;

      // Check if world exists in database (if worldId is provided in URL)
      let worldExists = false;
      if (worldId) {
        console.log('[World Builder] 🔍 Checking if world exists in database...');
        const checkRes = await fetch(`${config.backendUrl}/api/world-builder/${worldId}`, {
          headers: authHeaders()
        });
        worldExists = checkRes.ok;
        console.log('[World Builder] 🔍 World exists:', worldExists);
      }

      if (worldId && worldExists) {
        // Update existing world
        console.log('[World Builder] 📝 Updating existing world...');
        const url = `${config.backendUrl}/api/world-builder/${worldId}`;
        console.log('[World Builder] 🔍 PUT URL:', url);

        const res = await fetch(url, {
          method: 'PUT',
          headers: {
            ...authHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(worldData),
        });

        console.log('[World Builder] 🔍 PUT response status:', res.status);

        if (!res.ok) {
          const errorText = await res.text();
          console.error('[World Builder] ❌ PUT failed!');
          console.error('[World Builder] ❌ Status:', res.status);
          console.error('[World Builder] ❌ Error:', errorText);
          throw new Error(`Failed to save world: ${errorText}`);
        }

        const responseData = await res.json();
        console.log('[World Builder] ✅ PUT response:', responseData);
      } else {
        // Create new world (either no worldId OR world doesn't exist in DB)
        console.log('[World Builder] 🆕 Creating new world...');
        if (worldId && !worldExists) {
          console.log('[World Builder] ⚠️ World ID in URL but not in database - creating new world');
        }
        const url = `${config.backendUrl}/api/world-builder`;
        console.log('[World Builder] 🔍 POST URL:', url);

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            ...authHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(worldData),
        });

        console.log('[World Builder] 🔍 POST response status:', res.status);

        if (!res.ok) {
          const errorText = await res.text();
          console.error('[World Builder] ❌ POST failed!');
          console.error('[World Builder] ❌ Status:', res.status);
          console.error('[World Builder] ❌ Error:', errorText);
          throw new Error(`Failed to create world: ${errorText}`);
        }

        const data = await res.json();
        console.log('[World Builder] ✅ POST response:', data);
        savedWorldId = data.world.id;
        console.log('[World Builder] ✅ New world ID:', savedWorldId);

        // Update URL with world ID
        window.history.replaceState({}, '', `/world-builder?id=${savedWorldId}`);
        console.log('[World Builder] ✅ URL updated with world ID');
      }

      console.log('[World Builder] ✅ Save successful!');
      toast.success(`World "${worldName}" saved successfully!`);
    } catch (err: any) {
      console.error('[World Builder] ❌ Save failed with exception:', err);
      console.error('[World Builder] ❌ Error message:', err.message);
      console.error('[World Builder] ❌ Error stack:', err.stack);
      toast.error(err.message || 'Failed to save world');
    } finally {
      setSaving(false);
      console.log('[World Builder] 💾 Save process finished');
    }
  };

  const handlePreview = () => {
    setPreviewMode(!previewMode);
    if (!previewMode) {
      toast.info('Preview mode enabled - Press ESC to exit');
    } else {
      toast.info('Preview mode disabled');
    }
  };

  // Handle ESC key to exit preview mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewMode) {
        setPreviewMode(false);
        toast.info('Preview mode disabled');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewMode]);

  const handleExport = () => {
    toast.info('Exporting GLB...');
    // TODO: Export to GLB file
  };

  // Sidebar resize handlers
  const startResizing = () => {
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Hammer className="h-6 w-6 text-green-500" />
            <h1 className="text-2xl font-bold">World Builder</h1>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="World Name"
              value={worldName}
              onChange={(e) => setWorldName(e.target.value)}
              className="w-48"
            />
            <Button onClick={handleSave} variant="default" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {worldId ? 'Save Changes' : 'Save World'}
                </>
              )}
            </Button>
            <Button onClick={handlePreview} variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export GLB
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tabbed Interface (hidden in preview mode) */}
        {!previewMode && (
        <div
          className="border-r flex flex-col bg-background relative"
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Tabs Header */}
          <div className="border-b border-border overflow-x-auto scrollbar-thin">
            <div className="flex min-w-max">
              <button
                onClick={() => setActiveTab('tools')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'tools'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Box className="h-4 w-4" />
                  <span className="hidden md:inline">Tools</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('ground')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'ground'
                    ? 'border-b-2 border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Mountain className="h-4 w-4" />
                  <span className="hidden md:inline">Ground</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('size')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'size'
                    ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Maximize2 className="h-4 w-4" />
                  <span className="hidden md:inline">Size</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('controls')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'controls'
                    ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Move className="h-4 w-4" />
                  <span className="hidden md:inline">Edit</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('bots')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'bots'
                    ? 'border-b-2 border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Bot className="h-4 w-4" />
                  <span className="hidden md:inline">Bots</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'ai'
                    ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden md:inline">AI</span>
                </div>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* TAB 1: Tools */}
            {activeTab === 'tools' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {tools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => handleToolSelect(tool.id)}
                      className={`w-full p-3 rounded-lg border-2 transition-all ${
                        selectedTool === tool.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${tool.color}`}>
                          <tool.icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium">{tool.name}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <Button onClick={handleAddObject} className="w-full" disabled={!selectedTool}>
                  <Box className="h-4 w-4 mr-2" />
                  Add to World
                </Button>
              </div>
            )}

            {/* TAB 2: Ground Type */}
            {activeTab === 'ground' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <button
                    onClick={() => changeGroundType('color')}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      groundType === 'color'
                        ? 'border-green-500 bg-green-50 dark:bg-green-950'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Palette className="h-4 w-4" />
                      <span className="font-medium">Solid Color</span>
                    </div>
                  </button>
                  <button
                    onClick={() => changeGroundType('grid')}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      groundType === 'grid'
                        ? 'border-green-500 bg-green-50 dark:bg-green-950'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Grid3x3 className="h-4 w-4" />
                      <span className="font-medium">Grid Pattern</span>
                    </div>
                  </button>
                  <button
                    onClick={() => changeGroundType('terrain')}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      groundType === 'terrain'
                        ? 'border-green-500 bg-green-50 dark:bg-green-950'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Mountain className="h-4 w-4" />
                      <span className="font-medium">Grass Terrain</span>
                    </div>
                  </button>
                  <button
                    onClick={() => changeGroundType('sea')}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      groundType === 'sea'
                        ? 'border-green-500 bg-green-50 dark:bg-green-950'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Waves className="h-4 w-4" />
                      <span className="font-medium">Ocean Water</span>
                    </div>
                  </button>
                  <button
                    onClick={() => changeGroundType('desert')}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      groundType === 'desert'
                        ? 'border-green-500 bg-green-50 dark:bg-green-950'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Wind className="h-4 w-4" />
                      <span className="font-medium">Desert Sand</span>
                    </div>
                  </button>
                </div>

                {groundType === 'color' && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <Label htmlFor="ground-color" className="text-sm font-medium mb-2 block">
                      Ground Color
                    </Label>
                    <Input
                      id="ground-color"
                      type="color"
                      value={groundColor}
                      onChange={(e) => setGroundColor(e.target.value)}
                      className="h-12 w-full"
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: World Size */}
            {activeTab === 'size' && (
              <div className="space-y-4">
                <div className="text-center p-6 bg-muted/30 rounded-lg">
                  <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                    {worldSize}m
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {worldSize}m × {worldSize}m
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="world-size" className="text-sm font-medium">
                    World Dimensions
                  </Label>
                  <Input
                    id="world-size"
                    type="range"
                    min="20"
                    max="200"
                    step="10"
                    value={worldSize}
                    onChange={(e) => setWorldSize(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>20m (Small)</span>
                    <span>200m (Large)</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWorldSize(50)}
                    className={worldSize === 50 ? 'border-purple-500' : ''}
                  >
                    Small
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWorldSize(100)}
                    className={worldSize === 100 ? 'border-purple-500' : ''}
                  >
                    Medium
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWorldSize(150)}
                    className={worldSize === 150 ? 'border-purple-500' : ''}
                  >
                    Large
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 4: Controls */}
            {activeTab === 'controls' && (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted/30 rounded-lg">
                  Select an object to edit its properties
                </div>

                <Button variant="outline" size="lg" className="w-full justify-start">
                  <Move className="h-4 w-4 mr-3" />
                  Move Object
                </Button>
                <Button variant="outline" size="lg" className="w-full justify-start">
                  <RotateCw className="h-4 w-4 mr-3" />
                  Rotate Object
                </Button>
                <Button variant="outline" size="lg" className="w-full justify-start">
                  <Maximize2 className="h-4 w-4 mr-3" />
                  Scale Object
                </Button>

                <div className="border-t border-border my-4"></div>

                <Button variant="outline" size="lg" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                  <Trash2 className="h-4 w-4 mr-3" />
                  Delete Object
                </Button>
              </div>
            )}

            {/* TAB 5: Bots */}
            {activeTab === 'bots' && (
              <div className="space-y-4">
                {!worldId ? (
                  <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                    Save the world first to add bots
                  </div>
                ) : (
                  <>
                    {/* Add Bot Section */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Add Bot</Label>
                      {agents.length === 0 ? (
                        <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                          No agents available
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {agents.map((agent) => (
                            <button
                              key={agent.id}
                              onClick={() => handleAddBot(agent.id)}
                              className="w-full p-2 rounded-lg border-2 border-transparent hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-all text-left"
                            >
                              <div className="flex items-center gap-2">
                                <Bot className="h-4 w-4 text-cyan-500" />
                                <span className="text-sm font-medium">{agent.name}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border"></div>

                    {/* Bots List */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Bots in World ({bots.length})
                      </Label>
                      {botsLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : bots.length === 0 ? (
                        <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                          No bots yet. Add one above!
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {bots.map((bot) => (
                            <div
                              key={bot.id}
                              className={`p-3 rounded-lg border-2 transition-all ${
                                selectedBotId === bot.id
                                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
                                  : 'border-transparent hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Activity className="h-4 w-4 text-cyan-500" />
                                  <span className="text-sm font-medium">{bot.agent_name}</span>
                                </div>
                                <button
                                  onClick={() => handleDeleteBot(bot.id)}
                                  className="p-1 hover:bg-red-100 dark:hover:bg-red-950/30 rounded"
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </button>
                              </div>

                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>
                                    Position: ({bot.position_x.toFixed(1)}, {bot.position_z.toFixed(1)})
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Zap className="h-3 w-3" />
                                  <span>Behavior: {bot.behavior_type || 'static'}</span>
                                </div>
                              </div>

                              {selectedBotId === bot.id && (
                                <div className="mt-3 pt-3 border-t space-y-2">
                                  <Label className="text-xs">Behavior Type</Label>
                                  <select
                                    className="w-full p-2 text-xs rounded border"
                                    value={bot.behavior_type || 'static'}
                                    onChange={(e) =>
                                      handleUpdateBot(bot.id, { behavior_type: e.target.value })
                                    }
                                  >
                                    <option value="static">Static</option>
                                    <option value="idle">Idle</option>
                                    <option value="random_walk">Random Walk</option>
                                    <option value="patrol">Patrol</option>
                                    <option value="interactive">Interactive</option>
                                  </select>

                                  <Label className="text-xs">Speed</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    max="5"
                                    value={bot.movement_speed || 1.0}
                                    onChange={(e) =>
                                      handleUpdateBot(bot.id, {
                                        movement_speed: parseFloat(e.target.value),
                                      })
                                    }
                                    className="text-xs"
                                  />
                                </div>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full mt-2"
                                onClick={() =>
                                  setSelectedBotId(selectedBotId === bot.id ? null : bot.id)
                                }
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                {selectedBotId === bot.id ? 'Close' : 'Edit'}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* AI Assistant Tab */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Quick commands:
                    </p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• "Add a red cube at position 0,0,0"</li>
                      <li>• "Change the ground color to green"</li>
                      <li>• "Create a desk in the center"</li>
                      <li>• "Add 5 trees randomly"</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* History */}
                {aiHistory.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">History</h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {aiHistory.map((item, idx) => (
                        <div
                          key={idx}
                          className="text-xs bg-muted p-2 rounded"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Input */}
                <div className="space-y-2">
                  <Label htmlFor="ai-command" className="text-sm font-medium">
                    AI Command
                  </Label>
                  <Textarea
                    id="ai-command"
                    value={aiCommand}
                    onChange={(e) => setAiCommand(e.target.value)}
                    placeholder="Type a command like 'Add a red cube'"
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleAICommand();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAICommand}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Execute Command
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Press Ctrl+Enter to execute
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors group"
            onMouseDown={startResizing}
          >
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1 h-16 bg-border group-hover:bg-blue-500 transition-colors" />
          </div>
        </div>
        )}

        {/* Center - 3D Canvas */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 relative">
          <div ref={canvasRef} className="w-full h-full">
            <WorldCanvas3D
              objects={objects}
              groundType={groundType}
              groundColor={groundColor}
              worldSize={worldSize}
              avatarUrl={avatarUrl}
              worldId={worldId}
              onGroundClick={handleGroundClick}
              selectedTool={selectedTool}
              onObjectDelete={handleObjectDelete}
            />
          </div>

          {/* Info overlay */}
          <div className="absolute bottom-4 left-4 bg-black/50 rounded px-3 py-2 text-white text-xs space-y-1">
            <div>Camera: Orbit (Drag to rotate)</div>
            <div>Ground: {groundType.charAt(0).toUpperCase() + groundType.slice(1)}</div>
            <div>Size: {worldSize}m × {worldSize}m</div>
            <div>Objects: {objects.length}</div>
            <div className={bots.length > 0 ? 'text-cyan-400' : 'text-gray-400'}>
              Bots: {bots.length}
            </div>
            <div className={avatarUrl ? 'text-green-400' : 'text-yellow-400'}>
              Avatar: {avatarUrl ? (avatarUrl.startsWith('http') ? 'Loaded' : 'Fallback (invalid URL)') : 'Fallback (no avatar)'}
            </div>
            {objects.length > 0 && (
              <div className="border-t border-white/20 mt-2 pt-2 text-yellow-300">
                <div>Left-click ground: Place object</div>
                <div>Right-click object: Delete</div>
                <div>Or use Delete tool to remove</div>
              </div>
            )}
          </div>

          {/* Instructions overlay - only show if no WebGL error */}
          {objects.length === 0 && !avatarUrl && !loading && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-white/70 pointer-events-none z-10">
              <Box className="h-16 w-16 mx-auto mb-4 text-white/40" />
              <h3 className="text-lg font-semibold mb-2">Start Building Your World</h3>
              <p className="text-sm mb-2">
                Select a tool from the left sidebar
              </p>
              <p className="text-xs text-white/50">
                Then click anywhere on the ground to place it
              </p>
            </div>
          )}
        </div>

        {/* Right Sidebar - Removed (AI Assistant moved to left sidebar) */}
      </div>

      {/* Bottom Status Bar (hidden in preview mode) */}
      {!previewMode && (
      <div className="border-t px-6 py-2 flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Objects: {objects.length}</span>
          <span>Selected: {selectedTool || 'None'}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Ready</span>
        </div>
      </div>
      )}

      {/* Preview Mode Exit Button */}
      {previewMode && (
        <div className="absolute top-4 right-4 z-50">
          <Button
            onClick={() => setPreviewMode(false)}
            variant="outline"
            className="bg-black/50 backdrop-blur border-white/20 hover:bg-black/70"
          >
            <Eye className="h-4 w-4 mr-2" />
            Exit Preview (ESC)
          </Button>
        </div>
      )}
    </div>
  );
}
