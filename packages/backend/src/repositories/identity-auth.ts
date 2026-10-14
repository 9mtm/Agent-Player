/**
 * Accounts and sessions (B1.6, part of the identity repository): creating
 * accounts, signing in, ending sessions and changing the password.
 * Scope rules (scope.ts):
 *
 *   createAccount      owner or admin; owners create admin/user/guest,
 *                      admins user/guest; nobody creates another owner
 *                      (S0-Q.13: no open self-registration)
 *   signIn             no actor: this is how a user actor comes to exist.
 *                      Internal system accounts, inactive or unverified
 *                      accounts and published default passwords are refused
 *                      (S0-Q.2); the token carries token_version (H-01)
 *   endSessions        the account itself (guests too): bumps token_version,
 *                      so every token of the account stops working (F-02)
 *   changePassword     the account itself; the current password must match
 *
 * Agent runs and channel turns have no access. Password hashes never leave
 * this layer. Rate limits and lockout stay in front (routes/auth.ts).
 */

import type { Actor } from './actor.js';
import { ScopeError, requireAccount, requireAdmin } from './scope.js';
import { getRepositories } from '../db/index.js';
import { generateToken } from '../auth/jwt.js';
import { isPublishedDefaultPassword, isSystemAccount } from '../auth/default-accounts.js';
import type { SafeUser } from './identity.js';

/** A refused account change with the route's `{ error, message }` body. */
export class AccountError extends Error {
  constructor(readonly status: 400 | 403 | 409, readonly error: string, message: string) { super(message); }
}

export type SignInResult =
  | { status: 'ok'; user: SafeUser; token: string }
  | { status: 'unknown' }
  | { status: 'system' | 'inactive' | 'unverified' | 'bad_password' | 'published_password'; userId: string; username: string };

export interface AccountInput {
  email?: unknown;
  username?: unknown;
  password?: unknown;
  full_name?: unknown;
  role?: unknown;
}

export interface IdentityAuthRepository {
  /** Roles the actor may give a new account. */
  creatableRoles(actor: Actor | null | undefined): Promise<string[]>;
  createAccount(actor: Actor | null | undefined, input: AccountInput, validatePassword: (p: string) => { valid: boolean; error?: string }): Promise<SafeUser>;
  signIn(email: string, password: string): Promise<SignInResult>;
  /** Ends every session of the account; returns its username. */
  endSessions(actor: Actor | null | undefined): Promise<{ username?: string }>;
  /** 'ok', or 'no_user' / 'wrong_password' (route answers 401). */
  changePassword(actor: Actor | null | undefined, currentPassword: string, newPassword: string): Promise<{ status: 'ok' | 'no_user' | 'wrong_password'; username?: string; userId?: string }>;
}

const users = () => getRepositories().users;

function accountId(actor: Actor | null | undefined): string {
  const a = requireAccount(actor);
  if (!a.userId) throw new ScopeError(401, 'Authentication required');
  return a.userId;
}

export const sqliteIdentityAuth: IdentityAuthRepository = {
  async creatableRoles(actor) {
    const a = requireAdmin(actor);
    return a.kind === 'system' || a.role === 'owner' ? ['admin', 'user', 'guest'] : ['user', 'guest'];
  },

  async createAccount(actor, input, validatePassword) {
    const allowedRoles = await sqliteIdentityAuth.creatableRoles(actor);
    const role = input.role ?? 'user';
    if (typeof role !== 'string' || !allowedRoles.includes(role)) {
      throw new AccountError(403, 'Forbidden', `You can create these roles: ${allowedRoles.join(', ')}`);
    }
    const { email, username, password, full_name } = input as Record<string, any>;
    if (!email || !username || !password) {
      throw new AccountError(400, 'Missing required fields', 'email, username, and password are required');
    }
    const strength = validatePassword(password);
    if (!strength.valid) throw new AccountError(400, 'Weak password', strength.error ?? 'Weak password');
    if (users().findByEmail(email)) throw new AccountError(409, 'Email already exists', 'A user with this email already exists');
    if (users().findByUsername(username)) throw new AccountError(409, 'Username already exists', 'A user with this username already exists');

    const created = await users().create({ email, username, password, full_name, role: role as 'admin' | 'user' | 'guest' });
    // The account is created by an owner/admin, who vouches for the address
    // (there is no e-mail verification flow); login requires email_verified.
    users().markEmailVerified(created.id);
    return users().getSafeUser(users().findById(created.id) ?? created);
  },

  async signIn(email, password) {
    const user = users().findByEmail(email);
    if (!user) return { status: 'unknown' };
    const who = { userId: user.id, username: user.username };
    if (isSystemAccount(user.id)) return { status: 'system', ...who };
    if (user.status !== 'active') return { status: 'inactive', ...who };
    if (!user.email_verified) return { status: 'unverified', ...who };
    if (!(await users().verifyPassword(user, password))) return { status: 'bad_password', ...who };
    if (isPublishedDefaultPassword(password)) return { status: 'published_password', ...who };
    users().updateLastLogin(user.id);
    // SECURITY (H-01): the token carries token_version for invalidation.
    const token = generateToken(user.id, (user as { token_version?: number }).token_version || 1);
    return { status: 'ok', user: users().getSafeUser(user), token };
  },

  async endSessions(actor) {
    const id = accountId(actor);
    const user = users().findById(id);
    users().incrementTokenVersion(id);
    return { username: user?.username };
  },

  async changePassword(actor, currentPassword, newPassword) {
    const id = accountId(actor);
    const user = users().findById(id);
    if (!user) return { status: 'no_user' };
    if (!(await users().verifyPassword(user, currentPassword))) return { status: 'wrong_password' };
    await users().updatePassword(user.id, newPassword);
    return { status: 'ok', userId: user.id, username: user.username };
  },
};
