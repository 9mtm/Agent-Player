'use client';

import { Suspense, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useMicVAD } from '@ricky0123/vad-react';
import {
  Mic, MicOff, Send, Loader2, Volume2, VolumeX,
  MessageCircle, X, ZoomIn, ZoomOut, ChevronRight, ChevronLeft, Users, Settings,
  Sun, Moon, Cloud, CloudRain, Snowflake, CloudLightning, Leaf, Sparkles, Flame, Cpu,
  Camera, CameraOff, Circle, Square, Link, Eye, EyeOff, SlidersHorizontal, Mountain,
  Video, Home, Bell, Puzzle, Palette, FileText, Image as ImageIcon, Brush, Check
} from 'lucide-react';
import { config } from '@/lib/config';
import { useDeveloperMode } from '@/contexts/developer-context';
import type { ZoomHandle, CameraPreset, AvatarScene, WallLayout } from '@/components/avatar/AvatarViewer';
import { SCENE_OPTIONS } from '@/components/avatar/AvatarViewer';
import { SpecRenderer } from '@/lib/json-render/renderer';
import type { Spec } from '@/lib/ui-web4/core';

const AvatarViewer = dynamic(
  () => import('@/components/avatar/AvatarViewer').then((mod) => ({ default: mod.AvatarViewer })),
  { ssr: false, loading: () => <LoadingScreen /> }
);

// ── Types ─────────────────────────────────────────────────────────────────────
type ConvMode = 'idle' | 'listening' | 'processing' | 'speaking';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AnimEntry {
  label: string;
  url: string;
}
interface FxState {
  snow:      { on: boolean; speed: number; density: number; opacity: number };
  fireflies: { on: boolean; count: number; speed: number; opacity: number };
  starfield: { on: boolean; speed: number; count: number; opacity: number };
  rain:      { on: boolean; intensity: number; speed: number; opacity: number };
  fire:      { on: boolean; intensity: number; opacity: number };
  lightning: { on: boolean; frequency: number; opacity: number };
  aurora:    { on: boolean; speed: number; opacity: number };
  scanlines: { on: boolean; opacity: number };
  glitch:    { on: boolean; intensity: number };
  hologram:  { on: boolean; opacity: number };
  vignette:  { on: boolean; color: string; pulseSpeed: number; opacity: number };
  confetti:  boolean;
}
const FX_DEFAULTS: FxState = {
  snow:      { on: false, speed: 60,      density: 150, opacity: 1   },
  fireflies: { on: false, count: 30,      speed: 1,     opacity: 1   },
  starfield: { on: false, speed: 2,       count: 200,   opacity: 1   },
  rain:      { on: false, intensity: 200, speed: 15,    opacity: 0.6 },
  fire:      { on: false, intensity: 0.8, opacity: 1   },
  lightning: { on: false, frequency: 3,   opacity: 0.8 },
  aurora:    { on: false, speed: 1,       opacity: 0.5 },
  scanlines: { on: false, opacity: 0.12 },
  glitch:    { on: false, intensity: 0.3 },
  hologram:  { on: false, opacity: 0.3 },
  vignette:  { on: false, color: 'blue', pulseSpeed: 2, opacity: 0.6 },
  confetti:  false,
};

// ── Weather Preset types ───────────────────────────────────────────────────────
interface WeatherPreset {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  fx: Partial<FxState>;
}

const WEATHER_PRESETS: WeatherPreset[] = [
  {
    id: 'sunny', label: 'Sunny', icon: Sun, color: 'text-yellow-400',
    fx: { vignette: { on: true, color: 'gold', pulseSpeed: 1, opacity: 0.35 } },
  },
  {
    id: 'moonlit', label: 'Moonlit', icon: Moon, color: 'text-blue-300',
    fx: {
      starfield: { on: true, speed: 1, count: 300, opacity: 0.9 },
      vignette:  { on: true, color: 'blue', pulseSpeed: 1, opacity: 0.25 },
    },
  },
  {
    id: 'cloudy', label: 'Cloudy', icon: Cloud, color: 'text-gray-300',
    fx: {
      scanlines: { on: true, opacity: 0.07 },
      vignette:  { on: true, color: 'cyan', pulseSpeed: 1, opacity: 0.18 },
    },
  },
  {
    id: 'rainy', label: 'Rainy', icon: CloudRain, color: 'text-sky-400',
    fx: {
      rain:     { on: true, intensity: 250, speed: 15, opacity: 0.6 },
      vignette: { on: true, color: 'blue', pulseSpeed: 2, opacity: 0.3 },
    },
  },
  {
    id: 'snowy', label: 'Snowy', icon: Snowflake, color: 'text-blue-200',
    fx: {
      snow:     { on: true, speed: 60, density: 150, opacity: 0.9 },
      vignette: { on: true, color: 'cyan', pulseSpeed: 1, opacity: 0.2 },
    },
  },
  {
    id: 'storm', label: 'Storm', icon: CloudLightning, color: 'text-yellow-300',
    fx: {
      rain:      { on: true, intensity: 400, speed: 22, opacity: 0.7 },
      lightning: { on: true, frequency: 6, opacity: 0.9 },
      vignette:  { on: true, color: 'purple', pulseSpeed: 3, opacity: 0.4 },
    },
  },
  {
    id: 'autumn', label: 'Autumn', icon: Leaf, color: 'text-orange-400',
    fx: {
      fireflies: { on: true, count: 25, speed: 0.8, opacity: 0.85 },
      vignette:  { on: true, color: 'gold', pulseSpeed: 1, opacity: 0.25 },
    },
  },
  {
    id: 'aurora', label: 'Aurora', icon: Sparkles, color: 'text-green-400',
    fx: {
      aurora:    { on: true, speed: 1.5, opacity: 0.55 },
      starfield: { on: true, speed: 1, count: 200, opacity: 0.6 },
    },
  },
  {
    id: 'inferno', label: 'Inferno', icon: Flame, color: 'text-orange-500',
    fx: {
      fire:     { on: true, intensity: 0.9, opacity: 1 },
      vignette: { on: true, color: 'red', pulseSpeed: 3, opacity: 0.4 },
    },
  },
  {
    id: 'cyber', label: 'Cyber', icon: Cpu, color: 'text-cyan-400',
    fx: {
      hologram:  { on: true, opacity: 0.3 },
      scanlines: { on: true, opacity: 0.1 },
      glitch:    { on: true, intensity: 0.25 },
    },
  },
];




/** Extract avatar ID from a ReadyPlayerMe GLB URL */
function extractRpmAvatarId(url: string): string | null {
  const match = url.match(/models\.readyplayer\.me\/([a-f0-9]+)\.glb/i);
  return match ? match[1] : null;
}

// ── CDN animations (guaranteed to work with all RPM avatars) ─────────────────
const CDN_MALE_IDLE   = 'https://readyplayerme-assets.s3.amazonaws.com/animations/visage/male-idle.glb';
const CDN_FEMALE_IDLE = 'https://readyplayerme-assets.s3.amazonaws.com/animations/visage/female-idle.glb';

// ── Animation manifest — AI selects from these by ID ─────────────────────────
// Each entry has a semantic label so the AI understands when to use it.
// URLs are gender-specific and resolved at runtime from the `gender` state.
interface AnimManifestEntry {
  id: string;
  label: string;
  category: 'idle' | 'expression' | 'dance' | 'locomotion';
  male: string;
  female: string;
}

const ANIMATION_MANIFEST: AnimManifestEntry[] = [
  // Idle
  { id: 'idle',           label: 'Default standing idle (neutral, waiting)',          category: 'idle',       male: CDN_MALE_IDLE,                                                          female: CDN_FEMALE_IDLE },
  { id: 'idle_relaxed',   label: 'Relaxed casual idle variation',                    category: 'idle',       male: '/animations/masculine/idle/M_Standing_Idle_Variations_001.glb',       female: '/animations/feminine/idle/F_Standing_Idle_Variations_001.glb' },
  { id: 'idle_casual',    label: 'Casual friendly idle',                             category: 'idle',       male: '/animations/masculine/idle/M_Standing_Idle_Variations_002.glb',       female: '/animations/feminine/idle/F_Standing_Idle_Variations_002.glb' },
  // Expression / Talking
  { id: 'talk',           label: 'Talking with natural hand gestures',               category: 'expression', male: '/animations/masculine/expression/M_Talking_Variations_001.glb',       female: '/animations/feminine/expression/F_Talking_Variations_001.glb' },
  { id: 'talk_excited',   label: 'Excited enthusiastic talking',                     category: 'expression', male: '/animations/masculine/expression/M_Talking_Variations_002.glb',       female: '/animations/feminine/expression/F_Talking_Variations_002.glb' },
  { id: 'talk_explain',   label: 'Explaining with expressive teaching gestures',     category: 'expression', male: '/animations/masculine/expression/M_Talking_Variations_004.glb',       female: '/animations/feminine/expression/F_Talking_Variations_004.glb' },
  { id: 'talk_calm',      label: 'Calm measured talking',                            category: 'expression', male: '/animations/masculine/expression/M_Talking_Variations_005.glb',       female: '/animations/feminine/expression/F_Talking_Variations_005.glb' },
  { id: 'expr_happy',     label: 'Happy joyful expression',                          category: 'expression', male: '/animations/masculine/expression/M_Standing_Expressions_001.glb',    female: '/animations/feminine/expression/M_Standing_Expressions_001.glb' },
  { id: 'expr_think',     label: 'Thinking pondering thoughtful pose',               category: 'expression', male: '/animations/masculine/expression/M_Standing_Expressions_002.glb',    female: '/animations/feminine/expression/M_Standing_Expressions_002.glb' },
  { id: 'expr_confident', label: 'Confident assured strong pose',                   category: 'expression', male: '/animations/masculine/expression/M_Standing_Expressions_004.glb',    female: '/animations/feminine/expression/M_Standing_Expressions_004.glb' },
  { id: 'expr_wonder',    label: 'Amazed wondrous surprised reaction',               category: 'expression', male: '/animations/masculine/expression/M_Standing_Expressions_005.glb',    female: '/animations/feminine/expression/M_Standing_Expressions_005.glb' },
  { id: 'expr_wave',      label: 'Waving greeting gesture',                          category: 'expression', male: '/animations/masculine/expression/M_Standing_Expressions_006.glb',    female: '/animations/feminine/expression/M_Standing_Expressions_006.glb' },
  { id: 'expr_shrug',     label: 'Shrug uncertain or unsure gesture',                category: 'expression', male: '/animations/masculine/expression/M_Standing_Expressions_007.glb',    female: '/animations/feminine/expression/M_Standing_Expressions_007.glb' },
  { id: 'expr_nod',       label: 'Nodding agreement approving',                      category: 'expression', male: '/animations/masculine/expression/M_Standing_Expressions_008.glb',    female: '/animations/feminine/expression/M_Standing_Expressions_006.glb' },
  // Dance
  { id: 'dance_hype',     label: 'Energetic celebratory hype dance',                 category: 'dance',      male: '/animations/masculine/dance/M_Dances_001.glb',                        female: '/animations/feminine/dance/F_Dances_001.glb' },
  { id: 'dance_groove',   label: 'Groovy funky dance',                               category: 'dance',      male: '/animations/masculine/dance/M_Dances_002.glb',                        female: '/animations/feminine/dance/F_Dances_004.glb' },
  { id: 'dance_fun',      label: 'Fun silly playful dance',                           category: 'dance',      male: '/animations/masculine/dance/M_Dances_005.glb',                        female: '/animations/feminine/dance/F_Dances_005.glb' },
  { id: 'dance_smooth',   label: 'Smooth elegant dance',                              category: 'dance',      male: '/animations/masculine/dance/M_Dances_007.glb',                        female: '/animations/feminine/dance/F_Dances_006.glb' },
  // Locomotion
  { id: 'walk',           label: 'Walking forward (describing movement or journey)',  category: 'locomotion', male: '/animations/masculine/locomotion/M_Walk_001.glb',                    female: '/animations/feminine/locomotion/F_Walk_002.glb' },
  { id: 'run',            label: 'Running (fast action or urgency)',                  category: 'locomotion', male: '/animations/masculine/locomotion/M_Run_001.glb',                     female: '/animations/feminine/locomotion/F_Run_001.glb' },
  { id: 'jog',            label: 'Jogging (moderate pace activity)',                  category: 'locomotion', male: '/animations/masculine/locomotion/M_Jog_001.glb',                     female: '/animations/feminine/locomotion/F_Jog_001.glb' },
];

// ── Animation library (served from /public/animations/) ───────────────────────
const ANIMS = {
  male: {
    idle: [
      { label: 'Default Idle',  url: CDN_MALE_IDLE },
      { label: 'Idle 1',        url: '/animations/masculine/idle/M_Standing_Idle_001.glb' },
      { label: 'Idle 2',        url: '/animations/masculine/idle/M_Standing_Idle_002.glb' },
      { label: 'Idle Var 1',    url: '/animations/masculine/idle/M_Standing_Idle_Variations_001.glb' },
      { label: 'Idle Var 2',    url: '/animations/masculine/idle/M_Standing_Idle_Variations_002.glb' },
      { label: 'Idle Var 3',    url: '/animations/masculine/idle/M_Standing_Idle_Variations_003.glb' },
      { label: 'Idle Var 4',    url: '/animations/masculine/idle/M_Standing_Idle_Variations_004.glb' },
      { label: 'Idle Var 5',    url: '/animations/masculine/idle/M_Standing_Idle_Variations_005.glb' },
      { label: 'Idle Var 6',    url: '/animations/masculine/idle/M_Standing_Idle_Variations_006.glb' },
    ],
    expression: [
      { label: 'Talk 1',        url: '/animations/masculine/expression/M_Talking_Variations_001.glb' },
      { label: 'Talk 2',        url: '/animations/masculine/expression/M_Talking_Variations_002.glb' },
      { label: 'Talk 3',        url: '/animations/masculine/expression/M_Talking_Variations_003.glb' },
      { label: 'Talk 4',        url: '/animations/masculine/expression/M_Talking_Variations_004.glb' },
      { label: 'Talk 5',        url: '/animations/masculine/expression/M_Talking_Variations_005.glb' },
      { label: 'Expr 1',        url: '/animations/masculine/expression/M_Standing_Expressions_001.glb' },
      { label: 'Expr 2',        url: '/animations/masculine/expression/M_Standing_Expressions_002.glb' },
      { label: 'Expr 4',        url: '/animations/masculine/expression/M_Standing_Expressions_004.glb' },
      { label: 'Expr 5',        url: '/animations/masculine/expression/M_Standing_Expressions_005.glb' },
      { label: 'Expr 6',        url: '/animations/masculine/expression/M_Standing_Expressions_006.glb' },
      { label: 'Expr 7',        url: '/animations/masculine/expression/M_Standing_Expressions_007.glb' },
      { label: 'Expr 8',        url: '/animations/masculine/expression/M_Standing_Expressions_008.glb' },
    ],
    dance: [
      { label: 'Dance 1',       url: '/animations/masculine/dance/M_Dances_001.glb' },
      { label: 'Dance 2',       url: '/animations/masculine/dance/M_Dances_002.glb' },
      { label: 'Dance 3',       url: '/animations/masculine/dance/M_Dances_003.glb' },
      { label: 'Dance 4',       url: '/animations/masculine/dance/M_Dances_004.glb' },
      { label: 'Dance 5',       url: '/animations/masculine/dance/M_Dances_005.glb' },
      { label: 'Dance 6',       url: '/animations/masculine/dance/M_Dances_006.glb' },
      { label: 'Dance 7',       url: '/animations/masculine/dance/M_Dances_007.glb' },
      { label: 'Dance 8',       url: '/animations/masculine/dance/M_Dances_008.glb' },
      { label: 'Dance 9',       url: '/animations/masculine/dance/M_Dances_009.glb' },
      { label: 'Dance 11',      url: '/animations/masculine/dance/M_Dances_011.glb' },
    ],
    locomotion: [
      { label: 'Walk',          url: '/animations/masculine/locomotion/M_Walk_001.glb' },
      { label: 'Walk 2',        url: '/animations/masculine/locomotion/M_Walk_002.glb' },
      { label: 'Walk Back',     url: '/animations/masculine/locomotion/M_Walk_Backwards_001.glb' },
      { label: 'Jog',           url: '/animations/masculine/locomotion/M_Jog_001.glb' },
      { label: 'Jog 2',         url: '/animations/masculine/locomotion/M_Jog_003.glb' },
      { label: 'Jog Back',      url: '/animations/masculine/locomotion/M_Jog_Backwards_001.glb' },
      { label: 'Run',           url: '/animations/masculine/locomotion/M_Run_001.glb' },
      { label: 'Run Back',      url: '/animations/masculine/locomotion/M_Run_Backwards_002.glb' },
      { label: 'Jump (Walk)',   url: '/animations/masculine/locomotion/M_Walk_Jump_001.glb' },
      { label: 'Jump (Run)',    url: '/animations/masculine/locomotion/M_Run_Jump_001.glb' },
      { label: 'Falling',       url: '/animations/masculine/locomotion/M_Falling_Idle_002.glb' },
      { label: 'Crouch Walk',   url: '/animations/masculine/locomotion/M_Crouch_Walk_003.glb' },
    ],
  },
  female: {
    idle: [
      { label: 'Default Idle',  url: CDN_FEMALE_IDLE },
      { label: 'Idle 1',        url: '/animations/feminine/idle/F_Standing_Idle_001.glb' },
      { label: 'Idle Var 1',    url: '/animations/feminine/idle/F_Standing_Idle_Variations_001.glb' },
      { label: 'Idle Var 2',    url: '/animations/feminine/idle/F_Standing_Idle_Variations_002.glb' },
      { label: 'Idle Var 3',    url: '/animations/feminine/idle/F_Standing_Idle_Variations_003.glb' },
      { label: 'Idle Var 4',    url: '/animations/feminine/idle/F_Standing_Idle_Variations_004.glb' },
      { label: 'Idle Var 5',    url: '/animations/feminine/idle/F_Standing_Idle_Variations_005.glb' },
      { label: 'Idle Var 6',    url: '/animations/feminine/idle/F_Standing_Idle_Variations_006.glb' },
    ],
    expression: [
      { label: 'Talk 1',        url: '/animations/feminine/expression/F_Talking_Variations_001.glb' },
      { label: 'Talk 2',        url: '/animations/feminine/expression/F_Talking_Variations_002.glb' },
      { label: 'Talk 3',        url: '/animations/feminine/expression/F_Talking_Variations_003.glb' },
      { label: 'Talk 4',        url: '/animations/feminine/expression/F_Talking_Variations_004.glb' },
      { label: 'Talk 5',        url: '/animations/feminine/expression/F_Talking_Variations_005.glb' },
      { label: 'Expr 1',        url: '/animations/feminine/expression/M_Standing_Expressions_001.glb' },
      { label: 'Expr 2',        url: '/animations/feminine/expression/M_Standing_Expressions_002.glb' },
      { label: 'Expr 4',        url: '/animations/feminine/expression/M_Standing_Expressions_004.glb' },
      { label: 'Expr 5',        url: '/animations/feminine/expression/M_Standing_Expressions_005.glb' },
      { label: 'Expr 6',        url: '/animations/feminine/expression/M_Standing_Expressions_006.glb' },
    ],
    dance: [
      { label: 'Dance F 1',     url: '/animations/feminine/dance/F_Dances_001.glb' },
      { label: 'Dance F 4',     url: '/animations/feminine/dance/F_Dances_004.glb' },
      { label: 'Dance F 5',     url: '/animations/feminine/dance/F_Dances_005.glb' },
      { label: 'Dance F 6',     url: '/animations/feminine/dance/F_Dances_006.glb' },
      { label: 'Dance F 7',     url: '/animations/feminine/dance/F_Dances_007.glb' },
      { label: 'Dance 1',       url: '/animations/feminine/dance/M_Dances_001.glb' },
      { label: 'Dance 2',       url: '/animations/feminine/dance/M_Dances_002.glb' },
      { label: 'Dance 3',       url: '/animations/feminine/dance/M_Dances_003.glb' },
      { label: 'Dance 4',       url: '/animations/feminine/dance/M_Dances_004.glb' },
    ],
    locomotion: [
      { label: 'Walk',          url: '/animations/feminine/locomotion/F_Walk_002.glb' },
      { label: 'Walk 2',        url: '/animations/feminine/locomotion/F_Walk_003.glb' },
      { label: 'Walk Back',     url: '/animations/feminine/locomotion/F_Walk_Backwards_001.glb' },
      { label: 'Jog',           url: '/animations/feminine/locomotion/F_Jog_001.glb' },
      { label: 'Jog Back',      url: '/animations/feminine/locomotion/F_Jog_Backwards_001.glb' },
      { label: 'Run',           url: '/animations/feminine/locomotion/F_Run_001.glb' },
      { label: 'Run Back',      url: '/animations/feminine/locomotion/F_Run_Backwards_001.glb' },
      { label: 'Jump (Walk)',   url: '/animations/feminine/locomotion/F_Walk_Jump_001.glb' },
      { label: 'Jump (Run)',    url: '/animations/feminine/locomotion/F_Run_Jump_001.glb' },
      { label: 'Falling',       url: '/animations/feminine/locomotion/F_Falling_Idle_001.glb' },
      { label: 'Crouch Walk',   url: '/animations/feminine/locomotion/F_Crouch_Walk_001.glb' },
    ],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function float32ToWav(samples: Float32Array, sampleRate = 16000): Blob {
  const len = samples.length;
  const buf = new ArrayBuffer(44 + len * 2);
  const view = new DataView(buf);
  const write = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };
  write(0, 'RIFF'); view.setUint32(4, 36 + len * 2, true);
  write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); write(36, 'data');
  view.setUint32(40, len * 2, true);
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

/**
 * Remove symbols, markdown, emojis from text before TTS.
 * The avatar should only speak natural words — no asterisks, emojis, etc.
 */
function cleanTextForTTS(text: string): string {
  return text
    .replace(/\[ANIM:[a-z_]+\]/g, '')          // Remove anim markers
    .replace(/```[\s\S]*?```/g, '')             // Remove code blocks
    .replace(/`([^`]+)`/g, '$1')               // Remove inline code backticks
    .replace(/\*\*(.+?)\*\*/g, '$1')           // Remove bold **
    .replace(/\*(.+?)\*/g, '$1')               // Remove italic *
    .replace(/_{1,2}(.+?)_{1,2}/g, '$1')       // Remove underscore emphasis
    .replace(/^#{1,6}\s+/gm, '')               // Remove headings #
    .replace(/^[\s]*[-*•]\s/gm, '')            // Remove bullet points
    .replace(/^\d+\.\s/gm, '')                 // Remove numbered lists
    .replace(/[→←↑↓►◄]/g, '')                // Remove arrows
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')   // Remove emoji (misc symbols/pictographs)
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '')   // Remove mahjong/domino
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '')   // Remove playing cards
    .replace(/[\u{1F100}-\u{1F1FF}]/gu, '')   // Remove enclosed alphanumeric
    .replace(/[\u{1F200}-\u{1F2FF}]/gu, '')   // Remove enclosed CJK
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')   // Remove emoticons
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')   // Remove transport/map
    .replace(/[\u{2600}-\u{27BF}]/gu, '')      // Remove misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')      // Remove dingbats
    .replace(/[★☆✓✗✔✘⭐❤💯🔥💫✨⚡🎉🎊]/g, '')
    .replace(/\*/g, '')                         // Remove stray asterisks
    .replace(/\s+/g, ' ')                       // Normalize spaces
    .trim();
}

function detectLang(text: string): string {
  // Arabic script
  const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
  if (arabicChars > text.length * 0.15) return 'ar';

  // Cyrillic (Russian, etc.)
  const cyrillicChars = (text.match(/[\u0400-\u04FF]/g) || []).length;
  if (cyrillicChars > text.length * 0.15) return 'ru';

  // Chinese characters
  const chineseChars = (text.match(/[\u4E00-\u9FFF\u3400-\u4DBF]/g) || []).length;
  if (chineseChars > text.length * 0.1) return 'zh';

  // Japanese (hiragana / katakana)
  const japaneseChars = (text.match(/[\u3040-\u30FF]/g) || []).length;
  if (japaneseChars > text.length * 0.1) return 'ja';

  // Korean
  const koreanChars = (text.match(/[\uAC00-\uD7AF]/g) || []).length;
  if (koreanChars > text.length * 0.1) return 'ko';

  // Latin-script language heuristics
  const lower = text.toLowerCase();

  // German: ä/ö/ü/ß or common German words
  const germanChars = (text.match(/[äöüÄÖÜß]/g) || []).length;
  const germanWords = (lower.match(/\b(der|die|das|und|nicht|ich|du|ist|haben|sein|werden|aber|auch|auf|mit|bei|von|zu|sie|wir|ihr)\b/g) || []).length;
  if (germanChars > 2 || germanWords > 1) return 'de';

  // French: accented chars or common French words
  const frenchChars = (text.match(/[éèêëàâùûîïç]/g) || []).length;
  const frenchWords = (lower.match(/\b(le|la|les|un|une|des|est|dans|avec|pour|que|qui|pas|je|tu|il|elle|nous|vous|bonjour|merci)\b/g) || []).length;
  if (frenchChars > 2 || frenchWords > 1) return 'fr';

  // Spanish: ñ/¡/¿ or common Spanish words
  const spanishChars = (text.match(/[ñÑ¡¿]/g) || []).length;
  const spanishWords = (lower.match(/\b(el|los|las|una|es|en|de|que|con|por|para|pero|como|más|yo|hola|gracias|estoy)\b/g) || []).length;
  if (spanishChars > 0 || spanishWords > 1) return 'es';

  // Italian: common Italian words
  const italianWords = (lower.match(/\b(il|lo|la|gli|le|un|una|sono|con|per|che|del|della|questo|quello|ciao|grazie)\b/g) || []).length;
  if (italianWords > 1) return 'it';

  // Let Python's edge-tts auto-detect any remaining languages (Dutch, Polish, Turkish, etc.)
  return 'auto';
}

// ── Animation helpers ─────────────────────────────────────────────────────────



/** Resolve animation ID → URL for the given gender. Returns null if ID not found. */
function resolveAnimUrl(animId: string, gender: 'male' | 'female'): string | null {
  const entry = ANIMATION_MANIFEST.find((a) => a.id === animId);
  return entry ? entry[gender] : null;
}

/** Build full avatar system prompt including animation manifest for the AI. */
function buildAvatarSystemPrompt(gender: 'male' | 'female', agentSystemPrompt?: string): string {
  const animLines = ANIMATION_MANIFEST.map((a) => `  ${a.id}: ${a.label}`).join('\n');

  const base = agentSystemPrompt?.trim()
    ? agentSystemPrompt
    : `You are a professional personal assistant embodied as a 3D ${gender} avatar.
Be direct, warm, and concise. Answer in 1-3 sentences for simple questions.
Always reply in the SAME language the user uses (Arabic, English, etc.).`;

  return `${base}

VOICE OUTPUT RULES (critical — your reply is spoken aloud):
- Write ONLY natural spoken words — no markdown, no symbols
- NO: **, *, #, -, •, \`, backticks, asterisks, bullet points, numbered lists
- NO emojis or unicode symbols in text — express emotion via [ANIM:] instead
- Write numbers as words when natural ("twenty" not "20")
- Keep sentences short and conversational

CRITICAL: ANIMATION MARKERS ARE MANDATORY!
You MUST use [ANIM:id] markers in EVERY response. NO EXCEPTIONS.

FORMAT (exact pattern required):
[ANIM:id] text here [ANIM:id] more text

Available animations:
${animLines}

WHEN TO USE WHICH ANIMATION (follow this strictly):
- User says hello/hi/مرحبا         → USE: expr_wave
- User asks you to run/ركض          → USE: run
- User asks you to dance/ارقص       → USE: dance_hype
- User asks you to walk/امش         → USE: walk
- You are explaining something      → USE: talk_explain
- You are thinking                  → USE: expr_think
- You are happy/positive            → USE: expr_happy
- Normal talking                    → USE: talk
- You agree/nod                     → USE: expr_nod
- You are confident                 → USE: expr_confident
- You are excited                   → USE: talk_excited
- You are surprised                 → USE: expr_wonder

MANDATORY RULES:
1. EVERY response MUST start with [ANIM:id]
2. Use 2-4 animation markers per response
3. Never use same animation twice in a row
4. Match animation to emotion/action

EXAMPLES (copy this pattern exactly):
User: "hi"
You: [ANIM:expr_wave] Hello there! [ANIM:talk] How can I help you?

User: "can you run?"
You: [ANIM:run] Of course I can run! [ANIM:talk] I am running right now.

User: "dance for me"
You: [ANIM:dance_hype] Dancing just for you! [ANIM:talk_excited] This is fun!

User: "مرحبا"
You: [ANIM:expr_wave] مرحبا بك! [ANIM:talk] كيف يمكنني مساعدتك؟

IMPORTANT: If you forget to use [ANIM:id] markers, the avatar will freeze!`;

}

// ── Visual FX types & constants ───────────────────────────────────────────────
interface Notif {
  id: string;
  type: 'msg' | 'task' | 'approval' | 'email' | 'whatsapp' | 'facebook' | 'instagram' | 'telegram' | 'discord' | 'stripe' | 'paypal' | 'bank' | 'applepay' | 'stock' | 'calendar' | 'terminal' | 'gif' | 'twitter' | 'tiktok' | 'linkedin' | 'snapchat' | 'youtube' | 'reddit' | 'twitch' | 'otp' | 'faceid' | 'sms_otp';
  title: string;
  body: string;
  from?: string;
  needsApproval?: boolean;
  canReply?: boolean;
  repliedWith?: string;
  /** Terminal notification fields */
  terminalCmd?: string;
  terminalOutput?: string;
  /** GIF notification — direct image URL */
  gifUrl?: string;
  /** OTP code to display */
  otpCode?: string;
  /** Face ID / fingerprint — device name */
  biometricDevice?: string;
  /** SMS OTP — phone number hint */
  phoneNumber?: string;
}

const EMOJI_PACKS: Record<string, { label: string; emojis: string[] }> = {
  party:  { label: '🎉 Party',  emojis: ['🎉','🎊','🥳','🎈','🎆','✨','🎇'] },
  love:   { label: '❤️ Love',   emojis: ['❤️','💕','💖','💗','💝','💓','🥰'] },
  money:  { label: '💰 Money',  emojis: ['💰','💸','💵','🤑','💎','🏆','👑'] },
  stars:  { label: '⭐ Stars',  emojis: ['⭐','🌟','✨','💫','🌠','🔥','⚡'] },
  fire:   { label: '🔥 Fire',   emojis: ['🔥','⚡','💥','☄️','🌪️','💢','🌊'] },
};

// ── Matrix rain canvas ────────────────────────────────────────────────────────
interface MatrixRainProps {
  speed?: number;    // interval delay ms — lower = faster (default 45)
  opacity?: number;  // canvas opacity 0-1 (default 1)
  density?: number;  // font size px — smaller = more columns/denser (default 13)
}

function MatrixRain({ speed = 45, opacity = 1, density = 13 }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const chars = 'アイウエオカキクケコサシスセソタチツテトABCDEF0123456789<>{}[]|\\/*;:';
    let cols = Math.floor(canvas.width / density);
    let drops = Array(cols).fill(0).map(() => Math.random() * -50);

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      cols = Math.floor(canvas.width / density);
      if (drops.length !== cols) drops = Array(cols).fill(0);
      drops.forEach((y, x) => {
        const c = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = '#aaffaa';
        ctx.font = `bold ${density}px monospace`;
        ctx.fillText(c, x * density, y * density);
        ctx.fillStyle = '#00bb33';
        ctx.font = `${density}px monospace`;
        if (y * density > canvas.height && Math.random() > 0.975) drops[x] = 0;
        else drops[x] += 1;
      });
    };

    const id = setInterval(draw, speed);
    return () => { clearInterval(id); window.removeEventListener('resize', resize); };
  }, [speed, density]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1, opacity }}
    />
  );
}

// ── Emoji rain ────────────────────────────────────────────────────────────────
function EmojiRain({ pack, onDone }: { pack: string[]; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5000);
    return () => clearTimeout(t);
  }, [onDone]);

  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      emoji: pack[Math.floor(Math.random() * pack.length)],
      left:  Math.random() * 95 + 2,
      delay: Math.random() * 2.8,
      dur:   2.2 + Math.random() * 2.5,
      size:  1.3 + Math.random() * 1.8,
      spin:  (Math.random() - 0.5) * 540,
    })),
  [pack]);

  return (
    <>
      <style>{`
        @keyframes emoji-rise {
          0%   { transform: translateY(0) translateX(0) scale(1);       opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translateY(-110vh) translateX(var(--e-dx)) scale(0.7); opacity: 0; }
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 60 }}>
        {particles.map(p => (
          <span
            key={p.id}
            className="absolute bottom-0 select-none"
            style={{
              left: `${p.left}%`,
              fontSize: `${p.size}rem`,
              '--e-dx': `${p.spin / 15}px`,
              animation: `emoji-rise ${p.dur}s ${p.delay}s ease-out forwards`,
            } as React.CSSProperties}
          >
            {p.emoji}
          </span>
        ))}
      </div>
    </>
  );
}


