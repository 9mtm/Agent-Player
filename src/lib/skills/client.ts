/**
 * Skills Client
 * Calls the Backend API for skills operations
 * This unifies Frontend and Backend - single source of truth
 */

import { config } from '@/lib/config';
import { authHeaders } from '@/lib/auth/headers';

// Use centralized config
const BACKEND_URL = config.backendUrl;

/**
 * The backend requires a bearer token on every /api/skills* route (S0-Q.19).
 * In the browser the stored token is added; server-side callers (Next routes,
 * server components) pass the forwarded session token in `headers`.
 */
function withAuth(headers: Record<string, string> = {}): Record<string, string> {
  return authHeaders(headers);
}

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
  async list(headers: Record<string, string> = {}): Promise<Skill[]> {
    const res = await fetch(`${BACKEND_URL}/api/skills`, { headers: withAuth(headers) });
    if (!res.ok) {
      throw new Error(`Failed to fetch skills: ${res.statusText}`);
    }
    const data: SkillsResponse = await res.json();
    return data.skills;
  },

  /**
   * Get a skill by name
   */
  async get(name: string, headers: Record<string, string> = {}): Promise<Skill | null> {
    const res = await fetch(`${BACKEND_URL}/api/skills/${encodeURIComponent(name)}`, {
      headers: withAuth(headers),
    });
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
  async reload(headers: Record<string, string> = {}): Promise<{ success: boolean; count: number }> {
    const res = await fetch(`${BACKEND_URL}/api/skills/reload`, {
      method: 'POST',
      headers: withAuth(headers),
    });
    if (!res.ok) {
      throw new Error(`Failed to reload skills: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Find a skill that matches a message
   */
  async match(message: string, headers: Record<string, string> = {}): Promise<SkillMatchResponse> {
    const res = await fetch(`${BACKEND_URL}/api/skills/match?message=${encodeURIComponent(message)}`, {
      headers: withAuth(headers),
    });
    if (!res.ok) {
      throw new Error(`Failed to match skill: ${res.statusText}`);
    }
    return res.json();
  },
};
