'use client';

import {
  Suspense, useRef, useEffect, useState, useMemo,
  Component, ErrorInfo, ReactNode, forwardRef, useImperativeHandle
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, PerspectiveCamera, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  OfficeScene,
  LivingRoomScene,
  ConferenceRoomScene,
  StageScene,
  StudioScene,
} from './scenes';

// ─── Bot Avatar Component (Static NPC) ────────────────────────────────────────
interface BotAvatarProps {
  avatarUrl: string;
  position: [number, number, number];
  rotationY: number;
}

function BotAvatar({ avatarUrl, position, rotationY }: BotAvatarProps) {
  const { scene } = useGLTF(avatarUrl);
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  // Default idle animation URL (use male idle as default for bots)
  const CDN_BOT_IDLE = 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit&textureAtlas=none';
  const { animations } = useGLTF(CDN_BOT_IDLE);

  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  // Play idle animation
  useEffect(() => {
    if (!animations.length) return;

    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current.uncacheRoot(cloned);
    }

    const mixer = new THREE.AnimationMixer(cloned);
    mixerRef.current = mixer;

    const action = mixer.clipAction(animations[0]);
    action.reset().setEffectiveWeight(1).setLoop(THREE.LoopRepeat, Infinity).play();

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(cloned);
      mixerRef.current = null;
    };
  }, [cloned, animations]);

  // Update animation
  useFrame((_, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, (rotationY * Math.PI) / 180, 0]} // Convert degrees to radians
    >
      <primitive object={cloned} />
    </group>
  );
}

// ─── Avatar scene type ────────────────────────────────────────────────────────
// 'yt_VIDEOID'      → YouTube video as full-screen background (muted, looping)
// 'custombg_URL'    → Local image/GIF/video as full-screen background
export type AvatarScene =
  | 'none'
  | 'office'
  | 'living_room'
  | 'conference'
  | 'stage'
  | 'studio'
  | (string & {});    // ← allows 'yt_*' and 'custombg_*' dynamically

export const SCENE_OPTIONS: { value: AvatarScene; label: string; emoji: string }[] = [
  { value: 'none',          label: 'Color',           emoji: '🎨' },
  { value: 'office',        label: 'Office',          emoji: '🏢' },
  { value: 'living_room',   label: 'Living Room',     emoji: '🛋️' },
  { value: 'conference',    label: 'Conference Room', emoji: '🤝' },
  { value: 'stage',         label: 'Stage',           emoji: '🎭' },
  { value: 'studio',        label: 'Studio',          emoji: '📸' },
];

// ─── Wall layout — per-panel position / size / sound config ──────────────────
export interface WallPanelLayout {
  x?: number;     // world X position (default: auto-calculated)
  y?: number;     // offset above avatarY (default: 2.0)
  w?: number;     // width in THREE units
  h?: number;     // height in THREE units
}

export interface WallLayout {
  text?:  WallPanelLayout;
  logo?:  WallPanelLayout;
  video?: WallPanelLayout & { muted?: boolean };
}

// ─── Extract YouTube video ID from any YouTube URL ───────────────────────────
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  // youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  // youtube.com/watch?v=ID or /embed/ID or /shorts/ID
  const longMatch = url.match(/(?:v=|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (longMatch) return longMatch[1];
  // bare ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

// ─── Logo panel (CanvasTexture — logo image centered) ─────────────────────────
interface WallLogoPanelProps {
  logoUrl: string;
  position: [number, number, number];
  width?: number;
  height?: number;
  boardColor?: string;
}

function WallLogoPanel({ logoUrl, position, width = 1.0, height = 1.0, boardColor = '#1a1a2e' }: WallLogoPanelProps) {
  const texture = useMemo(() => {
    const W = 256, H = 256;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const draw = (img?: HTMLImageElement) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = boardColor;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 5;
      ctx.strokeRect(8, 8, W - 16, H - 16);

      if (img) {
        const pad = 24;
        const maxW = W - pad * 2;
        const maxH = H - pad * 2;
        const scale = Math.min(maxW / img.width, maxH / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      }
      tex.needsUpdate = true;
    };

    const tex = new THREE.CanvasTexture(canvas);
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => draw(img);
    img.onerror = () => draw();
    img.src = logoUrl;
    draw(); // initial placeholder
    return tex;
  }, [logoUrl, boardColor, width, height]);

  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} roughness={0.4} metalness={0.1} />
    </mesh>
  );
}

// ─── Text panel (CanvasTexture — text lines centered) ─────────────────────────
interface WallTextPanelProps {
  text: string;
  position: [number, number, number];
  width?: number;
  height?: number;
  boardColor?: string;
  textColor?: string;
}

function WallTextPanel({ text, position, width = 1.4, height = 0.8, boardColor = '#1a1a2e', textColor = '#ffffff' }: WallTextPanelProps) {
  const texture = useMemo(() => {
    const W = 512, H = Math.round(512 * (height / width));
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = boardColor;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, W - 20, H - 20);

    if (text) {
      const lines = text.split('\n').slice(0, 5);
      const fontSize = Math.max(18, Math.floor(H / (lines.length + 2)));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 8;
      const startY = H / 2 - (lines.length - 1) * fontSize * 0.65;
      lines.forEach((line, i) => {
        const grad = ctx.createLinearGradient(W * 0.1, 0, W * 0.9, 0);
        grad.addColorStop(0, textColor);
        grad.addColorStop(1, textColor + 'cc');
        ctx.fillStyle = grad;
        ctx.fillText(line, W / 2, startY + i * fontSize * 1.3);
      });
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('[ Text ]', W / 2, H / 2);
    }

    return new THREE.CanvasTexture(canvas);
  }, [text, boardColor, textColor, width, height]);

  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} roughness={0.4} metalness={0.1} />
    </mesh>
  );
}