// ── Snow ──────────────────────────────────────────────────────────────────────
function SnowEffect({ speed = 60, density = 150, opacity = 1 }: { speed?: number; density?: number; opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize(); window.addEventListener('resize', resize);
    const flakes = Array.from({ length: density }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 3 + 1, vx: (Math.random() - 0.5) * 0.5, vy: Math.random() * 1 + 0.5,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      flakes.forEach(f => {
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        f.x += f.vx; f.y += f.vy;
        if (f.y > canvas.height) { f.y = -5; f.x = Math.random() * canvas.width; }
        if (f.x < 0) f.x = canvas.width; if (f.x > canvas.width) f.x = 0;
      });
    };
    const id = setInterval(draw, speed);
    return () => { clearInterval(id); window.removeEventListener('resize', resize); };
  }, [speed, density]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2, opacity }} />;
}

// ── Fireflies ─────────────────────────────────────────────────────────────────
function FirefliesEffect({ count = 30, speed = 1, opacity = 1 }: { count?: number; speed?: number; opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize(); window.addEventListener('resize', resize);
    const flies = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 2.5 + 1, vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed,
      phase: Math.random() * Math.PI * 2, hue: Math.random() * 60 + 60,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      flies.forEach(f => {
        f.phase += 0.04;
        const glow = (Math.sin(f.phase) + 1) / 2;
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 10);
        grad.addColorStop(0, `hsla(${f.hue},100%,70%,${0.9 * glow})`);
        grad.addColorStop(1, `hsla(${f.hue},100%,70%,0)`);
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `hsla(${f.hue},100%,95%,${glow})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        f.x += f.vx; f.y += f.vy;
        if (f.x < 0 || f.x > canvas.width) f.vx *= -1;
        if (f.y < 0 || f.y > canvas.height) f.vy *= -1;
      });
    };
    const id = setInterval(draw, 33);
    return () => { clearInterval(id); window.removeEventListener('resize', resize); };
  }, [count, speed]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2, opacity }} />;
}

// ── Starfield ─────────────────────────────────────────────────────────────────
function StarfieldEffect({ speed = 2, count = 200, opacity = 1 }: { speed?: number; count?: number; opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize(); window.addEventListener('resize', resize);
    const stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width - canvas.width / 2,
      y: Math.random() * canvas.height - canvas.height / 2,
      z: Math.random() * canvas.width,
    }));
    const draw = () => {
      const cx = canvas.width / 2, cy = canvas.height / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.z -= speed;
        if (s.z <= 0) { s.x = Math.random() * canvas.width - cx; s.y = Math.random() * canvas.height - cy; s.z = canvas.width; }
        const k = 128 / s.z;
        const sx = s.x * k + cx, sy = s.y * k + cy;
        const r = Math.max(0.1, (1 - s.z / canvas.width) * 2.5);
        ctx.fillStyle = `rgba(255,255,255,${1 - s.z / canvas.width})`;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
      });
    };
    const id = setInterval(draw, 16);
    return () => { clearInterval(id); window.removeEventListener('resize', resize); };
  }, [speed, count]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2, opacity }} />;
}

// ── Rain ──────────────────────────────────────────────────────────────────────
function RainEffect({ intensity = 200, speed = 15, opacity = 0.6 }: { intensity?: number; speed?: number; opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize(); window.addEventListener('resize', resize);
    const drops = Array.from({ length: intensity }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      len: Math.random() * 15 + 10, spd: Math.random() * speed + speed * 0.5,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(174,214,241,0.5)'; ctx.lineWidth = 1;
      drops.forEach(d => {
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2, d.y + d.len); ctx.stroke();
        d.y += d.spd;
        if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width; }
      });
    };
    const id = setInterval(draw, 20);
    return () => { clearInterval(id); window.removeEventListener('resize', resize); };
  }, [intensity, speed]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2, opacity }} />;
}

// ── Fire ──────────────────────────────────────────────────────────────────────
function FireEffect({ intensity = 0.8, opacity = 1 }: { intensity?: number; opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize(); window.addEventListener('resize', resize);
    const particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number }[] = [];
    const max = Math.floor(intensity * 120);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      while (particles.length < max) {
        particles.push({ x: Math.random() * canvas.width, y: canvas.height,
          vx: (Math.random() - 0.5) * 2, vy: -(Math.random() * 3 + 2),
          life: 0, maxLife: Math.random() * 60 + 40, r: Math.random() * 8 + 4 });
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.life++;
        if (p.life > p.maxLife) { particles.splice(i, 1); continue; }
        const t = p.life / p.maxLife;
        const color = t < 0.2 ? `rgba(255,255,180,${1 - t * 2})`
          : t < 0.5 ? `rgba(255,160,0,${0.9 - t})`
          : `rgba(255,50,0,${0.6 - t * 0.6})`;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(p.x + p.vx * p.life, p.y + p.vy * p.life, p.r * (1 - t * 0.5), 0, Math.PI * 2); ctx.fill();
      }
    };
    const id = setInterval(draw, 20);
    return () => { clearInterval(id); window.removeEventListener('resize', resize); };
  }, [intensity]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2, opacity }} />;
}

// ── Lightning ─────────────────────────────────────────────────────────────────
function LightningEffect({ frequency = 3, opacity = 0.8 }: { frequency?: number; opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize(); window.addEventListener('resize', resize);
    let flash = 0;
    const bolt = (x1: number, y1: number, x2: number, y2: number, off: number) => {
      if (off < 3) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); return; }
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * off;
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * off;
      bolt(x1, y1, mx, my, off / 2); bolt(mx, my, x2, y2, off / 2);
    };
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (flash > 0) {
        ctx.fillStyle = `rgba(200,220,255,${flash * 0.025})`; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = `rgba(200,220,255,${Math.min(1, flash * 0.25)})`; ctx.lineWidth = 1.5;
        ctx.shadowBlur = 18; ctx.shadowColor = '#aaccff';
        const sx = canvas.width * 0.25 + Math.random() * canvas.width * 0.5;
        bolt(sx, 0, sx + (Math.random() - 0.5) * 80, canvas.height, canvas.height / 3);
        ctx.shadowBlur = 0; flash--;
      } else if (Math.random() < frequency / 300) {
        flash = Math.floor(Math.random() * 5 + 3);
      }
    };
    const id = setInterval(draw, 30);
    return () => { clearInterval(id); window.removeEventListener('resize', resize); };
  }, [frequency]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2, opacity }} />;
}

// ── Aurora ────────────────────────────────────────────────────────────────────
function AuroraEffect({ speed = 1, opacity = 0.5 }: { speed?: number; opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize(); window.addEventListener('resize', resize);
    let t = 0;
    const BANDS: [number, number, number][] = [[0,255,150],[0,200,255],[150,0,255],[0,255,200]];
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += speed * 0.005;
      BANDS.forEach(([r, g, b], i) => {
        const off = i * 0.6;
        const wave = Math.sin(t + off) * 0.12 + 0.12;
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.5);
        grad.addColorStop(0, `rgba(${r},${g},${b},${wave})`);
        grad.addColorStop(0.6, `rgba(${r},${g},${b},${wave * 0.3})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(0, 0);
        for (let x = 0; x <= canvas.width; x += 20) {
          const y = Math.sin((x / canvas.width) * Math.PI * 3 + t + off) * canvas.height * 0.08 + canvas.height * 0.15;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, 0); ctx.closePath(); ctx.fill();
      });
    };
    const id = setInterval(draw, 30);
    return () => { clearInterval(id); window.removeEventListener('resize', resize); };
  }, [speed]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2, opacity }} />;
}

// ── Glitch ────────────────────────────────────────────────────────────────────
function GlitchEffect({ intensity = 0.3 }: { intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize(); window.addEventListener('resize', resize);
    let frames = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (frames > 0) {
        const n = Math.floor(Math.random() * 4 * intensity + 1);
        for (let i = 0; i < n; i++) {
          const y = Math.floor(Math.random() * canvas.height);
          const h = Math.floor(Math.random() * 18 * intensity + 2);
          const ox = (Math.random() - 0.5) * 28 * intensity;
          ctx.fillStyle = `rgba(255,0,80,${0.12 * intensity})`; ctx.fillRect(ox, y, canvas.width, h);
          ctx.fillStyle = `rgba(0,255,255,${0.08 * intensity})`; ctx.fillRect(-ox, y + 3, canvas.width, h);
        }
        frames--;
      } else if (Math.random() < intensity * 0.08) {
        frames = Math.floor(Math.random() * 3 + 1);
      }
    };
    const id = setInterval(draw, 50);
    return () => { clearInterval(id); window.removeEventListener('resize', resize); };
  }, [intensity]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 3 }} />;
}

// ── Scanlines ─────────────────────────────────────────────────────────────────
function ScanlinesEffect({ opacity = 0.12 }: { opacity?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 3, opacity, background: 'repeating-linear-gradient(0deg,transparent,transparent 1px,rgba(0,0,0,0.22) 1px,rgba(0,0,0,0.22) 2px)' }} />
  );
}

// ── Hologram ──────────────────────────────────────────────────────────────────
function HologramEffect({ opacity = 0.3 }: { opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize(); window.addEventListener('resize', resize);
    let sweepY = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(0,200,255,0.15)'; ctx.lineWidth = 0.5;
      for (let x = 0; x <= canvas.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
      for (let y = 0; y <= canvas.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
      ctx.fillStyle = 'rgba(0,200,255,0.5)'; ctx.fillRect(0, sweepY, canvas.width, 2);
      const sg = ctx.createLinearGradient(0, sweepY - 40, 0, sweepY);
      sg.addColorStop(0, 'transparent'); sg.addColorStop(1, 'rgba(0,200,255,0.06)');
      ctx.fillStyle = sg; ctx.fillRect(0, sweepY - 40, canvas.width, 40);
      sweepY = (sweepY + 2) % canvas.height;
    };
    const id = setInterval(draw, 20);
    return () => { clearInterval(id); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2, opacity }} />;
}

// ── Vignette Pulse ────────────────────────────────────────────────────────────
const VIGNETTE_COLORS: Record<string, [number, number, number]> = {
  blue: [0,120,255], red: [255,0,60], green: [0,220,100],
  purple: [180,0,255], gold: [255,180,0], cyan: [0,200,255],
};
function VignettePulseEffect({ color = 'blue', pulseSpeed = 2, opacity = 0.6 }: { color?: string; pulseSpeed?: number; opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize(); window.addEventListener('resize', resize);
    const [r, g, b] = VIGNETTE_COLORS[color] ?? VIGNETTE_COLORS.blue;
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += pulseSpeed * 0.02;
      const alpha = 0.2 + ((Math.sin(t) + 1) / 2) * 0.4;
      const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width*0.3, canvas.width/2, canvas.height/2, canvas.width*0.85);
      grad.addColorStop(0, 'transparent'); grad.addColorStop(1, `rgba(${r},${g},${b},${alpha})`);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    const id = setInterval(draw, 30);
    return () => { clearInterval(id); window.removeEventListener('resize', resize); };
  }, [color, pulseSpeed]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 3, opacity }} />;
}

// ── Confetti ──────────────────────────────────────────────────────────────────
function ConfettiEffect({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const pieces = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 10 + 5, h: Math.random() * 6 + 3,
      vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 2,
      angle: Math.random() * 360, va: (Math.random() - 0.5) * 10,
      color: `hsl(${Math.random() * 360},90%,60%)`,
    }));
    let frame = 0;
    let id: ReturnType<typeof setInterval>;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle * Math.PI / 180);
        ctx.fillStyle = p.color; ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h); ctx.restore();
        p.x += p.vx; p.y += p.vy; p.angle += p.va; p.vy += 0.04;
      });
      frame++;
      if (frame > 200) { clearInterval(id); onDone(); }
    };
    id = setInterval(draw, 16);
    return () => clearInterval(id);
  }, [onDone]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5, width: '100%', height: '100%' }} />;
}


// ── Notification toasts ───────────────────────────────────────────────────────

// Left-border accent color per type
const NOTIF_BORDER: Record<Notif['type'], string> = {
  msg:       'border-blue-500',
  task:      'border-purple-500',
  approval:  'border-yellow-500',
  email:     'border-red-400',
  whatsapp:  'border-green-500',
  facebook:  'border-blue-600',
  instagram: 'border-pink-500',
  telegram:  'border-sky-400',
  discord:   'border-indigo-400',
  stripe:    'border-violet-500',
  paypal:    'border-blue-400',
  bank:      'border-emerald-500',
  applepay:  'border-gray-400',
  stock:     'border-green-400',
  calendar:  'border-sky-400',
  terminal:  'border-green-500',
  gif:       'border-pink-400',
  twitter:   'border-sky-400',
  tiktok:    'border-pink-400',
  linkedin:  'border-blue-500',
  snapchat:  'border-yellow-400',
  youtube:   'border-red-500',
  reddit:    'border-orange-500',
  twitch:    'border-purple-500',
  otp:       'border-emerald-400',
  faceid:    'border-blue-400',
  sms_otp:   'border-violet-400',
};

