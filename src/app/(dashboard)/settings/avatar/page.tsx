'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { config } from '@/lib/config';
import type { AvatarScene, WallLayout } from '@/components/avatar/AvatarViewer';
import { SCENE_OPTIONS } from '@/components/avatar/AvatarViewer';
import { Upload, Link, Plus, Trash2, Check, Pencil, Star, User, Download, LayoutGrid, Video } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserAvatar {
  id: string;
  userId: string;
  name: string;
  source: 'system' | 'url' | 'upload' | 'rpm';
  glbUrl: string | null;
  localGlbPath: string | null;
  previewUrl: string | null;
  bgColor: string;
  bgScene: string;
  isActive: boolean;
  createdAt: string;
}

interface SystemAvatar {
  id: string;
  name: string;
  description: string;
  glbUrl: string;
  previewUrl: string | null;
  bgColor: string;
  bgScene: string;
  tags: string[];
}

interface VoiceOption {
  id: string;
  name: string;
  provider: string;
  gender: string;
  description: string;
}

interface AvatarSettings {
  userId: string;
  rpmAvatarUrl: string | null;
  voiceProvider: string;
  voiceId: string;
  languagePreference: string;
  bgColor: string;
  bgScene: AvatarScene;
  wallText: string;
  wallLogoUrl: string;
  wallVideoUrl: string;
  wallLayout: string;
}

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';
type AddMode = 'none' | 'url' | 'upload' | 'browse';

function parseAvatarSlug(id: string): { gender: 'female' | 'male' | 'unknown'; num: string; ver: string } {
  const m = id.match(/^(Female|Male)_(\d+)_V(\d+)$/i);
  if (!m) return { gender: 'unknown', num: '', ver: '' };
  return {
    gender: m[1].toLowerCase() === 'female' ? 'female' : 'male',
    num: m[2],
    ver: m[3],
  };
}