// ─── Video panel (drei Html — YouTube iframe embedded on wall) ────────────────
interface WallVideoPanelProps {
  videoId: string;
  position: [number, number, number];
  width?: number;   // THREE units
  height?: number;
  muted?: boolean;
  noCookie?: boolean;
}

function WallVideoPanel({ videoId, position, width = 1.8, height = 1.0, muted = true, noCookie = false }: WallVideoPanelProps) {
  const pxW = 320;
  const pxH = Math.round(pxW * (height / width));
  const muteParam = muted ? '&mute=1' : '';
  const domain = noCookie ? 'www.youtube-nocookie.com' : 'www.youtube.com';
  const src = `https://${domain}/embed/${videoId}?autoplay=1${muteParam}&loop=1&controls=1&playlist=${videoId}`;

  return (
    <group position={position}>
      {/* Dark frame behind the video */}
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[width + 0.08, height + 0.08]} />
        <meshStandardMaterial color="#111" roughness={0.3} metalness={0.4} />
      </mesh>
      <Html
        transform
        distanceFactor={2.5}
        style={{ width: pxW, height: pxH, pointerEvents: 'none' }}
      >
        <iframe
          width={pxW}
          height={pxH}
          src={src}
          allow="autoplay; encrypted-media; picture-in-picture"
          style={{ border: 'none', borderRadius: '3px', display: 'block', pointerEvents: 'auto' }}
          title="Wall video"
        />
      </Html>
    </group>
  );
}

// ─── Wall content renderer — logo, text, video as separate panels ─────────────
interface WallContentProps {
  wallText?: string;
  wallLogoUrl?: string;
  wallVideoUrl?: string;
  wallLayout?: WallLayout;
  noCookie?: boolean;
  y: number;
  wallZ: number;
  boardColor: string;
  textColor: string;
}

function WallContent({ wallText, wallLogoUrl, wallVideoUrl, wallLayout, noCookie, y, wallZ, boardColor, textColor }: WallContentProps) {
  const hasText  = !!wallText;
  const hasLogo  = !!wallLogoUrl;
  const videoId  = extractYouTubeId(wallVideoUrl || '');
  const hasVideo = !!videoId;

  if (!hasText && !hasLogo && !hasVideo) return null;

  const panelZ = wallZ + 0.03;

  // Auto-layout defaults based on which panels are active
  const autoLogoX = hasVideo ? -2.0 : (hasText ? -0.9 : 0);
  const autoTextX = hasVideo ? -0.4 : (hasLogo ? 0.8 : 0);
  const autoTextW = hasLogo || hasVideo ? 1.3 : 2.2;

  // Merge layout overrides with defaults (any undefined field falls back to auto)
  const logoX = wallLayout?.logo?.x  ?? autoLogoX;
  const logoY = wallLayout?.logo?.y  ?? 2.0;
  const logoW = wallLayout?.logo?.w  ?? 0.9;
  const logoH = wallLayout?.logo?.h  ?? 0.9;

  const textX = wallLayout?.text?.x  ?? autoTextX;
  const textY = wallLayout?.text?.y  ?? 2.0;
  const textW = wallLayout?.text?.w  ?? autoTextW;
  const textH = wallLayout?.text?.h  ?? 0.75;

  const videoX     = wallLayout?.video?.x     ?? 1.2;
  const videoY     = wallLayout?.video?.y     ?? 1.85;
  const videoW     = wallLayout?.video?.w     ?? 1.8;
  const videoH     = wallLayout?.video?.h     ?? 1.02;
  const videoMuted = wallLayout?.video?.muted ?? true;

  return (
    <>
      {hasLogo && (
        <WallLogoPanel
          logoUrl={wallLogoUrl!}
          position={[logoX, y + logoY, panelZ]}
          width={logoW}
          height={logoH}
          boardColor={boardColor}
        />
      )}
      {hasText && (
        <WallTextPanel
          text={wallText!}
          position={[textX, y + textY, panelZ]}
          width={textW}
          height={textH}
          boardColor={boardColor}
          textColor={textColor}
        />
      )}
      {hasVideo && (
        <WallVideoPanel
          videoId={videoId!}
          position={[videoX, y + videoY, panelZ]}
          width={videoW}
          height={videoH}
          muted={videoMuted}
          noCookie={noCookie}
        />
      )}
    </>
  );
}

