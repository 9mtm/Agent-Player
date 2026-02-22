/**
 * Users Repository
 * Handles user CRUD operations
 */

import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../database.js';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'user' | 'guest';
  status: 'active' | 'inactive' | 'suspended';
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  role?: 'owner' | 'admin' | 'user' | 'guest';
}

export interface UpdateUserInput {
  email?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  role?: 'owner' | 'admin' | 'user' | 'guest';
  status?: 'active' | 'inactive' | 'suspended';
}

export class UsersRepository {
  constructor(private db: DatabaseManager) {}

  /**
   * Create a new user
   */
  async create(input: CreateUserInput): Promise<User> {
    const id = uuidv4();
    // SECURITY: Use 12 bcrypt rounds for stronger password hashing (M-07)
    const password_hash = await bcrypt.hash(input.password, 12);

    this.db.execute(
      `INSERT INTO users (id, email, username, password_hash, full_name, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      input.email,
      input.username,
      password_hash,
      input.full_name || null,
      input.role || 'user'
    );

    return this.findById(id)!;
  }

  /**
   * Find user by ID
   */
  findById(id: string): User | undefined {
    return this.db.queryOne<User>(
      'SELECT * FROM users WHERE id = ?',
      id
    );
  }

  /**
   * Find user by email
   */
  findByEmail(email: string): User | undefined {
    return this.db.queryOne<User>(
      'SELECT * FROM users WHERE email = ?',
      email
    );
  }

  /**
   * Find user by username
   */
  findByUsername(username: string): User | undefined {
    return this.db.queryOne<User>(
      'SELECT * FROM users WHERE username = ?',
      username
    );
  }

  /**
   * Find all users
   */
  findAll(filters?: { role?: string; status?: string }): User[] {
    let query = 'SELECT * FROM users WHERE 1=1';
    const params: any[] = [];

    if (filters?.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';

    return this.db.query<User>(query, ...params);
  }

  /**
   * Update user
   */
  async update(id: string, input: UpdateUserInput): Promise<User | undefined> {
    const updates: string[] = [];
    const params: any[] = [];

    if (input.email !== undefined) {
      updates.push('email = ?');
      params.push(input.email);
    }

    if (input.username !== undefined) {
      updates.push('username = ?');
      params.push(input.username);
    }

    if (input.full_name !== undefined) {
      updates.push('full_name = ?');
      params.push(input.full_name);
    }

    if (input.avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      params.push(input.avatar_url);
    }

    if (input.role !== undefined) {
      updates.push('role = ?');
      params.push(input.role);
    }

    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    this.db.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      ...params
    );

    return this.findById(id);
  }

  /**
   * Delete user
   */
  delete(id: string): boolean {
    const result = this.db.execute('DELETE FROM users WHERE id = ?', id);
    return result.changes > 0;
  }

  /**
   * Verify password
   */
  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  /**
   * Update password
   * SECURITY: Increments token_version to invalidate all existing tokens (H-01)
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    // SECURITY: Use 12 bcrypt rounds for stronger password hashing (M-07)
    const password_hash = await bcrypt.hash(newPassword, 12);

    // SECURITY: Increment token_version to invalidate all existing JWT tokens (H-01)
    this.db.execute(
      `UPDATE users
       SET password_hash = ?,
           token_version = COALESCE(token_version, 0) + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      password_hash,
      id
    );
  }

  /**
   * Update last login timestamp
   */
  updateLastLogin(id: string): void {
    this.db.execute(
      `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`,
      id
    );
  }

  /**
   * Count users by role
   */
  countByRole(): Record<string, number> {
    const results = this.db.query<{ role: string; count: number }>(
      'SELECT role, COUNT(*) as count FROM users GROUP BY role'
    );

    const counts: Record<string, number> = {};
    for (const row of results) {
      counts[row.role] = row.count;
    }

    return counts;
  }

  /**
   * Get user without password hash (safe for API responses)
   * FIXED: Prefer profile_picture_url over avatar_url for avatar display
   */
  getSafeUser(user: User): Omit<User, 'password_hash'> {
    const { password_hash, ...safeUser } = user;

    // Fix: Use profile_picture_url if available, otherwise use avatar_url
    const userWithAvatar: any = { ...safeUser };
    if ((user as any).profile_picture_url) {
      userWithAvatar.avatar_url = (user as any).profile_picture_url;
    }

    return userWithAvatar;
  }
}
