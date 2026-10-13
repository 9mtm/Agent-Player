import * as THREE from 'three';

/**
 * Agent Player avatar animation controller.
 *
 * Plays clips that are authored on our own skeleton (docs/avatar-base/build_v002.py)
 * and shipped inside the avatar GLB itself. Pure Three.js: one AnimationMixer per
 * avatar, crossfades between clips, and "one-shot" clips (Wave, Nod, Shake) return
 * to the base clip when they finish.
 */

/** Clips that loop forever until replaced. Everything else plays once. */
export const LOOP_CLIPS = new Set(['Idle', 'Talk', 'Walk']);

export const BASE_CLIP = 'Idle';

export interface AvatarAnimatorOptions {
  /** Seconds used for crossfading between clips. */
  fade?: number;
  /** Clip to fall back to after a one-shot clip finishes. */
  baseClip?: string;
}

export class AvatarAnimator {
  readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  private readonly fade: number;
  private readonly baseClip: string;
  private readonly onFinished = (e: { action: THREE.AnimationAction }) => {
    if (e.action === this.current) this.play(this.baseClip);
  };

  constructor(root: THREE.Object3D, clips: THREE.AnimationClip[], opts: AvatarAnimatorOptions = {}) {
    this.fade = opts.fade ?? 0.3;
    this.baseClip = opts.baseClip ?? BASE_CLIP;
    this.mixer = new THREE.AnimationMixer(root);
    for (const clip of clips) {
      const action = this.mixer.clipAction(clip);
      if (LOOP_CLIPS.has(clip.name)) {
        action.setLoop(THREE.LoopRepeat, Infinity);
      } else {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(clip.name, action);
    }
    this.mixer.addEventListener('finished', this.onFinished);
  }

  /** Names of the clips found in the GLB, in file order. */
  get clipNames(): string[] {
    return [...this.actions.keys()];
  }

  get currentClip(): string | null {
    return this.current?.getClip().name ?? null;
  }

  /** Crossfade to a clip. Unknown names are ignored so a missing clip never crashes the scene. */
  play(name: string): boolean {
    const next = this.actions.get(name);
    if (!next) return false;
    if (next === this.current && LOOP_CLIPS.has(name)) return true;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
    if (this.current && this.current !== next) {
      next.crossFadeFrom(this.current, this.fade, true);
    }
    next.play();
    this.current = next;
    return true;
  }

  update(delta: number): void {
    this.mixer.update(delta);
  }

  dispose(): void {
    this.mixer.removeEventListener('finished', this.onFinished);
    this.mixer.stopAllAction();
    this.actions.clear();
    this.current = null;
  }
}