// ─── Scene dispatcher ─────────────────────────────────────────────────────────
function SceneBackground({ scene, avatarY, wallText, wallLogoUrl, wallVideoUrl, wallLayout, noCookie }: {
  scene: AvatarScene;
  avatarY: number;
  wallText?: string;
  wallLogoUrl?: string;
  wallVideoUrl?: string;
  wallLayout?: WallLayout;
  noCookie?: boolean;
}) {
  if (!scene || scene === 'none') return null;

  if (scene.startsWith('env_')) {
    const preset = scene.replace('env_', '') as any;
    return <Environment background preset={preset} blur={0.05} />;
  }

  const wallProps = { wallText, wallLogoUrl, wallVideoUrl, wallLayout, noCookie, y: avatarY };

  if (scene === 'office') return (
    <>
      <OfficeScene y={avatarY} />
      <WallContent {...wallProps} wallZ={-2.8} boardColor="#1e2d4a" textColor="#e0efff" />
    </>
  );
  if (scene === 'living_room') return (
    <>
      <LivingRoomScene y={avatarY} />
      <WallContent {...wallProps} wallZ={-2.6} boardColor="#2a1a0a" textColor="#fff4e0" />
    </>
  );
  if (scene === 'conference') return (
    <>
      <ConferenceRoomScene y={avatarY} />
      <WallContent {...wallProps} wallZ={-3.5} boardColor="#2a3a4a" textColor="#ffffff" />
    </>
  );
  if (scene === 'stage') return (
    <>
      <StageScene y={avatarY} />
      <WallContent {...wallProps} wallZ={-2.9} boardColor="#1a1a1a" textColor="#ffe080" />
    </>
  );
  if (scene === 'studio') return (
    <>
      <StudioScene y={avatarY} />
      <WallContent {...wallProps} wallZ={-2.85} boardColor="#f0f0f0" textColor="#111111" />
    </>
  );

  return null;
}

// ─── CDN fallback animations ──────────────────────────────────────────────────
const CDN_IDLE = {
  male:   'https://readyplayerme-assets.s3.amazonaws.com/animations/visage/male-idle.glb',
  female: 'https://readyplayerme-assets.s3.amazonaws.com/animations/visage/female-idle.glb',
};
useGLTF.preload(CDN_IDLE.male);
useGLTF.preload(CDN_IDLE.female);

// ─── Facial expression type ───────────────────────────────────────────────────
export type FacialExpression = 'smile' | 'angry' | 'sad' | 'surprised' | 'thinking' | null;

// ─── Rhubarb mouth-cue type ───────────────────────────────────────────────────
export interface LipsyncCue {
  start: number; // seconds from audio start
  end: number;
  value: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'X';
}

// ─── ARKit blendshapes ────────────────────────────────────────────────────────
const MORPH = {
  // mouth / jaw
  jawOpen:          'jawOpen',
  mouthSmileLeft:   'mouthSmileLeft',
  mouthSmileRight:  'mouthSmileRight',
  mouthFrownLeft:   'mouthFrownLeft',
  mouthFrownRight:  'mouthFrownRight',
  // eyes
  eyeBlinkLeft:     'eyeBlinkLeft',
  eyeBlinkRight:    'eyeBlinkRight',
  eyeSquintLeft:    'eyeSquintLeft',
  eyeSquintRight:   'eyeSquintRight',
  eyeWideLeft:      'eyeWideLeft',
  eyeWideRight:     'eyeWideRight',
  // brows
  browInnerUp:      'browInnerUp',
  browDownLeft:     'browDownLeft',
  browDownRight:    'browDownRight',
  browOuterUpLeft:  'browOuterUpLeft',
  browOuterUpRight: 'browOuterUpRight',
  // cheeks / nose
  cheekPuff:        'cheekPuff',
  cheekSquintLeft:  'cheekSquintLeft',
  cheekSquintRight: 'cheekSquintRight',
  noseSneerLeft:    'noseSneerLeft',
  noseSneerRight:   'noseSneerRight',
  // RPM visemes (Rhubarb output)
  viseme_sil:  'viseme_sil',
  viseme_PP:   'viseme_PP',
  viseme_kk:   'viseme_kk',
  viseme_I:    'viseme_I',
  viseme_AA:   'viseme_AA',
  viseme_O:    'viseme_O',
  viseme_U:    'viseme_U',
  viseme_FF:   'viseme_FF',
  viseme_TH:   'viseme_TH',
  viseme_DD:   'viseme_DD',
  viseme_RR:   'viseme_RR',
  viseme_CH:   'viseme_CH',
  viseme_SS:   'viseme_SS',
  viseme_nn:   'viseme_nn',
  viseme_E:    'viseme_E',
};

// ─── Rhubarb shape → RPM viseme mapping ──────────────────────────────────────
// Rhubarb: A=rest B=MBP C=EEE D=AAH E=EHH F=OOO G=RRR H=FV X=silence
const RHUBARB_TO_VISEME: Record<string, string> = {
  A: 'viseme_sil',  // rest/neutral
  B: 'viseme_PP',   // lips together — m, b, p
  C: 'viseme_I',    // teeth / wide — ee, ih
  D: 'viseme_AA',   // jaw open — ah, aa
  E: 'viseme_E',    // mid — eh, uh
  F: 'viseme_O',    // round — oh
  G: 'viseme_RR',   // rounded / back — oo, r
  H: 'viseme_FF',   // teeth+lip — f, v
  X: 'viseme_sil',  // silence
};

