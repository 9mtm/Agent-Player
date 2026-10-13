'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { AvatarAnimator } from '@/lib/avatar-engine/AvatarAnimator';

export type AvatarBody = 'female' | 'male';

export const AVATAR_URLS: Record<AvatarBody, string> = {
  female: '/avatars/agentplayer/female-v003.glb',
  male: '/avatars/agentplayer/male-v003.glb',
};

interface AvatarModelProps {
  url: string;
  clip: string;
  /** Called once per loaded model with the clip names found inside the GLB. */
  onClips?: (names: string[]) => void;
}

function AvatarModel({ url, clip, onClips }: AvatarModelProps) {
  const { scene, animations } = useGLTF(url);
  // Clone so several stages can show the same GLB; SkeletonUtils keeps skinning intact.
  const root = useMemo(() => cloneSkinned(scene), [scene]);
  const animatorRef = useRef<AvatarAnimator | null>(null);

  useEffect(() => {
    const animator = new AvatarAnimator(root, animations);
    animatorRef.current = animator;
    onClips?.(animator.clipNames);
    animator.play(clip);
    return () => {
      animator.dispose();
      animatorRef.current = null;
    };
    // Rebuild only when the model changes; clip switches are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, animations]);

  useEffect(() => {
    animatorRef.current?.play(clip);
  }, [clip]);

  useFrame((_, delta) => animatorRef.current?.update(delta));

  return <primitive object={root} />;
}

export interface AvatarStageProps {
  body: AvatarBody;
  clip: string;
  onClips?: (names: string[]) => void;
  className?: string;
}

/** Minimal Three.js stage for our own avatars: lights, floor, orbit camera. No external assets. */
export function AvatarStage({ body, clip, onClips, className }: AvatarStageProps) {
  return (
    <Canvas className={className} camera={{ position: [0, 1.3, 3.2], fov: 35 }} shadows>
      <color attach="background" args={['#1b1f27']} />
      <hemisphereLight args={['#ffffff', '#3a3f4b', 0.9]} />
      <directionalLight position={[2, 4, 3]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.6, 48]} />
        <meshStandardMaterial color="#2a2f3a" />
      </mesh>
      <gridHelper args={[4, 16, '#3c4250', '#2c313c']} />
      <Suspense fallback={null}>
        <AvatarModel url={AVATAR_URLS[body]} clip={clip} onClips={onClips} />
      </Suspense>
      <OrbitControls target={[0, 0.95, 0]} minDistance={1.2} maxDistance={6} enablePan={false} />
    </Canvas>
  );
}

useGLTF.preload(AVATAR_URLS.female);
useGLTF.preload(AVATAR_URLS.male);
