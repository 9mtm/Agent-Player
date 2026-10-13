'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import type { AvatarBody } from '@/components/avatar-engine/AvatarStage';
import { BASE_CLIP, LOOP_CLIPS } from '@/lib/avatar-engine/AvatarAnimator';

const AvatarStage = dynamic(
  () => import('@/components/avatar-engine/AvatarStage').then((m) => ({ default: m.AvatarStage })),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-zinc-400">Loading stage…</div> }
);

const BODIES: Array<{ id: AvatarBody; label: string }> = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
];

/**
 * Avatar Lab: test page for our own avatar pipeline
 * (Blender build script -> GLB with clips -> Three.js AvatarAnimator).
 */
export default function AvatarLabPage() {
  const [body, setBody] = useState<AvatarBody>('female');
  const [clip, setClip] = useState<string>(BASE_CLIP);
  const [clips, setClips] = useState<string[]>([]);
  const onClips = useCallback((names: string[]) => setClips(names), []);

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100">
      <aside className="flex w-64 shrink-0 flex-col gap-6 border-r border-zinc-800 p-5">
        <div>
          <h1 className="text-lg font-semibold">Avatar Lab</h1>
          <p className="mt-1 text-xs text-zinc-400">Own skeleton + authored clips, played by Three.js.</p>
        </div>

        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Body</h2>
          <div className="grid grid-cols-2 gap-2">
            {BODIES.map((b) => (
              <button
                key={b.id}
                type="button"
                data-testid={`body-${b.id}`}
                onClick={() => setBody(b.id)}
                className={`rounded-md border px-3 py-2 text-sm transition ${
                  body === b.id ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200' : 'border-zinc-700 hover:border-zinc-500'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Clips</h2>
          {clips.length === 0 ? (
            <p className="text-xs text-zinc-500">Loading model…</p>
          ) : (
            <div className="flex flex-col gap-2">
              {clips.map((name) => (
                <button
                  key={name}
                  type="button"
                  data-testid={`clip-${name}`}
                  onClick={() => setClip(name)}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                    clip === name ? 'border-sky-500 bg-sky-500/15 text-sky-200' : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <span>{name}</span>
                  <span className="text-[10px] uppercase text-zinc-500">{LOOP_CLIPS.has(name) ? 'loop' : 'once'}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <p className="mt-auto text-[11px] leading-relaxed text-zinc-500">
          Current: <span className="text-zinc-300">{body}</span> / <span className="text-zinc-300">{clip}</span>.
          One-shot clips return to {BASE_CLIP} when finished.
        </p>
      </aside>

      <main className="relative flex-1">
        <AvatarStage body={body} clip={clip} onClips={onClips} className="h-full w-full" />
      </main>
    </div>
  );
}