// ─── Expression morph-target presets ─────────────────────────────────────────
type MorphMap = Partial<Record<keyof typeof MORPH, number>>;
const EXPRESSION_PRESETS: Record<NonNullable<FacialExpression>, MorphMap> = {
  smile: {
    mouthSmileLeft: 0.7, mouthSmileRight: 0.7,
    cheekSquintLeft: 0.35, cheekSquintRight: 0.35,
    browInnerUp: 0.1,
  },
  angry: {
    browDownLeft: 0.75, browDownRight: 0.75,
    mouthFrownLeft: 0.45, mouthFrownRight: 0.45,
    noseSneerLeft: 0.3, noseSneerRight: 0.3,
    eyeSquintLeft: 0.3, eyeSquintRight: 0.3,
  },
  sad: {
    browInnerUp: 0.7,
    mouthFrownLeft: 0.55, mouthFrownRight: 0.55,
    eyeSquintLeft: 0.25, eyeSquintRight: 0.25,
  },
  surprised: {
    browInnerUp: 0.85, browOuterUpLeft: 0.7, browOuterUpRight: 0.7,
    eyeWideLeft: 0.65, eyeWideRight: 0.65,
    jawOpen: 0.35,
  },
  thinking: {
    browInnerUp: 0.35,
    eyeSquintLeft: 0.2,
    browOuterUpRight: 0.25,
  },
};

// ─── Bone names ───────────────────────────────────────────────────────────────
const BONES = {
  head:     'Head',
  neck:     'Neck',
  spine2:   'Spine2',
  spine1:   'Spine1',
  spine:    'Spine',
  hips:     'Hips',
  leftArm:  'LeftArm',
  rightArm: 'RightArm',
};

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function collectMorphMeshes(scene: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  scene.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh && m.morphTargetInfluences?.length) out.push(m);
  });
  return out;
}

function setMorph(meshes: THREE.Mesh[], name: string, value: number) {
  for (const m of meshes) {
    const idx = m.morphTargetDictionary?.[name];
    if (idx !== undefined && m.morphTargetInfluences)
      m.morphTargetInfluences[idx] = clamp(value, 0, 1);
  }
}

// ─── Camera presets ───────────────────────────────────────────────────────────
const CAM_PRESETS = {
  full: { pos: [0, 0.2, 3.0] as [number,number,number], target: [0, 0.3, 0] as [number,number,number] },
  half: { pos: [0, 0.7, 2.0] as [number,number,number], target: [0, 0.8, 0] as [number,number,number] },
  bust: { pos: [0, 1.1, 1.4] as [number,number,number], target: [0, 1.2, 0] as [number,number,number] },
  face: { pos: [0, 1.5, 0.8] as [number,number,number], target: [0, 1.5, 0] as [number,number,number] },
};
export type CameraPreset = keyof typeof CAM_PRESETS;

// ─── Zoom controller ─────────────────────────────────────────────────────────
export interface ZoomHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  setPreset: (preset: CameraPreset) => void;
}

const ZoomController = forwardRef<ZoomHandle, {}>((_, ref) => {
  const { camera, controls } = useThree();

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const cam = camera as THREE.PerspectiveCamera;
      const dir = new THREE.Vector3(0, 0.3, 0).sub(cam.position).normalize();
      const dist = cam.position.distanceTo(new THREE.Vector3(0, 0.3, 0));
      if (dist > 1.5) cam.position.addScaledVector(dir, 0.4);
    },
    zoomOut: () => {
      const cam = camera as THREE.PerspectiveCamera;
      const dir = cam.position.clone().sub(new THREE.Vector3(0, 0.3, 0)).normalize();
      const dist = cam.position.distanceTo(new THREE.Vector3(0, 0.3, 0));
      if (dist < 5) cam.position.addScaledVector(dir, 0.4);
    },
    setPreset: (preset: CameraPreset) => {
      const p = CAM_PRESETS[preset];
      camera.position.set(...p.pos);
      if (controls) {
        const c = controls as any;
        c.target.set(...p.target);
        c.update?.();
      }
    },
  }));

  return null;
});
ZoomController.displayName = 'ZoomController';

// ─── Avatar model ─────────────────────────────────────────────────────────────
interface AvatarModelProps {
  url: string;
  isPlaying: boolean;
  audioAnalyser: AnalyserNode | null;
  animationUrl: string;
  avatarY: number;
  stripRootMotion: boolean;
  facialExpression?: FacialExpression;
  lipsyncCues?: LipsyncCue[];
  audioEl?: HTMLAudioElement | null; // audio element — use .currentTime for precise lipsync timing
  avatarRef?: React.RefObject<THREE.Group>;
}

