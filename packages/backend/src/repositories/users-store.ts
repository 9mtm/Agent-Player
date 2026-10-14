/**
 * Users store (B2.2a): the account reads/writes the identity repository needs,
 * behind one interface, so the identity logic (scope rules, sign-in order of
 * checks, S0-Q.20/21) exists once and runs on either driver.
 *
 *   sqliteUsersStore   db/repositories/users.ts + the users table (unchanged
 *                      SQL, synchronous under the hood)
 *   pgUsersStore       repositories/pg/users-store.ts (PostgreSQL)
 *
 * Methods may return a value or a Promise; callers always await. Password
 * hashes stay inside: callers only hand the User row back to verifyPassword
 * and safeUser.
 */

import { getDatabase, getRepositories } from '../db/index.js';
import type { CreateUserInput, User } from '../db/repositories/users.js';

type MaybePromise<T> = T | Promise<T>;

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

export interface UsersStore {
  findById(id: string): MaybePromise<User | undefined>;
  findByEmail(email: string): MaybePromise<User | undefined>;
  findByUsername(username: string): MaybePromise<User | undefined>;
  findAll(filters?: { role?: string; status?: string }): MaybePromise<User[]>;
  create(input: CreateUserInput): Promise<User>;
  verifyPassword(user: User, password: string): Promise<boolean>;
  updatePassword(id: string, newPassword: string): Promise<void>;
  markEmailVerified(id: string): MaybePromise<void>;
  incrementTokenVersion(id: string): MaybePromise<void>;
  updateLastLogin(id: string): MaybePromise<void>;
  countByRole(): MaybePromise<Record<string, number>>;
  profile(id: string): MaybePromise<ProfileRow | undefined>;
  updateProfile(id: string, update: ProfileUpdate): MaybePromise<void>;
  /** The row without password_hash (profile_picture_url wins over avatar_url). */
  safeUser(user: User): SafeUser;
}

/** Same rule as UsersRepository.getSafeUser (kept in one place for both drivers). */
export function toSafeUser(user: User): SafeUser {
  const { password_hash: _hash, ...safe } = user;
  const out: any = { ...safe };
  if ((user as any).profile_picture_url) out.avatar_url = (user as any).profile_picture_url;
  return out;
}

const users = () => getRepositories().users;

export const PROFILE_COLUMNS = `id, email, username, full_name, bio, company, location, website, timezone,
             profile_picture_url, avatar_url, role, created_at`;

export const UPDATE_PROFILE_SQL = `
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
      WHERE id = ?`;

export function profileParams(id: string, u: ProfileUpdate): Array<string | null> {
  return [u.fullName, u.email, u.username, u.bio, u.company, u.location, u.website, u.timezone, id];
}

export const sqliteUsersStore: UsersStore = {
  findById: (id) => users().findById(id),
  findByEmail: (email) => users().findByEmail(email),
  findByUsername: (username) => users().findByUsername(username),
  findAll: (filters) => users().findAll(filters),
  create: (input) => users().create(input),
  verifyPassword: (user, password) => users().verifyPassword(user, password),
  updatePassword: (id, p) => users().updatePassword(id, p),
  markEmailVerified: (id) => users().markEmailVerified(id),
  incrementTokenVersion: (id) => users().incrementTokenVersion(id),
  updateLastLogin: (id) => users().updateLastLogin(id),
  countByRole: () => users().countByRole(),
  profile: (id) => getDatabase().prepare(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = ?`).get(id) as ProfileRow | undefined,
  updateProfile: (id, u) => { getDatabase().prepare(UPDATE_PROFILE_SQL).run(...profileParams(id, u)); },
  safeUser: (user) => users().getSafeUser(user),
};
