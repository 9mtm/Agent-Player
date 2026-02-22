/**
 * Skills Repository
 * Handles skill CRUD operations and settings
 */
import { v4 as uuidv4 } from 'uuid';
export class SkillsRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Create a new skill
     */
    create(input) {
        const id = uuidv4();
        this.db.execute(`INSERT INTO skills (id, name, version, description, source, file_path, settings_schema)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, id, input.name, input.version || '1.0.0', input.description || null, input.source, input.file_path, input.settings_schema ? JSON.stringify(input.settings_schema) : null);
        return this.findById(id);
    }
    /**
     * Find skill by ID
     */
    findById(id) {
        return this.db.queryOne('SELECT * FROM skills WHERE id = ?', id);
    }
    /**
     * Find skill by name
     */
    findByName(name) {
        return this.db.queryOne('SELECT * FROM skills WHERE name = ?', name);
    }
    /**
     * Find all skills
     */
    findAll(filters) {
        let query = 'SELECT * FROM skills WHERE 1=1';
        const params = [];
        if (filters?.enabled !== undefined) {
            query += ' AND enabled = ?';
            params.push(filters.enabled ? 1 : 0);
        }
        if (filters?.source) {
            query += ' AND source = ?';
            params.push(filters.source);
        }
        query += ' ORDER BY name ASC';
        return this.db.query(query, ...params);
    }
    /**
     * Update skill
     */
    update(id, updates) {
        const fields = [];
        const params = [];
        if (updates.name !== undefined) {
            fields.push('name = ?');
            params.push(updates.name);
        }
        if (updates.version !== undefined) {
            fields.push('version = ?');
            params.push(updates.version);
        }
        if (updates.description !== undefined) {
            fields.push('description = ?');
            params.push(updates.description);
        }
        if (updates.enabled !== undefined) {
            fields.push('enabled = ?');
            params.push(updates.enabled ? 1 : 0);
        }
        if (updates.file_path !== undefined) {
            fields.push('file_path = ?');
            params.push(updates.file_path);
        }
        if (updates.settings_schema !== undefined) {
            fields.push('settings_schema = ?');
            params.push(updates.settings_schema);
        }
        if (fields.length === 0) {
            return this.findById(id);
        }
        fields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);
        this.db.execute(`UPDATE skills SET ${fields.join(', ')} WHERE id = ?`, ...params);
        return this.findById(id);
    }
    /**
     * Delete skill
     */
    delete(id) {
        const result = this.db.execute('DELETE FROM skills WHERE id = ?', id);
        return result.changes > 0;
    }
    /**
     * Toggle skill enabled/disabled
     */
    toggleEnabled(id) {
        this.db.execute('UPDATE skills SET enabled = NOT enabled, updated_at = CURRENT_TIMESTAMP WHERE id = ?', id);
        return this.findById(id);
    }
    /**
     * Get skill settings for user
     */
    getSettings(skill_id, user_id) {
        return this.db.queryOne('SELECT * FROM skill_settings WHERE skill_id = ? AND user_id = ?', skill_id, user_id);
    }
    /**
     * Save skill settings for user
     */
    saveSettings(skill_id, user_id, settings) {
        const existing = this.getSettings(skill_id, user_id);
        if (existing) {
            // Update
            this.db.execute('UPDATE skill_settings SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', JSON.stringify(settings), existing.id);
            return this.getSettings(skill_id, user_id);
        }
        else {
            // Insert
            const id = uuidv4();
            this.db.execute('INSERT INTO skill_settings (id, skill_id, user_id, settings) VALUES (?, ?, ?, ?)', id, skill_id, user_id, JSON.stringify(settings));
            return this.getSettings(skill_id, user_id);
        }
    }
    /**
     * Get skill secrets for user
     */
    getSecrets(skill_id, user_id) {
        return this.db.query('SELECT * FROM skill_secrets WHERE skill_id = ? AND user_id = ?', skill_id, user_id);
    }
    /**
     * Get a specific secret
     */
    getSecret(skill_id, user_id, key) {
        return this.db.queryOne('SELECT * FROM skill_secrets WHERE skill_id = ? AND user_id = ? AND key = ?', skill_id, user_id, key);
    }
    /**
     * Save encrypted secret
     */
    saveSecret(skill_id, user_id, key, encrypted_value, iv, auth_tag) {
        const existing = this.getSecret(skill_id, user_id, key);
        if (existing) {
            // Update
            this.db.execute(`UPDATE skill_secrets
         SET encrypted_value = ?, iv = ?, auth_tag = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`, encrypted_value, iv, auth_tag, existing.id);
        }
        else {
            // Insert
            const id = uuidv4();
            this.db.execute(`INSERT INTO skill_secrets (id, skill_id, user_id, key, encrypted_value, iv, auth_tag)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, id, skill_id, user_id, key, encrypted_value, iv, auth_tag);
        }
        return this.getSecret(skill_id, user_id, key);
    }
    /**
     * Delete secret
     */
    deleteSecret(skill_id, user_id, key) {
        const result = this.db.execute('DELETE FROM skill_secrets WHERE skill_id = ? AND user_id = ? AND key = ?', skill_id, user_id, key);
        return result.changes > 0;
    }
    /**
     * Delete all secrets for a skill+user
     */
    deleteAllSecrets(skill_id, user_id) {
        const result = this.db.execute('DELETE FROM skill_secrets WHERE skill_id = ? AND user_id = ?', skill_id, user_id);
        return result.changes > 0;
    }
    /**
     * Count skills by source
     */
    countBySource() {
        const results = this.db.query('SELECT source, COUNT(*) as count FROM skills GROUP BY source');
        const counts = {};
        for (const row of results) {
            counts[row.source] = row.count;
        }
        return counts;
    }
}
