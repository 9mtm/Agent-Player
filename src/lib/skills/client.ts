/**
 * Skills Client
 * Calls the Backend API for skills operations
 * This unifies Frontend and Backend - single source of truth
 */

import { config } from '@/lib/config';

// Use centralized config
const BACKEND_URL = config.backendUrl;

export type SkillCategory =
  | 'development'
  | 'productivity'
  | 'communication'
  | 'utilities'
  | 'ai'
  | 'media'
  | 'data'
  | 'automation'
  | 'other';

export interface Skill {
  name: string;
  displayName?: string;
  description: string;
  version: string;
  author?: string;
  category?: SkillCategory;
  emoji?: string;
  tags?: string[];
  triggers: string[];
  settings: any[];
  enabled?: boolean;
  iconPath?: string;
  instructions?: string;
}

export interface SkillsResponse {
  skills: Skill[];
  count: number;
}

export interface SkillMatchResponse {
  matched: boolean;
  skill: Skill | null;
}

/**
 * Skills Client - calls Backend API
 */
export const skillsClient = {
  /**
   * List all skills
   */
  async list(): Promise<Skill[]> {
    const res = await fetch(`${BACKEND_URL}/api/skills`);
    if (!res.ok) {
      throw new Error(`Failed to fetch skills: ${res.statusText}`);
    }
    const data: SkillsResponse = await res.json();
    return data.skills;
  },

  /**
   * Get a skill by name
   */
  async get(name: string): Promise<Skill | null> {
    const res = await fetch(`${BACKEND_URL}/api/skills/${encodeURIComponent(name)}`);
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch skill: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Reload all skills from disk
   */
  async reload(): Promise<{ success: boolean; count: number }> {
    const res = await fetch(`${BACKEND_URL}/api/skills/reload`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(`Failed to reload skills: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Find a skill that matches a message
   */
  async match(message: string): Promise<SkillMatchResponse> {
    const res = await fetch(`${BACKEND_URL}/api/skills/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      throw new Error(`Failed to match skill: ${res.statusText}`);
    }
    return res.json();
  },
};
