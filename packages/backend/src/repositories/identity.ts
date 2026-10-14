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
 * One implementation over a users store (users-store.ts, B2.2a):
 * sqliteIdentity (db/repositories/users.ts) and pgIdentity (repositories/pg/).
 */

import type { Actor } from './actor.js';
import { ScopeError, isAdminOrOwner, requireAccount, requireAdmin, requireMember } from './scope.js';
import { sqliteIdentityAuth, type IdentityAuthRepository } from './identity-auth.js';
import { sqliteTeams, type TeamsRepository } from './teams.js';
import { sqliteUsersStore, type ProfileRow, type ProfileUpdate, type SafeUser, type UsersStore } from './users-store.js';

export type { ProfileRow, ProfileUpdate, SafeUser } from './users-store.js';

export interface IdentityRepository extends IdentityAuthRepository, TeamsRepository {
  /** The account itself (safe fields); null when it no longer exists or is not active. */
  self(actor: Actor | null | undefined): Promise<SafeUser | null>;
  profile(actor: Actor | null | undefined): Promise<ProfileRow | null>;
  updateProfile(actor: Actor | null | undefined, update: ProfileUpdate): Promise<void>;
  get(actor: Actor | null | undefined, userId: string): Promise<SafeUser>;
  list(actor: Actor | null | undefined, filters?: { role?: string; status?: string }): Promise<SafeUser[]>;
  countByRole(actor: Actor | null | undefined): Promise<Record<string, number>>;
}

function selfId(actor: Actor | null | undefined): string {
  const a = requireAccount(actor);
  if (!a.userId) throw new ScopeError(403, 'An account is required');
  return a.userId;
}

/** The identity repository over a users store, with its accounts and teams parts. */
export function createIdentity(users: UsersStore, auth: IdentityAuthRepository, teams: TeamsRepository): IdentityRepository {
  return {
    ...auth,
    ...teams,

    async self(actor) {
      const user = await users.findById(selfId(actor));
      if (!user || (user as any).status !== 'active') return null;
      return users.safeUser(user);
    },

    async profile(actor) {
      return (await users.profile(selfId(actor))) ?? null;
    },

    async updateProfile(actor, u) {
      const a = requireMember(actor);
      if (!a.userId) throw new ScopeError(403, 'An account is required');
      await users.updateProfile(a.userId, u);
    },

    async get(actor, userId) {
      const a = requireAccount(actor);
      if (a.kind !== 'system' && a.userId !== userId && !isAdminOrOwner(a)) throw new ScopeError(404, 'User not found');
      const user = await users.findById(userId);
      if (!user) throw new ScopeError(404, 'User not found');
      return users.safeUser(user);
    },

    async list(actor, filters) {
      requireAdmin(actor);
      return (await users.findAll(filters)).map((u) => users.safeUser(u));
    },

    async countByRole(actor) {
      requireMember(actor);
      return users.countByRole();
    },
  };
}

export const sqliteIdentity: IdentityRepository = createIdentity(sqliteUsersStore, sqliteIdentityAuth, sqliteTeams);