function AvatarModel({ url, isPlaying, audioAnalyser, animationUrl, avatarY, stripRootMotion, facialExpression, lipsyncCues, audioEl, avatarRef: externalAvatarRef }: AvatarModelProps) {
  const { scene } = useGLTF(url);
  // SkeletonUtils.clone properly rebinds SkinnedMesh skeletons to cloned bones
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  const { animations: rawAnims } = useGLTF(animationUrl);

  // For locomotion: strip Hips position tracks so avatar stays in-place
  const loadedAnims = useMemo(() => {
    if (!stripRootMotion || !rawAnims.length) return rawAnims;
    return rawAnims.map((clip) => {
      const c = clip.clone();
      c.tracks = c.tracks.filter((t) => !t.name.match(/^Hips\.position/));
      return c;
    });
  }, [rawAnims, stripRootMotion]);

  const internalGroupRef = useRef<THREE.Group>(null);
  const groupRef = externalAvatarRef || internalGroupRef;
  const morphMeshes = useMemo(() => collectMorphMeshes(cloned), [cloned]);
  const bones       = useRef<Record<string, THREE.Object3D | undefined>>({});

  const mixerRef      = useRef<THREE.AnimationMixer | null>(null);
  const currentAction = useRef<THREE.AnimationAction | null>(null);

  // Cache bone refs after mount
  useEffect(() => {
    Object.entries(BONES).forEach(([k, name]) => {
      bones.current[k] = cloned.getObjectByName(name);
    });
  }, [cloned]);

  // Play animation — always create fresh mixer so bone retargeting is correct
  useEffect(() => {
    if (!loadedAnims.length) return;

    // Stop and discard any previous mixer
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current.uncacheRoot(cloned);
    }

    const mixer = new THREE.AnimationMixer(cloned);
    mixerRef.current = mixer;

    const clip   = loadedAnims[0];
    const action = mixer.clipAction(clip);
    action.reset().setEffectiveWeight(1).setLoop(THREE.LoopRepeat, Infinity).play();
    currentAction.current = action;

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(cloned);
      mixerRef.current   = null;
      currentAction.current = null;
    };
  }, [cloned, loadedAnims]);

  // Smooth values
  const blinkTimer   = useRef(0);
  const nextBlink    = useRef(3 + Math.random() * 2);
  const blinkPhase   = useRef<'idle' | 'closing' | 'opening'>('idle');
  const blinkProg    = useRef(0);
  const mouthSmooth  = useRef(0);
  const talkEnergy   = useRef(0);
  const bodyLean     = useRef(0);
  // Expression smooth targets (current blended values per morph)
  const exprSmooth   = useRef<Record<string, number>>({});
  // Lipsync: current viseme target strengths
  const visemeSmooth = useRef<Record<string, number>>({});

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    // Advance animation mixer
    mixerRef.current?.update(delta);

    // ── Audio → mouth target (generic jaw) ───────────────────────────────────
    let mouthTarget = 0;
    if (isPlaying) {
      let analyserAvg = 0;
      if (audioAnalyser) {
        const buf = new Uint8Array(audioAnalyser.frequencyBinCount);
        audioAnalyser.getByteFrequencyData(buf);
        analyserAvg = buf.reduce((a, b) => a + b, 0) / buf.length;
        mouthTarget = clamp(analyserAvg / 80, 0, 1);
      }
      // Procedural fallback: if analyser returns no audio data, simulate lip movement
      if (analyserAvg < 3) {
        const f1 = Math.abs(Math.sin(t * 9.1 + 0.3));
        const f2 = Math.abs(Math.sin(t * 4.7 + 1.1));
        const f3 = Math.abs(Math.sin(t * 14.3));
        mouthTarget = clamp(f1 * 0.5 + f2 * 0.22 + f3 * 0.12, 0, 0.75);
      }
    }
    mouthSmooth.current = lerp(mouthSmooth.current, mouthTarget, delta * 16);
    talkEnergy.current  = lerp(talkEnergy.current, isPlaying ? 1 : 0, delta * 3);
    bodyLean.current    = lerp(bodyLean.current,   isPlaying ? 1 : 0, delta * 2);

    const ms = mouthSmooth.current;
    const te = talkEnergy.current;
    const bl = bodyLean.current;

    // ── Rhubarb lipsync visemes (if cues provided, override generic jaw) ─────
    if (lipsyncCues && lipsyncCues.length > 0 && isPlaying && audioEl) {
      const elapsed = audioEl.currentTime; // exact playback position — no drift
      // Find active cue
      const activeCue = lipsyncCues.find(c => elapsed >= c.start && elapsed < c.end);
      const targetViseme = activeCue ? (RHUBARB_TO_VISEME[activeCue.value] ?? 'viseme_sil') : 'viseme_sil';

      // Lerp all viseme morphs: target=1 for active, 0 for rest
      const allVisemes = ['viseme_sil','viseme_PP','viseme_kk','viseme_I','viseme_AA','viseme_O','viseme_U','viseme_FF','viseme_TH','viseme_DD','viseme_RR','viseme_CH','viseme_SS','viseme_nn','viseme_E'];
      for (const v of allVisemes) {
        const cur = visemeSmooth.current[v] ?? 0;
        const tgt = v === targetViseme ? 1 : 0;
        visemeSmooth.current[v] = lerp(cur, tgt, delta * 20);
        setMorph(morphMeshes, MORPH[v as keyof typeof MORPH] ?? v, visemeSmooth.current[v]);
      }
      // Override jawOpen with AA viseme
      setMorph(morphMeshes, MORPH.jawOpen, (visemeSmooth.current['viseme_AA'] ?? 0) * 0.8);
    } else {
      // ── Generic audio-driven lip sync (no Rhubarb) ─────────────────────────
      setMorph(morphMeshes, MORPH.jawOpen,          ms * 0.72);
      setMorph(morphMeshes, MORPH.mouthSmileLeft,   isPlaying ? ms * 0.22 : 0);
      setMorph(morphMeshes, MORPH.mouthSmileRight,  isPlaying ? ms * 0.22 : 0);
      setMorph(morphMeshes, MORPH.browInnerUp,      te * (0.12 + ms * 0.2));
      setMorph(morphMeshes, MORPH.browOuterUpLeft,  te * ms * 0.15);
      setMorph(morphMeshes, MORPH.browOuterUpRight, te * ms * 0.15);
      setMorph(morphMeshes, MORPH.cheekPuff,        ms * 0.05);
    }

    // ── Facial expression blending (additive on top of lip sync) ─────────────
    if (facialExpression && EXPRESSION_PRESETS[facialExpression]) {
      const preset = EXPRESSION_PRESETS[facialExpression];
      for (const [key, targetVal] of Object.entries(preset)) {
        const cur = exprSmooth.current[key] ?? 0;
        exprSmooth.current[key] = lerp(cur, targetVal as number, delta * 5);
        // Additive: clamp sum with existing morph to 1
        setMorph(morphMeshes, MORPH[key as keyof typeof MORPH] ?? key, clamp(exprSmooth.current[key], 0, 1));
      }
    } else {
      // Fade out all expression morphs when no expression active
      for (const key of Object.keys(exprSmooth.current)) {
        exprSmooth.current[key] = lerp(exprSmooth.current[key], 0, delta * 4);
        setMorph(morphMeshes, MORPH[key as keyof typeof MORPH] ?? key, exprSmooth.current[key]);
      }
    }

    // Blink
    blinkTimer.current += delta;
    if (blinkPhase.current === 'idle' && blinkTimer.current >= nextBlink.current) {
      blinkPhase.current = 'closing'; blinkProg.current = 0; blinkTimer.current = 0;
    }
    if (blinkPhase.current === 'closing') {
      blinkProg.current += delta * 18;
      const v = Math.min(blinkProg.current, 1);
      setMorph(morphMeshes, MORPH.eyeBlinkLeft,  v);
      setMorph(morphMeshes, MORPH.eyeBlinkRight, v);
      if (v >= 1) { blinkPhase.current = 'opening'; blinkProg.current = 0; }
    }
    if (blinkPhase.current === 'opening') {
      blinkProg.current += delta * 12;
      const v = 1 - Math.min(blinkProg.current, 1);
      setMorph(morphMeshes, MORPH.eyeBlinkLeft,  v);
      setMorph(morphMeshes, MORPH.eyeBlinkRight, v);
      if (v <= 0) { blinkPhase.current = 'idle'; nextBlink.current = 2 + Math.random() * 4; }
    }

    // Additive head motion (on top of animation)
    const head = bones.current['head'];
    if (head) {
      const idleYaw   = Math.sin(t * 0.22) * 0.03;
      const idlePitch = Math.sin(t * 0.37) * 0.02 + Math.sin(t * 0.17) * 0.01;
      const talkNod   = isPlaying
        ? Math.sin(t * 4.8) * 0.055 * ms + Math.sin(t * 2.3) * 0.03 * te
        : 0;
      const listenTilt = !isPlaying ? Math.sin(t * 0.11) * 0.02 : 0;
      head.rotation.y = lerp(head.rotation.y, idleYaw,          delta * 2.5);
      head.rotation.x = lerp(head.rotation.x, idlePitch + talkNod, delta * 5);
      head.rotation.z = lerp(head.rotation.z, listenTilt,        delta * 1.5);
    }

    // Breathing + lean
    const spine1 = bones.current['spine1'];
    if (spine1) {
      const breathe  = Math.sin(t * 0.8) * 0.008;
      const talkLean = bl * (Math.sin(t * 0.45) * 0.018 + 0.025);
      spine1.rotation.x = lerp(spine1.rotation.x, breathe + talkLean, delta * 2);
    }

    // Arm gestures when talking
    const lArm = bones.current['leftArm'];
    const rArm = bones.current['rightArm'];
    if (lArm && rArm && isPlaying) {
      lArm.rotation.z = lerp(lArm.rotation.z,  te * Math.sin(t * 1.3 + 0.5) * 0.05, delta * 3);
      rArm.rotation.z = lerp(rArm.rotation.z, -te * Math.sin(t * 1.1 + 1.2) * 0.05, delta * 3);
    }

    // Subtle body rock
    if (groupRef.current) {
      groupRef.current.position.y = lerp(
        groupRef.current.position.y,
        avatarY + Math.sin(t * 0.85) * 0.01,
        delta * 3
      );
    }
  });

  return (
    <group ref={groupRef} position={[0, avatarY, 0]}>
      <primitive object={cloned} scale={1.8} />
    </group>
  );
}

