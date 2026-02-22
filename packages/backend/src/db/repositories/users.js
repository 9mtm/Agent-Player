/**
 * Users Repository
 * Handles user CRUD operations
 */
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
export class UsersRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Create a new user
     */
    async create(input) {
        const id = uuidv4();
        const password_hash = await bcrypt.hash(input.password, 10);
        this.db.execute(`INSERT INTO users (id, email, username, password_hash, full_name, role)
       VALUES (?, ?, ?, ?, ?, ?)`, id, input.email, input.username, password_hash, input.full_name || null, input.role || 'user');
        return this.findById(id);
    }
    /**
     * Find user by ID
     */
    findById(id) {
        return this.db.queryOne('SELECT * FROM users WHERE id = ?', id);
    }
    /**
     * Find user by email
     */
    findByEmail(email) {
        return this.db.queryOne('SELECT * FROM users WHERE email = ?', email);
    }
    /**
     * Find user by username
     */
    findByUsername(username) {
        return this.db.queryOne('SELECT * FROM users WHERE username = ?', username);
    }
    /**
     * Find all users
     */
    findAll(filters) {
        let query = 'SELECT * FROM users WHERE 1=1';
        const params = [];
        if (filters?.role) {
            query += ' AND role = ?';
            params.push(filters.role);
        }
        if (filters?.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }
        query += ' ORDER BY created_at DESC';
        return this.db.query(query, ...params);
    }
    /**
     * Update user
     */
    async update(id, input) {
        const updates = [];
        const params = [];
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
        this.db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, ...params);
        return this.findById(id);
    }
    /**
     * Delete user
     */
    delete(id) {
        const result = this.db.execute('DELETE FROM users WHERE id = ?', id);
        return result.changes > 0;
    }
    /**
     * Verify password
     */
    async verifyPassword(user, password) {
        return bcrypt.compare(password, user.password_hash);
    }
    /**
     * Update password
     */
    async updatePassword(id, newPassword) {
        const password_hash = await bcrypt.hash(newPassword, 10);
        this.db.execute(`UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, password_hash, id);
    }
    /**
     * Update last login timestamp
     */
    updateLastLogin(id) {
        this.db.execute(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`, id);
    }
    /**
     * Count users by role
     */
    countByRole() {
        const results = this.db.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
        const counts = {};
        for (const row of results) {
            counts[row.role] = row.count;
        }
        return counts;
    }
    /**
     * Get user without password hash (safe for API responses)
     */
    getSafeUser(user) {
        const { password_hash, ...safeUser } = user;
        return safeUser;
    }
}
