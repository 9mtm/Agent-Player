/**
 * PostgreSQL users store (B2.2a): the same reads/writes as
 * db/repositories/users.ts, on the translated schema (migrations-pg).
 *
 * The SQL is the SQLite SQL where both dialects agree (`?` placeholders are
 * converted by db/pg/placeholders.ts); nothing is rewritten at run time.
 * Rows come back in the SQLite shapes (db/pg/types.ts): bigint columns
 * (email_verified, token_version, COUNT(*)) as numbers, timestamptz columns
 * (created_at, updated_at, last_login_at) as 'YYYY-MM-DD HH:MM:SS[.f]' UTC.
 */

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { pgAll, pgOne, pgRun } from '../../db/pg/pool.js';
import type { User } from '../../db/repositories/users.js';
import {
  PROFILE_COLUMNS, UPDATE_PROFILE_SQL, profileParams, toSafeUser,
  type ProfileRow, type UsersStore,
} from '../users-store.js';

export const pgUsersStore: UsersStore = {
  async create(input) {
    const id = uuidv4();
    // SECURITY: 12 bcrypt rounds, as db/repositories/users.ts (M-07).
    const passwordHash = await bcrypt.hash(input.password, 12);
    await pgRun(
      `INSERT INTO users (id, email, username, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)`,
      id, input.email, input.username, passwordHash, input.full_name || null, input.role || 'user',
    );
    const created = await pgUsersStore.findById(id);
    if (!created) throw new Error('user insert did not persist');
    return created;
  },

  findById: (id) => pgOne<User>('SELECT * FROM users WHERE id = ?', id),
  findByEmail: (email) => pgOne<User>('SELECT * FROM users WHERE email = ?', email),
  findByUsername: (username) => pgOne<User>('SELECT * FROM users WHERE username = ?', username),

  async findAll(filters) {
    let sql = 'SELECT * FROM users WHERE 1=1';
    const params: string[] = [];
    if (filters?.role) { sql += ' AND role = ?'; params.push(filters.role); }
    if (filters?.status) { sql += ' AND status = ?'; params.push(filters.status); }
    // id breaks ties: SQLite's CURRENT_TIMESTAMP has whole seconds, so equal
    // created_at values are common there and the order must not depend on chance.
    sql += ' ORDER BY created_at DESC, id';
    return pgAll<User>(sql, ...params);
  },

  verifyPassword: (user, password) => bcrypt.compare(password, user.password_hash),

  async updatePassword(id, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    // SECURITY (H-01): bumping token_version invalidates every issued token.
    await pgRun(
      `UPDATE users SET password_hash = ?, token_version = COALESCE(token_version, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      passwordHash, id,
    );
  },

  async markEmailVerified(id) {
    await pgRun('UPDATE users SET email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', id);
  },

  async incrementTokenVersion(id) {
    await pgRun('UPDATE users SET token_version = COALESCE(token_version, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', id);
  },

  async updateLastLogin(id) {
    await pgRun('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', id);
  },

  async countByRole() {
    const rows = await pgAll<{ role: string; count: number }>('SELECT role, COUNT(*) AS count FROM users GROUP BY role');
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.role] = r.count;
    return counts;
  },

  profile: (id) => pgOne<ProfileRow>(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = ?`, id),

  async updateProfile(id, u) {
    await pgRun(UPDATE_PROFILE_SQL, ...profileParams(id, u));
  },

  safeUser: toSafeUser,
};
