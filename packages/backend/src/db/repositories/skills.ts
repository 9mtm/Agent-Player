/**
 * Skills Repository
 * Handles skill CRUD operations and settings
 */

import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../database.js';

export interface Skill {
  id: string;
  name: string;
  version: string;
  description: string | null;
  enabled: boolean;
  source: 'bundled' | 'managed' | 'workspace' | 'marketplace';
  file_path: string;
  settings_schema: string | null; // JSON
  created_at: string;
  updated_at: string;
}

export interface SkillSettings {
  id: string;
  skill_id: string;
  user_id: string;
  settings: string; // JSON
  updated_at: string;
}

export interface SkillSecret {
  id: string;
  skill_id: string;
  user_id: string;
  key: string;
  encrypted_value: string;
  iv: string;
  auth_tag: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSkillInput {
  name: string;
  version?: string;
  description?: string;
  source: 'bundled' | 'managed' | 'workspace' | 'marketplace';
  file_path: string;
  settings_schema?: Record<string, any>;
}

export class SkillsRepository {
  constructor(private db: DatabaseManager) {}

  /**
   * Create a new skill
   */
  create(input: CreateSkillInput): Skill {
    const id = uuidv4();

    this.db.execute(
      `INSERT INTO skills (id, name, version, description, source, file_path, settings_schema)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.name,
      input.version || '1.0.0',
      input.description || null,
      input.source,
      input.file_path,
      input.settings_schema ? JSON.stringify(input.settings_schema) : null
    );

    return this.findById(id)!;
  }

  /**
   * Find skill by ID
   */
  findById(id: string): Skill | undefined {
    return this.db.queryOne<Skill>(
      'SELECT * FROM skills WHERE id = ?',
      id
    );
  }

  /**
   * Find skill by name
   */
  findByName(name: string): Skill | undefined {
    return this.db.queryOne<Skill>(
      'SELECT * FROM skills WHERE name = ?',
      name
    );
  }

  /**
   * Find all skills
   */
  findAll(filters?: { enabled?: boolean; source?: string }): Skill[] {
    let query = 'SELECT * FROM skills WHERE 1=1';
    const params: any[] = [];

    if (filters?.enabled !== undefined) {
      query += ' AND enabled = ?';
      params.push(filters.enabled ? 1 : 0);
    }

    if (filters?.source) {
      query += ' AND source = ?';
      params.push(filters.source);
    }

    query += ' ORDER BY name ASC';

    return this.db.query<Skill>(query, ...params);
  }

  /**
   * Update skill
   */
  update(id: string, updates: Partial<Omit<Skill, 'id' | 'created_at' | 'updated_at'>>): Skill | undefined {
    const fields: string[] = [];
    const params: any[] = [];

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

    this.db.execute(
      `UPDATE skills SET ${fields.join(', ')} WHERE id = ?`,
      ...params
    );

    return this.findById(id);
  }

  /**
   * Delete skill
   */
  delete(id: string): boolean {
    const result = this.db.execute('DELETE FROM skills WHERE id = ?', id);
    return result.changes > 0;
  }

  /**
   * Toggle skill enabled/disabled
   */
  toggleEnabled(id: string): Skill | undefined {
    this.db.execute(
      'UPDATE skills SET enabled = NOT enabled, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      id
    );
    return this.findById(id);
  }

  /**
   * Get skill settings for user
   */
  getSettings(skill_id: string, user_id: string): SkillSettings | undefined {
    return this.db.queryOne<SkillSettings>(
      'SELECT * FROM skill_settings WHERE skill_id = ? AND user_id = ?',
      skill_id,
      user_id
    );
  }

  /**
   * Save skill settings for user
   */
  saveSettings(skill_id: string, user_id: string, settings: Record<string, any>): SkillSettings {
    const existing = this.getSettings(skill_id, user_id);

    if (existing) {
      // Update
      this.db.execute(
        'UPDATE skill_settings SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        JSON.stringify(settings),
        existing.id
      );
      return this.getSettings(skill_id, user_id)!;
    } else {
      // Insert
      const id = uuidv4();
      this.db.execute(
        'INSERT INTO skill_settings (id, skill_id, user_id, settings) VALUES (?, ?, ?, ?)',
        id,
        skill_id,
        user_id,
        JSON.stringify(settings)
      );
      return this.getSettings(skill_id, user_id)!;
    }
  }

  /**
   * Get skill secrets for user
   */
  getSecrets(skill_id: string, user_id: string): SkillSecret[] {
    return this.db.query<SkillSecret>(
      'SELECT * FROM skill_secrets WHERE skill_id = ? AND user_id = ?',
      skill_id,
      user_id
    );
  }

  /**
   * Get a specific secret
   */
  getSecret(skill_id: string, user_id: string, key: string): SkillSecret | undefined {
    return this.db.queryOne<SkillSecret>(
      'SELECT * FROM skill_secrets WHERE skill_id = ? AND user_id = ? AND key = ?',
      skill_id,
      user_id,
      key
    );
  }

  /**
   * Save encrypted secret
   */
  saveSecret(skill_id: string, user_id: string, key: string, encrypted_value: string, iv: string, auth_tag: string): SkillSecret {
    const existing = this.getSecret(skill_id, user_id, key);

    if (existing) {
      // Update
      this.db.execute(
        `UPDATE skill_secrets
         SET encrypted_value = ?, iv = ?, auth_tag = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        encrypted_value,
        iv,
        auth_tag,
        existing.id
      );
    } else {
      // Insert
      const id = uuidv4();
      this.db.execute(
        `INSERT INTO skill_secrets (id, skill_id, user_id, key, encrypted_value, iv, auth_tag)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id,
        skill_id,
        user_id,
        key,
        encrypted_value,
        iv,
        auth_tag
      );
    }

    return this.getSecret(skill_id, user_id, key)!;
  }

  /**
   * Delete secret
   */
  deleteSecret(skill_id: string, user_id: string, key: string): boolean {
    const result = this.db.execute(
      'DELETE FROM skill_secrets WHERE skill_id = ? AND user_id = ? AND key = ?',
      skill_id,
      user_id,
      key
    );
    return result.changes > 0;
  }

  /**
   * Delete all secrets for a skill+user
   */
  deleteAllSecrets(skill_id: string, user_id: string): boolean {
    const result = this.db.execute(
      'DELETE FROM skill_secrets WHERE skill_id = ? AND user_id = ?',
      skill_id,
      user_id
    );
    return result.changes > 0;
  }

  /**
   * Count skills by source
   */
  countBySource(): Record<string, number> {
    const results = this.db.query<{ source: string; count: number }>(
      'SELECT source, COUNT(*) as count FROM skills GROUP BY source'
    );

    const counts: Record<string, number> = {};
    for (const row of results) {
      counts[row.source] = row.count;
    }

    return counts;
  }
}