// ─── Placeholder ──────────────────────────────────────────────────────────────
function PlaceholderAvatar() {
  const headRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.5) * 0.2;
      headRef.current.rotation.x = Math.sin(t * 0.7) * 0.08;
    }
    if (bodyRef.current) bodyRef.current.position.y = Math.sin(t * 0.9) * 0.02;
  });
  return (
    <group ref={bodyRef}>
      <mesh ref={headRef} position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#7c9cbf" />
      </mesh>
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.35, 0.45, 1.2, 32]} />
        <meshStandardMaterial color="#4a7fb5" />
      </mesh>
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#4a7fb5" wireframe />
    </mesh>
  );
}

class AvatarErrorBoundary extends Component<
  { children: ReactNode; onError?: (e: Error) => void },
  { hasError: boolean }
> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e: Error) { this.props.onError?.(e); }
  render() {
    return this.state.hasError ? <PlaceholderAvatar /> : this.props.children;
  }
}

// ─── Public component ─────────────────────────────────────────────────────────
export interface AvatarViewerProps {
  avatarUrl: string;
  isPlaying?: boolean;
  audioElement?: HTMLAudioElement | null;
  className?: string;
  /** Override which animation to play (full URL or /animations/... path) */
  animationUrl?: string;
  /** Ref that exposes zoomIn / zoomOut / setPreset imperatively */
  zoomRef?: React.RefObject<ZoomHandle | null>;
  /** Avatar vertical position (default -1.5). Use slider to move up/down */
  avatarY?: number;
  /** Strip root bone translation (Hips.position) for in-place locomotion */
  stripRootMotion?: boolean;
  /** Transparent canvas background (alpha: true). Default false */
  transparent?: boolean;
  /** Initial camera preset. Default 'full' */
  initialPreset?: CameraPreset;
  /** Optional facial expression to blend (smile/angry/sad/surprised/thinking) */
  facialExpression?: FacialExpression;
  /** Optional Rhubarb mouth cues for precise lip sync */
  lipsyncCues?: LipsyncCue[];
  /** Canvas background color (hex/css). Ignored when transparent=true */
  bgColor?: string;
  /** 3D scene or environment preset. 'none' = color only */
  bgScene?: AvatarScene;
  /** Text to display on wall board in the scene */
  wallText?: string;
  /** Image URL for logo on wall board */
  wallLogoUrl?: string;
  /** YouTube URL or video ID to display on a separate wall panel */
  wallVideoUrl?: string;
  /** Per-panel position / size / sound layout overrides */
  wallLayout?: WallLayout;
  /** Use YouTube Privacy-Enhanced mode (youtube-nocookie.com) — GDPR/EU compliance */
  youtubeNoCookie?: boolean;
  /** Show/hide character shadow. Default true */
  showShadow?: boolean;
  /** World bots to render as static NPCs */
  worldBots?: Array<{
    id: string;
    agent_id: string;
    position_x: number;
    position_y: number;
    position_z: number;
    rotation_y: number;
    agent_name?: string;
    agent_avatar_url?: string;
  }>;
}

