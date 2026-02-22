'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarCreator } from '@readyplayerme/react-avatar-creator';
import { config } from '@/lib/config';
import { useAuth } from '@/contexts/auth-context';

export default function AvatarCreatorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleAvatarExported = useCallback(async (event: { data: { url?: string } }) => {
    const rawUrl = event.data?.url;
    if (!rawUrl) return;

    if (!user?.id) {
      setError('You must be logged in to save avatars');
      return;
    }

    // Ensure we request ARKit morph targets for lip-sync
    const finalUrl = rawUrl.includes('morphTargets=ARKit')
      ? rawUrl
      : `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}morphTargets=ARKit`;

    setAvatarUrl(finalUrl);
    setError(null);

    // Persist to backend — download locally so viewer never needs external URLs
    setSaving(true);
    try {
      // Save to avatar_settings (backward compat)
      await fetch(`${config.backendUrl}/api/avatar/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, rpmAvatarUrl: finalUrl }),
      });
      // Download GLB + preview locally, add to user_avatars collection
      await fetch(`${config.backendUrl}/api/avatars/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, name: 'My Avatar', glbUrl: finalUrl }),
      });
      setSaved(true);

      // Auto-redirect to settings after successful save
      setTimeout(() => {
        router.push('/settings/avatar');
      }, 1500);
    } catch {
      setError('Could not save to server.');
    } finally {
      setSaving(false);
    }
  }, [user, router]);

  /* ── Success screen ── */
  if (avatarUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white gap-5 p-8 overflow-y-auto">
        {saving ? (
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}

        <h1 className="text-2xl font-bold">{saving ? 'Saving…' : 'Avatar saved'}</h1>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="bg-gray-800 rounded-lg px-4 py-3 max-w-lg w-full break-all text-xs text-gray-400 font-mono select-all">
          {avatarUrl}
        </div>

        <button
          onClick={() => router.push('/settings/avatar')}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
        >
          Back to Settings
        </button>
      </div>
    );
  }

  /* ── Creator screen ── */
  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white">Create Your 3D Avatar</h1>
          <p className="text-xs text-gray-400">
            Upload a photo or customise — powered by Ready Player Me
          </p>
        </div>
        <a
          href="/settings/avatar"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Settings
        </a>
      </div>

      {/* Creator iframe */}
      <div className="flex-1 min-h-0">
        <AvatarCreator
          subdomain="demo"
          className="w-full h-full border-0"
          config={{
            bodyType: 'fullbody',
            quickStart: false,
            language: 'en',
          }}
          onAvatarExported={handleAvatarExported}
        />
      </div>

      {/* Footer hint */}
      <div className="px-6 py-2 border-t border-gray-800 text-center text-xs text-gray-500 shrink-0">
        Click <strong className="text-gray-300">Next</strong> inside the creator, then{' '}
        <strong className="text-gray-300">Done</strong> to save your avatar
      </div>
    </div>
  );
}
