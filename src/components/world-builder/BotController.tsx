import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface BotData {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar_url: string | null;
  position_x: number;
  position_y: number;
  position_z: number;
  rotation_y: number;
  behavior_type: 'static' | 'random_walk' | 'patrol' | 'idle' | 'interactive';
  patrol_path: string | null; // JSON array of waypoints
  movement_speed: number;
  animation_state: 'idle' | 'walk' | 'run' | 'sit' | 'wave' | 'dance';
  interaction_radius: number;
  current_waypoint: number;
}

interface BotState {
  mesh: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  currentAction: THREE.AnimationAction | null;
  targetPosition: THREE.Vector3 | null;
  waypoints: THREE.Vector3[];
  currentWaypointIndex: number;
  idleTimer: number;
  lastUpdate: number;
}

export class BotController {
  private bots: Map<string, BotState> = new Map();
  private clock: THREE.Clock = new THREE.Clock();

  /**
   * Add a bot to the controller
   */
  addBot(botData: BotData, mesh: THREE.Group, mixer: THREE.AnimationMixer | null) {
    const waypoints = this.parsePatrolPath(botData.patrol_path);

    this.bots.set(botData.id, {
      mesh,
      mixer,
      currentAction: null,
      targetPosition: null,
      waypoints,
      currentWaypointIndex: botData.current_waypoint || 0,
      idleTimer: 0,
      lastUpdate: Date.now(),
    });

    // Set initial position
    mesh.position.set(botData.position_x, botData.position_y, botData.position_z);
    mesh.rotation.y = (botData.rotation_y * Math.PI) / 180;

    console.log(`[BotController] Added bot ${botData.id} with behavior: ${botData.behavior_type}`);
  }

  /**
   * Remove a bot from the controller
   */
  removeBot(botId: string) {
    this.bots.delete(botId);
  }

  /**
   * Update all bots
   */
  update(botDataList: BotData[], deltaTime: number) {
    botDataList.forEach((botData) => {
      const state = this.bots.get(botData.id);
      if (!state) return;

      // Update animation mixer
      if (state.mixer) {
        state.mixer.update(deltaTime);
      }

      // Update behavior
      switch (botData.behavior_type) {
        case 'static':
          this.updateStatic(botData, state);
          break;
        case 'idle':
          this.updateIdle(botData, state, deltaTime);
          break;
        case 'random_walk':
          this.updateRandomWalk(botData, state, deltaTime);
          break;
        case 'patrol':
          this.updatePatrol(botData, state, deltaTime);
          break;
        case 'interactive':
          this.updateInteractive(botData, state, deltaTime);
          break;
      }
    });
  }

  /**
   * Static behavior - just play idle animation
   */
  private updateStatic(botData: BotData, state: BotState) {
    this.playAnimation(state, 'idle');
  }

  /**
   * Idle behavior - play idle animation with occasional random animations
   */
  private updateIdle(botData: BotData, state: BotState, deltaTime: number) {
    state.idleTimer += deltaTime;

    // Every 5-10 seconds, play a random animation
    if (state.idleTimer > 5 + Math.random() * 5) {
      const randomAnims = ['wave', 'dance'];
      const randomAnim = randomAnims[Math.floor(Math.random() * randomAnims.length)];
      this.playAnimation(state, randomAnim as any);
      state.idleTimer = 0;
    } else {
      this.playAnimation(state, 'idle');
    }
  }

  /**
   * Random walk behavior - wander around randomly
   */
  private updateRandomWalk(botData: BotData, state: BotState, deltaTime: number) {
    // If no target, pick a random nearby position
    if (!state.targetPosition) {
      const randomX = state.mesh.position.x + (Math.random() - 0.5) * 10;
      const randomZ = state.mesh.position.z + (Math.random() - 0.5) * 10;
      state.targetPosition = new THREE.Vector3(randomX, state.mesh.position.y, randomZ);
    }

    // Move toward target
    this.moveTowards(botData, state, state.targetPosition, deltaTime);

    // If reached target, wait then pick new target
    const distance = state.mesh.position.distanceTo(state.targetPosition);
    if (distance < 0.5) {
      state.targetPosition = null;
      state.idleTimer = 0;
      this.playAnimation(state, 'idle');
    } else {
      this.playAnimation(state, 'walk');
    }
  }

  /**
   * Patrol behavior - follow a predefined path
   */
  private updatePatrol(botData: BotData, state: BotState, deltaTime: number) {
    if (state.waypoints.length === 0) {
      this.playAnimation(state, 'idle');
      return;
    }

    // Get current waypoint
    const targetWaypoint = state.waypoints[state.currentWaypointIndex];

    // Move toward waypoint
    this.moveTowards(botData, state, targetWaypoint, deltaTime);

    // Check if reached waypoint
    const distance = state.mesh.position.distanceTo(targetWaypoint);
    if (distance < 0.5) {
      // Move to next waypoint
      state.currentWaypointIndex = (state.currentWaypointIndex + 1) % state.waypoints.length;
      this.playAnimation(state, 'idle');
    } else {
      this.playAnimation(state, 'walk');
    }
  }

  /**
   * Interactive behavior - react to nearby player (placeholder)
   */
  private updateInteractive(botData: BotData, state: BotState, deltaTime: number) {
    // For now, just idle - can be extended to detect player and wave/interact
    this.playAnimation(state, 'idle');
  }

  /**
   * Move bot towards a target position
   */
  private moveTowards(botData: BotData, state: BotState, target: THREE.Vector3, deltaTime: number) {
    const direction = new THREE.Vector3()
      .subVectors(target, state.mesh.position)
      .normalize();

    const speed = botData.movement_speed * 2; // units per second
    const step = direction.multiplyScalar(speed * deltaTime);

    state.mesh.position.add(step);

    // Rotate to face movement direction
    if (direction.length() > 0.01) {
      const angle = Math.atan2(direction.x, direction.z);
      state.mesh.rotation.y = angle;
    }
  }

  /**
   * Play an animation on the bot
   */
  private playAnimation(state: BotState, animName: string) {
    if (!state.mixer) return;

    const animations = (state.mesh as any).animations;
    if (!animations || animations.length === 0) return;

    // Find animation by name (case-insensitive)
    const clip = animations.find(
      (clip: THREE.AnimationClip) => clip.name.toLowerCase().includes(animName.toLowerCase())
    );

    if (!clip) return;

    // If already playing this animation, return
    if (state.currentAction && state.currentAction.getClip().name === clip.name) {
      return;
    }

    // Stop current action
    if (state.currentAction) {
      state.currentAction.fadeOut(0.3);
    }

    // Play new action
    const action = state.mixer.clipAction(clip);
    action.reset().fadeIn(0.3).play();
    state.currentAction = action;
  }

  /**
   * Parse patrol path JSON string into Vector3 array
   */
  private parsePatrolPath(pathJson: string | null): THREE.Vector3[] {
    if (!pathJson) return [];

    try {
      const waypoints = JSON.parse(pathJson);
      return waypoints.map((wp: any) => new THREE.Vector3(wp.x || 0, wp.y || 0, wp.z || 0));
    } catch (err) {
      console.error('[BotController] Failed to parse patrol path:', err);
      return [];
    }
  }

  /**
   * Get all bot meshes for rendering
   */
  getBotMeshes(): THREE.Group[] {
    return Array.from(this.bots.values()).map((state) => state.mesh);
  }

  /**
   * Cleanup
   */
  dispose() {
    this.bots.forEach((state) => {
      if (state.mixer) {
        state.mixer.stopAllAction();
      }
    });
    this.bots.clear();
  }
}