// Reactively controls canvas transparency & scene background
function BgController({ useHtmlBg, transparent, bgColor }: { useHtmlBg: boolean; transparent: boolean; bgColor: string }) {
  const { gl, scene } = useThree();
  useFrame(() => {
    if (transparent || useHtmlBg) {
      gl.setClearColor(0x000000, 0);
      if (scene.background !== null) scene.background = null;
    } else {
      const col = new THREE.Color(bgColor);
      gl.setClearColor(col, 1);
      if (!scene.background) scene.background = col;
      else (scene.background as THREE.Color).set(bgColor);
    }
  });
  return null;
}

export function AvatarViewer({
  avatarUrl,
  isPlaying = false,
  audioElement = null,
  className = '',
  animationUrl,
  zoomRef,
  avatarY = -1.5,
  stripRootMotion = false,
  transparent = false,
  initialPreset,
  facialExpression,
  lipsyncCues,
  bgColor,
  bgScene = 'none',
  wallText = '',
  wallLogoUrl = '',
  wallVideoUrl = '',
  wallLayout,
  youtubeNoCookie = false,
  showShadow = true,
  worldBots = [],
}: AvatarViewerProps) {
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);
  const [loadError, setLoadError]         = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const internalZoomRef = useRef<ZoomHandle | null>(null);
  const effectiveZoomRef = zoomRef ?? internalZoomRef;
  const avatarRef = useRef<THREE.Group>(null);

  const isValidGlbUrl =
    avatarUrl &&
    (
      avatarUrl.startsWith('http://') ||
      avatarUrl.startsWith('https://') ||
      avatarUrl.startsWith('/avatar-cache/') || // Local cached GLB
      avatarUrl.startsWith('/avatars/')          // Local user/system avatars
    ) &&
    !avatarUrl.includes('example.com');

  // Determine default animation based on gender
  const isFemale = avatarUrl.toLowerCase().includes('female') ||
                   avatarUrl.toLowerCase().includes('woman') ||
                   avatarUrl.toLowerCase().includes('girl');

  const defaultAnimUrl = isFemale ? CDN_IDLE.female : CDN_IDLE.male;
  const activeAnimUrl  = animationUrl || defaultAnimUrl;

  // Connect audio → Web Audio API for lip sync
  useEffect(() => {
    if (!audioElement) return;
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    ctx.resume().catch(() => {});
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    try {
      const src = ctx.createMediaElementSource(audioElement);
      src.connect(analyser);
      analyser.connect(ctx.destination);
      setAudioAnalyser(analyser);
    } catch {
      // Element already connected — analyser won't get audio data,
      // but procedural fallback in useFrame will handle lip movement
      setAudioAnalyser(analyser);
    }
  }, [audioElement]);

  useEffect(() => {
    const resume = () => audioCtxRef.current?.resume();
    document.addEventListener('click', resume, { once: true });
    return () => document.removeEventListener('click', resume);
  }, []);

  // HTML-overlay background types (YouTube or custom file)
  const isYtBg    = bgScene.startsWith('yt_');
  const isCustBg  = bgScene.startsWith('custombg_');
  const useHtmlBg = isYtBg || isCustBg;
  const ytVideoId  = isYtBg   ? bgScene.slice(3)  : null;
  const custBgUrl  = isCustBg ? bgScene.slice(9)  : null;

  const resolvedBg = (transparent || useHtmlBg) ? undefined : (bgColor || '#09090b');

  return (
    <div
      className={`w-full h-full relative ${className}`}
      style={resolvedBg ? { background: resolvedBg } : undefined}
    >
      {loadError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-red-900/80 text-white text-sm px-4 py-2 rounded-lg max-w-sm text-center">
          Could not load avatar — showing placeholder.
        </div>
      )}

      {/* ── HTML background layer (YouTube / custom image-GIF-video) ── */}
      {useHtmlBg && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          {isYtBg && ytVideoId && (
            <iframe
              src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&mute=1&loop=1&playlist=${ytVideoId}&controls=0&showinfo=0&rel=0&disablekb=1&iv_load_policy=3&modestbranding=1`}
              allow="autoplay"
              className="absolute inset-0 w-full h-full scale-[1.6]"
              style={{ border: 'none', pointerEvents: 'none' }}
            />
          )}
          {isCustBg && custBgUrl && (
            custBgUrl.match(/\.(mp4|webm|mov)$/i) ? (
              <video src={custBgUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <img src={custBgUrl} alt="background" className="absolute inset-0 w-full h-full object-cover" />
            )
          )}
        </div>
      )}

      {!isValidGlbUrl && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-gray-800/90 text-white text-center px-6 py-4 rounded-xl max-w-xs">
            <div className="text-4xl mb-3">🎭</div>
            <p className="font-semibold mb-1">No Avatar Connected</p>
            <p className="text-xs text-gray-400">
              Create one at{' '}
              <span className="text-blue-400">/avatar-creator</span>{' '}
              or paste a Ready Player Me URL in Avatar Settings.
            </p>
          </div>
        </div>
      )}

      <Canvas
        shadows
        gl={{ antialias: true, alpha: true }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* Reactively update canvas background/transparency when bgScene changes */}
        <BgController useHtmlBg={useHtmlBg} transparent={!!transparent} bgColor={bgColor || '#09090b'} />
        {initialPreset
          ? <PerspectiveCamera makeDefault position={CAM_PRESETS[initialPreset].pos} fov={45} />
          : <PerspectiveCamera makeDefault position={[0, 0.2, 2.8]} fov={45} />
        }

        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 3]}   intensity={1.2} castShadow />
        <directionalLight position={[-3, 3, -2]} intensity={0.4} color="#b0c8ff" />
        <spotLight        position={[0, 6, 2]}   intensity={0.8} angle={0.4} penumbra={0.8} />

        {/* Environment: use scene env OR default city (lighting only). Skip for HTML-bg modes. */}
        {!useHtmlBg && bgScene && bgScene !== 'none'
          ? <SceneBackground scene={bgScene} avatarY={avatarY} wallText={wallText} wallLogoUrl={wallLogoUrl} wallVideoUrl={wallVideoUrl} wallLayout={wallLayout} noCookie={youtubeNoCookie} />
          : (!transparent && !useHtmlBg) && <Environment preset="city" />
        }

        <ZoomController ref={effectiveZoomRef} />

        {isValidGlbUrl ? (
          <AvatarErrorBoundary onError={(e) => setLoadError(e.message)}>
            <Suspense fallback={<LoadingFallback />}>
              <AvatarModel
                url={avatarUrl}
                isPlaying={isPlaying}
                audioAnalyser={audioAnalyser}
                animationUrl={activeAnimUrl}
                avatarY={avatarY}
                stripRootMotion={stripRootMotion}
                facialExpression={facialExpression}
                lipsyncCues={lipsyncCues}
                audioEl={audioElement}
                avatarRef={avatarRef}
              />
            </Suspense>
          </AvatarErrorBoundary>
        ) : (
          <PlaceholderAvatar />
        )}

        {/* World Bots (NPCs) */}
        {worldBots && worldBots.length > 0 && worldBots.map((bot) => {
          const botAvatarUrl = bot.agent_avatar_url;
          if (!botAvatarUrl) return null;

          return (
            <Suspense key={bot.id} fallback={null}>
              <BotAvatar
                avatarUrl={botAvatarUrl}
                position={[bot.position_x, bot.position_y, bot.position_z]}
                rotationY={bot.rotation_y}
              />
            </Suspense>
          );
        })}

        {/* Soft contact shadow beneath the avatar — works with transparent bg too */}
        {showShadow && (
          <ContactShadows
            position={[0, avatarY + 0.01, 0]}
            opacity={transparent ? 0.35 : 0.5}
            scale={3}
            blur={2.5}
            far={2}
            color="#000000"
          />
        )}

        <OrbitControls
          target={[0, 0.3, 0]}
          enablePan={false}
          enableZoom={true}
          minDistance={1.5}
          maxDistance={5}
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.7}
        />
      </Canvas>
    </div>
  );
}
