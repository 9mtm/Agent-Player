/**
 * Identity repository (B1-core): accounts and their own profile. Scope rules
 * (scope.ts):
 *
 *   self / profile             the signed-in account itself (guests too)
 *   updateProfile              the account itself (member accounts)
 *   get(userId)                yourself; owner/admin: any account
 *                              (others -> 404 'User not found')
 *   list / countByRole         countByRole: member accounts (dashboard);
 *                              list: owner/admin
 *
 * Agent runs and channel turns have no identity access. Password hashes never
 * leave this layer. Accounts and sessions (register/login/logout/password)
 * are in identity-auth.ts, teams and invitations in teams.ts (B1.6).
 *
 * SQLite implementation over db/repositories/users.ts and the users table.
 */

import type { Actor } from './actor.js';
import { ScopeError, isAdminOrOwner, requireAccount, requireAdmin, requireMember } from './scope.js';
import { getDatabase, getRepositories } from '../db/index.js';
import type { User } from '../db/repositories/users.js';
import { sqliteIdentityAuth, type IdentityAuthRepository } from './identity-auth.js';
import { sqliteTeams, type TeamsRepository } from './teams.js';

export type SafeUser = Omit<User, 'password_hash'>;

export interface ProfileRow {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  bio: string;
  company: string;
  location: string;
  website: string;
  timezone: string;
  profile_picture_url: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export interface ProfileUpdate {
  fullName: string | null;
  email: string | null;
  username: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  website: string | null;
  timezone: string | null;
}

export interface IdentityRepository extends IdentityAuthRepository, TeamsRepository {
  /** The account itself (safe fields); null when it no longer exists or is not active. */
  self(actor: Actor | null | undefined): Promise<SafeUser | null>;
  profile(actor: Actor | null | undefined): Promise<ProfileRow | null>;
  updateProfile(actor: Actor | null | undefined, update: ProfileUpdate): Promise<void>;
  get(actor: Actor | null | undefined, userId: string): Promise<SafeUser>;
  list(actor: Actor | null | undefined, filters?: { role?: string; status?: string }): Promise<SafeUser[]>;
  countByRole(actor: Actor | null | undefined): Promise<Record<string, number>>;
}

const users = () => getRepositories().users;

function selfId(actor: Actor | null | undefined): string {
  const a = requireAccount(actor);
  if (!a.userId) throw new ScopeError(403, 'An account is required');
  return a.userId;
}

export const sqliteIdentity: IdentityRepository = {
  ...sqliteIdentityAuth,
  ...sqliteTeams,

  async self(actor) {
    const user = users().findById(selfId(actor));
    if (!user || (user as any).status !== 'active') return null;
    return users().getSafeUser(user);
  },

  async profile(actor) {
    const row = getDatabase().prepare(`
      SELECT id, email, username, full_name, bio, company, location, website, timezone,
             profile_picture_url, avatar_url, role, created_at
      FROM users WHERE id = ?
    `).get(selfId(actor)) as ProfileRow | undefined;
    return row ?? null;
  },

  async updateProfile(actor, u) {
    const a = requireMember(actor);
    if (!a.userId) throw new ScopeError(403, 'An account is required');
    getDatabase().prepare(`
      UPDATE users SET
        full_name = COALESCE(?, full_name),
        email = COALESCE(?, email),
        username = COALESCE(?, username),
        bio = COALESCE(?, bio),
        company = COALESCE(?, company),
        location = COALESCE(?, location),
        website = COALESCE(?, website),
        timezone = COALESCE(?, timezone),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(u.fullName, u.email, u.username, u.bio, u.company, u.location, u.website, u.timezone, a.userId);
  },

  async get(actor, userId) {
    const a = requireAccount(actor);
    if (a.kind !== 'system' && a.userId !== userId && !isAdminOrOwner(a)) throw new ScopeError(404, 'User not found');
    const user = users().findById(userId);
    if (!user) throw new ScopeError(404, 'User not found');
    return users().getSafeUser(user);
  },

  async list(actor, filters) {
    requireAdmin(actor);
    return users().findAll(filters).map((u) => users().getSafeUser(u));
  },

  async countByRole(actor) {
    requireMember(actor);
    return users().countByRole();
  },
};
