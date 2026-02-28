/**
 * Public Chat Room Creation Wizard
 * 4-Step wizard for creating new public chat rooms
 */

'use client';

import { config } from '@/lib/config';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface RoomData {
  // Step 1: Basic Info
  name: string;
  description: string;
  avatar_url: string;
  avatar_gender: 'male' | 'female';

  // Step 2: AI Configuration
  model: string;
  system_prompt: string;
  agent_id: string;
  workflow_id: string;
  skills: string[];

  // Step 3: Appearance
  bg_color: string;
  bg_scene: string;
  wall_text: string;
  wall_logo_url: string;
  wall_video_url: string;

  // Step 4: Access & Settings
  is_public: boolean;
  require_auth: boolean;
  allowed_users: string[];
  max_message_length: number;
  rate_limit_seconds: number;
  enable_voice: boolean;
  enable_avatar: boolean;
  enable_developer_mode: boolean;
  embed_enabled: boolean;
  embed_size: 'small' | 'medium' | 'large' | 'full';
  embed_theme: 'light' | 'dark' | 'auto';
}

const INITIAL_DATA: RoomData = {
  name: '',
  description: '',
  avatar_url: '',
  avatar_gender: 'female',
  model: 'claude-sonnet-4.5',
  system_prompt: '',
  agent_id: '',
  workflow_id: '',
  skills: [],
  bg_color: '#09090b',
  bg_scene: 'none',
  wall_text: '',
  wall_logo_url: '',
  wall_video_url: '',
  is_public: true,
  require_auth: false,
  allowed_users: [],
  max_message_length: 1000,
  rate_limit_seconds: 5,
  enable_voice: true,
  enable_avatar: true,
  enable_developer_mode: false,
  embed_enabled: true,
  embed_size: 'medium',
  embed_theme: 'auto',
};

interface UserAvatar {
  id: string;
  name: string;
  glbUrl: string;
  localGlbPath?: string;
  previewUrl?: string;
  bgColor: string;
  bgScene: string;
  isActive: number;
}