function getPreviewUrl(avatar: UserAvatar): string | null {
  if (avatar.previewUrl) return avatar.previewUrl;
  // Derive RPM preview from glbUrl (https://models.readyplayer.me/{id}.glb → .png)
  const url = avatar.glbUrl || '';
  const match = url.match(/models\.readyplayer\.me\/([a-f0-9]+)\.glb/);
  if (match) return `https://models.readyplayer.me/${match[1]}.png`;
  return null;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AvatarSettingsPage() {
  const [userId, setUserId] = useState<string>('');

  // Avatar collection state
  const [avatars, setAvatars] = useState<UserAvatar[]>([]);
  const [systemAvatars, setSystemAvatars] = useState<SystemAvatar[]>([]);
  const [avatarsLoading, setAvatarsLoading] = useState(true);
  const [addMode, setAddMode] = useState<AddMode>('none');
  const [urlInput, setUrlInput] = useState('');
  const [urlName, setUrlName] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared settings state
  const [settings, setSettings] = useState<AvatarSettings | null>(null);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploadStatus, setLogoUploadStatus] = useState<UploadStatus>('idle');

  // Extract userId from JWT token
  useEffect(() => {
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        setUserId(payload.userId);
      } catch (error) {
        console.error('Failed to decode auth token:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    loadAvatars();
    loadSystemAvatars();
    loadSettings();
    loadVoices();
  }, [userId]);

  // ── Avatar Collection ──────────────────────────────────────────────────────

  const loadAvatars = async () => {
    try {
      console.log('═══════════════════════════════════════════════════════');
      console.log('[Avatar Settings] 🔍 Loading avatars...');
      console.log('[Avatar Settings] 🔍 userId:', userId);
      console.log('[Avatar Settings] 🔍 API URL:', `${config.backendUrl}/api/avatars?userId=${userId}`);

      const res = await fetch(`${config.backendUrl}/api/avatars?userId=${userId}`);
      console.log('[Avatar Settings] 🔍 Response status:', res.status);

      const data = await res.json();
      console.log('[Avatar Settings] ✅ API Response:', JSON.stringify(data, null, 2));

      if (data.success) {
        console.log('[Avatar Settings] ✅ Total avatars found:', data.avatars.length);

        data.avatars.forEach((avatar: any, index: number) => {
          console.log(`[Avatar Settings] 📦 Avatar ${index + 1}:`, {
            id: avatar.id,
            name: avatar.name,
            source: avatar.source,
            isActive: avatar.isActive,
            glbUrl: avatar.glbUrl,
            localGlbPath: avatar.localGlbPath,
            previewUrl: avatar.previewUrl,
          });
        });

        const activeAvatar = data.avatars.find((a: any) => a.isActive);
        if (activeAvatar) {
          console.log('[Avatar Settings] ⭐ ACTIVE AVATAR:', {
            name: activeAvatar.name,
            glbUrl: activeAvatar.glbUrl,
            localGlbPath: activeAvatar.localGlbPath,
            effectiveUrl: activeAvatar.localGlbPath || activeAvatar.glbUrl,
          });
        } else {
          console.warn('[Avatar Settings] ❌ No active avatar found!');
        }

        setAvatars(data.avatars);
      } else {
        console.error('[Avatar Settings] ❌ API returned success=false');
      }

      console.log('═══════════════════════════════════════════════════════');
    } catch (e) {
      console.error('[Avatar Settings] ❌ Exception:', e);
    } finally {
      setAvatarsLoading(false);
    }
  };

  const loadSystemAvatars = async () => {
    try {
      const res = await fetch(`${config.backendUrl}/api/avatars/system`);
      const data = await res.json();
      if (data.success) setSystemAvatars(data.avatars);
    } catch (e) {
      console.error('Failed to load system avatars:', e);
    }
  };

  const [localizingIds, setLocalizingIds] = useState<Set<string>>(new Set());

  const localizeAvatar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalizingIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`${config.backendUrl}/api/avatars/${id}/localize`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.avatar) {
        setAvatars(prev => prev.map(a => a.id === id ? data.avatar : a));
      }
    } catch (e) {
      console.error('Failed to localize avatar:', e);
    } finally {
      setLocalizingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const activateAvatar = async (id: string) => {
    try {
      await fetch(`${config.backendUrl}/api/avatars/${id}/activate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      setAvatars(prev => prev.map(a => ({ ...a, isActive: a.id === id })));
    } catch (e) {
      console.error('Failed to activate avatar:', e);
    }
  };

  const deleteAvatar = async (id: string) => {
    if (!confirm('Remove this avatar?')) return;
    try {
      await fetch(`${config.backendUrl}/api/avatars/${id}?userId=${userId}`, { method: 'DELETE' });
      setAvatars(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error('Failed to delete avatar:', e);
    }
  };

  const saveAvatarName = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await fetch(`${config.backendUrl}/api/avatars/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });
      setAvatars(prev => prev.map(a => a.id === id ? { ...a, name: editName } : a));
    } catch (e) {
      console.error('Failed to rename avatar:', e);
    } finally {
      setEditingId(null);
    }
  };

  const [urlError, setUrlError] = useState<string | null>(null);

  const addByUrl = async () => {
    if (!urlInput.trim()) return;
    setAddingUrl(true);
    setUrlError(null);
    try {
      const res = await fetch(`${config.backendUrl}/api/avatars/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: urlName.trim() || 'New Avatar',
          glbUrl: urlInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAvatars(prev => [...prev, data.avatar]);
        setUrlInput('');
        setUrlName('');
        setAddMode('none');
      } else {
        setUrlError(data.error || 'Download failed');
      }
    } catch (e) {
      setUrlError('Connection error — check backend is running');
    } finally {
      setAddingUrl(false);
    }
  };

  const addFromSystem = async (sys: SystemAvatar) => {
    try {
      const res = await fetch(`${config.backendUrl}/api/avatars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: sys.name,
          source: 'system',
          glbUrl: sys.glbUrl,
          previewUrl: sys.previewUrl,
          bgColor: sys.bgColor,
          bgScene: sys.bgScene,
        }),
      });
      const data = await res.json();
      if (data.success) setAvatars(prev => [...prev, data.avatar]);
    } catch (e) {
      console.error('Failed to add system avatar:', e);
    }
  };

  const uploadGlb = async (file: File) => {
    setUploadStatus('uploading');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(
        `${config.backendUrl}/api/avatars/upload?userId=${userId}&name=${encodeURIComponent(file.name.replace(/\.glb$/i, ''))}`,
        { method: 'POST', body: form }
      );
      const data = await res.json();
      if (data.success) {
        setAvatars(prev => [...prev, data.avatar]);
        setUploadStatus('done');
        setAddMode('none');
      } else {
        setUploadStatus('error');
      }
    } catch (e) {
      setUploadStatus('error');
    }
  };

  // ── Shared Settings ────────────────────────────────────────────────────────

  const loadSettings = async () => {
    try {
      const res = await fetch(`${config.backendUrl}/api/avatar/settings?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setSettings({ bgColor: '#09090b', bgScene: 'none', wallText: '', wallLogoUrl: '', wallVideoUrl: '', wallLayout: '{}', ...data.settings });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadVoices = async () => {
    try {
      const res = await fetch(`${config.backendUrl}/api/avatar/voices`);
      const data = await res.json();
      if (data.success) setVoices(data.voices);
    } catch (e) {
      console.error('Failed to load voices:', e);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch(`${config.backendUrl}/api/avatar/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!data.success) toast.error('Failed to save settings');
    } catch (e) {
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof AvatarSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const updateLayoutField = (panel: keyof WallLayout, key: string, value: number | boolean) => {
    if (!settings) return;
    let current: WallLayout = {};
    try { current = JSON.parse(settings.wallLayout || '{}'); } catch {}
    const updated: WallLayout = { ...current, [panel]: { ...(current[panel] || {}), [key]: value } };
    updateSetting('wallLayout', JSON.stringify(updated));
  };

  const uploadLogo = async (file: File) => {
    setLogoUploadStatus('uploading');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${config.backendUrl}/api/avatar/upload-logo`, { method: 'POST', body: form });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');
      updateSetting('wallLogoUrl', `${config.backendUrl}${data.url}`);
      setLogoUploadStatus('done');
    } catch {
      setLogoUploadStatus('error');
    }
  };

  // ── Active avatar URL for viewer link ─────────────────────────────────────
  const activeAvatar = avatars.find(a => a.isActive);
  const viewerUrl = activeAvatar ? `/avatar-viewer?id=${activeAvatar.id}` : '/avatar-viewer';

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading || avatarsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Avatar &amp; Voice Settings</h1>

      {/* ── My Avatars ─────────────────────────────────────────────────────── */}
      <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">My Avatars</h2>
          {activeAvatar && (
            <a
              href={viewerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <User size={14} />
              Open Viewer
            </a>
          )}
        </div>

        {/* Avatar grid */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-4">
          {avatars.map(avatar => (
            <div
              key={avatar.id}
              className={`relative flex-shrink-0 w-32 rounded-xl border-2 overflow-hidden cursor-pointer transition-all group ${
                avatar.isActive
                  ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
              }`}
              onClick={() => activateAvatar(avatar.id)}
            >
              {/* Preview image */}
              <div className="w-full h-40 bg-gray-900 flex items-center justify-center overflow-hidden relative">
                {getPreviewUrl(avatar) ? (
                  <img
                    src={getPreviewUrl(avatar)!}
                    alt={avatar.name}
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      const t = e.target as HTMLImageElement;
                      t.style.display = 'none';
                      (t.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'flex');
                    }}
                  />
                ) : null}
                <div
                  className="flex-col items-center gap-1 text-gray-600 absolute inset-0 justify-center"
                  style={{ display: getPreviewUrl(avatar) ? 'none' : 'flex' }}
                >
                  <User size={32} />
                  <span className="text-xs">{avatar.source}</span>
                </div>
              </div>

              {/* Active badge */}
              {!!avatar.isActive && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow">
                  <Check size={12} className="text-white" />
                </div>
              )}

              {/* Remote-only badge + localize button */}
              {!avatar.localGlbPath && avatar.glbUrl && (
                <button
                  onClick={(e) => localizeAvatar(avatar.id, e)}
                  disabled={localizingIds.has(avatar.id)}
                  title="Download to local storage"
                  className="absolute bottom-10 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/90 hover:bg-orange-600 disabled:bg-gray-500/70 text-white text-[10px] font-medium transition-colors z-10"
                >
                  {localizingIds.has(avatar.id) ? (
                    <span className="inline-block w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download size={10} />
                  )}
                  {localizingIds.has(avatar.id) ? 'saving…' : 'save local'}
                </button>
              )}

              {/* Name */}
              <div className="px-2 py-2 bg-white dark:bg-gray-800">
                {editingId === avatar.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={() => saveAvatarName(avatar.id)}
                    onKeyDown={e => e.key === 'Enter' && saveAvatarName(avatar.id)}
                    onClick={e => e.stopPropagation()}
                    className="w-full text-xs border rounded px-1 py-0.5 dark:bg-gray-700 dark:border-gray-500"
                  />
                ) : (
                  <p className="text-xs font-medium truncate text-center">{avatar.name}</p>
                )}
              </div>

              {/* Hover actions */}
              <div className="absolute top-2 left-2 hidden group-hover:flex gap-1">
                <button
                  onClick={e => { e.stopPropagation(); setEditingId(avatar.id); setEditName(avatar.name); }}
                  className="w-6 h-6 rounded bg-black/60 flex items-center justify-center hover:bg-black/80"
                  title="Rename"
                >
                  <Pencil size={11} className="text-white" />
                </button>
                {avatars.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); deleteAvatar(avatar.id); }}
                    className="w-6 h-6 rounded bg-red-600/80 flex items-center justify-center hover:bg-red-700"
                    title="Delete"
                  >
                    <Trash2 size={11} className="text-white" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add new card */}
          <button
            onClick={() => setAddMode(addMode === 'none' ? 'url' : 'none')}
            className="flex-shrink-0 w-32 h-[172px] rounded-xl border-2 border-dashed border-gray-400 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-blue-500 transition-colors"
          >
            <Plus size={28} />
            <span className="text-xs font-medium">Add Avatar</span>
          </button>
        </div>

        {/* Add avatar panel */}
        {addMode !== 'none' && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
            {/* Mode switcher */}
            <div className="flex gap-2">
              <button
                onClick={() => setAddMode('url')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  addMode === 'url' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Link size={14} /> URL
              </button>
              <button
                onClick={() => { setAddMode('upload'); setUploadStatus('idle'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  addMode === 'upload' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Upload size={14} /> Upload GLB
              </button>
              <button
                onClick={() => setAddMode('browse')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  addMode === 'browse' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutGrid size={14} /> Browse
              </button>
              <a
                href="/avatar-creator"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Star size={14} /> RPM Creator
              </a>
            </div>

            {/* URL mode */}
            {addMode === 'url' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={urlName}
                  onChange={e => setUrlName(e.target.value)}
                  placeholder="Name (optional)"
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  disabled={addingUrl}
                />
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => { setUrlInput(e.target.value); setUrlError(null); }}
                    placeholder="https://models.readyplayer.me/... or any .glb URL"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                    disabled={addingUrl}
                    onKeyDown={e => e.key === 'Enter' && addByUrl()}
                  />
                  <button
                    onClick={addByUrl}
                    disabled={!urlInput.trim() || addingUrl}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium whitespace-nowrap"
                  >
                    {addingUrl ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Downloading…
                      </>
                    ) : (
                      'Download & Save'
                    )}
                  </button>
                </div>
                {addingUrl && (
                  <p className="text-xs text-blue-400">Downloading GLB file to local storage…</p>
                )}
                {urlError && (
                  <p className="text-xs text-red-500">{urlError}</p>
                )}
              </div>
            )}

            {/* Upload mode */}
            {addMode === 'upload' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".glb,.gltf"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadGlb(f); }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadStatus === 'uploading'}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Upload size={16} />
                  {uploadStatus === 'uploading' ? 'Uploading...' : 'Choose .glb file'}
                </button>
                {uploadStatus === 'done' && <p className="text-sm text-green-600 mt-2">Uploaded successfully</p>}
                {uploadStatus === 'error' && <p className="text-sm text-red-500 mt-2">Upload failed — only .glb files allowed</p>}
                <p className="text-xs text-gray-500 mt-2">Accepts .glb and .gltf files</p>
              </div>
            )}

            {/* Browse mode */}
            {addMode === 'browse' && (
              <div>
                {systemAvatars.length === 0 ? (
                  <p className="text-sm text-gray-500">No system avatars available.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {systemAvatars.map(sys => {
                      const alreadyAdded = avatars.some(a => a.glbUrl === sys.glbUrl);
                      const parsed = parseAvatarSlug(sys.id);
                      const isFemale = parsed.gender === 'female';
                      const gradientClass = isFemale
                        ? 'from-purple-900 via-pink-900 to-purple-800'
                        : 'from-blue-900 via-indigo-900 to-blue-800';
                      const iconColor = isFemale ? '#c084fc' : '#60a5fa';
                      const label = parsed.gender !== 'unknown'
                        ? `${parsed.gender === 'female' ? 'Female' : 'Male'} ${parsed.num}`
                        : sys.name;
                      const verLabel = parsed.ver ? `V${parsed.ver}` : '';
                      return (
                        <div key={sys.id} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className={`h-32 bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center overflow-hidden gap-1`}>
                            {sys.previewUrl ? (
                              <img src={sys.previewUrl} alt={sys.name} className="w-full h-full object-cover object-top" />
                            ) : (
                              <>
                                <User size={36} color={iconColor} />
                                {verLabel && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-white/60">{verLabel}</span>}
                              </>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-sm font-medium truncate">{label}</p>
                            {sys.description && <p className="text-xs text-gray-500 truncate">{sys.description}</p>}
                            <button
                              onClick={() => { addFromSystem(sys); if (!alreadyAdded) setAddMode('none'); }}
                              disabled={alreadyAdded}
                              className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded-lg font-medium transition-colors"
                            >
                              {alreadyAdded ? <><Check size={12} /> Added</> : <><Plus size={12} /> Use This</>}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </section>

      {/* ── Background Color ──────────────────────────────────────────────────── */}
      {settings && (
        <>
          <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Background Color</h2>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.bgColor}
                  onChange={(e) => updateSetting('bgColor', e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-600 bg-transparent"
                />
                <span className="font-mono text-sm text-gray-400">{settings.bgColor}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'Black',    value: '#09090b' },
                  { label: 'Navy',     value: '#0f172a' },
                  { label: 'Dark Blue',value: '#1a1a2e' },
                  { label: 'GitHub',   value: '#0d1117' },
                  { label: 'White',    value: '#ffffff' },
                  { label: 'Light',    value: '#f8fafc' },
                  { label: 'Green',    value: '#10b981' },
                  { label: 'Indigo',   value: '#6366f1' },
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => updateSetting('bgColor', value)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      settings.bgColor === value ? 'border-blue-400 scale-110' : 'border-gray-600'
                    }`}
                    style={{ background: value }}
                    title={label}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* ── Background Scene ────────────────────────────────────────────────── */}
          <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">3D Background Scene</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {SCENE_OPTIONS.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  onClick={() => updateSetting('bgScene', value as AvatarScene)}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                    settings.bgScene === value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-xs text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>

            {/* ── YouTube Video Background ── */}
            <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Video className="w-4 h-4" />
                YouTube Video Background
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Plays muted and looping behind the avatar. Overrides the scene selection above.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://youtu.be/... or youtube.com/watch?v=..."
                  defaultValue={settings.bgScene.startsWith('yt_') ? `https://youtu.be/${settings.bgScene.slice(3)}` : ''}
                  key={settings.bgScene.startsWith('yt_') ? settings.bgScene : 'yt-input'}
                  onBlur={(e) => {
                    const url = e.target.value.trim();
                    if (!url) {
                      if (settings.bgScene.startsWith('yt_')) updateSetting('bgScene', 'none' as AvatarScene);
                      return;
                    }
                    const vid = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/)?.[1];
                    if (vid) updateSetting('bgScene', `yt_${vid}` as AvatarScene);
                  }}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                />
                {settings.bgScene.startsWith('yt_') && (
                  <button
                    onClick={() => updateSetting('bgScene', 'none' as AvatarScene)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
              {settings.bgScene.startsWith('yt_') && (
                <p className="text-xs text-green-500 mt-1">
                  ✓ Active — Video ID: {settings.bgScene.slice(3)}
                </p>
              )}
            </div>
          </section>

          {/* ── Wall Panels ──────────────────────────────────────────────────────── */}
          {settings.bgScene !== 'none' && !settings.bgScene.startsWith('env_') && !settings.bgScene.startsWith('yt_') && !settings.bgScene.startsWith('custombg_') && (() => {
            let wl: WallLayout = {};
            try { wl = JSON.parse(settings.wallLayout || '{}'); } catch {}

            const LayoutRow = ({ panel, defs }: {
              panel: keyof WallLayout;
              defs: { x: number; y: number; w: number; h: number };
            }) => {
              const cur = (wl[panel] || {}) as Record<string, number>;
              return (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {(['x','y','w','h'] as const).map((k) => (
                    <div key={k}>
                      <label className="block text-[11px] text-gray-500 mb-0.5 uppercase">{k}</label>
                      <input
                        type="number"
                        step={k === 'w' || k === 'h' ? 0.05 : 0.1}
                        min={k === 'x' ? -5 : 0.1}
                        max={k === 'x' ? 5 : k === 'y' ? 5 : 8}
                        value={cur[k] ?? defs[k]}
                        onChange={(e) => updateLayoutField(panel, k, parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 [appearance:textfield]"
                      />
                    </div>
                  ))}
                </div>
              );
            };

            return (
              <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <h2 className="text-xl font-semibold mb-2">Wall Panels</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Display text, logo, and YouTube video. Adjust position (X/Y) and size (W/H) per panel.
                </p>
                <div className="space-y-6">
                  {/* Text panel */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <label className="block text-sm font-semibold mb-2">Text Panel</label>
                    <textarea
                      value={settings.wallText}
                      onChange={(e) => updateSetting('wallText', e.target.value)}
                      placeholder={'Company Name\nTagline or subtitle'}
                      rows={3}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1 mb-2">Each line = one line on the panel.</p>
                    <p className="text-xs font-medium text-gray-400 mb-1">Position &amp; Size</p>
                    <LayoutRow panel="text" defs={{ x: -0.4, y: 2.0, w: 1.4, h: 0.75 }} />
                  </div>

                  {/* Logo panel */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <label className="block text-sm font-semibold mb-2">Logo Panel</label>
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      {settings.wallLogoUrl && (
                        <div className="w-16 h-16 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                          <img src={settings.wallLogoUrl} alt="Logo" className="max-w-full max-h-full object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                          logoUploadStatus === 'uploading' ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}>
                          {logoUploadStatus === 'uploading' ? 'Uploading...' : 'Upload Logo'}
                          <input type="file" accept="image/*" className="hidden" disabled={logoUploadStatus === 'uploading'}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
                        </label>
                        {logoUploadStatus === 'done' && <span className="text-xs text-green-600 dark:text-green-400">Uploaded</span>}
                        {logoUploadStatus === 'error' && <span className="text-xs text-red-500">Failed</span>}
                        {settings.wallLogoUrl && (
                          <button onClick={() => { updateSetting('wallLogoUrl', ''); setLogoUploadStatus('idle'); }}
                            className="text-xs text-red-500 hover:text-red-700">Remove logo</button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-medium text-gray-400 mb-1">Position &amp; Size</p>
                    <LayoutRow panel="logo" defs={{ x: -2.0, y: 2.0, w: 0.9, h: 0.9 }} />
                  </div>

                  {/* Video panel */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <label className="block text-sm font-semibold mb-2">YouTube Video Panel</label>
                    <div className="flex items-center gap-2 mb-2">
                      <input type="text" value={settings.wallVideoUrl}
                        onChange={(e) => updateSetting('wallVideoUrl', e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                      {settings.wallVideoUrl && (
                        <button onClick={() => updateSetting('wallVideoUrl', '')}
                          className="text-sm text-red-500 hover:text-red-700 px-2">Remove</button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-gray-500">Sound:</span>
                      <button
                        onClick={() => updateLayoutField('video', 'muted', !((wl.video?.muted) ?? true))}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          (wl.video?.muted ?? true)
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                            : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-400'
                        }`}
                      >
                        {(wl.video?.muted ?? true) ? 'Muted' : 'Sound On'}
                      </button>
                    </div>
                    <p className="text-xs font-medium text-gray-400 mb-1">Position &amp; Size</p>
                    <LayoutRow panel="video" defs={{ x: 1.2, y: 1.85, w: 1.8, h: 1.02 }} />
                  </div>
                </div>
              </section>
            );
          })()}

          {/* ── Voice Settings ────────────────────────────────────────────────── */}
          <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Voice Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Voice Provider</label>
                <select
                  value={settings.voiceProvider}
                  onChange={(e) => updateSetting('voiceProvider', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="local">Local (Coqui TTS - Free)</option>
                  <option value="openai">OpenAI (Requires API Key)</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {settings.voiceProvider === 'local' ? 'Using free local TTS' : 'Requires OPENAI_API_KEY in .env'}
                </p>
              </div>
              {settings.voiceProvider === 'openai' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Voice</label>
                  <select
                    value={settings.voiceId}
                    onChange={(e) => updateSetting('voiceId', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  >
                    {voices.map((v) => (
                      <option key={v.id} value={v.id}>{v.name} ({v.gender}) - {v.description}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Language Preference</label>
                <select
                  value={settings.languagePreference}
                  onChange={(e) => updateSetting('languagePreference', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="auto">Auto-Detect</option>
                  <option value="ar">Arabic</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </section>

          {/* ── Save Button ──────────────────────────────────────────────────── */}
          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-semibold"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