// Real brand SVG icons with official colors
function PlatformIcon({ type }: { type: Notif['type'] }) {
  const map: Record<Notif['type'], { bg: string; node: React.ReactNode }> = {
    msg: {
      bg: '#3B82F6',
      node: <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>,
    },
    task: {
      bg: '#8B5CF6',
      node: <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>,
    },
    approval: {
      bg: '#F59E0B',
      node: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>,
    },
    email: {
      bg: '#EA4335',
      node: <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>,
    },
    whatsapp: {
      bg: '#25D366',
      node: <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>,
    },
    facebook: {
      bg: '#1877F2',
      node: <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>,
    },
    instagram: {
      bg: 'gradient-ig',
      node: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>,
    },
    telegram: {
      bg: '#2AABEE',
      node: <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>,
    },
    discord: {
      bg: '#5865F2',
      node: <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>,
    },
    stripe: {
      bg: '#635BFF',
      node: <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.91 5.623C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>,
    },
    paypal: {
      bg: '#0070BA',
      node: <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 0 0-.794.68l-.04.22-.63 3.993-.032.17a.804.804 0 0 1-.794.679H8.972a.483.483 0 0 1-.477-.558L9.945 6.24a.805.805 0 0 1 .795-.68h5.288c.79 0 1.52.09 2.167.267.965.258 1.617.755 2.03 1.494zm-2.72 3.13c.271-1.401.011-2.344-.818-2.783a4.1 4.1 0 0 0-1.893-.383h-2.556l-1.101 6.976h2.062c2.11 0 3.679-1.001 4.306-3.81zM5.152 6.24a.805.805 0 0 1 .795-.68h2.76c-.036.232-.073.468-.11.706l-.797 5.058-.027.177a.805.805 0 0 1-.795.68H4.25l.902-5.941z"/>,
    },
    bank: {
      bg: '#10B981',
      node: <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>,
    },
    applepay: {
      bg: '#000000',
      node: <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z"/>,
    },
    stock: {
      bg: '#16a34a',
      node: <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>,
    },
    calendar: {
      bg: '#0284c7',
      node: <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>,
    },
    terminal: {
      bg: '#15803d',
      node: <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zM8.71 14.29L5.41 11l3.3-3.29 1.42 1.41L8.24 11l1.89 1.88-1.42 1.41zm6.58 0l-1.42-1.41L15.76 11l-1.89-1.88 1.42-1.41L18.59 11l-3.3 3.29z"/>,
    },
    gif: {
      bg: '#db2777',
      node: <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm-8 12H8c-1.66 0-3-1.34-3-3V8c0-1.66 1.34-3 3-3h5c1.66 0 3 1.34 3 3v1h-2V8c0-.55-.45-1-1-1H8c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h5v-2h-3v-2h5v4c0 1.66-1.34 3-3 3zm8-2h-2v-2h-2v2h-2V9h2v2h2V9h2v4z"/>,
    },
    twitter: { bg: '#000000', node: <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/> },
    tiktok: { bg: '#010101', node: <><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 100 12.68 6.34 6.34 0 006.33-6.34V8.72a8.19 8.19 0 004.8 1.52V6.77a4.85 4.85 0 01-1.03-.08z" fill="#EE1D52"/><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 100 12.68 6.34 6.34 0 006.33-6.34V8.72a8.19 8.19 0 004.8 1.52V6.77a4.85 4.85 0 01-1.03-.08z" fill="white" opacity="0.4"/></> },
    linkedin: { bg: '#0A66C2', node: <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/> },
    snapchat: { bg: '#FFFC00', node: <path d="M12.166.8c4.563 0 7.674 3.165 7.674 7.928 0 1.012-.117 2.15-.234 3.21.293.078.606.117.918.117.371 0 .723-.058 1.036-.195.234.195.37.469.37.781 0 .547-.429.977-1.074 1.172-.605.195-1.27.273-1.934.273-.41 0-.82-.04-1.211-.117-1.074 2.852-3.848 4.785-7.577 4.785-3.73 0-6.504-1.933-7.578-4.785a7.643 7.643 0 01-1.21.117c-.664 0-1.329-.078-1.934-.273C.43 13.617 0 13.187 0 12.64c0-.312.137-.586.37-.781.313.137.665.195 1.036.195.312 0 .625-.039.918-.117a22.58 22.58 0 01-.234-3.21C2.09 3.965 5.2.8 9.764.8h2.402z" fill="#FFFC00"/> },
    youtube: { bg: '#FF0000', node: <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/> },
    reddit: { bg: '#FF4500', node: <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/> },
    twitch: { bg: '#9146FF', node: <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/> },
    otp: { bg: '#10B981', node: <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z"/> },
    faceid: { bg: '#1D4ED8', node: <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" stroke="white" strokeWidth="2" fill="none"/> },
    sms_otp: { bg: '#7C3AED', node: <path d="M21 10.5h.5a2 2 0 012 2v3a2 2 0 01-2 2H18a6 6 0 01-6-6V4a2 2 0 012-2h3a2 2 0 012 2v.5M3 10.5h.5m16.5 0H3.5m17 0V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-2.5M12 14v-4m0 0h4m-4 0H8" stroke="white" strokeWidth="2" fill="none"/> },
  };
  const { bg, node } = map[type];
  const bgStyle = bg === 'gradient-ig'
    ? { background: 'linear-gradient(135deg, #405DE6 0%, #833AB4 35%, #E1306C 65%, #F77737 100%)' }
    : { background: bg };
  return (
    <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={bgStyle}>
      <svg viewBox="0 0 24 24" fill="white" width="14" height="14">{node}</svg>
    </span>
  );
}

// ── Face ID / Biometric verification card ─────────────────────────────────────
function FaceIdNotifCard({ notif, onDismiss, onApprove }: { notif: Notif; onDismiss: () => void; onApprove: () => void }) {
  const [scanning, setScanning] = useState(true);
  const device = notif.biometricDevice || 'your device';
  const isApple = device.toLowerCase().includes('iphone') || device.toLowerCase().includes('ipad') || device.toLowerCase().includes('mac');
  const biometricName = isApple ? 'Face ID' : 'Fingerprint';
  const approve = () => { setScanning(false); setTimeout(onApprove, 400); };
  return (
    <div className="bg-gray-900/97 backdrop-blur border border-gray-700 border-l-4 border-l-blue-400 rounded-r-xl p-3 shadow-2xl w-72" style={{ animation: 'notif-slide 0.3s ease forwards' }}>
      <div className="flex items-start gap-2 mb-3">
        <PlatformIcon type="faceid" />
        <div className="flex-1">
          <div className="text-xs font-bold text-white">{notif.title}</div>
          <div className="text-[10px] text-gray-400">{notif.from}</div>
        </div>
        <button onClick={onDismiss} className="text-gray-600 hover:text-white text-xs">✕</button>
      </div>
      <div className="flex flex-col items-center bg-gray-800 rounded-xl py-3 mb-3">
        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 transition-all ${scanning ? 'border-blue-400 shadow-[0_0_12px_2px_rgba(96,165,250,0.5)]' : 'border-green-400'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke={scanning ? '#60A5FA' : '#4ADE80'} strokeWidth="1.5" width="26" height="26">
            {isApple
              ? <><path d="M7 3H5a2 2 0 00-2 2v2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><path d="M17 21h2a2 2 0 002-2v-2"/><path d="M12 8v4l2 2"/><circle cx="12" cy="12" r="4"/></>
              : <><path d="M12 10a2 2 0 100 4 2 2 0 000-4z"/><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17h8v-2.26C17.81 13.47 19 11.38 19 9c0-3.87-3.13-7-7-7z"/><path d="M9 21h6m-3-4v4"/></>
            }
          </svg>
        </div>
        <div className="text-[11px] text-gray-300 font-medium">{biometricName} on {device}</div>
        {scanning && <div className="text-[9px] text-blue-400 mt-0.5 animate-pulse">Waiting for biometric...</div>}
      </div>
      <div className="text-[10px] text-gray-400 text-center mb-2">{notif.body}</div>
      <div className="flex gap-2">
        <button onClick={approve} className="flex-1 text-[11px] py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors">Confirm</button>
        <button onClick={onDismiss} className="flex-1 text-[11px] py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// ── SMS OTP card ───────────────────────────────────────────────────────────────
function SmsOtpNotifCard({ notif, onDismiss }: { notif: Notif; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const code = notif.otpCode || '------';
  const phone = notif.phoneNumber || '+•• ••• ••• ••••';
  const copy = () => { navigator.clipboard.writeText(code.replace(/\s/g,'')).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  return (
    <div className="bg-gray-900/97 backdrop-blur border border-gray-700 border-l-4 border-l-violet-400 rounded-r-xl p-3 shadow-2xl w-72" style={{ animation: 'notif-slide 0.3s ease forwards' }}>
      <div className="flex items-start gap-2 mb-2">
        <PlatformIcon type="sms_otp" />
        <div className="flex-1">
          <div className="text-xs font-bold text-white">{notif.title}</div>
          <div className="text-[10px] text-gray-400">Sent to {phone}</div>
        </div>
        <button onClick={onDismiss} className="text-gray-600 hover:text-white text-xs">✕</button>
      </div>
      <div className="bg-gray-800 rounded-xl py-3 px-4 flex items-center justify-between mb-2">
        <span className="text-2xl font-mono font-bold tracking-[0.35em] text-violet-300">{code.slice(0,3)} {code.slice(3,6)}</span>
        <button onClick={copy} className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all ${copied ? 'bg-violet-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>{copied ? 'Copied!' : 'Copy'}</button>
      </div>
      <div className="text-[9px] text-gray-600 text-center">Code expires in 5 min · Do not share</div>
    </div>
  );
}

// ── OTP notification card ─────────────────────────────────────────────────────
function OtpNotifCard({ notif, onDismiss }: { notif: Notif; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const code = notif.otpCode || '------';
  const copy = () => { navigator.clipboard.writeText(code.replace(/\s/g,'')).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  return (
    <div className="bg-gray-900/97 backdrop-blur border border-gray-700 border-l-4 border-l-emerald-400 rounded-r-xl p-3 shadow-2xl w-72" style={{ animation: 'notif-slide 0.3s ease forwards' }}>
      <div className="flex items-start gap-2 mb-2">
        <PlatformIcon type="otp" />
        <div className="flex-1">
          <div className="text-xs font-bold text-white">{notif.title}</div>
          <div className="text-[10px] text-gray-400">{notif.body}</div>
        </div>
        <button onClick={onDismiss} className="text-gray-600 hover:text-white text-xs">✕</button>
      </div>
      <div className="bg-gray-800 rounded-xl py-3 px-4 flex items-center justify-between">
        <span className="text-2xl font-mono font-bold tracking-[0.35em] text-emerald-300">{code.slice(0,3)} {code.slice(3,6)}</span>
        <button onClick={copy} className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>{copied ? 'Copied!' : 'Copy'}</button>
      </div>
      <div className="text-[9px] text-gray-600 mt-1.5 text-center">Do not share this code with anyone</div>
    </div>
  );
}

// ── GIF notification card ──────────────────────────────────────────────────────
function GifNotifCard({ notif, onDismiss }: { notif: Notif; onDismiss: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const gifUrl = notif.gifUrl || '';

  return (
    <div
      className="bg-gray-900/97 backdrop-blur border border-gray-700 border-l-4 border-l-pink-400 rounded-r-xl shadow-2xl w-72 overflow-hidden"
      style={{ animation: 'notif-slide 0.3s ease forwards' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <PlatformIcon type="gif" />
          <div>
            <div className="text-xs font-bold text-white leading-tight">{notif.title}</div>
            {notif.from && <div className="text-[10px] text-gray-400">from {notif.from}</div>}
          </div>
        </div>
        <button onClick={onDismiss} className="text-gray-600 hover:text-white text-xs flex-shrink-0 ml-1">✕</button>
      </div>
      {/* GIF image */}
      {gifUrl && !error ? (
        <div className="relative bg-gray-950">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <img
            src={gifUrl}
            alt={notif.title}
            className={`w-full max-h-48 object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        </div>
      ) : (
        <div className="px-3 py-2 text-[11px] text-gray-300">{notif.body}</div>
      )}
      {/* Caption if body differs from title */}
      {notif.body && notif.body !== notif.title && (
        <div className="px-3 py-2 text-[11px] text-gray-400 border-t border-gray-800">{notif.body}</div>
      )}
    </div>
  );
}

// ── Terminal notification card ─────────────────────────────────────────────────
function TerminalNotifCard({ notif, onDismiss }: { notif: Notif; onDismiss: () => void }) {
  const [phase, setPhase] = useState<'pending' | 'typing' | 'done'>('pending');
  const [typed, setTyped] = useState('');
  const cmd = notif.terminalCmd || notif.body;
  const output = notif.terminalOutput || '(no output)';

  const handleRun = () => {
    setPhase('typing');
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(cmd.slice(0, i));
      if (i >= cmd.length) {
        clearInterval(iv);
        setTimeout(() => setPhase('done'), 250);
      }
    }, 38);
  };

  return (
    <div
      className="bg-gray-950 border border-gray-800 border-l-4 border-l-green-500 rounded-r-xl shadow-2xl w-72 overflow-hidden font-mono"
      style={{ animation: 'notif-slide 0.3s ease forwards' }}
    >
      {/* macOS-style title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-80" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 opacity-80" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 opacity-80" />
        </div>
        <span className="text-[10px] text-gray-500 tracking-wide">{notif.title || 'Terminal'}</span>
        <button onClick={onDismiss} className="text-gray-600 hover:text-white text-xs">✕</button>
      </div>

      {/* Terminal body */}
      <div className="p-3 space-y-2">
        {/* From label */}
        {notif.from && (
          <div className="text-[10px] text-gray-500">{notif.from} wants to run:</div>
        )}

        {/* Command display */}
        <div className="bg-black rounded px-2.5 py-2 text-[11px] leading-relaxed min-h-[36px]">
          {phase === 'pending' && (
            <span className="text-green-400">
              <span className="text-gray-600">$ </span>{cmd}
            </span>
          )}
          {phase === 'typing' && (
            <span className="text-green-400">
              <span className="text-gray-600">$ </span>{typed}<span className="animate-pulse text-green-400">▌</span>
            </span>
          )}
          {phase === 'done' && (
            <div className="space-y-1">
              <div className="text-green-400"><span className="text-gray-600">$ </span>{cmd}</div>
              <div className="text-gray-300 whitespace-pre-wrap text-[10px] leading-relaxed border-t border-gray-800 pt-1 mt-1">{output}</div>
            </div>
          )}
        </div>

        {/* Approve / Deny — only in pending phase */}
        {phase === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={handleRun}
              className="flex-1 text-[11px] py-1.5 rounded bg-green-700 hover:bg-green-600 text-white font-semibold transition-colors"
            >
              ▶ Run
            </button>
            <button
              onClick={onDismiss}
              className="flex-1 text-[11px] py-1.5 rounded bg-red-900 hover:bg-red-800 text-white font-semibold transition-colors"
            >
              ✕ Deny
            </button>
          </div>
        )}

        {/* Done — dismiss button */}
        {phase === 'done' && (
          <button
            onClick={onDismiss}
            className="w-full text-[11px] py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

function NotifCard({ notif, onDismiss, onApprove, onUpdate, onAiReply }: {
  notif: Notif;
  onDismiss: () => void;
  onApprove: () => void;
  onUpdate: (changes: Partial<Omit<Notif, 'id'>>) => void;
  onAiReply: () => Promise<string>;
}) {
  // Specialized cards
  if (notif.type === 'terminal') return <TerminalNotifCard notif={notif} onDismiss={onDismiss} />;
  if (notif.type === 'gif')      return <GifNotifCard      notif={notif} onDismiss={onDismiss} />;
  if (notif.type === 'otp')      return <OtpNotifCard      notif={notif} onDismiss={onDismiss} />;
  if (notif.type === 'faceid')   return <FaceIdNotifCard   notif={notif} onDismiss={onDismiss} onApprove={onApprove} />;
  if (notif.type === 'sms_otp')  return <SmsOtpNotifCard   notif={notif} onDismiss={onDismiss} />;

  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const border = NOTIF_BORDER[notif.type];
  const canReply = notif.canReply && !notif.repliedWith;

  const sendReply = () => {
    if (!replyText.trim()) return;
    onUpdate({ repliedWith: replyText.trim() });
    setShowReply(false);
    setReplyText('');
  };

  const handleAiReply = async () => {
    setAiLoading(true);
    const reply = await onAiReply();
    setAiLoading(false);
    if (reply) setReplyText(reply);
  };

  return (
    <div
      className={`bg-gray-900/96 backdrop-blur border border-gray-700 border-l-4 ${border} rounded-r-xl p-3 shadow-2xl w-72`}
      style={{ animation: 'notif-slide 0.3s ease forwards' }}
    >
      <div className="flex items-start gap-2">
        <PlatformIcon type={notif.type} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-white leading-tight">{notif.title}</div>
          {notif.from && <div className="text-[10px] text-gray-400 mt-0.5">from {notif.from}</div>}
          <div className="text-[11px] text-gray-300 mt-1 leading-relaxed">{notif.body}</div>
        </div>
        <button onClick={onDismiss} className="text-gray-600 hover:text-white ml-1 text-xs flex-shrink-0 leading-none">✕</button>
      </div>

      {/* Approval buttons */}
      {notif.needsApproval && (
        <div className="flex gap-2 mt-2">
          <button onClick={onApprove} className="flex-1 text-[11px] py-1 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors">✓ Approve</button>
          <button onClick={onDismiss}  className="flex-1 text-[11px] py-1 rounded-lg bg-red-700 hover:bg-red-600 text-white font-semibold transition-colors">✕ Deny</button>
        </div>
      )}

      {/* Replied badge */}
      {notif.repliedWith && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="text-[10px] text-green-400 font-semibold mb-0.5">Replied:</div>
          <div className="text-[10px] text-gray-300 leading-relaxed">{notif.repliedWith}</div>
        </div>
      )}

      {/* Reply section */}
      {canReply && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          {!showReply ? (
            <button
              onClick={() => setShowReply(true)}
              className="text-[11px] px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors w-full text-left"
            >
              ↩ Reply
            </button>
          ) : (
            <div className="space-y-1">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                rows={2}
                className="w-full text-[10px] bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex gap-1">
                <button
                  onClick={handleAiReply}
                  disabled={aiLoading}
                  className="flex-1 text-[10px] py-1 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 text-white transition-colors font-semibold"
                >
                  {aiLoading ? '⏳ Generating...' : '✦ AI Reply'}
                </button>
                <button
                  onClick={sendReply}
                  disabled={!replyText.trim()}
                  className="flex-1 text-[10px] py-1 rounded-lg bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 text-white transition-colors font-semibold"
                >
                  Send ↗
                </button>
                <button
                  onClick={() => { setShowReply(false); setReplyText(''); }}
                  className="px-2 text-[10px] py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotifStack({ notifs, onDismiss, onApprove, onUpdate, onAiReply }: {
  notifs: Notif[];
  onDismiss: (id: string) => void;
  onApprove: (id: string) => void;
  onUpdate: (id: string, changes: Partial<Omit<Notif, 'id'>>) => void;
  onAiReply: (notif: Notif) => Promise<string>;
}) {
  if (notifs.length === 0) return null;
  return (
    <>
      <style>{`
        @keyframes notif-slide {
          from { transform: translateX(110%); opacity:0; }
          to   { transform: translateX(0);    opacity:1; }
        }
      `}</style>
      <div className="absolute right-2 top-16 z-50 space-y-2 pointer-events-none" style={{ maxWidth: 290 }}>
        {notifs.map(n => (
          <div key={n.id} className="pointer-events-auto">
            <NotifCard
              notif={n}
              onDismiss={() => onDismiss(n.id)}
              onApprove={() => onApprove(n.id)}
              onUpdate={(changes) => onUpdate(n.id, changes)}
              onAiReply={() => onAiReply(n)}
            />
          </div>
        ))}
      </div>
    </>
  );
}

// ── Spotify overlay ───────────────────────────────────────────────────────────
function extractSpotifyEmbed(url: string): string | null {
  if (!url.trim()) return null;
  // Already an embed URL — use as-is
  if (url.includes('open.spotify.com/embed/')) return url.split('?')[0];
  // spotify:type:id URI
  const uriMatch = url.match(/spotify:(track|album|playlist|artist|show|episode):([A-Za-z0-9]+)/);
  if (uriMatch) return `https://open.spotify.com/embed/${uriMatch[1]}/${uriMatch[2]}`;
  // Web URL — handles locale prefix like /intl-de/, /intl-ar/, /intl-en-GB/
  const webMatch = url.match(
    /open\.spotify\.com\/(?:intl-[a-zA-Z-]+\/)?(track|album|playlist|artist|show|episode)\/([A-Za-z0-9]+)/
  );
  if (webMatch) return `https://open.spotify.com/embed/${webMatch[1]}/${webMatch[2]}`;
  return null;
}

function SpotifyOverlay({ embedUrl, onClose }: { embedUrl: string; onClose: () => void }) {
  const [minimized, setMinimized] = useState(false);
  const src = `${embedUrl}?utm_source=generator&theme=0`;
  return (
    <>
      <style>{`
        @keyframes spotify-in {
          from { transform: translateY(100px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
      `}</style>
      <div
        className="absolute bottom-20 left-4 z-50 rounded-2xl overflow-hidden shadow-2xl border border-gray-700"
        style={{ animation: 'spotify-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards', width: minimized ? 200 : 340 }}
      >
        <div className="flex items-center gap-2 px-3 py-2 bg-[#191414]">
          <span className="text-[#1DB954] text-sm font-bold flex-1">♪ Spotify</span>
          <button
            onClick={() => setMinimized(m => !m)}
            title={minimized ? 'Expand' : 'Minimize'}
            className="text-gray-400 hover:text-white text-[10px] px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-600 transition-colors"
          >
            {minimized ? '▲' : '▼'}
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="text-gray-400 hover:text-red-400 text-[10px] px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>
        {!minimized && (
          <iframe
            src={src}
            width="340"
            height="152"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ border: 'none', display: 'block' }}
          />
        )}
      </div>
    </>
  );
}

// ── UI Component overlays (SpecRenderer cards on canvas) ─────────────────────
interface UIOverlayItem {
  id: string;
  title: string;
  spec: Spec;
  duration: number;
}

// ── UI component catalog — all 54 components + 8 pre-built demos ─────────────
interface UIComponentEntry { id: string; name: string; category: string; duration: number; spec: Spec }

function singleSpec(type: string, props: Record<string, unknown>): Spec {
  return { root: 'r', elements: { r: { type, props, children: [] } } };
}

const ALL_UI_COMPONENTS: UIComponentEntry[] = [
  // ── Pre-built multi-component demos ──────────────────────────────────────
  { id: 'stock_aapl',        name: 'AAPL Stock Today',   category: 'Demo', duration: 10000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['m','c']}, m:{type:'Metric',props:{label:'AAPL — Apple Inc.',value:'$189.30',detail:'+$2.45 (+1.31%) today',trend:'up'},children:[]}, c:{type:'LineChart',props:{title:null,data:[{time:'9:30',price:184.2},{time:'10:00',price:185.8},{time:'10:30',price:184.9},{time:'11:00',price:186.2},{time:'11:30',price:187.5},{time:'12:00',price:186.8},{time:'12:30',price:188.1},{time:'13:00',price:189.3}],xKey:'time',yKey:'price',color:'#22c55e',height:110},children:[]} } } },
  { id: 'stock_tsla_down',   name: 'TSLA Stock Alert',   category: 'Demo', duration: 10000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['m','c']}, m:{type:'Metric',props:{label:'TSLA — Tesla Inc.',value:'$218.50',detail:'-$8.20 (-3.62%) today',trend:'down'},children:[]}, c:{type:'LineChart',props:{title:null,data:[{time:'9:30',price:227.1},{time:'10:00',price:225.3},{time:'10:30',price:224.0},{time:'11:00',price:222.8},{time:'11:30',price:221.4},{time:'12:00',price:220.1},{time:'12:30',price:219.3},{time:'13:00',price:218.5}],xKey:'time',yKey:'price',color:'#ef4444',height:110},children:[]} } } },
  { id: 'calendar_today',    name: "Today's Schedule",   category: 'Demo', duration: 9000,  spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['cv','tl']}, cv:{type:'CalendarView',props:{title:null,selectedDates:['2026-02-18','2026-02-20','2026-02-25']},children:[]}, tl:{type:'Timeline',props:{items:[{title:'Team Sync',description:'10:00 AM — Zoom',date:null,status:'completed'},{title:'Design Review',description:'2:00 PM — Conference Room',date:null,status:'current'},{title:'Client Call',description:'4:30 PM — Google Meet',date:null,status:'upcoming'}]},children:[]} } } },
  { id: 'task_checklist',    name: 'Daily Tasks',        category: 'Demo', duration: 9000,  spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['h','cl','pb']}, h:{type:'Heading',props:{text:"Today's Goals",level:'h3'},children:[]}, cl:{type:'CheckboxList',props:{items:[{id:'1',label:'Review pull requests',checked:true,disabled:null},{id:'2',label:'Deploy v2.1 to staging',checked:true,disabled:null},{id:'3',label:'Write release notes',checked:false,disabled:null},{id:'4',label:'Update team on progress',checked:false,disabled:null}]},children:[]}, pb:{type:'ProgressBar',props:{label:'Completion',value:50,max:null,color:'success',showPercent:true},children:[]} } } },
  { id: 'approval_choice',   name: 'Quick Decision',     category: 'Demo', duration: 12000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'md',direction:'vertical'},children:['al','rg']}, al:{type:'Alert',props:{title:'Deploy to Production?',description:'v2.1.0 has passed all staging checks. Estimated downtime: 2 minutes.',variant:'default'},children:[]}, rg:{type:'RadioGroup',props:{label:'Your decision:',options:[{value:'yes',label:'Yes — Deploy now'},{value:'later',label:'Schedule for tonight'},{value:'no',label:'No — Need more review'}],value:null,description:null},children:[]} } } },
  { id: 'portfolio_summary', name: 'Portfolio Overview', category: 'Demo', duration: 10000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['g','pc']}, g:{type:'Grid',props:{columns:2,gap:'sm'},children:['m1','m2']}, m1:{type:'Metric',props:{label:'Total Value',value:'$24,830',detail:null,trend:'up'},children:[]}, m2:{type:'Metric',props:{label:'Day P&L',value:'+$312',detail:'+1.27%',trend:'up'},children:[]}, pc:{type:'PieChart',props:{title:'Allocation',data:[{name:'Tech',value:45},{name:'Finance',value:20},{name:'Health',value:15},{name:'Energy',value:12},{name:'Other',value:8}],nameKey:'name',valueKey:'value',height:140},children:[]} } } },
  { id: 'weather_report',    name: 'Weather Now',        category: 'Demo', duration: 8000,  spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['wc','bc']}, wc:{type:'WeatherCard',props:{location:'Berlin',temperature:8,condition:'cloudy',humidity:72,wind:18,unit:'C',feelsLike:null,size:'md',forecast:null},children:[]}, bc:{type:'BarChart',props:{title:'7-Day Forecast',data:[{day:'Mon',temp:8},{day:'Tue',temp:10},{day:'Wed',temp:7},{day:'Thu',temp:12},{day:'Fri',temp:15},{day:'Sat',temp:14},{day:'Sun',temp:11}],xKey:'day',yKey:'temp',color:'#60a5fa',height:80},children:[]} } } },
  { id: 'team_standup',      name: 'Team Standup',       category: 'Demo', duration: 10000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['h','t']}, h:{type:'Heading',props:{text:'Daily Standup — Status',level:'h3'},children:[]}, t:{type:'Table',props:{data:[{name:'Ahmad',status:'Done',task:'API integration'},{name:'Sarah',status:'In Progress',task:'UI redesign'},{name:'Omar',status:'Blocked',task:'DB migration'},{name:'Leila',status:'Done',task:'Tests'}],columns:[{key:'name',label:'Name'},{key:'status',label:'Status'},{key:'task',label:'Task'}],emptyMessage:null},children:[]} } } },
  // ── Layout ───────────────────────────────────────────────────────────────
  { id: 'c_card',      name: 'Card',      category: 'Layout', duration: 6000, spec: { root:'r', elements:{ r:{type:'Card',props:{title:'Summary Card',description:'A container for grouping related content.'},children:['c']}, c:{type:'Metric',props:{label:'Total Items',value:'42',detail:null,trend:'neutral'},children:[]} } } },
  { id: 'c_stack',     name: 'Stack',     category: 'Layout', duration: 7000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'md',direction:'vertical'},children:['m1','m2','m3']}, m1:{type:'Metric',props:{label:'Revenue',value:'$12,450',detail:'+8.2%',trend:'up'},children:[]}, m2:{type:'Metric',props:{label:'Users',value:'3,842',detail:'+124',trend:'up'},children:[]}, m3:{type:'Metric',props:{label:'Errors',value:'12',detail:'-3',trend:'down'},children:[]} } } },
  { id: 'c_grid',      name: 'Grid',      category: 'Layout', duration: 7000, spec: { root:'r', elements:{ r:{type:'Grid',props:{columns:2,gap:'md'},children:['m1','m2','m3','m4']}, m1:{type:'Metric',props:{label:'Revenue',value:'$12,450',detail:null,trend:'up'},children:[]}, m2:{type:'Metric',props:{label:'Users',value:'3,842',detail:null,trend:'up'},children:[]}, m3:{type:'Metric',props:{label:'Churn',value:'1.2%',detail:null,trend:'down'},children:[]}, m4:{type:'Metric',props:{label:'NPS',value:'72',detail:null,trend:'neutral'},children:[]} } } },
  { id: 'c_separator', name: 'Separator', category: 'Layout', duration: 5000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['t1','s','t2']}, t1:{type:'Text',props:{content:'Section A — above the separator',muted:null,size:'sm'},children:[]}, s:{type:'Separator',props:{},children:[]}, t2:{type:'Text',props:{content:'Section B — below the separator',muted:true,size:'sm'},children:[]} } } },
  // ── Typography ───────────────────────────────────────────────────────────
  { id: 'c_heading',   name: 'Heading',   category: 'Typography', duration: 6000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['h1','h2','h3','h4']}, h1:{type:'Heading',props:{text:'H1 — Main Title',level:'h1'},children:[]}, h2:{type:'Heading',props:{text:'H2 — Section Title',level:'h2'},children:[]}, h3:{type:'Heading',props:{text:'H3 — Subsection',level:'h3'},children:[]}, h4:{type:'Heading',props:{text:'H4 — Label',level:'h4'},children:[]} } } },
  { id: 'c_text',      name: 'Text',      category: 'Typography', duration: 6000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['t1','t2','t3']}, t1:{type:'Text',props:{content:'Normal text — the default paragraph style for body copy.',muted:null,size:'base'},children:[]}, t2:{type:'Text',props:{content:'Muted text — used for secondary or supporting information.',muted:true,size:'sm'},children:[]}, t3:{type:'Text',props:{content:'Large text — for introductory or featured paragraphs.',muted:null,size:'lg'},children:[]} } } },
  { id: 'c_link',      name: 'Link',      category: 'Typography', duration: 5000, spec: singleSpec('Link', {text:'Visit our documentation',href:'https://example.com'}) },
  // ── Data Display ─────────────────────────────────────────────────────────
  { id: 'c_metric',    name: 'Metric',    category: 'Data', duration: 6000, spec: { root:'r', elements:{ r:{type:'Grid',props:{columns:2,gap:'sm'},children:['m1','m2','m3','m4']}, m1:{type:'Metric',props:{label:'Revenue',value:'$48,200',detail:'+12% this month',trend:'up'},children:[]}, m2:{type:'Metric',props:{label:'Expenses',value:'$18,750',detail:'-3% vs last month',trend:'down'},children:[]}, m3:{type:'Metric',props:{label:'Active Users',value:'9,241',detail:null,trend:'neutral'},children:[]}, m4:{type:'Metric',props:{label:'Retention',value:'94.2%',detail:'+1.1%',trend:'up'},children:[]} } } },
  { id: 'c_badge',     name: 'Badge',     category: 'Data', duration: 6000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'horizontal'},children:['b1','b2','b3','b4','b5','b6']}, b1:{type:'Badge',props:{text:'Default',variant:'default'},children:[]}, b2:{type:'Badge',props:{text:'Active',variant:'success'},children:[]}, b3:{type:'Badge',props:{text:'Warning',variant:'warning'},children:[]}, b4:{type:'Badge',props:{text:'Error',variant:'destructive'},children:[]}, b5:{type:'Badge',props:{text:'Secondary',variant:'secondary'},children:[]}, b6:{type:'Badge',props:{text:'Outline',variant:'outline'},children:[]} } } },
  { id: 'c_table',     name: 'Table',     category: 'Data', duration: 8000, spec: singleSpec('Table', {data:[{name:'Alice Smith',role:'Engineer',status:'Active',score:'98%'},{name:'Bob Jones',role:'Designer',status:'Active',score:'94%'},{name:'Carol Wu',role:'PM',status:'Inactive',score:'87%'},{name:'David Kim',role:'DevOps',status:'Active',score:'92%'}],columns:[{key:'name',label:'Name'},{key:'role',label:'Role'},{key:'status',label:'Status'},{key:'score',label:'Score'}],emptyMessage:null}) },
  { id: 'c_callout',   name: 'Callout',   category: 'Data', duration: 7000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['c1','c2','c3','c4']}, c1:{type:'Callout',props:{type:'info',title:'Info',content:'This is informational content about the system.'},children:[]}, c2:{type:'Callout',props:{type:'tip',title:'Tip',content:'Pro tip: use keyboard shortcuts to speed up your workflow.'},children:[]}, c3:{type:'Callout',props:{type:'warning',title:'Warning',content:'This action will affect all users in the organization.'},children:[]}, c4:{type:'Callout',props:{type:'important',title:'Important',content:'Please back up your data before proceeding.'},children:[]} } } },
  { id: 'c_timeline',  name: 'Timeline',  category: 'Data', duration: 8000, spec: singleSpec('Timeline', {items:[{title:'Project Kickoff',description:'Initial planning and team assembly',date:'2026-01-01',status:'completed'},{title:'Design Phase',description:'UI/UX wireframes and prototyping',date:'2026-01-15',status:'completed'},{title:'Development',description:'Core feature implementation',date:'2026-02-01',status:'current'},{title:'Testing',description:'QA and bug fixes',date:'2026-03-01',status:'upcoming'},{title:'Launch',description:'Production deployment',date:'2026-04-01',status:'upcoming'}]}) },
  { id: 'c_accordion', name: 'Accordion', category: 'Data', duration: 7000, spec: singleSpec('Accordion', {items:[{title:'What is Agent Player?',content:'An AI agent platform for deploying and managing conversational AI assistants with avatar support.'},{title:'How does voice work?',content:'Uses Edge TTS for synthesis and faster-whisper for transcription, running locally on your machine.'},{title:'Is my data private?',content:'Fully local: frontend, backend, and database all run on localhost. Only your message text reaches the Anthropic API.'}]}) },
  // ── Charts ────────────────────────────────────────────────────────────────
  { id: 'c_barchart',  name: 'BarChart',  category: 'Charts', duration: 8000, spec: singleSpec('BarChart', {title:'Monthly Sales Q1 2026',data:[{month:'Jan',sales:12400},{month:'Feb',sales:15800},{month:'Mar',sales:14200},{month:'Apr',sales:18900},{month:'May',sales:17300},{month:'Jun',sales:21100}],xKey:'month',yKey:'sales',color:'#6366f1',height:160}) },
  { id: 'c_linechart', name: 'LineChart', category: 'Charts', duration: 8000, spec: singleSpec('LineChart', {title:'Server Response Time (ms)',data:[{time:'00:00',ms:120},{time:'04:00',ms:98},{time:'08:00',ms:185},{time:'12:00',ms:240},{time:'16:00',ms:210},{time:'20:00',ms:145},{time:'24:00',ms:118}],xKey:'time',yKey:'ms',color:'#22c55e',height:160}) },
  { id: 'c_piechart',  name: 'PieChart',  category: 'Charts', duration: 8000, spec: singleSpec('PieChart', {title:'Traffic Sources',data:[{source:'Organic',value:42},{source:'Direct',value:28},{source:'Social',value:18},{source:'Email',value:8},{source:'Other',value:4}],nameKey:'source',valueKey:'value',height:180}) },
  { id: 'c_areachart', name: 'AreaChart', category: 'Charts', duration: 8000, spec: singleSpec('AreaChart', {title:'Active Users Over Time',data:[{week:'W1',users:1200},{week:'W2',users:1450},{week:'W3',users:1380},{week:'W4',users:1820},{week:'W5',users:2100},{week:'W6',users:1950},{week:'W7',users:2340}],xKey:'week',yKey:'users',color:'#f59e0b',height:160,gradient:true}) },
  // ── Interactive ───────────────────────────────────────────────────────────
  { id: 'c_button',    name: 'Button',       category: 'Interactive', duration: 6000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'horizontal'},children:['b1','b2','b3','b4','b5']}, b1:{type:'Button',props:{label:'Default',variant:'default',size:null},children:[]}, b2:{type:'Button',props:{label:'Secondary',variant:'secondary',size:null},children:[]}, b3:{type:'Button',props:{label:'Outline',variant:'outline',size:null},children:[]}, b4:{type:'Button',props:{label:'Ghost',variant:'ghost',size:null},children:[]}, b5:{type:'Button',props:{label:'Destructive',variant:'destructive',size:null},children:[]} } } },
  { id: 'c_checklist', name: 'CheckboxList', category: 'Interactive', duration: 7000, spec: singleSpec('CheckboxList', {items:[{id:'1',label:'Enable two-factor authentication',checked:true,disabled:null},{id:'2',label:'Subscribe to product updates',checked:true,disabled:null},{id:'3',label:'Allow anonymous analytics',checked:false,disabled:null},{id:'4',label:'Enable beta features',checked:false,disabled:null},{id:'5',label:'Legacy API (deprecated)',checked:false,disabled:true}]}) },
  { id: 'c_radiogrp',  name: 'RadioGroup',   category: 'Interactive', duration: 6000, spec: singleSpec('RadioGroup', {label:'Select subscription plan',options:[{value:'free',label:'Free — 5 agents, 100 messages/day'},{value:'pro',label:'Pro — 25 agents, unlimited messages'},{value:'enterprise',label:'Enterprise — unlimited everything'}],value:'free',description:'You can change your plan at any time.'}) },
  { id: 'c_switchrow', name: 'SwitchRow',    category: 'Interactive', duration: 6000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['s1','s2','s3']}, s1:{type:'SwitchRow',props:{label:'Dark Mode',description:'Use dark theme across the app',checked:true},children:[]}, s2:{type:'SwitchRow',props:{label:'Email Notifications',description:'Receive alerts via email',checked:false},children:[]}, s3:{type:'SwitchRow',props:{label:'Auto-save',description:'Save drafts automatically every 30 seconds',checked:true},children:[]} } } },
  { id: 'c_sliderrow', name: 'SliderRow',    category: 'Interactive', duration: 6000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['s1','s2','s3']}, s1:{type:'SliderRow',props:{label:'Volume',value:70,min:0,max:100,step:null,showValue:true},children:[]}, s2:{type:'SliderRow',props:{label:'Brightness',value:85,min:0,max:100,step:null,showValue:true},children:[]}, s3:{type:'SliderRow',props:{label:'Zoom Level',value:4,min:1,max:10,step:1,showValue:true},children:[]} } } },
  { id: 'c_togglebtn', name: 'ToggleButton', category: 'Interactive', duration: 5000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'horizontal'},children:['t1','t2','t3','t4']}, t1:{type:'ToggleButton',props:{label:'Bold',pressed:true,variant:'outline',size:null},children:[]}, t2:{type:'ToggleButton',props:{label:'Italic',pressed:false,variant:'outline',size:null},children:[]}, t3:{type:'ToggleButton',props:{label:'Underline',pressed:true,variant:'outline',size:null},children:[]}, t4:{type:'ToggleButton',props:{label:'Strike',pressed:false,variant:'outline',size:null},children:[]} } } },
  { id: 'c_togglegrp', name: 'ToggleGroup',  category: 'Interactive', duration: 5000, spec: singleSpec('ToggleGroup', {label:'View Mode',options:[{value:'day',label:'Day'},{value:'week',label:'Week'},{value:'month',label:'Month'},{value:'year',label:'Year'}],value:'week',variant:'outline'}) },
  { id: 'c_tabs',      name: 'Tabs',         category: 'Interactive', duration: 7000, spec: { root:'r', elements:{ r:{type:'Tabs',props:{defaultValue:'overview',tabs:[{value:'overview',label:'Overview'},{value:'metrics',label:'Metrics'},{value:'settings',label:'Settings'}]},children:['tc1','tc2','tc3']}, tc1:{type:'TabContent',props:{value:'overview'},children:['t1']}, tc2:{type:'TabContent',props:{value:'metrics'},children:['t2']}, tc3:{type:'TabContent',props:{value:'settings'},children:['t3']}, t1:{type:'Text',props:{content:'Overview tab — general summary information.',muted:null,size:null},children:[]}, t2:{type:'Metric',props:{label:'Key Metric',value:'98.7%',detail:'uptime this month',trend:'up'},children:[]}, t3:{type:'Text',props:{content:'Settings tab — configuration options.',muted:true,size:'sm'},children:[]} } } },
  // ── Status / Feedback ─────────────────────────────────────────────────────
  { id: 'c_progress',  name: 'ProgressBar',   category: 'Status', duration: 6000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['p1','p2','p3','p4']}, p1:{type:'ProgressBar',props:{label:'Upload Progress',value:72,max:null,color:'default',showPercent:true},children:[]}, p2:{type:'ProgressBar',props:{label:'Build Success Rate',value:94,max:null,color:'success',showPercent:true},children:[]}, p3:{type:'ProgressBar',props:{label:'Memory Usage',value:68,max:null,color:'warning',showPercent:true},children:[]}, p4:{type:'ProgressBar',props:{label:'Disk Usage',value:89,max:null,color:'destructive',showPercent:true},children:[]} } } },
  { id: 'c_alert',     name: 'Alert',         category: 'Status', duration: 6000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['a1','a2']}, a1:{type:'Alert',props:{title:'Deployment Successful',description:'Version 2.1.0 has been deployed to production. All health checks passing.',variant:'default'},children:[]}, a2:{type:'Alert',props:{title:'Critical Error',description:'Database connection failed. Service is degraded. Check your connection settings.',variant:'destructive'},children:[]} } } },
  { id: 'c_skeleton',  name: 'SkeletonBlock', category: 'Status', duration: 5000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'md',direction:'vertical'},children:['s1','s2','s3']}, s1:{type:'SkeletonBlock',props:{lines:null,type:'avatar-row'},children:[]}, s2:{type:'SkeletonBlock',props:{lines:3,type:'text'},children:[]}, s3:{type:'SkeletonBlock',props:{lines:null,type:'card'},children:[]} } } },
  { id: 'c_usercard',  name: 'UserCard',      category: 'Status', duration: 6000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['u1','u2','u3']}, u1:{type:'UserCard',props:{name:'Ahmad Hassan',role:'Lead Engineer',email:'ahmad@example.com',src:null,size:'md'},children:[]}, u2:{type:'UserCard',props:{name:'Sarah Chen',role:'Product Designer',email:'sarah@example.com',src:null,size:'md'},children:[]}, u3:{type:'UserCard',props:{name:'Omar Al-Rashid',role:'DevOps',email:'omar@example.com',src:null,size:'md'},children:[]} } } },
  // ── Calendar ──────────────────────────────────────────────────────────────
  { id: 'c_calendar',  name: 'CalendarView',  category: 'Calendar', duration: 8000, spec: singleSpec('CalendarView', {title:'February 2026',selectedDates:['2026-02-18','2026-02-19','2026-02-20','2026-02-25','2026-02-26']}) },
  // ── Navigation ────────────────────────────────────────────────────────────
  { id: 'c_breadcrumb',   name: 'Breadcrumb',   category: 'Navigation', duration: 5000, spec: singleSpec('Breadcrumb', {items:[{label:'Dashboard',href:'/'},{label:'Agents',href:'/agents'},{label:'Configuration',href:'/agents/config'},{label:'Max',href:null}]}) },
  { id: 'c_pagination',   name: 'PaginationBar', category: 'Navigation', duration: 5000, spec: singleSpec('PaginationBar', {currentPage:4,totalPages:12,showLabel:true}) },
  { id: 'c_carousel',     name: 'Carousel',      category: 'Navigation', duration: 8000, spec: singleSpec('Carousel', {items:[{title:'Feature 1',description:'Multi-agent orchestration with task pipelines',imageUrl:null},{title:'Feature 2',description:'Real-time voice conversation with 3D avatar',imageUrl:null},{title:'Feature 3',description:'Full agentic loop with 18 built-in tools',imageUrl:null},{title:'Feature 4',description:'Generative UI with 53 components',imageUrl:null}],autoPlay:null}) },
  // ── Advanced UI ───────────────────────────────────────────────────────────
  { id: 'c_tooltip',      name: 'TooltipText',       category: 'Advanced', duration: 6000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['t1','t2','t3']}, t1:{type:'TooltipText',props:{text:'P99 Latency',tooltip:'99th percentile response time — 99% of requests complete within this time',muted:null},children:[]}, t2:{type:'TooltipText',props:{text:'TTFB',tooltip:'Time To First Byte — measures server response speed',muted:true},children:[]}, t3:{type:'TooltipText',props:{text:'Apdex Score',tooltip:'Application Performance Index — 0.0 (worst) to 1.0 (perfect)',muted:null},children:[]} } } },
  { id: 'c_collapsible',  name: 'CollapsibleSection', category: 'Advanced', duration: 7000, spec: { root:'r', elements:{ r:{type:'CollapsibleSection',props:{title:'Advanced Configuration',defaultOpen:true},children:['c']}, c:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['s1','s2']}, s1:{type:'SwitchRow',props:{label:'Debug Mode',description:'Log verbose output to console',checked:false},children:[]}, s2:{type:'SwitchRow',props:{label:'Experimental Features',description:'Enable unstable features in development',checked:true},children:[]} } } },
  { id: 'c_scrollbox',    name: 'ScrollBox',         category: 'Advanced', duration: 7000, spec: { root:'r', elements:{ r:{type:'ScrollBox',props:{maxHeight:160},children:['s']}, s:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['i1','i2','i3','i4','i5','i6','i7','i8']}, i1:{type:'Text',props:{content:'• Log 001 — Server started on port 41522',muted:null,size:'sm'},children:[]}, i2:{type:'Text',props:{content:'• Log 002 — Database connected successfully',muted:null,size:'sm'},children:[]}, i3:{type:'Text',props:{content:'• Log 003 — 3 agents loaded from config',muted:null,size:'sm'},children:[]}, i4:{type:'Text',props:{content:'• Log 004 — WebSocket server listening',muted:null,size:'sm'},children:[]}, i5:{type:'Text',props:{content:'• Log 005 — Cron scheduler initialized',muted:null,size:'sm'},children:[]}, i6:{type:'Text',props:{content:'• Log 006 — Storage manager ready',muted:null,size:'sm'},children:[]}, i7:{type:'Text',props:{content:'• Log 007 — TTS engine warm',muted:null,size:'sm'},children:[]}, i8:{type:'Text',props:{content:'• Log 008 — Ready to accept connections',muted:true,size:'sm'},children:[]} } } },
  { id: 'c_hovercard',    name: 'HoverCard',         category: 'Advanced', duration: 6000, spec: singleSpec('HoverCard', {triggerText:'@ahmad.hassan',title:'Ahmad Hassan',description:'Lead Engineer — ahmad@example.com — Joined 2024'}) },
  { id: 'c_otp',          name: 'OTPDisplay',        category: 'Advanced', duration: 6000, spec: singleSpec('OTPDisplay', {length:6,label:'Verification Code',placeholder:null}) },
  { id: 'c_sidepanel',    name: 'SidePanel',         category: 'Advanced', duration: 7000, spec: { root:'r', elements:{ r:{type:'SidePanel',props:{title:'Agent Details',description:'Configuration and stats for this agent',side:'right'},children:['c']}, c:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['u','m']}, u:{type:'UserCard',props:{name:'Max',role:'Primary Agent',email:null,src:null,size:'sm'},children:[]}, m:{type:'Metric',props:{label:'Tasks Completed',value:'142',detail:'this week',trend:'up'},children:[]} } } },
  { id: 'c_drawercard',   name: 'DrawerCard',        category: 'Advanced', duration: 7000, spec: { root:'r', elements:{ r:{type:'DrawerCard',props:{title:'Quick Actions',description:null},children:['c']}, c:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['b1','b2','b3']}, b1:{type:'Button',props:{label:'Create New Task',variant:'default',size:null},children:[]}, b2:{type:'Button',props:{label:'View Analytics',variant:'outline',size:null},children:[]}, b3:{type:'Button',props:{label:'Export Data',variant:'ghost',size:null},children:[]} } } },
  { id: 'c_alertdlg',     name: 'AlertDialogCard',   category: 'Advanced', duration: 7000, spec: singleSpec('AlertDialogCard', {title:'Delete Agent?',description:'This will permanently delete the agent and all associated data, including chat history, memory, and configuration. This action cannot be undone.',confirmLabel:'Delete Agent',cancelLabel:'Cancel',variant:'destructive'}) },
  { id: 'c_dialogcard',   name: 'DialogCard',        category: 'Advanced', duration: 6000, spec: { root:'r', elements:{ r:{type:'DialogCard',props:{title:'Edit Agent Profile',description:'Update agent name, emoji, and system prompt.'},children:['c']}, c:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['t','b']}, t:{type:'Text',props:{content:'Agent Name: Max\nRole: Primary assistant\nModel: Claude Sonnet',muted:null,size:'sm'},children:[]}, b:{type:'Button',props:{label:'Save Changes',variant:'default',size:null},children:[]} } } },
  { id: 'c_dropdown',     name: 'DropdownList',      category: 'Advanced', duration: 7000, spec: singleSpec('DropdownList', {label:'File',items:[{label:'New Chat',shortcut:'Ctrl+N',disabled:null,separator:null},{label:'Import Session',shortcut:'Ctrl+I',disabled:null,separator:null},{label:'Export History',shortcut:null,disabled:null,separator:true},{label:'Clear All',shortcut:null,disabled:false,separator:null}]}) },
  { id: 'c_command',      name: 'CommandSearch',     category: 'Advanced', duration: 8000, spec: singleSpec('CommandSearch', {placeholder:'Search commands...',groups:[{heading:'Navigation',items:[{label:'Go to Dashboard',shortcut:'G D'},{label:'Open Agent Chat',shortcut:'G C'},{label:'View Tasks',shortcut:'G T'}]},{heading:'Actions',items:[{label:'New Task',shortcut:'Ctrl+K'},{label:'Start Voice Chat',shortcut:'Space'},{label:'Toggle Dark Mode',shortcut:null}]}]}) },
  { id: 'c_resizable',    name: 'ResizablePanel',    category: 'Advanced', duration: 6000, spec: singleSpec('ResizablePanel', {direction:'horizontal',leftLabel:'Code Editor',rightLabel:'Preview',defaultSplit:60}) },
  { id: 'c_aspectbox',    name: 'AspectBox',         category: 'Advanced', duration: 6000, spec: { root:'r', elements:{ r:{type:'Stack',props:{gap:'sm',direction:'vertical'},children:['a1','a2']}, a1:{type:'AspectBox',props:{ratio:1.78,label:'16:9 Video Frame',bg:null},children:[]}, a2:{type:'AspectBox',props:{ratio:1,label:'1:1 Square',bg:null},children:[]} } } },
  // ── File Formats ──────────────────────────────────────────────────────────
  { id: 'c_jsonview',     name: 'JsonViewer',   category: 'Format', duration: 9000, spec: singleSpec('JsonViewer', {title:'API Response',data:{status:'success',user:{id:42,name:'Ahmad Hassan',email:'ahmad@example.com',roles:['admin','editor']},meta:{timestamp:'2026-02-18T14:30:00Z',version:'2.1.0',requestId:'req_abc123'}},maxHeight:220,defaultExpanded:true}) },
  { id: 'c_markdown',     name: 'MarkdownBlock', category: 'Format', duration: 9000, spec: singleSpec('MarkdownBlock', {content:'## Agent Player v2.1\n\nKey features:\n\n- **18 agentic tools** — browser, desktop, storage\n- **Multi-agent pipelines** with task dependencies\n- **53 UI components** rendered from JSON spec\n- Voice chat with real-time lip sync\n\n> "The goal is a fully autonomous AI agent."\n\n```typescript\nconst agent = createAgent({ tools });\nawait agent.run("analyze the codebase");\n```',prose:true}) },
  { id: 'c_mdc',          name: 'MDCBlock',      category: 'Format', duration: 10000, spec: singleSpec('MDCBlock', {content:'## System Status\n\nAll services are operational.\n\n::Metric{label="Uptime" value="99.97%" trend="up"}\n\nCurrent alerts:\n\n::Badge{text="3 warnings" variant="warning"}\n::Badge{text="0 errors" variant="success"}\n\nServer performance:\n\n::ProgressBar{label="CPU" value=42 color="default" showPercent=true}\n::ProgressBar{label="Memory" value=67 color="warning" showPercent=true}'}) },
  // ── AI Components ─────────────────────────────────────────────────────────
  { id: 'c_avatarcard',   name: 'AvatarCard',          category: 'AI', duration: 10000, spec: singleSpec('AvatarCard', {title:'Interactive Avatar',size:'md',removable:false}) },
  { id: 'c_supportchat',  name: 'SupportChatBlock',    category: 'AI', duration: 10000, spec: singleSpec('SupportChatBlock', {agentName:'Max',height:340,removable:false,bgColor:null}) },
  { id: 'c_agentportal',  name: 'AgentSupportPortal',  category: 'AI', duration: 10000, spec: singleSpec('AgentSupportPortal', {height:380,bgColor:null,title:'Choose your AI assistant'}) },
  // ── Weather ───────────────────────────────────────────────────────────────
  { id: 'c_weather_sm',   name: 'WeatherCard sm',  category: 'Weather', duration: 7000, spec: singleSpec('WeatherCard', {location:'Dubai',temperature:32,condition:'sunny',humidity:55,wind:12,unit:'C',feelsLike:36,size:'sm',forecast:null}) },
  { id: 'c_weather_md',   name: 'WeatherCard md',  category: 'Weather', duration: 7000, spec: singleSpec('WeatherCard', {location:'London',temperature:12,condition:'rainy',humidity:85,wind:24,unit:'C',feelsLike:8,size:'md',forecast:null}) },
  { id: 'c_weather_lg',   name: 'WeatherCard lg',  category: 'Weather', duration: 10000, spec: singleSpec('WeatherCard', {location:'New York',temperature:18,condition:'partly-cloudy',humidity:65,wind:15,unit:'C',feelsLike:16,size:'lg',forecast:[{day:'Mon',condition:'sunny',high:22,low:14},{day:'Tue',condition:'cloudy',high:19,low:11},{day:'Wed',condition:'rainy',high:15,low:9},{day:'Thu',condition:'stormy',high:13,low:8},{day:'Fri',condition:'partly-cloudy',high:17,low:12}]}) },
];