export default function CreateRoomPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RoomData>(INITIAL_DATA);
  const [creating, setCreating] = useState(false);
  const [avatars, setAvatars] = useState<UserAvatar[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);

  // Load user avatars
  useEffect(() => {
    const loadAvatars = async () => {
      try {
        // Get user ID from localStorage (stored after login)
        const authToken = localStorage.getItem('auth_token');
        if (!authToken) {
          setLoadingAvatars(false);
          return;
        }

        // Decode JWT to get userId (simple base64 decode of payload)
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        const userId = payload.userId;

        const response = await fetch(`${config.backendUrl}/api/avatars?userId=${userId}`);

        if (response.ok) {
          const result = await response.json();
          setAvatars(result.avatars || []);
        }
      } catch (error) {
        console.error('[CreateRoom] Failed to load avatars:', error);
      } finally {
        setLoadingAvatars(false);
      }
    };

    loadAvatars();
  }, []);

  const updateData = (updates: Partial<RoomData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    // Validate current step
    if (step === 1 && !data.name) {
      toast.error('Please enter a room name');
      return;
    }

    setStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleCreate = async () => {
    if (!data.name) {
      toast.error('Room name is required');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`${config.backendUrl}/api/public-chat/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const result = await response.json();
      toast.success('Room created successfully');
      router.push('/dashboard/public-chat');
    } catch (error: any) {
      console.error('[CreateRoom] Failed to create:', error);
      toast.error('Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Public Chat Room</h1>
        <p className="text-muted-foreground">
          Step {step} of 4: {step === 1 ? 'Basic Info' : step === 2 ? 'AI Configuration' : step === 3 ? 'Appearance' : 'Access & Settings'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`flex-1 h-2 rounded ${i <= step ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="border rounded-lg p-6 space-y-6 min-h-[500px]">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Room Name *</Label>
              <Input
                id="name"
                value={data.name}
                onChange={e => updateData({ name: e.target.value })}
                placeholder="Tech Support Chat"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={data.description}
                onChange={e => updateData({ description: e.target.value })}
                placeholder="A helpful AI agent for technical support questions"
                rows={3}
              />
            </div>

            <div>
              <Label>Select Avatar *</Label>
              {loadingAvatars ? (
                <p className="text-sm text-muted-foreground">Loading avatars...</p>
              ) : avatars.length === 0 ? (
                <p className="text-sm text-muted-foreground">No avatars found. Please add avatars first in Avatar Settings.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                  {avatars.map(avatar => {
                    const avatarUrl = avatar.localGlbPath || avatar.glbUrl;
                    const isSelected = data.avatar_url === avatarUrl;
                    const previewUrl = avatar.previewUrl || (avatar.glbUrl?.match(/models\.readyplayer\.me\/([a-f0-9]+)\.glb/) ? `https://models.readyplayer.me/${avatar.glbUrl.match(/models\.readyplayer\.me\/([a-f0-9]+)\.glb/)?.[1]}.png` : null);

                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => {
                          updateData({
                            avatar_url: avatarUrl,
                            bg_color: avatar.bgColor || data.bg_color,
                            bg_scene: avatar.bgScene || data.bg_scene,
                          });
                        }}
                        className={`rounded-xl border-2 overflow-hidden transition-all ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary ring-offset-2'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="h-32 bg-gradient-to-br from-blue-900 via-indigo-900 to-blue-800 flex items-center justify-center overflow-hidden relative">
                          {previewUrl ? (
                            <img src={previewUrl} alt={avatar.name} className="w-full h-full object-cover object-top" />
                          ) : (
                            <div className="text-white text-4xl font-bold">
                              {avatar.name.charAt(0)}
                            </div>
                          )}
                          {avatar.isActive && (
                            <div className="absolute top-1 right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                              Active
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <div className="bg-primary text-primary-foreground rounded-full p-2">
                                <Check className="w-5 h-5" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-2 bg-card">
                          <p className="text-sm font-medium truncate">{avatar.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: AI Configuration */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="model">AI Model</Label>
              <Select
                value={data.model}
                onValueChange={value => updateData({ model: value })}
              >
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-sonnet-4.5">Claude Sonnet 4.5</SelectItem>
                  <SelectItem value="claude-opus-4">Claude Opus 4</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gemini">Gemini Pro</SelectItem>
                  <SelectItem value="ollama">Ollama (Local)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="system_prompt">System Prompt</Label>
              <Textarea
                id="system_prompt"
                value={data.system_prompt}
                onChange={e => updateData({ system_prompt: e.target.value })}
                placeholder="You are a helpful AI assistant for technical support..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This overrides the agent&apos;s default system prompt
              </p>
            </div>

            <div>
              <Label htmlFor="agent_id">Base Agent (Optional)</Label>
              <Input
                id="agent_id"
                value={data.agent_id}
                onChange={e => updateData({ agent_id: e.target.value })}
                placeholder="Leave empty for standalone room"
              />
            </div>

            <div>
              <Label htmlFor="workflow_id">Workflow (Optional)</Label>
              <Input
                id="workflow_id"
                value={data.workflow_id}
                onChange={e => updateData({ workflow_id: e.target.value })}
                placeholder="Trigger workflow on messages"
              />
            </div>
          </div>
        )}

        {/* Step 3: Appearance */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="bg_color">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  id="bg_color"
                  type="color"
                  value={data.bg_color}
                  onChange={e => updateData({ bg_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={data.bg_color}
                  onChange={e => updateData({ bg_color: e.target.value })}
                  placeholder="#09090b"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bg_scene">Background Scene</Label>
              <Select
                value={data.bg_scene}
                onValueChange={value => updateData({ bg_scene: value })}
              >
                <SelectTrigger id="bg_scene">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="living_room">Living Room</SelectItem>
                  <SelectItem value="env_city">City</SelectItem>
                  <SelectItem value="env_sunset">Sunset</SelectItem>
                  <SelectItem value="env_forest">Forest</SelectItem>
                  <SelectItem value="env_space">Space</SelectItem>
                  <SelectItem value="env_cyberpunk">Cyberpunk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="wall_text">Wall Text</Label>
              <Textarea
                id="wall_text"
                value={data.wall_text}
                onChange={e => updateData({ wall_text: e.target.value })}
                placeholder="Welcome to Tech Support!"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="wall_logo_url">Wall Logo URL</Label>
              <Input
                id="wall_logo_url"
                value={data.wall_logo_url}
                onChange={e => updateData({ wall_logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div>
              <Label htmlFor="wall_video_url">Wall Video URL</Label>
              <Input
                id="wall_video_url"
                value={data.wall_video_url}
                onChange={e => updateData({ wall_video_url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>
        )}

        {/* Step 4: Access & Settings */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Access Control</h3>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_public">Public Room</Label>
                <Switch
                  id="is_public"
                  checked={data.is_public}
                  onCheckedChange={checked => updateData({ is_public: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="require_auth">Require Login</Label>
                <Switch
                  id="require_auth"
                  checked={data.require_auth}
                  onCheckedChange={checked => updateData({ require_auth: checked })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Chat Settings</h3>

              <div>
                <Label htmlFor="max_message_length">Max Message Length</Label>
                <Input
                  id="max_message_length"
                  type="number"
                  value={data.max_message_length}
                  onChange={e => updateData({ max_message_length: parseInt(e.target.value) })}
                  min={100}
                  max={2000}
                />
              </div>

              <div>
                <Label htmlFor="rate_limit_seconds">Rate Limit (seconds)</Label>
                <Input
                  id="rate_limit_seconds"
                  type="number"
                  value={data.rate_limit_seconds}
                  onChange={e => updateData({ rate_limit_seconds: parseInt(e.target.value) })}
                  min={0}
                  max={30}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="enable_voice">Enable Voice</Label>
                <Switch
                  id="enable_voice"
                  checked={data.enable_voice}
                  onCheckedChange={checked => updateData({ enable_voice: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="enable_avatar">Enable Avatar Viewer</Label>
                <Switch
                  id="enable_avatar"
                  checked={data.enable_avatar}
                  onCheckedChange={checked => updateData({ enable_avatar: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="enable_developer_mode">Developer Mode (Owner Only)</Label>
                <Switch
                  id="enable_developer_mode"
                  checked={data.enable_developer_mode}
                  onCheckedChange={checked => updateData({ enable_developer_mode: checked })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Embedding</h3>

              <div className="flex items-center justify-between">
                <Label htmlFor="embed_enabled">Allow Embedding</Label>
                <Switch
                  id="embed_enabled"
                  checked={data.embed_enabled}
                  onCheckedChange={checked => updateData({ embed_enabled: checked })}
                />
              </div>

              <div>
                <Label htmlFor="embed_size">Default Embed Size</Label>
                <Select
                  value={data.embed_size}
                  onValueChange={(value: any) => updateData({ embed_size: value })}
                >
                  <SelectTrigger id="embed_size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (300×400)</SelectItem>
                    <SelectItem value="medium">Medium (500×600)</SelectItem>
                    <SelectItem value="large">Large (800×800)</SelectItem>
                    <SelectItem value="full">Full (100%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="embed_theme">Embed Theme</Label>
                <Select
                  value={data.embed_theme}
                  onValueChange={(value: any) => updateData({ embed_theme: value })}
                >
                  <SelectTrigger id="embed_theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 1}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {step < 4 ? (
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating...' : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Create Room
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