function UIOverlayCard({ item, onDismiss }: { item: UIOverlayItem; onDismiss: () => void }) {
  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / item.duration) * 100);
      setProgress(pct);
      if (pct <= 0) onDismiss();
    };
    const id = setInterval(tick, 80);
    return () => clearInterval(id);
  }, [item.duration, onDismiss]);

  return (
    <div
      className="bg-gray-900/97 backdrop-blur border border-gray-700 rounded-xl shadow-2xl w-72 overflow-hidden"
      style={{ animation: 'notif-slide 0.3s ease forwards' }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/80">
        <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide">{item.title}</span>
        <button onClick={onDismiss} className="text-gray-600 hover:text-white text-xs leading-none">✕</button>
      </div>
      <div className="p-3 overflow-auto max-h-80">
        <SpecRenderer spec={item.spec} />
      </div>
      <div className="h-0.5 bg-gray-800">
        <div className="h-full bg-blue-500 transition-none" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function UIOverlayStack({ items, onDismiss }: { items: UIOverlayItem[]; onDismiss: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="absolute left-2 top-16 z-50 space-y-2 pointer-events-none" style={{ maxWidth: 295 }}>
      {items.map(item => (
        <div key={item.id} className="pointer-events-auto">
          <UIOverlayCard item={item} onDismiss={() => onDismiss(item.id)} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4" />
        <p className="text-white text-lg">Loading Avatar...</p>
      </div>
    </div>
  );
}

function ModeBadge({ mode }: { mode: ConvMode }) {
  if (mode === 'idle') return null;
  const map: Record<ConvMode, { label: string; color: string; pulse: boolean }> = {
    idle:       { label: '',                    color: 'bg-gray-700',   pulse: false },
    listening:  { label: 'Listening…',          color: 'bg-green-600',  pulse: true  },
    processing: { label: 'Thinking…',           color: 'bg-yellow-600', pulse: true  },
    speaking:   { label: 'Speaking…',           color: 'bg-blue-600',   pulse: true  },
  };
  const { label, color, pulse } = map[mode];
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-medium ${color}`}>
      {pulse && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
      {label}
    </div>
  );
}

// ── Animation Panel ───────────────────────────────────────────────────────────
interface AnimPanelProps {
  gender: 'male' | 'female';
  activeUrl: string;
  onSelect: (url: string) => void;
  onGenderToggle: () => void;
  avatarY: number;
  onAvatarYChange: (y: number) => void;
  onPreset: (p: CameraPreset) => void;
  bgColor: string;
  onBgColorChange: (color: string) => void;
  bgSaved?: boolean;
  bgScene: AvatarScene;
  onBgSceneChange: (scene: AvatarScene) => void;
  wallText: string;
  onWallTextChange: (t: string) => void;
  wallLogoUrl: string;
  onWallLogoUrlChange: (u: string) => void;
  wallVideoUrl: string;
  onWallVideoUrlChange: (u: string) => void;
  wallLayout: WallLayout;
  onWallLayoutChange: (panel: keyof WallLayout, key: string, value: number | boolean) => void;
  youtubeNoCookie: boolean;
  onYoutubeNoCookieChange: (v: boolean) => void;
  hasDraftChanges: boolean;
  onApply: () => void;
  // FX
  matrixOn: boolean;
  onMatrixToggle: () => void;
  matrixSpeed: number;
  onMatrixSpeedChange: (v: number) => void;
  matrixOpacity: number;
  onMatrixOpacityChange: (v: number) => void;
  matrixDensity: number;
  onMatrixDensityChange: (v: number) => void;
  onEmojiRain: (emojis: string[]) => void;
  onDemoNotif: (type: Notif['type']) => void;
  fxState: FxState;
  onFxChange: (key: keyof FxState, val: FxState[keyof FxState]) => void;
  notifAutoWeather: boolean;
  onNotifAutoWeatherChange: (v: boolean) => void;
  onApplyPreset: (id: string) => void;
  // Spotify
  spotifyUrl: string;
  onSpotifyUrlChange: (url: string) => void;
  spotifyOpen: boolean;
  onSpotifyToggle: () => void;
  // UI overlay cards
  onDemoUiOverlay: (id: string) => void;
  // Custom GIF sender
  onSendGif: (gifUrl: string, title: string) => void;
}

type PanelTab = 'anim' | 'scene' | 'camera' | 'fx' | 'notif' | 'ui';

function AnimPanel({ gender, activeUrl, onSelect, onGenderToggle, avatarY, onAvatarYChange, onPreset, bgColor, onBgColorChange, bgSaved, bgScene, onBgSceneChange, wallText, onWallTextChange, wallLogoUrl, onWallLogoUrlChange, wallVideoUrl, onWallVideoUrlChange, wallLayout, onWallLayoutChange, youtubeNoCookie, onYoutubeNoCookieChange, hasDraftChanges, onApply, matrixOn, onMatrixToggle, matrixSpeed, onMatrixSpeedChange, matrixOpacity, onMatrixOpacityChange, matrixDensity, onMatrixDensityChange, onEmojiRain, onDemoNotif, fxState, onFxChange, notifAutoWeather, onNotifAutoWeatherChange, onApplyPreset, spotifyUrl, onSpotifyUrlChange, spotifyOpen, onSpotifyToggle, onDemoUiOverlay, onSendGif, worlds, worldsLoading }: AnimPanelProps) {
  const [tab, setTab] = useState<PanelTab>('anim');
  const [notifSearch, setNotifSearch] = useState('');
  const [uiSearch, setUiSearch]       = useState('');
  const [uiCategory, setUiCategory]   = useState('All');
  const [gifCustomUrl, setGifCustomUrl]     = useState('');
  const [gifCustomTitle, setGifCustomTitle] = useState('');

  const cats = ANIMS[gender];
  const sections: { label: string; emoji: string; anims: AnimEntry[] }[] = [
    { label: 'Idle',       emoji: '🧍', anims: cats.idle },
    { label: 'Expression', emoji: '😊', anims: cats.expression },
    { label: 'Dance',      emoji: '💃', anims: cats.dance },
    { label: 'Locomotion', emoji: '🚶', anims: cats.locomotion },
  ];

  // Helper: compact 4-field layout control (X, Y, W, H)
  const LayoutControls = ({ panel, defaults }: {
    panel: keyof WallLayout;
    defaults: { x: number; y: number; w: number; h: number };
  }) => {
    const cur = wallLayout?.[panel] || {};
    const fields: { key: string; label: string; min: number; max: number; step: number; def: number }[] = [
      { key: 'x', label: 'X', min: -4, max: 4,   step: 0.1,  def: defaults.x },
      { key: 'y', label: 'Y', min: 0,  max: 4.5,  step: 0.1,  def: defaults.y },
      { key: 'w', label: 'W', min: 0.2, max: 5,   step: 0.05, def: defaults.w },
      { key: 'h', label: 'H', min: 0.1, max: 3,   step: 0.05, def: defaults.h },
    ];
    return (
      <div className="mt-1 grid grid-cols-4 gap-0.5">
        {fields.map(({ key, label, min, max, step, def }) => (
          <div key={key}>
            <div className="text-[9px] text-gray-600 text-center mb-0.5">{label}</div>
            <input
              type="number"
              step={step}
              min={min}
              max={max}
              value={(cur as any)[key] ?? def}
              onChange={(e) => onWallLayoutChange(panel, key, parseFloat(e.target.value) || 0)}
              className="w-full text-[10px] bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-gray-200 focus:outline-none focus:border-blue-500 [appearance:textfield]"
            />
          </div>
        ))}
      </div>
    );
  };

  const tabBtn = (id: PanelTab, Icon: React.ComponentType<{ className?: string }>, title: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      title={title}
      className={`flex-1 py-1.5 transition-colors ${
        tab === id
          ? 'text-white border-b-2 border-blue-500'
          : 'text-gray-500 hover:text-gray-300 border-b-2 border-transparent'
      }`}
    >
      <Icon className="w-4 h-4 mx-auto" />
    </button>
  );

  return (
    <div className="w-52 bg-gray-900/95 backdrop-blur border-l border-gray-700 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-700 bg-gray-900 flex-shrink-0">
        {tabBtn('anim',   Video, 'Animations')}
        {tabBtn('scene',  Home, 'Scene')}
        {tabBtn('camera', Camera, 'Camera')}
        {tabBtn('fx',     Sparkles, 'Visual Effects')}
        {tabBtn('notif',  Bell, 'Notifications')}
        {tabBtn('ui',     Puzzle, 'UI Components')}
      </div>

      {/* ── ANIM tab ──────────────────────────────────────────────────────── */}
      {tab === 'anim' && (
        <>
          {/* Gender toggle */}
          <div className="px-2 py-1.5 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Gender</span>
            <button
              onClick={onGenderToggle}
              className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            >
              {gender === 'male' ? '♂ Male' : '♀ Female'}
            </button>
          </div>
          {/* Animation list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {sections.map((sec) => (
              <div key={sec.label}>
                <div className="text-xs text-gray-500 font-semibold px-1 mb-1">
                  {sec.emoji} {sec.label}
                </div>
                <div className="space-y-1">
                  {sec.anims.map((a) => (
                    <button
                      key={a.url}
                      onClick={() => onSelect(a.url)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors truncate ${
                        activeUrl === a.url
                          ? 'bg-blue-600 text-white font-medium'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                      title={a.label}
                    >
                      {activeUrl === a.url && '▶ '}
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── SCENE tab ─────────────────────────────────────────────────────── */}
      {tab === 'scene' && (
        <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="flex-1 p-2 space-y-3 overflow-y-auto">
          {/* Background color */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                <Palette className="w-3 h-3" /> Background
              </span>
              <div className="flex items-center gap-1.5">
                {bgSaved && <Check className="w-3 h-3 text-green-400" />}
                <button
                  onClick={() => onBgColorChange('#09090b')}
                  className="text-[10px] text-gray-600 hover:text-gray-400"
                >reset</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => onBgColorChange(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
              />
              <div className="flex gap-1 flex-wrap">
                {['#09090b','#0f172a','#1a1a2e','#0d1117','#ffffff','#f8fafc','#10b981','#6366f1'].map(c => (
                  <button
                    key={c}
                    onClick={() => onBgColorChange(c)}
                    className="w-5 h-5 rounded border border-gray-600 transition-transform hover:scale-110"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Scene presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                <Home className="w-3 h-3" /> Scene
              </span>
              {bgScene !== 'none' && (
                <button
                  onClick={() => onBgSceneChange('none')}
                  className="text-[10px] text-gray-600 hover:text-gray-400"
                >clear</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {SCENE_OPTIONS.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  onClick={() => onBgSceneChange(value)}
                  className={`text-xs py-1 px-1.5 rounded text-left truncate transition-colors ${
                    bgScene === value
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                  title={label}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Shadow Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                <Circle className="w-3 h-3" /> Character Shadow
              </span>
            </div>
            <button
              onClick={() => setShowShadow(prev => !prev)}
              className={`w-full text-xs py-2 px-3 rounded text-left transition-colors ${
                showShadow
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{showShadow ? 'Shadow Enabled' : 'Shadow Disabled'}</span>
                <span className="text-[10px] opacity-70">
                  {showShadow ? 'Click to hide' : 'Click to show'}
                </span>
              </div>
            </button>
          </div>

          {/* Custom Background — upload or URL */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500 font-semibold">Custom BG</span>
              {(bgScene.startsWith('yt_') || bgScene.startsWith('custombg_')) && (
                <button onClick={() => onBgSceneChange('none')} className="text-[10px] text-gray-600 hover:text-red-400">clear</button>
              )}
            </div>
            {/* Active indicator */}
            {bgScene.startsWith('yt_') && (
              <p className="text-[10px] text-green-400 mb-1">YouTube active</p>
            )}
            {bgScene.startsWith('custombg_') && (
              <p className="text-[10px] text-green-400 mb-1 truncate">{bgScene.slice(9).split('/').pop()}</p>
            )}
            {/* Upload file */}
            <label className="flex items-center gap-1.5 w-full text-[11px] py-1.5 px-2 mb-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 cursor-pointer transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload image / video
              <input
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const fd = new FormData();
                  fd.append('file', f);
                  try {
                    const res = await fetch(`${config.backendUrl}/api/avatar/background/upload?userId=1`, { method: 'POST', body: fd });
                    const d = await res.json();
                    if (d.success) onBgSceneChange(`custombg_${d.url}` as AvatarScene);
                  } catch {}
                }}
              />
            </label>
            {/* URL input */}
            <input
              type="url"
              placeholder="YouTube URL or direct image/video URL"
              defaultValue={bgScene.startsWith('yt_') ? `https://youtu.be/${bgScene.slice(3)}` : bgScene.startsWith('custombg_') ? bgScene.slice(9) : ''}
              key={bgScene.startsWith('yt_') || bgScene.startsWith('custombg_') ? bgScene : 'bg-url'}
              onBlur={(e) => {
                const url = e.target.value.trim();
                if (!url) return;
                const vid = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/)?.[1];
                if (vid) { onBgSceneChange(`yt_${vid}` as AvatarScene); return; }
                if (url.match(/\.(mp4|webm|mov|gif|jpg|jpeg|png|webp)(\?|$)/i) || url.startsWith('http')) {
                  onBgSceneChange(`custombg_${url}` as AvatarScene);
                }
              }}
              className="w-full text-[11px] bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Wall panels (only for built-in 3D scenes) */}
          {bgScene !== 'none' && !bgScene.startsWith('env_') && !bgScene.startsWith('yt_') && !bgScene.startsWith('custombg_') && (
            <div>
              <div className="text-xs text-gray-500 font-semibold mb-1.5">🪧 Wall Panels</div>

              {/* Text panel */}
              <div className="mb-2">
                <div className="text-[10px] text-gray-600 mb-0.5 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Text
              </div>
                <textarea
                  value={wallText}
                  onChange={(e) => onWallTextChange(e.target.value)}
                  placeholder="Company name&#10;Slogan"
                  rows={2}
                  className="w-full text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-blue-500"
                />
                <LayoutControls panel="text" defaults={{ x: -0.4, y: 2.0, w: 1.4, h: 0.75 }} />
              </div>

              {/* Logo panel */}
              <div className="mb-2">
                <div className="text-[10px] text-gray-600 mb-0.5 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> Logo
                </div>
                <div className="flex items-center gap-1.5">
                  {wallLogoUrl && (
                    <img src={wallLogoUrl} alt="logo" className="w-6 h-6 object-contain rounded border border-gray-600" />
                  )}
                  <label className="flex-1 text-[10px] text-center py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 cursor-pointer transition-colors">
                    {wallLogoUrl ? '🔄 Change' : '📁 Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const form = new FormData();
                        form.append('file', f);
                        const res = await fetch(`${config.backendUrl}/api/avatar/upload-logo`, { method: 'POST', body: form });
                        const d = await res.json();
                        if (d.success) onWallLogoUrlChange(`${config.backendUrl}${d.url}`);
                      }}
                    />
                  </label>
                  {wallLogoUrl && (
                    <button onClick={() => onWallLogoUrlChange('')} className="text-[10px] text-red-500 hover:text-red-400 px-1">✕</button>
                  )}
                </div>
                <LayoutControls panel="logo" defaults={{ x: -2.0, y: 2.0, w: 0.9, h: 0.9 }} />
              </div>

              {/* YouTube video panel */}
              <div>
                <div className="text-[10px] text-gray-600 mb-0.5">▶ YouTube</div>
                <div className="flex items-center gap-1 mb-1">
                  <input
                    type="text"
                    value={wallVideoUrl}
                    onChange={(e) => onWallVideoUrlChange(e.target.value)}
                    placeholder="YouTube URL"
                    className="flex-1 text-[10px] bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                  {wallVideoUrl && (
                    <button onClick={() => onWallVideoUrlChange('')} className="text-[10px] text-red-500 hover:text-red-400 px-1">✕</button>
                  )}
                </div>
                {/* Sound + privacy toggles */}
                <div className="flex gap-1 mb-1">
                  <button
                    onClick={() => onWallLayoutChange('video', 'muted', !(wallLayout?.video?.muted ?? true))}
                    className={`flex-1 text-[10px] px-1 py-0.5 rounded transition-colors ${
                      (wallLayout?.video?.muted ?? true)
                        ? 'bg-gray-700 text-gray-400'
                        : 'bg-green-700 text-green-200'
                    }`}
                  >
                    {(wallLayout?.video?.muted ?? true) ? '🔇 Muted' : '🔊 Sound'}
                  </button>
                  <button
                    onClick={() => onYoutubeNoCookieChange(!youtubeNoCookie)}
                    title="youtube-nocookie.com — no tracking (GDPR)"
                    className={`flex-1 text-[10px] px-1 py-0.5 rounded transition-colors ${
                      youtubeNoCookie
                        ? 'bg-blue-700 text-blue-100'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {youtubeNoCookie ? '🛡 No Track' : '🍪 Cookies'}
                  </button>
                </div>
                <LayoutControls panel="video" defaults={{ x: 1.2, y: 1.85, w: 1.8, h: 1.02 }} />
              </div>
            </div>
          )}
        </div>

        {/* Save & Apply button — sticky at bottom of Scene tab */}
        <div className="flex-shrink-0 p-2 border-t border-gray-700 bg-gray-900">
          <button
            onClick={onApply}
            disabled={!hasDraftChanges}
            className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${
              hasDraftChanges
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            {hasDraftChanges ? '💾 Save & Apply' : '✓ Scene Applied'}
          </button>
        </div>
        </div>
      )}

      {/* ── FX tab ────────────────────────────────────────────────────────── */}
      {tab === 'fx' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-3">


          {/* ── Weather Presets ─────────────────────────────────────────────── */}
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-2">Weather Presets</div>
            <div className="grid grid-cols-2 gap-1 mb-2">
              {WEATHER_PRESETS.map(preset => {
                const Icon = preset.icon;
                const isActive = (() => {
                  const keys = Object.keys(preset.fx) as (keyof FxState)[];
                  return keys.length > 0 && keys.every(k => {
                    const v = fxState[k];
                    if (typeof v === 'boolean') return v === preset.fx[k];
                    return (v as { on: boolean }).on === true;
                  });
                })();
                return (
                  <button
                    key={preset.id}
                    onClick={() => onApplyPreset(preset.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-white/15 ring-1 ring-white/30 text-white'
                        : 'bg-gray-700/80 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${preset.color}`} />
                    <span>{preset.label}</span>
                  </button>
                );
              })}
              <button
                onClick={() => onApplyPreset('clear')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-500 transition-all col-span-2"
              >
                <X className="h-3 w-3 shrink-0" />
                <span>Clear All Effects</span>
              </button>
            </div>
            {/* Auto weather toggle */}
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-gray-700/60">
              <div>
                <div className="text-xs text-gray-300 font-medium">Auto Weather on Notify</div>
                <div className="text-[9px] text-gray-500">Each notification triggers its weather effect</div>
              </div>
              <button
                onClick={() => onNotifAutoWeatherChange(!notifAutoWeather)}
                className={`relative w-9 h-5 rounded-full transition-colors ${notifAutoWeather ? 'bg-green-600' : 'bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${notifAutoWeather ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>


          {/* Matrix rain */}
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-1.5">🟩 Matrix Rain</div>
            <button
              onClick={onMatrixToggle}
              className={`w-full py-2 rounded-lg text-xs font-semibold transition-all ${
                matrixOn
                  ? 'bg-green-700 text-green-100 ring-2 ring-green-500/40'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {matrixOn ? '🟢 Matrix ON — Click to Stop' : '▶ Start Matrix Rain'}
            </button>
            {/* Matrix controls */}
            <div className="mt-2 space-y-2">
              <div>
                <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                  <span>Speed</span>
                  <span className="text-green-400">{matrixSpeed === 15 ? 'Max' : matrixSpeed === 90 ? 'Slow' : `${matrixSpeed}ms`}</span>
                </div>
                <input
                  type="range" min={15} max={90} step={5}
                  value={matrixSpeed}
                  onChange={e => onMatrixSpeedChange(Number(e.target.value))}
                  className="w-full h-1.5 accent-green-500 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                  <span>Opacity</span>
                  <span className="text-green-400">{Math.round(matrixOpacity * 100)}%</span>
                </div>
                <input
                  type="range" min={10} max={100} step={5}
                  value={Math.round(matrixOpacity * 100)}
                  onChange={e => onMatrixOpacityChange(Number(e.target.value) / 100)}
                  className="w-full h-1.5 accent-green-500 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                  <span>Density</span>
                  <span className="text-green-400">{matrixDensity <= 9 ? 'Dense' : matrixDensity >= 18 ? 'Sparse' : `${matrixDensity}px`}</span>
                </div>
                <input
                  type="range" min={7} max={20} step={1}
                  value={matrixDensity}
                  onChange={e => onMatrixDensityChange(Number(e.target.value))}
                  className="w-full h-1.5 accent-green-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Emoji rain */}
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-1.5 flex items-center gap-1">
              <CloudRain className="w-3 h-3" /> Emoji Rain
            </div>
            <div className="grid grid-cols-1 gap-1">
              {Object.entries(EMOJI_PACKS).map(([key, { label, emojis }]) => (
                <button
                  key={key}
                  onClick={() => onEmojiRain(emojis)}
                  className="text-left text-[11px] px-2 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── New Effects ─────────────────────────────────────────────── */}

          {/* Snow */}
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-1.5 flex items-center gap-1">
              <Snowflake className="w-3 h-3" /> Snow
            </div>
            <button onClick={() => onFxChange('snow', { ...fxState.snow, on: !fxState.snow.on })}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${fxState.snow.on ? 'bg-blue-700 text-blue-100 ring-2 ring-blue-500/40' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
              {fxState.snow.on ? 'ON — Click to Stop' : 'Start Snow'}
            </button>
            {fxState.snow.on && <div className="mt-1.5 space-y-1.5">
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Speed</span><span>{fxState.snow.speed}ms</span></div>
                <input type="range" min={20} max={120} step={5} value={fxState.snow.speed} onChange={e => onFxChange('snow', { ...fxState.snow, speed: +e.target.value })} className="w-full h-1.5 accent-blue-400 cursor-pointer" /></div>
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Density</span><span>{fxState.snow.density}</span></div>
                <input type="range" min={30} max={400} step={10} value={fxState.snow.density} onChange={e => onFxChange('snow', { ...fxState.snow, density: +e.target.value })} className="w-full h-1.5 accent-blue-400 cursor-pointer" /></div>
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Opacity</span><span>{Math.round(fxState.snow.opacity * 100)}%</span></div>
                <input type="range" min={10} max={100} step={5} value={Math.round(fxState.snow.opacity * 100)} onChange={e => onFxChange('snow', { ...fxState.snow, opacity: +e.target.value / 100 })} className="w-full h-1.5 accent-blue-400 cursor-pointer" /></div>
            </div>}
          </div>

          {/* Fireflies */}
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-1.5">✦ Fireflies</div>
            <button onClick={() => onFxChange('fireflies', { ...fxState.fireflies, on: !fxState.fireflies.on })}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${fxState.fireflies.on ? 'bg-yellow-700 text-yellow-100 ring-2 ring-yellow-500/40' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
              {fxState.fireflies.on ? 'ON — Click to Stop' : 'Start Fireflies'}
            </button>
            {fxState.fireflies.on && <div className="mt-1.5 space-y-1.5">
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Count</span><span>{fxState.fireflies.count}</span></div>
                <input type="range" min={5} max={80} step={5} value={fxState.fireflies.count} onChange={e => onFxChange('fireflies', { ...fxState.fireflies, count: +e.target.value })} className="w-full h-1.5 accent-yellow-400 cursor-pointer" /></div>
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Speed</span><span>{fxState.fireflies.speed.toFixed(1)}</span></div>
                <input type="range" min={1} max={30} step={1} value={fxState.fireflies.speed * 10} onChange={e => onFxChange('fireflies', { ...fxState.fireflies, speed: +e.target.value / 10 })} className="w-full h-1.5 accent-yellow-400 cursor-pointer" /></div>
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Opacity</span><span>{Math.round(fxState.fireflies.opacity * 100)}%</span></div>
                <input type="range" min={10} max={100} step={5} value={Math.round(fxState.fireflies.opacity * 100)} onChange={e => onFxChange('fireflies', { ...fxState.fireflies, opacity: +e.target.value / 100 })} className="w-full h-1.5 accent-yellow-400 cursor-pointer" /></div>
            </div>}
          </div>

          {/* Starfield */}
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-1.5">★ Starfield</div>
            <button onClick={() => onFxChange('starfield', { ...fxState.starfield, on: !fxState.starfield.on })}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${fxState.starfield.on ? 'bg-indigo-700 text-indigo-100 ring-2 ring-indigo-500/40' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
              {fxState.starfield.on ? 'ON — Click to Stop' : 'Start Starfield'}
            </button>
            {fxState.starfield.on && <div className="mt-1.5 space-y-1.5">
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Speed</span><span>{fxState.starfield.speed}</span></div>
                <input type="range" min={1} max={10} step={1} value={fxState.starfield.speed} onChange={e => onFxChange('starfield', { ...fxState.starfield, speed: +e.target.value })} className="w-full h-1.5 accent-indigo-400 cursor-pointer" /></div>
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Stars</span><span>{fxState.starfield.count}</span></div>
                <input type="range" min={50} max={500} step={25} value={fxState.starfield.count} onChange={e => onFxChange('starfield', { ...fxState.starfield, count: +e.target.value })} className="w-full h-1.5 accent-indigo-400 cursor-pointer" /></div>
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Opacity</span><span>{Math.round(fxState.starfield.opacity * 100)}%</span></div>
                <input type="range" min={10} max={100} step={5} value={Math.round(fxState.starfield.opacity * 100)} onChange={e => onFxChange('starfield', { ...fxState.starfield, opacity: +e.target.value / 100 })} className="w-full h-1.5 accent-indigo-400 cursor-pointer" /></div>
            </div>}
          </div>

          {/* Rain */}
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-1.5">Rain</div>
            <button onClick={() => onFxChange('rain', { ...fxState.rain, on: !fxState.rain.on })}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${fxState.rain.on ? 'bg-sky-700 text-sky-100 ring-2 ring-sky-500/40' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
              {fxState.rain.on ? 'ON — Click to Stop' : 'Start Rain'}
            </button>
            {fxState.rain.on && <div className="mt-1.5 space-y-1.5">
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Drops</span><span>{fxState.rain.intensity}</span></div>
                <input type="range" min={50} max={600} step={25} value={fxState.rain.intensity} onChange={e => onFxChange('rain', { ...fxState.rain, intensity: +e.target.value })} className="w-full h-1.5 accent-sky-400 cursor-pointer" /></div>
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Speed</span><span>{fxState.rain.speed}</span></div>
                <input type="range" min={5} max={40} step={1} value={fxState.rain.speed} onChange={e => onFxChange('rain', { ...fxState.rain, speed: +e.target.value })} className="w-full h-1.5 accent-sky-400 cursor-pointer" /></div>
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Opacity</span><span>{Math.round(fxState.rain.opacity * 100)}%</span></div>
                <input type="range" min={10} max={100} step={5} value={Math.round(fxState.rain.opacity * 100)} onChange={e => onFxChange('rain', { ...fxState.rain, opacity: +e.target.value / 100 })} className="w-full h-1.5 accent-sky-400 cursor-pointer" /></div>
            </div>}
          </div>

          {/* Fire */}
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-1.5">Fire</div>
            <button onClick={() => onFxChange('fire', { ...fxState.fire, on: !fxState.fire.on })}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${fxState.fire.on ? 'bg-orange-700 text-orange-100 ring-2 ring-orange-500/40' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
              {fxState.fire.on ? 'ON — Click to Stop' : 'Start Fire'}
            </button>
            {fxState.fire.on && <div className="mt-1.5 space-y-1.5">
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Intensity</span><span>{Math.round(fxState.fire.intensity * 100)}%</span></div>
                <input type="range" min={10} max={100} step={5} value={Math.round(fxState.fire.intensity * 100)} onChange={e => onFxChange('fire', { ...fxState.fire, intensity: +e.target.value / 100 })} className="w-full h-1.5 accent-orange-400 cursor-pointer" /></div>
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Opacity</span><span>{Math.round(fxState.fire.opacity * 100)}%</span></div>
                <input type="range" min={10} max={100} step={5} value={Math.round(fxState.fire.opacity * 100)} onChange={e => onFxChange('fire', { ...fxState.fire, opacity: +e.target.value / 100 })} className="w-full h-1.5 accent-orange-400 cursor-pointer" /></div>
            </div>}
          </div>

          {/* Lightning */}
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-1.5">Lightning</div>
            <button onClick={() => onFxChange('lightning', { ...fxState.lightning, on: !fxState.lightning.on })}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${fxState.lightning.on ? 'bg-yellow-500 text-gray-900 ring-2 ring-yellow-400/40' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
              {fxState.lightning.on ? 'ON — Click to Stop' : 'Start Lightning'}
            </button>
            {fxState.lightning.on && <div className="mt-1.5 space-y-1.5">
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Frequency</span><span>{fxState.lightning.frequency}</span></div>
                <input type="range" min={1} max={10} step={1} value={fxState.lightning.frequency} onChange={e => onFxChange('lightning', { ...fxState.lightning, frequency: +e.target.value })} className="w-full h-1.5 accent-yellow-400 cursor-pointer" /></div>
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Opacity</span><span>{Math.round(fxState.lightning.opacity * 100)}%</span></div>
                <input type="range" min={10} max={100} step={5} value={Math.round(fxState.lightning.opacity * 100)} onChange={e => onFxChange('lightning', { ...fxState.lightning, opacity: +e.target.value / 100 })} className="w-full h-1.5 accent-yellow-400 cursor-pointer" /></div>
            </div>}
          </div>

          {/* Aurora */}
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-1.5">Aurora</div>
            <button onClick={() => onFxChange('aurora', { ...fxState.aurora, on: !fxState.aurora.on })}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${fxState.aurora.on ? 'bg-teal-700 text-teal-100 ring-2 ring-teal-500/40' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
              {fxState.aurora.on ? 'ON — Click to Stop' : 'Start Aurora'}
            </button>
            {fxState.aurora.on && <div className="mt-1.5 space-y-1.5">
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Speed</span><span>{fxState.aurora.speed}</span></div>
                <input type="range" min={1} max={10} step={1} value={fxState.aurora.speed} onChange={e => onFxChange('aurora', { ...fxState.aurora, speed: +e.target.value })} className="w-full h-1.5 accent-teal-400 cursor-pointer" /></div>
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Opacity</span><span>{Math.round(fxState.aurora.opacity * 100)}%</span></div>
                <input type="range" min={5} max={100} step={5} value={Math.round(fxState.aurora.opacity * 100)} onChange={e => onFxChange('aurora', { ...fxState.aurora, opacity: +e.target.value / 100 })} className="w-full h-1.5 accent-teal-400 cursor-pointer" /></div>
            </div>}
          </div>

          {/* Glitch */}
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-1.5">Glitch</div>
            <button onClick={() => onFxChange('glitch', { ...fxState.glitch, on: !fxState.glitch.on })}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${fxState.glitch.on ? 'bg-red-700 text-red-100 ring-2 ring-red-500/40' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
              {fxState.glitch.on ? 'ON — Click to Stop' : 'Start Glitch'}
            </button>
            {fxState.glitch.on && <div className="mt-1.5">
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Intensity</span><span>{Math.round(fxState.glitch.intensity * 100)}%</span></div>
                <input type="range" min={5} max={100} step={5} value={Math.round(fxState.glitch.intensity * 100)} onChange={e => onFxChange('glitch', { ...fxState.glitch, intensity: +e.target.value / 100 })} className="w-full h-1.5 accent-red-400 cursor-pointer" /></div>
            </div>}
          </div>

          {/* Scanlines */}
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-1.5">Scanlines</div>
            <button onClick={() => onFxChange('scanlines', { ...fxState.scanlines, on: !fxState.scanlines.on })}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${fxState.scanlines.on ? 'bg-gray-500 text-white ring-2 ring-gray-400/40' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
              {fxState.scanlines.on ? 'ON — Click to Stop' : 'Start Scanlines'}
            </button>
            {fxState.scanlines.on && <div className="mt-1.5">
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Opacity</span><span>{Math.round(fxState.scanlines.opacity * 100)}%</span></div>
                <input type="range" min={3} max={60} step={3} value={Math.round(fxState.scanlines.opacity * 100)} onChange={e => onFxChange('scanlines', { ...fxState.scanlines, opacity: +e.target.value / 100 })} className="w-full h-1.5 accent-gray-400 cursor-pointer" /></div>
            </div>}
          </div>

          {/* Hologram */}
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-1.5">Hologram</div>
            <button onClick={() => onFxChange('hologram', { ...fxState.hologram, on: !fxState.hologram.on })}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${fxState.hologram.on ? 'bg-cyan-700 text-cyan-100 ring-2 ring-cyan-500/40' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
              {fxState.hologram.on ? 'ON — Click to Stop' : 'Start Hologram'}
            </button>
            {fxState.hologram.on && <div className="mt-1.5">
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Opacity</span><span>{Math.round(fxState.hologram.opacity * 100)}%</span></div>
                <input type="range" min={5} max={80} step={5} value={Math.round(fxState.hologram.opacity * 100)} onChange={e => onFxChange('hologram', { ...fxState.hologram, opacity: +e.target.value / 100 })} className="w-full h-1.5 accent-cyan-400 cursor-pointer" /></div>
            </div>}
          </div>

          {/* Vignette Pulse */}
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-1.5">Vignette Pulse</div>
            <button onClick={() => onFxChange('vignette', { ...fxState.vignette, on: !fxState.vignette.on })}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${fxState.vignette.on ? 'bg-purple-700 text-purple-100 ring-2 ring-purple-500/40' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
              {fxState.vignette.on ? 'ON — Click to Stop' : 'Start Vignette'}
            </button>
            {fxState.vignette.on && <div className="mt-1.5 space-y-1.5">
              <div className="flex gap-1 flex-wrap">
                {(['blue','red','green','purple','gold','cyan'] as const).map(col => (
                  <button key={col} onClick={() => onFxChange('vignette', { ...fxState.vignette, color: col })}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${fxState.vignette.color === col ? 'ring-2 ring-white/40 opacity-100' : 'opacity-60 hover:opacity-90'}`}
                    style={{ background: col === 'blue' ? '#1e40af' : col === 'red' ? '#991b1b' : col === 'green' ? '#166534' : col === 'purple' ? '#6b21a8' : col === 'gold' ? '#854d0e' : '#0e7490' }}>
                    {col}
                  </button>
                ))}
              </div>
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Pulse Speed</span><span>{fxState.vignette.pulseSpeed}</span></div>
                <input type="range" min={1} max={10} step={1} value={fxState.vignette.pulseSpeed} onChange={e => onFxChange('vignette', { ...fxState.vignette, pulseSpeed: +e.target.value })} className="w-full h-1.5 accent-purple-400 cursor-pointer" /></div>
              <div><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Opacity</span><span>{Math.round(fxState.vignette.opacity * 100)}%</span></div>
                <input type="range" min={10} max={100} step={5} value={Math.round(fxState.vignette.opacity * 100)} onChange={e => onFxChange('vignette', { ...fxState.vignette, opacity: +e.target.value / 100 })} className="w-full h-1.5 accent-purple-400 cursor-pointer" /></div>
            </div>}
          </div>

          {/* Confetti */}
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-1.5">Confetti Burst</div>
            <button onClick={() => onFxChange('confetti', true)}
              className="w-full py-1.5 rounded-lg text-xs font-semibold bg-pink-700 hover:bg-pink-600 text-pink-100 transition-all">
              Launch Confetti
            </button>
          </div>


          {/* Spotify player */}
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-1.5">♪ Spotify</div>
            <input
              type="text"
              value={spotifyUrl}
              onChange={(e) => onSpotifyUrlChange(e.target.value)}
              placeholder="Spotify URL or URI"
              className="w-full text-[10px] bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-500 mb-1"
            />
            <button
              onClick={onSpotifyToggle}
              disabled={!extractSpotifyEmbed(spotifyUrl)}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${
                spotifyOpen
                  ? 'bg-[#1DB954] text-black'
                  : extractSpotifyEmbed(spotifyUrl)
                    ? 'bg-gray-700 hover:bg-[#1DB954]/80 hover:text-black text-gray-300'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              {spotifyOpen ? '⏹ Close Player' : '▶ Open Player'}
            </button>
            {!extractSpotifyEmbed(spotifyUrl) && spotifyUrl && (
              <div className="text-[9px] text-red-400 mt-0.5">Invalid Spotify URL</div>
            )}
          </div>

        </div>
      )}

      {/* ── CAMERA tab ────────────────────────────────────────────────────── */}
      {tab === 'camera' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {/* Camera presets */}
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-1.5 flex items-center gap-1">
              <Camera className="w-3 h-3" /> View
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(['full', 'half', 'bust', 'face'] as CameraPreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => onPreset(p)}
                  className="text-xs py-1 rounded bg-gray-700 hover:bg-blue-600 text-gray-300 hover:text-white transition-colors"
                  title={`${p} body`}
                >
                  {p === 'full' ? '🧍' : p === 'half' ? '🙋' : p === 'bust' ? '👤' : '😊'}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-gray-600 text-[10px] mt-0.5 px-0.5">
              <span>Full</span><span>Half</span><span>Bust</span><span>Face</span>
            </div>
          </div>

          {/* Height slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 font-semibold">↕ Height</span>
              <button
                onClick={() => onAvatarYChange(-1.5)}
                className="text-[10px] text-gray-600 hover:text-gray-400"
              >reset</button>
            </div>
            <input
              type="range"
              min="-2.2"
              max="-0.5"
              step="0.05"
              value={avatarY}
              onChange={(e) => onAvatarYChange(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-gray-600 text-[10px] mt-0.5">
              <span>Down</span><span>Up</span>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS tab ──────────────────────────────────────────── */}
      {tab === 'notif' && (() => {
        const ALL_NOTIFS: { type: Notif['type']; label: string; bg: string; textColor: string; border: string }[] = [
          { type: 'email',     label: 'Email',           bg: 'bg-red-900/40 hover:bg-red-900/70',         textColor: 'text-red-200',     border: 'border-red-700/40' },
          { type: 'whatsapp',  label: 'WhatsApp',        bg: 'bg-green-900/40 hover:bg-green-900/70',     textColor: 'text-green-200',   border: 'border-green-700/40' },
          { type: 'facebook',  label: 'Facebook',        bg: 'bg-blue-900/40 hover:bg-blue-900/70',       textColor: 'text-blue-200',    border: 'border-blue-700/40' },
          { type: 'instagram', label: 'Instagram DM',    bg: 'bg-pink-900/40 hover:bg-pink-900/70',       textColor: 'text-pink-200',    border: 'border-pink-700/40' },
          { type: 'telegram',  label: 'Telegram',        bg: 'bg-sky-900/40 hover:bg-sky-900/70',         textColor: 'text-sky-200',     border: 'border-sky-700/40' },
          { type: 'discord',   label: 'Discord',         bg: 'bg-indigo-900/40 hover:bg-indigo-900/70',   textColor: 'text-indigo-200',  border: 'border-indigo-700/40' },
          { type: 'stripe',    label: 'Stripe',          bg: 'bg-violet-900/40 hover:bg-violet-900/70',   textColor: 'text-violet-200',  border: 'border-violet-700/40' },
          { type: 'paypal',    label: 'PayPal',          bg: 'bg-blue-900/40 hover:bg-blue-900/70',       textColor: 'text-blue-200',    border: 'border-blue-700/40' },
          { type: 'bank',      label: 'Bank / Card',     bg: 'bg-emerald-900/40 hover:bg-emerald-900/70', textColor: 'text-emerald-200', border: 'border-emerald-700/40' },
          { type: 'applepay',  label: 'Apple Pay',       bg: 'bg-gray-800/60 hover:bg-gray-700/60',       textColor: 'text-gray-300',    border: 'border-gray-600/40' },
          { type: 'stock',     label: 'Stock Alert',     bg: 'bg-green-900/40 hover:bg-green-900/70',     textColor: 'text-green-200',   border: 'border-green-600/40' },
          { type: 'calendar',  label: 'Calendar Event',  bg: 'bg-sky-900/40 hover:bg-sky-900/70',         textColor: 'text-sky-200',     border: 'border-sky-600/40' },
          { type: 'msg',       label: 'Message',         bg: 'bg-blue-900/50 hover:bg-blue-900/80',       textColor: 'text-blue-200',    border: 'border-blue-700/40' },
          { type: 'task',      label: 'Task',            bg: 'bg-purple-900/50 hover:bg-purple-900/80',   textColor: 'text-purple-200',  border: 'border-purple-700/40' },
          { type: 'approval',  label: 'Approval',        bg: 'bg-yellow-900/50 hover:bg-yellow-900/80',   textColor: 'text-yellow-200',  border: 'border-yellow-700/40' },
          { type: 'terminal',  label: 'Terminal Command', bg: 'bg-green-950/80 hover:bg-green-900/60',    textColor: 'text-green-300',   border: 'border-green-700/50' },
          { type: 'gif',       label: 'GIF Image',        bg: 'bg-pink-950/80 hover:bg-pink-900/60',      textColor: 'text-pink-300',    border: 'border-pink-700/50' },
          { type: 'twitter',   label: 'X Login Alert',    bg: 'bg-gray-900/80 hover:bg-gray-800/80',       textColor: 'text-gray-200',    border: 'border-gray-600/40' },
          { type: 'tiktok',    label: 'TikTok Login',     bg: 'bg-pink-950/80 hover:bg-pink-900/60',       textColor: 'text-pink-300',    border: 'border-pink-700/50' },
          { type: 'linkedin',  label: 'LinkedIn Login',   bg: 'bg-blue-900/40 hover:bg-blue-900/70',       textColor: 'text-blue-200',    border: 'border-blue-700/40' },
          { type: 'snapchat',  label: 'Snapchat Login',   bg: 'bg-yellow-900/40 hover:bg-yellow-900/70',   textColor: 'text-yellow-200',  border: 'border-yellow-700/40' },
          { type: 'youtube',   label: 'YouTube Login',    bg: 'bg-red-900/40 hover:bg-red-900/70',         textColor: 'text-red-200',     border: 'border-red-700/40' },
          { type: 'reddit',    label: 'Reddit Login',     bg: 'bg-orange-900/40 hover:bg-orange-900/70',   textColor: 'text-orange-200',  border: 'border-orange-700/40' },
          { type: 'twitch',    label: 'Twitch Login',     bg: 'bg-purple-900/40 hover:bg-purple-900/70',   textColor: 'text-purple-200',  border: 'border-purple-700/40' },
          { type: 'otp',       label: 'OTP Code',         bg: 'bg-emerald-900/40 hover:bg-emerald-900/70', textColor: 'text-emerald-200', border: 'border-emerald-700/40' },
          { type: 'faceid',    label: 'Face ID / Biometric', bg: 'bg-blue-900/40 hover:bg-blue-900/70',     textColor: 'text-blue-200',    border: 'border-blue-700/40' },
          { type: 'sms_otp',  label: 'SMS Verify Code',   bg: 'bg-violet-900/40 hover:bg-violet-900/70',   textColor: 'text-violet-200',  border: 'border-violet-700/40' },
        ];
        const q = notifSearch.toLowerCase();
        const filtered = q ? ALL_NOTIFS.filter(n => n.label.toLowerCase().includes(q)) : ALL_NOTIFS;
        return (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Search bar */}
            <div className="px-2 pt-2 pb-1 flex-shrink-0">
              <input
                type="text"
                value={notifSearch}
                onChange={(e) => setNotifSearch(e.target.value)}
                placeholder="Search notifications..."
                className="w-full text-[10px] bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            {/* Notification buttons */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 && (
                <div className="text-[11px] text-gray-600 text-center py-4">No results</div>
              )}
              {filtered.map(n => (
                <button
                  key={n.type}
                  onClick={() => onDemoNotif(n.type)}
                  className={`w-full text-left text-[11px] px-2 py-1.5 rounded-lg ${n.bg} ${n.textColor} transition-colors border ${n.border} flex items-center gap-2`}
                >
                  <PlatformIcon type={n.type} />
                  <span>{n.label}</span>
                </button>
              ))}
            </div>

            {/* ── Custom GIF sender ──────────────────────────────── */}
            {(!q || 'gif custom'.includes(q)) && (
              <div className="px-2 pb-3 pt-1 border-t border-gray-800 flex-shrink-0 space-y-1.5">
                <div className="text-[9px] text-gray-500 uppercase tracking-wider px-0.5">Custom GIF URL</div>
                <input
                  type="text"
                  value={gifCustomTitle}
                  onChange={(e) => setGifCustomTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="w-full text-[10px] bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pink-500"
                />
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={gifCustomUrl}
                    onChange={(e) => setGifCustomUrl(e.target.value)}
                    placeholder="https://media.giphy.com/..."
                    className="flex-1 text-[10px] bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pink-500"
                  />
                  <button
                    onClick={() => {
                      if (!gifCustomUrl.trim()) return;
                      onSendGif(gifCustomUrl.trim(), gifCustomTitle.trim() || 'GIF');
                      setGifCustomUrl('');
                      setGifCustomTitle('');
                    }}
                    disabled={!gifCustomUrl.trim()}
                    className="px-2 text-[11px] rounded bg-pink-700 hover:bg-pink-600 disabled:bg-gray-700 text-white font-semibold transition-colors flex-shrink-0"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── UI COMPONENTS tab ──────────────────────────────────────────── */}
      {tab === 'ui' && (() => {
        const UI_CATS = ['All','Demo','Layout','Typography','Data','Charts','Interactive','Status','Calendar','Navigation','Advanced','Format','AI','Weather'];
        const q = uiSearch.toLowerCase();
        const filtered = ALL_UI_COMPONENTS.filter(c =>
          (uiCategory === 'All' || c.category === uiCategory) &&
          (!q || c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
        );
        return (
          <div className="flex flex-col h-full">
            {/* Search */}
            <div className="px-2 pt-2 pb-1">
              <input
                type="text"
                value={uiSearch}
                onChange={(e) => setUiSearch(e.target.value)}
                placeholder="Search components..."
                className="w-full text-[10px] bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            {/* Category filter chips */}
            <div className="px-2 pb-1 flex flex-wrap gap-1">
              {UI_CATS.map(cat => (
                <button
                  key={cat}
                  onClick={() => setUiCategory(cat)}
                  className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-colors ${
                    uiCategory === cat
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {/* Component list */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
              {filtered.length === 0 && (
                <div className="text-[11px] text-gray-600 text-center py-4">No results</div>
              )}
              {filtered.map(item => (
                <button
                  key={item.id}
                  onClick={() => onDemoUiOverlay(item.id)}
                  className="w-full text-left text-[11px] px-2 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors border border-gray-700 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[9px] text-gray-500 bg-gray-700/60 rounded px-1 py-0.5 shrink-0">{item.category}</span>
                    <span className="truncate">{item.name}</span>
                  </div>
                  <span className="text-[9px] text-gray-500 shrink-0">{item.duration / 1000}s</span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Main content ──────────────────────────────────────────────────────────────
function AvatarViewerContent() {
  const searchParams = useSearchParams();
  const avatarId = searchParams.get('id') || '';
  const rawAvatarUrl = searchParams.get('url') || '';
  const worldId = searchParams.get('world') || '';  // Join World feature
  // Start empty — set to local cache if available, else CDN. Avoids double-load.
  const [avatarUrl, setAvatarUrl] = useState('');
  const [cacheStatus, setCacheStatus] = useState<'checking' | 'local' | 'cdn'>('checking');

  useEffect(() => {
    // If neither ?id= nor ?url= are provided, auto-load the active avatar
    if (!avatarId && !rawAvatarUrl) {
      fetch(`${config.backendUrl}/api/avatars?userId=1`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.avatars?.length) {
            const active = data.avatars.find((a: { isActive: boolean }) => a.isActive) || data.avatars[0];
            const url = active.localGlbPath || active.glbUrl || '';
            if (url) { setAvatarUrl(url); setCacheStatus('local'); }
          } else {
            // No avatars — redirect to settings to create one
            window.location.href = '/settings/avatar';
          }
        }).catch(() => {
          // On error also redirect to settings
          window.location.href = '/settings/avatar';
        });
      return;
    }

    // If ?id= is provided, resolve avatar record from backend first
    if (avatarId) {
      fetch(`${config.backendUrl}/api/avatars/${avatarId}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.avatar) {
            const url = data.avatar.localGlbPath || data.avatar.glbUrl || '';
            if (url) {
              setAvatarUrl(url.startsWith('http') ? url : url);
              setCacheStatus('local');
            }
          }
        })
        .catch(() => {});
      return;
    }

    if (!rawAvatarUrl) return;
    if (!rawAvatarUrl.startsWith('http')) {
      setAvatarUrl(rawAvatarUrl);
      setCacheStatus('local');
      return;
    }

    // Fast cache check (no download)
    fetch(`/api/avatar-model?url=${encodeURIComponent(rawAvatarUrl)}`)
      .then(r => r.json())
      .then(data => {
        if (data.localUrl) {
          // Already cached → load from local (fast, no CDN)
          console.log(`[Avatar] Loading from local cache: ${data.localUrl}`);
          setAvatarUrl(data.localUrl);
          setCacheStatus('local');
        } else {
          // Not cached yet → use CDN now, cache in background for next visit
          console.log('[Avatar] Not cached yet — loading from CDN, caching in background...');
          setAvatarUrl(rawAvatarUrl);
          setCacheStatus('cdn');
          fetch('/api/avatar-model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ glbUrl: rawAvatarUrl }),
          }).then(r => r.json()).then(data => {
            if (data.localUrl) {
              console.log(`[Avatar] Cached! Will use local next time: ${data.localUrl}`);
            }
          }).catch(() => {});
        }
      })
      .catch(() => { setAvatarUrl(rawAvatarUrl); setCacheStatus('cdn'); });
  }, [avatarId, rawAvatarUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const [mode, setMode]               = useState<ConvMode>('idle');
  const [isPlaying, setIsPlaying]     = useState(false);
  const [isMuted, setIsMuted]         = useState(false);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [textInput, setTextInput]     = useState('');
  const [error, setError]             = useState<string | null>(null);
  const [showChat, setShowChat]       = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const sidebarDragRef = useRef<{ startX: number; startW: number } | null>(null);
  const [vadEnabled, setVadEnabled]   = useState(false);
  const { devMode, toggle: toggleDevMode } = useDeveloperMode();
  const [showAnimPanel, setShowAnimPanel] = useState(false);

  // Force-hide panel when dev mode is turned off
  useEffect(() => {
    if (!devMode) setShowAnimPanel(false);
  }, [devMode]);

  // Agent selector
  const [availableAgents, setAvailableAgents] = useState<{ id: string; name: string; emoji: string; isPrimary: boolean; system_prompt?: string }[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  useEffect(() => {
    fetch(`${config.backendUrl}/api/agents`)
      .then((r) => r.json())
      .then((data) => {
        const agents = data.agents || [];
        setAvailableAgents(agents);
        const primary = agents.find((a: any) => a.isPrimary) || agents[0];
        if (primary) setSelectedAgentId(primary.id);
      })
      .catch(() => {});
  }, []);

  // Animation state — start with CDN idle (guaranteed to work)
  const [gender, setGender]           = useState<'male' | 'female'>('male');
  const [animUrl, setAnimUrl]         = useState<string>(CDN_MALE_IDLE);

  // Camera / avatar position
  const [avatarY, setAvatarY]         = useState(-1.5);
  const zoomRef = useRef<ZoomHandle | null>(null);

  // Background color — loaded from DB, saveable
  const [bgColor, setBgColor]         = useState('#09090b');
  const [bgSaved, setBgSaved]         = useState(false);
  const [bgScene, setBgScene]         = useState<AvatarScene>('none');
  const bgSaveTimer                   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shadow visibility
  const [showShadow, setShowShadow] = useState(true);

  // World bots state
  const [worldBots, setWorldBots] = useState<Array<{
    id: string;
    agent_id: string;
    position_x: number;
    position_y: number;
    position_z: number;
    rotation_y: number;
    agent_name?: string;
    agent_avatar_url?: string;
  }>>([]);

  // Load world when ?world= parameter is present (Join World feature)
  useEffect(() => {
    if (!worldId) return;

    const authToken = localStorage.getItem('auth_token');
    if (!authToken) {
      console.error('[World] No auth token found');
      return;
    }

    fetch(`${config.backendUrl}/api/multiverse/${worldId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
      .then(r => r.json())
      .then(data => {
        if (data.world && data.world.glb_url) {
          // Load world GLB as background scene
          const worldGlbUrl = data.world.glb_url;
          console.log('[World] Loading world:', data.world.name, worldGlbUrl);
          setBgScene(`world_${worldGlbUrl}` as AvatarScene);

          // Fetch bots for this world
          fetch(`${config.backendUrl}/api/multiverse/${worldId}/bots`, {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          })
            .then(r => r.json())
            .then(botsData => {
              if (botsData.bots && Array.isArray(botsData.bots)) {
                console.log('[World] Loaded bots:', botsData.bots.length);
                setWorldBots(botsData.bots);
              }
            })
            .catch(err => {
              console.error('[World] Failed to load bots:', err);
            });
        }
      })
      .catch(err => {
        console.error('[World] Failed to load world:', err);
      });
  }, [worldId]);

  useEffect(() => {
    fetch(`${config.backendUrl}/api/avatar/settings?userId=1`)
      .then(r => r.json())
      .then(d => {
        if (d.settings?.bgColor) setBgColor(d.settings.bgColor);
        if (d.settings?.bgScene) setBgScene(d.settings.bgScene as AvatarScene);
        const text     = d.settings?.wallText     || '';
        const logoUrl  = d.settings?.wallLogoUrl  || '';
        const videoUrl = d.settings?.wallVideoUrl || '';
        let layout: WallLayout = {};
        if (d.settings?.wallLayout) {
          try { layout = JSON.parse(d.settings.wallLayout); } catch { /* use default {} */ }
        }
        // Initialize both draft and applied from DB — no unsaved changes on load
        setWallText(text);
        setWallLogoUrl(logoUrl);
        setWallVideoUrl(videoUrl);
        setWallLayout(layout);
        setAppliedWall({ text, logoUrl, videoUrl, layout });
        if (d.settings?.wallSpotifyUrl) setSpotifyUrl(d.settings.wallSpotifyUrl);
      })
      .catch(() => {});
  }, []);

  const saveBgColor = (color: string) => {
    setBgColor(color);
    if (bgSaveTimer.current) clearTimeout(bgSaveTimer.current);
    fetch(`${config.backendUrl}/api/avatar/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '1', bgColor: color }),
    }).then(() => {
      setBgSaved(true);
      bgSaveTimer.current = setTimeout(() => setBgSaved(false), 2000);
    }).catch(() => {});
  };

  const saveBgScene = (scene: AvatarScene) => {
    setBgScene(scene);
    fetch(`${config.backendUrl}/api/avatar/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '1', bgScene: scene }),
    }).then(() => {
      setBgSaved(true);
      if (bgSaveTimer.current) clearTimeout(bgSaveTimer.current);
      bgSaveTimer.current = setTimeout(() => setBgSaved(false), 2000);
    }).catch(() => {});
  };

  // Wall board — draft state (what's in the editor inputs)
  const [wallText, setWallText]           = useState('');
  const [wallLogoUrl, setWallLogoUrl]     = useState('');
  const [wallVideoUrl, setWallVideoUrl]   = useState('');
  const [wallLayout, setWallLayout]       = useState<WallLayout>({});

  // Applied state (what the 3D viewer actually renders — only updates on Save & Apply)
  const [appliedWall, setAppliedWall] = useState({
    text: '', logoUrl: '', videoUrl: '', layout: {} as WallLayout,
  });

  // True when draft differs from applied — enables the Save & Apply button
  const hasDraftChanges =
    wallText !== appliedWall.text ||
    wallLogoUrl !== appliedWall.logoUrl ||
    wallVideoUrl !== appliedWall.videoUrl ||
    JSON.stringify(wallLayout) !== JSON.stringify(appliedWall.layout);

  /** Commit all draft values to the 3D scene and save to DB. */
  const applyWallContent = () => {
    const snap = { text: wallText, logoUrl: wallLogoUrl, videoUrl: wallVideoUrl, layout: wallLayout };
    setAppliedWall(snap);
    fetch(`${config.backendUrl}/api/avatar/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '1',
        wallText: snap.text,
        wallLogoUrl: snap.logoUrl,
        wallVideoUrl: snap.videoUrl,
        wallLayout: JSON.stringify(snap.layout),
      }),
    }).catch(() => {});
  };

  const updateWallLayout = (panel: keyof WallLayout, key: string, value: number | boolean) => {
    setWallLayout((prev) => ({
      ...prev,
      [panel]: { ...(prev[panel] || {}), [key]: value },
    }));
    // No auto-save — user clicks Save & Apply
  };

  // YouTube privacy-enhanced mode
  const [youtubeNoCookie, setYoutubeNoCookie] = useState(false);

  // ── Visual FX state ──────────────────────────────────────────────────────
  const [matrixOn, setMatrixOn]           = useState(false);
  const [matrixSpeed, setMatrixSpeed]     = useState(45);
  const [matrixOpacity, setMatrixOpacity] = useState(1);
  const [matrixDensity, setMatrixDensity] = useState(13);
  const [fxState, setFxState]             = useState<FxState>(FX_DEFAULTS);
  const handleFxChange = (key: keyof FxState, val: FxState[keyof FxState]) => setFxState(prev => ({ ...prev, [key]: val }));
  const [notifAutoWeather, setNotifAutoWeather] = useState(false);
  const applyWeatherPreset = (id: string) => {
    if (id === 'clear') { setFxState(FX_DEFAULTS); return; }
    const p = WEATHER_PRESETS.find(x => x.id === id);
    if (p) setFxState({ ...FX_DEFAULTS, ...p.fx } as FxState);
  };
  const [emojiRain, setEmojiRain]         = useState<string[] | null>(null);
  const [notifs, setNotifs]             = useState<Notif[]>([]);
  const [uiOverlays, setUiOverlays]     = useState<UIOverlayItem[]>([]);
  const [clones, setClones]             = useState<{ id: string; animUrl: string }[]>([]);
  const [cameraOn, setCameraOn]         = useState(false);
  const [cameraVision, setCameraVision] = useState(false);   // AI sees frames
  const [cameraRecording, setCameraRecording] = useState(false);
  const [recSeconds, setRecSeconds]     = useState(0);
  const [sessionId_cam, setSessionId_cam] = useState<string | null>(null);
  const [roomId_cam, setRoomId_cam]     = useState<string | null>(null);
  const cameraVideoRef                  = useRef<HTMLVideoElement>(null);
  const cameraStreamRef                 = useRef<MediaStream | null>(null);
  const mediaRecorderRef                = useRef<MediaRecorder | null>(null);
  const recChunksRef                    = useRef<Blob[]>([]);
  const recTimerRef                     = useRef<ReturnType<typeof setInterval> | null>(null);
  const visionCanvasRef                 = useRef<HTMLCanvasElement>(null);

  // ── WebRTC call state ──────────────────────────────────────────────────────
  const urlRoomId = searchParams.get('room') || '';
  const urlNotif  = searchParams.get('notif') || '';
  const [callState, setCallState]       = useState<'idle' | 'offering' | 'waiting' | 'connected' | 'joining'>('idle');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerRef                         = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef                  = useRef<HTMLVideoElement>(null);
  const sigPollRef                      = useRef<ReturnType<typeof setInterval> | null>(null);
  const knownIceRef                     = useRef<number>(0); // count of ICE candidates we already added

  const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  const stopPoll = useCallback(() => {
    if (sigPollRef.current) { clearInterval(sigPollRef.current); sigPollRef.current = null; }
  }, []);

  const sendSignal = useCallback((roomId: string, type: string, data: any, from?: string) =>
    fetch(`${config.backendUrl}/api/camera/room/${roomId}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data, from }),
    }), []);

  const getRoomSignals = useCallback((roomId: string) =>
    fetch(`${config.backendUrl}/api/camera/room/${roomId}`)
      .then(r => r.json()), []);

  const buildPeer = useCallback((localStream: MediaStream, roomId: string, role: 'caller' | 'callee') => {
    const pc = new RTCPeerConnection(STUN);
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
      setCallState('connected');
      setTimeout(() => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
          remoteVideoRef.current.play().catch(() => {});
        }
      }, 100);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        fetch(`${config.backendUrl}/api/camera/room/${roomId}/signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'ice', data: e.candidate, from: role }),
        }).catch(() => {});
      }
    };
    peerRef.current = pc;
    return pc;
  }, []);

  // Caller: (re)use existing camera stream or open new one → create offer → wait for answer
  const startOffer = useCallback(async (roomId: string) => {
    setCallState('offering');
    try {
      let stream = cameraStreamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        cameraStreamRef.current = stream;
        setCameraOn(true);
        setTimeout(() => {
          if (cameraVideoRef.current) { cameraVideoRef.current.srcObject = stream!; cameraVideoRef.current.play().catch(() => {}); }
        }, 50);
      }
      const pc = buildPeer(stream, roomId, 'caller');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal(roomId, 'offer', offer);
      setCallState('waiting');
      knownIceRef.current = 0;
      // Poll for answer + callee's ICE candidates
      sigPollRef.current = setInterval(async () => {
        try {
          const { room } = await getRoomSignals(roomId);
          if (!room) return;
          if (room.answer && pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(room.answer);
          }
          // Caller reads callee's ICE
          const newIce = (room.calleeIce || []).slice(knownIceRef.current);
          for (const c of newIce) {
            try { await pc.addIceCandidate(c); } catch { /* skip */ }
          }
          knownIceRef.current += newIce.length;
          if (pc.connectionState === 'connected') stopPoll();
        } catch { /* silent */ }
      }, 1000);
    } catch {
      setError('Cannot access camera/microphone for call.');
      setCallState('idle');
    }
  }, [buildPeer, sendSignal, getRoomSignals, stopPoll]);

  // Callee: detect room → open camera → poll for offer → answer
  const joinCall = useCallback(async (roomId: string) => {
    setCallState('joining');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraStreamRef.current = stream;
      setCameraOn(true);
      setTimeout(() => {
        if (cameraVideoRef.current) { cameraVideoRef.current.srcObject = stream; cameraVideoRef.current.play().catch(() => {}); }
      }, 50);
      const pc = buildPeer(stream, roomId, 'callee');
      knownIceRef.current = 0;
      // Poll for offer → answer, and read caller's ICE candidates
      sigPollRef.current = setInterval(async () => {
        try {
          const { room } = await getRoomSignals(roomId);
          if (!room?.offer) return;
          if (pc.signalingState === 'stable') {
            await pc.setRemoteDescription(room.offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal(roomId, 'answer', answer);
          }
          // Callee reads caller's ICE
          const newIce = (room.callerIce || []).slice(knownIceRef.current);
          for (const c of newIce) {
            try { await pc.addIceCandidate(c); } catch { /* skip */ }
          }
          knownIceRef.current += newIce.length;
          if (pc.connectionState === 'connected') stopPoll();
        } catch { /* silent */ }
      }, 1000);
    } catch {
      setError('Cannot access camera/microphone for call.');
      setCallState('idle');
    }
  }, [buildPeer, sendSignal, getRoomSignals, stopPoll]);

  const hangUp = useCallback(() => {
    stopPoll();
    peerRef.current?.close();
    peerRef.current = null;
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    setRemoteStream(null);
    setCameraOn(false);
    setCallState('idle');
  }, [stopPoll]);

  // Auto-join if room param in URL
  useEffect(() => {
    if (urlRoomId && callState === 'idle') {
      // show join banner — don't auto-start, wait for user click
    }
  }, [urlRoomId, callState]);

  // Auto-fire notification from ?notif= query param (from ui-components Try button)
  useEffect(() => {
    if (!urlNotif) return;
    const timer = setTimeout(() => {
      demoNotif(urlNotif as Notif['type']);
    }, 1200); // small delay so avatar finishes loading
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlNotif]);

  // Attach remote stream to video element when it changes
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // Start camera + create session
  const toggleCamera = useCallback(async () => {
    if (cameraOn) {
      // Stop recording if active
      if (cameraRecording) mediaRecorderRef.current?.stop();
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
      setCameraOn(false);
      setCameraVision(false);
      setCameraRecording(false);
      setRecSeconds(0);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      // End session in DB
      if (sessionId_cam) {
        fetch(`${config.backendUrl}/api/camera/sessions/${sessionId_cam}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }).catch(() => {});
        setSessionId_cam(null);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        cameraStreamRef.current = stream;
        setCameraOn(true);
        setTimeout(() => {
          if (cameraVideoRef.current) {
            cameraVideoRef.current.srcObject = stream;
            cameraVideoRef.current.play().catch(() => {});
          }
        }, 50);
        // Create session in DB
        const res = await fetch(`${config.backendUrl}/api/camera/sessions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'vision', agent_id: selectedAgentId || '' }),
        });
        if (res.ok) {
          const data = await res.json();
          setSessionId_cam(data.session.id);
          setRoomId_cam(data.roomId);
        }
      } catch {
        setError('Camera access denied or not available.');
      }
    }
  }, [cameraOn, cameraRecording, sessionId_cam, selectedAgentId]);

  // Capture a JPEG frame from the webcam → base64 (for AI vision)
  const captureFrame = useCallback((): string | null => {
    const video = cameraVideoRef.current;
    if (!video || video.readyState < 2) return null;
    const canvas = visionCanvasRef.current || document.createElement('canvas');
    canvas.width = 640;
    canvas.height = Math.round(640 * (video.videoHeight / (video.videoWidth || 1)));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.save();
    ctx.scale(-1, 1);         // un-mirror the mirrored video
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
    // strip data-url prefix → raw base64
    return canvas.toDataURL('image/jpeg', 0.7).replace(/^data:image\/jpeg;base64,/, '');
  }, []);

  // Start/stop recording
  const toggleRecording = useCallback(async () => {
    if (!cameraStreamRef.current) return;
    if (cameraRecording) {
      mediaRecorderRef.current?.stop();
    } else {
      recChunksRef.current = [];
      const mr = new MediaRecorder(cameraStreamRef.current, { mimeType: 'video/webm;codecs=vp8' });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        setCameraRecording(false);
        if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
        const blob = new Blob(recChunksRef.current, { type: 'video/webm' });
        if (blob.size < 1000) return;
        // Upload to storage
        const form = new FormData();
        form.append('file', blob, `cam-${Date.now()}.webm`);
        form.append('zone', 'cdn');
        form.append('category', 'files');
        form.append('description', 'Camera session recording');
        form.append('tags', JSON.stringify(['camera', 'recording']));
        form.append('ttl', 'long');
        try {
          const up = await fetch(`${config.backendUrl}/api/storage/upload`, { method: 'POST', body: form });
          if (up.ok && sessionId_cam) {
            const { file } = await up.json();
            await fetch(`${config.backendUrl}/api/camera/sessions/${sessionId_cam}`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ file_id: file.id }),
            });
          }
        } catch { /* silent */ }
        setRecSeconds(0);
      };
      mr.start(1000);
      setCameraRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    }
  }, [cameraRecording, sessionId_cam]);

  // Copy share link to clipboard
  const copyRoomLink = useCallback(() => {
    if (!roomId_cam) return;
    const url = `${window.location.origin}/avatar-viewer?room=${roomId_cam}`;
    navigator.clipboard.writeText(url).then(() => setError(null)).catch(() => {});
  }, [roomId_cam]);

  const addClone = useCallback(() => {
    if (clones.length >= 3) return;
    const options = ANIMATION_MANIFEST.filter(a => a.category !== 'locomotion');
    const usedUrls = new Set([animUrl, ...clones.map(c => c.animUrl)]);
    const available = options.filter(a => {
      const url = gender === 'male' ? a.male : a.female;
      return !usedUrls.has(url);
    });
    const pool = available.length > 0 ? available : options;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const url = gender === 'male' ? pick.male : pick.female;
    setClones(prev => [...prev, { id: Math.random().toString(36).slice(2), animUrl: url }]);
  }, [clones, animUrl, gender]);

  const removeClone = useCallback((id: string) => {
    setClones(prev => prev.filter(c => c.id !== id));
  }, []);

  const addUiOverlay = useCallback((specId: string) => {
    const template = ALL_UI_COMPONENTS.find(s => s.id === specId);
    if (!template) return;
    const id = Math.random().toString(36).slice(2);
    setUiOverlays(prev => [...prev, { id, title: template.name, spec: template.spec, duration: template.duration }]);
  }, []);

  const dismissUiOverlay = useCallback((id: string) => {
    setUiOverlays(prev => prev.filter(x => x.id !== id));
  }, []);

  // Spotify overlay — URL saved to DB, visibility is transient session-only
  const [spotifyUrl, setSpotifyUrl]     = useState('');
  const [spotifyOpen, setSpotifyOpen]   = useState(false);
  const spotifyEmbed = extractSpotifyEmbed(spotifyUrl);

  const saveSpotifyUrl = (url: string) => {
    setSpotifyUrl(url);
    fetch(`${config.backendUrl}/api/avatar/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '1', wallSpotifyUrl: url }),
    }).catch(() => {});
  };

  const addNotif = useCallback((n: Omit<Notif, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setNotifs(prev => [...prev, { ...n, id }]);
    if (!n.needsApproval) {
      setTimeout(() => setNotifs(prev => prev.filter(x => x.id !== id)), 5500);
    }
  }, []);

  const dismissNotif = useCallback((id: string) => {
    setNotifs(prev => {
      const next = prev.filter(x => x.id !== id);
      if (notifAutoWeather && next.length === 0) setFxState(FX_DEFAULTS);
      return next;
    });
  }, [notifAutoWeather]);
  const approveNotif = useCallback((id: string) => {
    dismissNotif(id);
    addNotif({ type: 'msg', title: 'Approved ✓', body: 'Task has been approved and queued.' });
  }, [dismissNotif, addNotif]);


  const NOTIF_WEATHER_MAP: Partial<Record<Notif['type'], string>> = {
    msg:       'rainy',
    task:      'cyber',
    approval:  'storm',
    email:     'moonlit',
    whatsapp:  'rainy',
    facebook:  'sunny',
    instagram: 'aurora',
    telegram:  'cyber',
    discord:   'starfield',
    stripe:    'inferno',
    paypal:    'sunny',
    bank:      'storm',
    applepay:  'moonlit',
    stock:     'storm',
    calendar:  'cloudy',
    terminal:  'cyber',
    gif:       'autumn',
    twitter:   'storm',
    tiktok:    'aurora',
    linkedin:  'moonlit',
    snapchat:  'sunny',
    youtube:   'inferno',
    reddit:    'autumn',
    twitch:    'starfield',
    otp:       'cyber',
    faceid:    'cyber',
    sms_otp:   'cyber',
  };
  const demoNotif = useCallback((type: Notif['type']) => {
    const demos: Record<Notif['type'], Omit<Notif, 'id'>> = {
      msg:       { type: 'msg',       title: 'New message',          body: 'Hey! Can we schedule a meeting at 3pm?', from: 'Ahmad', canReply: true },
      task:      { type: 'task',      title: 'New task assigned',    body: 'Review the quarterly report and send feedback.', from: 'System' },
      approval:  { type: 'approval',  title: 'Approval needed',      body: 'Deploy v2.1 to production server?', from: 'CI/CD', needsApproval: true },
      email:     { type: 'email',     title: 'New Email',            body: 'Hi, I wanted to follow up on the proposal we discussed. Can you send the updated version?', from: 'sarah@example.com', canReply: true },
      whatsapp:  { type: 'whatsapp',  title: 'WhatsApp',             body: 'Are you available for a quick call today?', from: '+49 151 234 5678', canReply: true },
      facebook:  { type: 'facebook',  title: 'Facebook Message',     body: 'Hello! I saw your post about the new product. How can I order one?', from: 'Mohamed Ali', canReply: true },
      instagram: { type: 'instagram', title: 'Instagram DM',         body: 'Love your content! Would you be interested in a collaboration?', from: '@brand_partner', canReply: true },
      telegram:  { type: 'telegram',  title: 'Telegram',             body: 'Hey! Did you see the file I sent in the group? Please review when you get a chance.', from: '@team_chat', canReply: true },
      discord:   { type: 'discord',   title: 'Discord',              body: 'New message in #general — @here The meeting starts in 10 minutes!', from: 'Team Server', canReply: true },
      stripe:    { type: 'stripe',    title: 'Stripe — Payment Received', body: 'You received a payment of $249.00 from customer cus_Nfq... Invoice #INV-2024-0087 has been paid.', from: 'Stripe' },
      paypal:    { type: 'paypal',    title: 'PayPal — Money Received',   body: 'You received $180.00 from sarah.m@gmail.com. "Thanks for the invoice!" The funds are now in your balance.', from: 'PayPal' },
      bank:      { type: 'bank',      title: 'Bank — Amount Deducted',    body: 'A payment of €320.00 was deducted from your account ending in 4821. Merchant: Amazon EU. Available balance: €1,240.55.', from: 'Mastercard' },
      applepay:  { type: 'applepay',  title: 'Apple Pay — Payment Sent',  body: 'You paid $45.99 to Starbucks using Apple Pay with Visa •••• 3291.', from: 'Wallet' },
      stock:     { type: 'stock',     title: 'AAPL — Stock Alert',        body: 'Apple Inc. is up +2.45% today, trading at $189.30. Volume: 58.2M. 52w high: $199.62.', from: 'Market Watch' },
      calendar:  { type: 'calendar',  title: 'Upcoming Meeting',          body: 'Team Sync in 15 minutes — 3:00 PM. Zoom link: zoom.us/j/123456789. Attendees: 4 people.', from: 'Calendar' },
      terminal:  { type: 'terminal',  title: 'Terminal Command',          body: 'Execute system command?', from: 'Agent Max', terminalCmd: 'ls -la ~/.data/storage/cache/', terminalOutput: 'total 48\ndrwxr-xr-x  5 user staff   160 Feb 18 14:23 .\ndrwxr-xr-x 12 user staff   384 Feb 18 09:11 ..\ndrwxr-xr-x  8 user staff   256 Feb 18 14:20 audio\ndrwxr-xr-x  3 user staff    96 Feb 18 14:15 screenshots\ndrwxr-xr-x  2 user staff    64 Feb 18 13:42 web' },
      twitter:   { type: 'twitter',   title: 'X — New Login Alert',      body: 'New sign-in to your X account from Windows 11 · Chrome · Berlin, Germany. If this was you, no action needed.', from: 'X Security', needsApproval: true },
      tiktok:    { type: 'tiktok',    title: 'TikTok — Login Attempt',   body: 'A new device signed in to your TikTok account. iPhone 15 · Safari · Dubai, UAE. Tap to review.', from: 'TikTok Security', needsApproval: true },
      linkedin:  { type: 'linkedin',  title: 'LinkedIn — New Sign-in',   body: 'Someone signed in to your account from a new device. MacBook Pro · Firefox · London, UK. Was this you?', from: 'LinkedIn', needsApproval: true },
      snapchat:  { type: 'snapchat',  title: 'Snapchat — Login Alert',   body: 'Your account was accessed from a new device. Samsung Galaxy · New York, US. Tap to verify.', from: 'Snapchat Team', needsApproval: true },
      youtube:   { type: 'youtube',   title: 'YouTube — Account Login',  body: 'New sign-in to your YouTube Studio. Desktop · Chrome · Tokyo, Japan. Secure your account if this wasn\'t you.', from: 'Google Security', needsApproval: true },
      reddit:    { type: 'reddit',    title: 'Reddit — Sign-in Alert',   body: 'New login to your Reddit account detected. Android · Reddit App · Sydney, Australia. Review activity.', from: 'Reddit', needsApproval: true },
      twitch:    { type: 'twitch',    title: 'Twitch — Login from New Device', body: 'Your Twitch account was accessed from Windows 10 · Twitch Desktop · Amsterdam, NL. Enable 2FA for extra protection.', from: 'Twitch Security', needsApproval: true },
      otp:       { type: 'otp',       title: 'Verification Code',        body: 'Use this code to complete your sign-in. Expires in 5 minutes.', from: 'Auth System', otpCode: String(Math.floor(100000 + Math.random() * 900000)) },
      faceid:    { type: 'faceid',    title: 'Sign In Request',            body: 'Sign in to your account using Face ID or fingerprint authentication.', from: 'Security System', biometricDevice: 'iPhone 15 Pro', needsApproval: true },
      sms_otp:   { type: 'sms_otp',  title: 'SMS Verification',           body: 'Your verification code:', from: 'Auth System', phoneNumber: '+49 151 ••• ••83', otpCode: String(Math.floor(100000 + Math.random() * 900000)) },
      gif:       (() => {
        const GIF_POOL: { title: string; body: string; gifUrl: string }[] = [
          { title: 'Amazing Work!',      body: 'You absolutely crushed it today!',     gifUrl: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif' },
          { title: 'Level Up!',          body: 'You just leveled up!',                 gifUrl: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' },
          { title: 'Deploy Successful!', body: 'Ship it! Everything is green!',        gifUrl: 'https://media.giphy.com/media/PiQejEf31116URju4V/giphy.gif' },
          { title: 'High Five!',         body: 'Great collaboration this sprint!',     gifUrl: 'https://media.giphy.com/media/l4q8cJzGdR9J8w3hS/giphy.gif' },
          { title: 'Let\'s Go!',         body: 'Time to build something amazing!',     gifUrl: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
          { title: 'Mind Blown!',        body: 'This code is next level...',           gifUrl: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif' },
          { title: 'Coffee Time!',       body: 'Refuel and get back to it!',           gifUrl: 'https://media.giphy.com/media/3o6ZsYm5Su7ka0kBLG/giphy.gif' },
          { title: 'Bug Fixed!',         body: 'That was a tricky one!',               gifUrl: 'https://media.giphy.com/media/citBl9yPwnUOs/giphy.gif' },
          { title: 'Weekend!',           body: 'Close your laptop, you earned it!',    gifUrl: 'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif' },
          { title: 'Dance Break!',       body: 'Great work deserves a dance!',         gifUrl: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif' },
        ];
        const pick = GIF_POOL[Math.floor(Math.random() * GIF_POOL.length)];
        return { type: 'gif' as const, ...pick, from: 'Team Bot' };
      })(),
    };
    addNotif(demos[type]);
    if (notifAutoWeather) {
      const weatherId = NOTIF_WEATHER_MAP[type] ?? WEATHER_PRESETS[Math.floor(Math.random() * WEATHER_PRESETS.length)].id;
      applyWeatherPreset(weatherId);
    }
  }, [addNotif, notifAutoWeather, applyWeatherPreset]);

  const sendGif = useCallback((gifUrl: string, title: string) => {
    addNotif({ type: 'gif', title: title || 'GIF', body: '', from: 'Custom', gifUrl });
    if (notifAutoWeather) applyWeatherPreset('autumn');
  }, [addNotif, notifAutoWeather, applyWeatherPreset]);

  // Update a specific notification by id (for reply, etc.)
  const updateNotif = useCallback((id: string, changes: Partial<Omit<Notif, 'id'>>) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, ...changes } : n));
  }, []);

  // AI-generated reply for a notification — calls the agent and returns the reply text
  const handleAiReply = useCallback(async (notif: Notif): Promise<string> => {
    const platformName = ({ email: 'email', whatsapp: 'WhatsApp', facebook: 'Facebook', instagram: 'Instagram DM', msg: 'message', task: 'task', approval: 'request' } as Record<string, string>)[notif.type] || notif.type;
    const prompt = `You received a ${platformName} from ${notif.from || 'someone'}: "${notif.body}". Write a short professional reply in the same language as the message. Plain text only, no markdown.`;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          systemPrompt: 'You are a helpful personal assistant. Reply to messages concisely and naturally. No markdown, no asterisks, plain text only.',
          agentId: selectedAgentId || undefined,
        }),
      });
      if (!res.ok) return '';
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = '', buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(trimmed.slice(6));
            const chunk = (json.type === 'text' && json.content) ? json.content : (!json.type && json.content ? json.content : '');
            if (chunk) full += chunk;
          } catch { /* skip */ }
        }
      }
      return cleanTextForTTS(full).trim();
    } catch { return ''; }
  }, [selectedAgentId]);

  // Detect if current animation is locomotion (needs root motion stripping)
  const isLocomotion = ANIMS.male.locomotion.some(a => a.url === animUrl)
                    || ANIMS.female.locomotion.some(a => a.url === animUrl);

  // ── Keyboard controls — active only when mouse is over the avatar canvas ──
  const [avatarHovered, setAvatarHovered] = useState(false);
  const heldKeysRef = useRef<Set<string>>(new Set());
  const idleUrlRef  = useRef<string>(CDN_MALE_IDLE); // track idle per gender

  // Keep idleUrlRef in sync with gender
  useEffect(() => {
    idleUrlRef.current = gender === 'male' ? CDN_MALE_IDLE : CDN_FEMALE_IDLE;
  }, [gender]);

  // Resolve the best animation URL for a given key + gender
  const keyToAnimUrl = useCallback((key: string, g: string): string | null => {
    const male = g === 'male';
    const k = key.toLowerCase();
    // Forward: ArrowUp / W
    if (k === 'arrowup' || k === 'w')
      return male
        ? '/animations/masculine/locomotion/M_Walk_001.glb'
        : '/animations/feminine/locomotion/F_Walk_002.glb';
    // Backward: ArrowDown / S
    if (k === 'arrowdown' || k === 's')
      return male
        ? '/animations/masculine/locomotion/M_Walk_Backwards_001.glb'
        : '/animations/feminine/locomotion/F_Walk_Backwards_001.glb';
    // Strafe right: ArrowRight / D
    if (k === 'arrowright' || k === 'd')
      return male
        ? '/animations/masculine/locomotion/M_Walk_001.glb'
        : '/animations/feminine/locomotion/F_Walk_002.glb';
    // Strafe left: ArrowLeft / A
    if (k === 'arrowleft' || k === 'a')
      return male
        ? '/animations/masculine/locomotion/M_Walk_Backwards_001.glb'
        : '/animations/feminine/locomotion/F_Walk_Backwards_001.glb';
    // Jump: Space
    if (key === ' ')
      return male
        ? '/animations/masculine/locomotion/M_Walk_Jump_001.glb'
        : '/animations/feminine/locomotion/F_Walk_Jump_001.glb';
    return null;
  }, []);

  useEffect(() => {
    if (!avatarHovered) return;

    const KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D']);

    const onKeyDown = (e: KeyboardEvent) => {
      if (!KEYS.has(e.key)) return;
      // Don't fire when typing in an input / textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      if (heldKeysRef.current.has(e.key)) return; // already held
      heldKeysRef.current.add(e.key);
      // Priority: Space > directional
      const activeKey = heldKeysRef.current.has(' ')
        ? ' '
        : [...heldKeysRef.current][0];
      const url = keyToAnimUrl(activeKey, gender);
      if (url) setAnimUrl(url);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!KEYS.has(e.key)) return;
      heldKeysRef.current.delete(e.key);
      if (heldKeysRef.current.size === 0) {
        // All keys released → return to idle
        setAnimUrl(idleUrlRef.current);
      } else {
        // Other keys still held — switch to their animation
        const activeKey = heldKeysRef.current.has(' ')
          ? ' '
          : [...heldKeysRef.current][0];
        const url = keyToAnimUrl(activeKey, gender);
        if (url) setAnimUrl(url);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      // Release all held keys on unmount / hover-leave
      heldKeysRef.current.clear();
    };
  }, [avatarHovered, gender, keyToAnimUrl]);

  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const audioCallbackRef = useCallback((el: HTMLAudioElement | null) => setAudioElement(el), []);

  const processingRef    = useRef(false);
  const historyRef       = useRef<Message[]>([]);
  const vadRef           = useRef<ReturnType<typeof useMicVAD> | null>(null);
  const chatBottomRef    = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat sidebar to bottom whenever messages change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  const segmentQueueRef  = useRef<Array<{ animId: string | null; blobUrl: string }>>([]);
  // Refs for VAD callbacks (avoid stale closures)
  const audioRef         = useRef<HTMLAudioElement | null>(null);
  const modeRef          = useRef<ConvMode>('idle');

  useEffect(() => { historyRef.current = messages; }, [messages]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  // Keep audioRef in sync so VAD callbacks can access it without stale closure
  useEffect(() => { audioRef.current = audioElement; }, [audioElement]);

  // When gender changes, reset to CDN idle for that gender
  useEffect(() => {
    setAnimUrl(gender === 'male' ? CDN_MALE_IDLE : CDN_FEMALE_IDLE);
  }, [gender]);

  // Show contextual animation based on mode
  useEffect(() => {
    if (mode === 'processing') {
      const url = resolveAnimUrl('expr_think', gender);
      if (url) setAnimUrl(url);
    } else if (mode === 'listening') {
      const url = resolveAnimUrl('idle_casual', gender);
      if (url) setAnimUrl(url);
    }
  }, [mode, gender]);

  // ── Shared streaming chat + TTS pipeline ────────────────────────────────────
  /**
   * Stream AI response token by token, generate TTS for each [ANIM:id] segment
   * as soon as its text is complete — play first segment immediately when ready,
   * queue the rest. Much faster than waiting for the full response.
   */
  const runStreamingChat = useCallback(async (userText: string) => {
    setMode('processing');
    setError(null);
    segmentQueueRef.current = [];

    try {
      const selectedAgent = availableAgents.find((a) => a.id === selectedAgentId);
      const history = historyRef.current.slice(-8);

      // Build user message — attach camera frame when vision mode is active
      let userMessageContent: string | any[] = userText;
      if (cameraOn && cameraVision) {
        const frameB64 = captureFrame();
        if (frameB64) {
          userMessageContent = [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frameB64 } },
            { type: 'text', text: userText },
          ];
          // Count frame in session
          if (sessionId_cam) {
            fetch(`${config.backendUrl}/api/camera/sessions/${sessionId_cam}`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ frame_count: 1 }),
            }).catch(() => {});
          }
        }
      }

      // Stream directly from /api/chat (raw text chunks)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: userMessageContent }],
          systemPrompt: buildAvatarSystemPrompt(gender, selectedAgent?.system_prompt) +
            (cameraOn && cameraVision ? '\n\nThe user has shared a camera frame with you. You can see them in the image. Respond naturally as if you can see them.' : ''),
          agentId: selectedAgentId || undefined,
        }),
      });
      if (!res.ok) throw new Error('AI request failed');

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      // TTS generation helper
      const generateTTS = async (animId: string | null, rawText: string): Promise<{ animId: string | null; blobUrl: string }> => {
        const cleaned = cleanTextForTTS(rawText);
        if (!cleaned) return { animId, blobUrl: '' };
        const lang = detectLang(cleaned);
        const ttsRes = await fetch(`${config.backendUrl}/api/audio/tts`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleaned, voice: 'alloy', language: lang }),
        });
        if (!ttsRes.ok) return { animId, blobUrl: '' };
        const ttsData = await ttsRes.json();
        if (!ttsData.success || !ttsData.audioUrl) return { animId, blobUrl: '' };
        const audioRes = await fetch(`${config.backendUrl}${ttsData.audioUrl}`);
        const blob = await audioRes.blob();
        return { animId, blobUrl: URL.createObjectURL(blob) };
      };

      // Segment streaming state
      let sseLineBuffer = ''; // accumulate raw SSE bytes to split into lines
      let textBuffer = ''; // accumulates plain text extracted from SSE
      let currentAnimId: string | null = null;
      let fullDisplayText = '';
      const ttsPromises: Promise<{ animId: string | null; blobUrl: string }>[] = [];

      // Read streaming chunks, parse SSE lines, then detect [ANIM:id] boundaries
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseLineBuffer += decoder.decode(value, { stream: true });

        // Extract complete SSE lines, keep partial last line in buffer
        const lines = sseLineBuffer.split('\n');
        sseLineBuffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(trimmed.slice(6));
            // New format: {type:'text', content} — Old format: {content, done}
            const chunk = (json.type === 'text' && json.content)
              ? json.content
              : (!json.type && json.content ? json.content : '');
            if (chunk) textBuffer += chunk;
          } catch { /* skip malformed lines */ }
        }

        // Strip complete ```spec blocks (UI components — not spoken aloud)
        {
          let sStart: number;
          while ((sStart = textBuffer.indexOf('```spec\n')) !== -1) {
            const sEnd = textBuffer.indexOf('\n```', sStart + 8);
            if (sEnd === -1) break;
            textBuffer = textBuffer.slice(0, sStart) + textBuffer.slice(sEnd + 4);
          }
        }

        // Strip and fire any complete ```notify blocks from the text buffer
        {
          let nStart: number;
          while ((nStart = textBuffer.indexOf('```notify\n')) !== -1) {
            const nEnd = textBuffer.indexOf('\n```', nStart + 10);
            if (nEnd === -1) break; // block still streaming in
            const jsonStr = textBuffer.slice(nStart + 10, nEnd).trim();
            textBuffer = textBuffer.slice(0, nStart) + textBuffer.slice(nEnd + 4);
            try {
              const notifData = JSON.parse(jsonStr);
              addNotif(notifData);
            } catch { /* ignore malformed */ }
          }
        }

        // Consume all complete [ANIM:id] markers currently in the text buffer
        while (true) {
          const animStart = textBuffer.indexOf('[ANIM:');
          if (animStart === -1) break;
          const animEnd = textBuffer.indexOf(']', animStart);
          if (animEnd === -1) break; // Marker still arriving — wait for next chunk

          // Flush text before this marker as a segment with the current animation
          const before = textBuffer.slice(0, animStart);
          if (before.trim()) {
            ttsPromises.push(generateTTS(currentAnimId, before));
            fullDisplayText += before + ' ';
          }

          // Switch to the new animation and continue with text after the marker
          currentAnimId = textBuffer.slice(animStart + 6, animEnd);
          textBuffer = textBuffer.slice(animEnd + 1);
        }
      }

      // Flush any remaining text as the final segment
      if (textBuffer.trim()) {
        ttsPromises.push(generateTTS(currentAnimId, textBuffer));
        fullDisplayText += textBuffer;
      }
      fullDisplayText = fullDisplayText.trim();

      // Update chat display (clean text without anim markers)
      setMessages((prev) => [...prev, { role: 'assistant', content: cleanTextForTTS(fullDisplayText) }]);

      if (ttsPromises.length === 0) {
        setMode(vadEnabled ? 'listening' : 'idle');
        processingRef.current = false;
        return;
      }

      // Play first segment as soon as its TTS resolves (it started earliest)
      const first = await ttsPromises[0];
      if (!first.blobUrl) {
        setMode(vadEnabled ? 'listening' : 'idle');
        processingRef.current = false;
        return;
      }

      if (first.animId) {
        const url = resolveAnimUrl(first.animId, gender);
        if (url) setAnimUrl(url);
      }

      if (audioElement) {
        if (audioElement.src.startsWith('blob:')) URL.revokeObjectURL(audioElement.src);
        audioElement.src = first.blobUrl;
        audioElement.muted = isMuted;
        setMode('speaking');
        setIsPlaying(true);
        // Populate queue in order as remaining TTS resolve (background)
        (async () => {
          for (let i = 1; i < ttsPromises.length; i++) {
            const item = await ttsPromises[i];
            if (item.blobUrl) segmentQueueRef.current.push(item);
          }
        })();
        try {
          await audioElement.play();
        } catch (playErr: any) {
          console.error('Audio autoplay blocked:', playErr);
          // Try to enable audio on user interaction
          setError('Click anywhere to enable audio playback');
          // Add one-time click listener to start audio
          const playOnInteraction = () => {
            audioElement.play().then(() => {
              setError(null);
              document.removeEventListener('click', playOnInteraction);
            }).catch(err => console.error('Still cannot play:', err));
          };
          document.addEventListener('click', playOnInteraction, { once: true });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setMode(vadEnabled ? 'listening' : 'idle');
    } finally {
      processingRef.current = false;
    }
  }, [audioElement, isMuted, vadEnabled, selectedAgentId, gender, availableAgents, cameraOn, cameraVision, captureFrame, sessionId_cam, addNotif]);

  // ── Audio pipeline (voice input → STT → streaming chat) ──────────────────
  const runPipeline = useCallback(async (audio: Float32Array) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setMode('processing'); setError(null);

    try {
      const wavBlob = float32ToWav(audio);
      const form = new FormData();
      form.append('file', wavBlob, 'speech.wav');

      const sttRes = await fetch(`${config.backendUrl}/api/audio/transcribe`, { method: 'POST', body: form });
      if (!sttRes.ok) throw new Error('Transcription failed');
      const sttData = await sttRes.json();
      const userText = sttData.transcript?.trim();
      if (!userText) { setMode(vadEnabled ? 'listening' : 'idle'); processingRef.current = false; return; }

      setMessages((prev) => [...prev, { role: 'user', content: userText }]);
      setShowChat(true);
      await runStreamingChat(userText);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setMode(vadEnabled ? 'listening' : 'idle');
      processingRef.current = false;
    }
  }, [vadEnabled, runStreamingChat]);

  // ── Text pipeline (typed input → streaming chat) ──────────────────────────
  const runTextPipeline = useCallback(async (text: string) => {
    if (!text.trim() || processingRef.current) return;
    processingRef.current = true;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setTextInput('');
    setShowChat(true);
    await runStreamingChat(text);
  }, [runStreamingChat]);

  // ── VAD ───────────────────────────────────────────────────────────────────
  const vad = useMicVAD({
    startOnLoad: false,
    model: 'v5',
    baseAssetPath:    '/',
    onnxWASMBasePath: '/',
    onSpeechStart: () => {
      // Interrupt avatar if it's speaking — user wants to talk
      if (modeRef.current === 'speaking') {
        const audio = audioRef.current;
        if (audio) { audio.pause(); audio.src = ''; }
        segmentQueueRef.current = [];
        setIsPlaying(false);
      }
      if (modeRef.current !== 'processing') setMode('listening');
    },
    onSpeechEnd: (audio) => {
      vadRef.current?.pause();
      runPipeline(audio);
    },
  });
  vadRef.current = vad;

  // Cleanup VAD on unmount to prevent "null stream, audio context, or processor adapter" error
  useEffect(() => {
    return () => {
      if (vadRef.current) {
        vadRef.current.pause();
        vadRef.current = null;
      }
    };
  }, []);

  /** Play the next queued animation segment, or return to idle if queue is empty. */
  const playNextSegment = useCallback(() => {
    const next = segmentQueueRef.current.shift();
    if (!next || !audioElement) {
      // Queue exhausted — return to idle
      setIsPlaying(false);
      setMode('idle');
      setAnimUrl(gender === 'male' ? CDN_MALE_IDLE : CDN_FEMALE_IDLE);
      if (vadEnabled) { setMode('listening'); vadRef.current?.start(); }
      return;
    }
    // Switch animation for this segment
    if (next.animId) {
      const url = resolveAnimUrl(next.animId, gender);
      if (url) setAnimUrl(url);
    }
    // Play audio for this segment (onEnded will call playNextSegment again)
    if (audioElement.src.startsWith('blob:')) URL.revokeObjectURL(audioElement.src);
    audioElement.src = next.blobUrl;
    audioElement.muted = isMuted;
    audioElement.play().catch((err) => {
      console.error('Error playing next segment:', err);
      setError('Audio playback failed - click to retry');
    });
  }, [audioElement, gender, isMuted, vadEnabled]);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    // If more segments are queued, play the next one; otherwise go idle
    if (segmentQueueRef.current.length > 0) {
      playNextSegment();
    } else {
      setMode('idle');
      setAnimUrl(gender === 'male' ? CDN_MALE_IDLE : CDN_FEMALE_IDLE);
      if (vadEnabled) { setMode('listening'); vadRef.current?.start(); }
    }
  }, [vadEnabled, gender, playNextSegment]);

  const toggleVAD = useCallback(() => {
    if (vadEnabled) { vadRef.current?.pause(); setVadEnabled(false); setMode('idle'); }
    else { vadRef.current?.start(); setVadEnabled(true); setMode('listening'); }
  }, [vadEnabled]);

  const toggleMute = () => {
    if (audioElement) audioElement.muted = !isMuted;
    setIsMuted((m) => !m);
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col select-none">
      {/* ── Header ── */}
      <header className="bg-gray-800/80 backdrop-blur text-white px-5 py-3 flex items-center gap-3 border-b border-gray-700 z-10">
        <div className="flex-1" />
        <button onClick={toggleMute} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        {/* Developer mode toggle */}
        <button
          onClick={toggleDevMode}
          className={`p-2 rounded-lg transition-colors text-[10px] font-bold leading-none ${devMode ? 'bg-amber-600/80 text-white hover:bg-amber-600' : 'text-gray-500 hover:bg-gray-700 hover:text-amber-400'}`}
          title={devMode ? 'Developer mode ON — click to disable' : 'Enable developer mode'}
        >
          DEV
        </button>
        {/* Dev panel toggle — visible only in developer mode */}
        {devMode && (
          <button
            onClick={() => setShowAnimPanel((s) => !s)}
            className={`p-2 rounded-lg transition-colors ${showAnimPanel ? 'bg-amber-600/40 text-amber-300 hover:bg-amber-600/60' : 'text-amber-500 hover:bg-gray-700'}`}
            title={showAnimPanel ? 'Hide dev panel' : 'Show dev panel'}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        )}
        <a href="/settings/avatar" className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-300" title="Avatar Settings">
          <Settings className="w-4 h-4" />
        </a>
        <button
          onClick={toggleCamera}
          className={`p-2 rounded-lg transition-colors ${cameraOn ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-700 text-gray-300'}`}
          title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {cameraOn ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
        </button>
        <button onClick={() => setShowChat((s) => !s)} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Chat history">
          <MessageCircle className="w-4 h-4" />
        </button>
        {/* Clone avatar button */}
        <button
          onClick={addClone}
          disabled={clones.length >= 3 || !avatarUrl}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 disabled:opacity-30 relative"
          title={clones.length >= 3 ? 'Max 3 clones' : 'Clone avatar with different animation'}
        >
          <Users className="w-4 h-4" />
          {clones.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 text-[9px] bg-blue-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold leading-none">
              {clones.length + 1}
            </span>
          )}
        </button>
        {clones.length > 0 && (
          <button
            onClick={() => setClones([])}
            className="p-2 hover:bg-red-900/60 rounded-lg transition-colors text-gray-500 hover:text-red-400 text-[10px] font-medium"
            title="Remove all clones"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left sidebar — chat + agent selector ── */}
        {showChat && (
          <aside
            className="flex-shrink-0 bg-gray-800/95 border-r border-gray-700 flex flex-col overflow-hidden z-10 relative"
            style={{ width: sidebarWidth }}
          >
            {/* Agent / Model selector */}
            {availableAgents.length > 0 && (
              <div className="px-3 py-2 border-b border-gray-700 flex-shrink-0">
                <span className="text-xs text-gray-400 block mb-1">Agent / Model</span>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg text-white text-xs px-2 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                  disabled={mode === 'processing' || mode === 'speaking'}
                >
                  {availableAgents.map((a) => (
                    <option key={a.id} value={a.id}>{a.emoji} {a.name}{a.isPrimary ? ' ★' : ''}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Messages header */}
            <div className="px-3 py-2 border-b border-gray-700 text-sm font-medium text-gray-300 flex items-center justify-between flex-shrink-0">
              <span>Conversation</span>
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>
              )}
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <p className="text-xs text-gray-600 text-center pt-4">No messages yet</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-700 text-gray-100 rounded-bl-sm'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Drag handle — right edge */}
            <div
              className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/40 active:bg-blue-500/60 transition-colors z-20"
              onMouseDown={(e) => {
                e.preventDefault();
                sidebarDragRef.current = { startX: e.clientX, startW: sidebarWidth };
                const onMove = (ev: MouseEvent) => {
                  if (!sidebarDragRef.current) return;
                  const delta = ev.clientX - sidebarDragRef.current.startX;
                  const newW = Math.max(200, Math.min(520, sidebarDragRef.current.startW + delta));
                  setSidebarWidth(newW);
                };
                const onUp = () => {
                  sidebarDragRef.current = null;
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            />
          </aside>
        )}

        {/* Canvas area */}
        <div className="flex-1 relative overflow-hidden flex">
          {/* Global overlays — absolute, cover all slots */}
          {matrixOn && <MatrixRain speed={matrixSpeed} opacity={matrixOpacity} density={matrixDensity} />}
          {emojiRain && <EmojiRain pack={emojiRain} onDone={() => setEmojiRain(null)} />}
          {fxState.snow.on && <SnowEffect speed={fxState.snow.speed} density={fxState.snow.density} opacity={fxState.snow.opacity} />}
          {fxState.fireflies.on && <FirefliesEffect count={fxState.fireflies.count} speed={fxState.fireflies.speed} opacity={fxState.fireflies.opacity} />}
          {fxState.starfield.on && <StarfieldEffect speed={fxState.starfield.speed} count={fxState.starfield.count} opacity={fxState.starfield.opacity} />}
          {fxState.rain.on && <RainEffect intensity={fxState.rain.intensity} speed={fxState.rain.speed} opacity={fxState.rain.opacity} />}
          {fxState.fire.on && <FireEffect intensity={fxState.fire.intensity} opacity={fxState.fire.opacity} />}
          {fxState.lightning.on && <LightningEffect frequency={fxState.lightning.frequency} opacity={fxState.lightning.opacity} />}
          {fxState.aurora.on && <AuroraEffect speed={fxState.aurora.speed} opacity={fxState.aurora.opacity} />}
          {fxState.glitch.on && <GlitchEffect intensity={fxState.glitch.intensity} />}
          {fxState.scanlines.on && <ScanlinesEffect opacity={fxState.scanlines.opacity} />}
          {fxState.hologram.on && <HologramEffect opacity={fxState.hologram.opacity} />}
          {fxState.vignette.on && <VignettePulseEffect color={fxState.vignette.color} pulseSpeed={fxState.vignette.pulseSpeed} opacity={fxState.vignette.opacity} />}
          {fxState.confetti && <ConfettiEffect onDone={() => handleFxChange('confetti', false)} />}

          <NotifStack notifs={notifs} onDismiss={dismissNotif} onApprove={approveNotif} onUpdate={updateNotif} onAiReply={handleAiReply} />
          <UIOverlayStack items={uiOverlays} onDismiss={dismissUiOverlay} />
          {spotifyOpen && spotifyEmbed && (
            <SpotifyOverlay embedUrl={spotifyEmbed} onClose={() => setSpotifyOpen(false)} />
          )}

          {/* Main avatar slot */}
          <div
            className="relative flex-1 min-w-0 overflow-hidden"
            onMouseEnter={() => setAvatarHovered(true)}
            onMouseLeave={() => { setAvatarHovered(false); heldKeysRef.current.clear(); setAnimUrl(idleUrlRef.current); }}
          >
          {!avatarUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mx-auto mb-3" />
                <p className="text-white text-sm">Loading avatar...</p>
              </div>
            </div>
          )}
          <AvatarViewer
            avatarUrl={avatarUrl}
            isPlaying={isPlaying}
            audioElement={audioElement}
            className="w-full h-full"
            animationUrl={animUrl}
            zoomRef={zoomRef}
            avatarY={avatarY}
            stripRootMotion={isLocomotion}
            bgColor={bgColor}
            bgScene={bgScene}
            wallText={appliedWall.text}
            wallLogoUrl={appliedWall.logoUrl}
            wallVideoUrl={appliedWall.videoUrl}
            wallLayout={appliedWall.layout}
            youtubeNoCookie={youtubeNoCookie}
            showShadow={showShadow}
            worldBots={worldBots}
          />

          {/* Status badge */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <ModeBadge mode={mode} />
          </div>

          {/* Webcam PiP overlay */}
          {cameraOn && (
            <div className="absolute bottom-20 right-4 z-20 flex flex-col gap-1 items-end">
              {/* Video frame */}
              <div className="relative rounded-xl overflow-hidden border-2 shadow-2xl bg-black"
                style={{ width: 220, height: 165, borderColor: cameraRecording ? '#ef4444' : '#3b82f6' }}>
                <video
                  ref={cameraVideoRef}
                  autoPlay playsInline muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Recording indicator */}
                {cameraRecording && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/90 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {String(Math.floor(recSeconds / 60)).padStart(2, '0')}:{String(recSeconds % 60).padStart(2, '0')}
                  </div>
                )}
                {/* Vision mode indicator */}
                {cameraVision && !cameraRecording && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-purple-600/90 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                    <Eye className="w-2.5 h-2.5" />
                    AI Vision
                  </div>
                )}
                {/* Close button */}
                <button
                  onClick={toggleCamera}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/70 hover:bg-red-700 text-white flex items-center justify-center transition-colors"
                  title="Close camera"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Controls bar */}
              <div className="flex gap-1.5 bg-gray-900/95 rounded-xl px-2 py-1.5 border border-gray-700 shadow-xl">
                {/* AI Vision toggle */}
                <button
                  onClick={() => setCameraVision(v => !v)}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-medium transition-colors ${cameraVision ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  title="AI Vision — Claude sees your camera"
                >
                  {cameraVision ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  Vision
                </button>

                {/* Record toggle */}
                <button
                  onClick={toggleRecording}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-medium transition-colors ${cameraRecording ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  title={cameraRecording ? 'Stop recording' : 'Start recording (saves to storage)'}
                >
                  {cameraRecording ? <Square className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                  {cameraRecording ? 'Stop' : 'Rec'}
                </button>

                {/* Share / Start call */}
                {roomId_cam && callState === 'idle' && (
                  <button
                    onClick={() => { copyRoomLink(); startOffer(roomId_cam); }}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-medium bg-gray-700 text-gray-300 hover:bg-blue-700 hover:text-white transition-colors"
                    title="Copy room link and start call — share the link so the other person can join"
                  >
                    <Link className="w-3 h-3" />
                    Share + Call
                  </button>
                )}
                {(callState === 'waiting' || callState === 'offering') && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-yellow-700/60 text-yellow-200 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-pulse" />
                    Waiting...
                  </span>
                )}
                {callState === 'connected' && (
                  <button
                    onClick={hangUp}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-medium bg-red-700 text-white hover:bg-red-800 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    End
                  </button>
                )}
              </div>
            </div>
          )}
          {/* Hidden canvas for AI vision frame capture */}
          <canvas ref={visionCanvasRef} className="hidden" />

          {/* Join call banner — shown when opened via room link */}
          {urlRoomId && callState === 'idle' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-blue-700/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-blue-500 backdrop-blur">
              <Camera className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">You have been invited to a video call</span>
              <button
                onClick={() => joinCall(urlRoomId)}
                className="bg-white text-blue-700 font-semibold text-sm px-4 py-1.5 rounded-xl hover:bg-blue-50 transition-colors"
              >
                Join
              </button>
            </div>
          )}
          {urlRoomId && callState === 'joining' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-gray-800/95 text-white px-5 py-3 rounded-2xl shadow-xl border border-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Connecting to call...</span>
            </div>
          )}

          {/* Remote video PiP — bottom-right when in a call */}
          {remoteStream && (
            <div className="absolute bottom-20 right-4 z-20 flex flex-col gap-1 items-end" style={{ marginRight: cameraOn ? 238 : 0 }}>
              <div className="relative rounded-xl overflow-hidden border-2 border-green-500 shadow-2xl bg-black" style={{ width: 220, height: 165 }}>
                <video
                  ref={remoteVideoRef}
                  autoPlay playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-600/90 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  Remote
                </div>
                <button
                  onClick={hangUp}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-700/80 hover:bg-red-700 text-white flex items-center justify-center transition-colors"
                  title="End call"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="text-[10px] text-green-400 font-medium bg-gray-900/80 px-2 py-0.5 rounded-full">
                Connected
              </div>
            </div>
          )}

          {/* Error toast */}
          {error && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 bg-red-900/90 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 max-w-sm">
              <span className="flex-1">⚠️ {error}</span>
              <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Zoom buttons — bottom-left */}
          <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1">
            <button
              onClick={() => zoomRef.current?.zoomIn()}
              className="w-9 h-9 flex items-center justify-center bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => zoomRef.current?.zoomOut()}
              className="w-9 h-9 flex items-center justify-center bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>


          </div>{/* end main avatar slot */}

          {/* Clone slots */}
          {clones.map((clone) => {
            const entry = ANIMATION_MANIFEST.find(a =>
              (gender === 'male' ? a.male : a.female) === clone.animUrl
            );
            return (
              <div key={clone.id} className="relative flex-1 min-w-0 overflow-hidden border-l border-gray-800/80">
                <AvatarViewer
                  avatarUrl={avatarUrl}
                  animationUrl={clone.animUrl}
                  bgColor={bgColor}
                  bgScene={bgScene}
                  avatarY={avatarY}
                  className="w-full h-full"
                  showShadow={showShadow}
                />
                {/* Dismiss button */}
                <button
                  onClick={() => removeClone(clone.id)}
                  className="absolute top-2 right-2 w-6 h-6 bg-gray-900/80 hover:bg-red-900/80 text-gray-400 hover:text-white rounded-full text-xs flex items-center justify-center z-10 border border-gray-700 transition-colors"
                  title="Remove clone"
                >
                  <X className="w-3 h-3" />
                </button>
                {/* Animation label */}
                {entry && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-gray-400 bg-gray-900/70 backdrop-blur px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none z-10">
                    {entry.label.split(' ').slice(0, 3).join(' ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Animation panel */}
        {showAnimPanel && (
          <AnimPanel
            gender={gender}
            activeUrl={animUrl}
            onSelect={setAnimUrl}
            onGenderToggle={() => setGender((g) => g === 'male' ? 'female' : 'male')}
            avatarY={avatarY}
            onAvatarYChange={setAvatarY}
            onPreset={(p) => zoomRef.current?.setPreset(p)}
            bgColor={bgColor}
            onBgColorChange={saveBgColor}
            bgSaved={bgSaved}
            bgScene={bgScene}
            onBgSceneChange={saveBgScene}
            wallText={wallText}
            onWallTextChange={setWallText}
            wallLogoUrl={wallLogoUrl}
            onWallLogoUrlChange={setWallLogoUrl}
            wallVideoUrl={wallVideoUrl}
            onWallVideoUrlChange={setWallVideoUrl}
            wallLayout={wallLayout}
            onWallLayoutChange={updateWallLayout}
            youtubeNoCookie={youtubeNoCookie}
            onYoutubeNoCookieChange={setYoutubeNoCookie}
            hasDraftChanges={hasDraftChanges}
            onApply={applyWallContent}
            matrixOn={matrixOn}
            onMatrixToggle={() => setMatrixOn(m => !m)}
            matrixSpeed={matrixSpeed}
            onMatrixSpeedChange={setMatrixSpeed}
            matrixOpacity={matrixOpacity}
            onMatrixOpacityChange={setMatrixOpacity}
            matrixDensity={matrixDensity}
            onMatrixDensityChange={setMatrixDensity}
            onEmojiRain={setEmojiRain}
            onDemoNotif={demoNotif}
            fxState={fxState}
            onFxChange={handleFxChange}
            notifAutoWeather={notifAutoWeather}
            onNotifAutoWeatherChange={setNotifAutoWeather}
            onApplyPreset={applyWeatherPreset}
            spotifyUrl={spotifyUrl}
            onSpotifyUrlChange={saveSpotifyUrl}
            spotifyOpen={spotifyOpen}
            onSpotifyToggle={() => setSpotifyOpen(o => !o)}
            onDemoUiOverlay={addUiOverlay}
            onSendGif={sendGif}
          />
        )}
      </div>

      {/* ── Controls ── */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Text input row */}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') runTextPipeline(textInput); }}
              placeholder={vadEnabled ? 'Listening… speak naturally, pause to send' : 'Type a message…'}
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500"
              disabled={mode === 'processing' || mode === 'speaking'}
            />

            {/* Mic button — turns red when active */}
            <button
              onClick={toggleVAD}
              title={vadEnabled ? 'Stop microphone' : 'Start voice chat'}
              className={`relative p-2.5 rounded-lg transition-all ${
                vadEnabled
                  ? 'bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-500/40'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {vadEnabled ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {/* Pulse ring when listening */}
              {mode === 'listening' && (
                <span className="absolute inset-0 rounded-lg ring-2 ring-red-400 animate-ping pointer-events-none" />
              )}
            </button>

            {/* Send button */}
            <button
              onClick={() => runTextPipeline(textInput)}
              disabled={!textInput.trim() || mode === 'processing' || mode === 'speaking'}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg transition-colors"
            >
              {mode === 'processing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioCallbackRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleAudioEnded}
        onError={(e) => {
          console.error('Audio playback error:', e);
          setError('Audio playback failed');
        }}
        muted={isMuted}
        playsInline
        autoPlay
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AvatarViewerPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AvatarViewerContent />
    </Suspense>
  );
}
