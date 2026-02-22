/**
 * Credential Storage
 *
 * Stores credentials in JSON files + SQLite database
 * JSON files for backup, SQLite for fast access
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/index.js';
import { getEncryptionService } from './encryption.js';
import type { Credential, ICredentialStorage } from './types.js';

export class CredentialStorage implements ICredentialStorage {
  private credentialsDir: string;
  private db: ReturnType<typeof getDatabase>;
  private encryption: ReturnType<typeof getEncryptionService>;

  constructor(credentialsDir?: string) {
    // Default to home directory
    this.credentialsDir = credentialsDir || path.join(
      os.homedir(),
      '.agent-player',
      'credentials'
    );
    this.db = getDatabase();
    this.encryption = getEncryptionService();
  }

  /**
   * Initialize storage
   */
  async initialize(): Promise<void> {
    // Create credentials directory
    await fs.mkdir(this.credentialsDir, { recursive: true });

    // Create database table
    this.db.getDb().exec(`
      CREATE TABLE IF NOT EXISTS credentials (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        encrypted_value TEXT NOT NULL,
        iv TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        description TEXT,
        skill_id TEXT,
        user_id TEXT,
        refresh_token TEXT,
        expires_at TEXT,
        scopes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_used TEXT
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_credentials_name_user
        ON credentials(name, user_id);
      CREATE INDEX IF NOT EXISTS idx_credentials_skill
        ON credentials(skill_id);
      CREATE INDEX IF NOT EXISTS idx_credentials_user
        ON credentials(user_id);
    `);

    console.log(`[Credentials] 🔐 Storage initialized: ${this.credentialsDir}`);
  }

  /**
   * Save a credential
   */
  async save(credential: Credential): Promise<void> {
    // Save to database
    const stmt = this.db.getDb().prepare(`
      INSERT OR REPLACE INTO credentials (
        id, name, type, encrypted_value, iv, auth_tag,
        description, skill_id, user_id, refresh_token,
        expires_at, scopes, created_at, updated_at, last_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      credential.id,
      credential.name,
      credential.type,
      credential.encryptedValue,
      credential.iv,
      credential.authTag,
      credential.description || null,
      credential.skillId || null,
      credential.userId || null,
      credential.refreshToken || null,
      credential.expiresAt?.toISOString() || null,
      credential.scopes ? JSON.stringify(credential.scopes) : null,
      credential.createdAt.toISOString(),
      credential.updatedAt.toISOString(),
      credential.lastUsed?.toISOString() || null
    );

    // Save to JSON file (backup)
    await this.saveToFile(credential);
  }

  /**
   * Get credential by ID
   */
  async get(id: string): Promise<Credential | null> {
    const stmt = this.db.getDb().prepare('SELECT * FROM credentials WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    // Update last used timestamp
    this.db.getDb().prepare(`
      UPDATE credentials
      SET last_used = ?
      WHERE id = ?
    `).run(new Date().toISOString(), id);

    return this.rowToCredential(row);
  }

  /**
   * Get credential by name
   */
  async getByName(name: string, userId?: string): Promise<Credential | null> {
    let stmt;
    let row;

    if (userId) {
      stmt = this.db.getDb().prepare(
        'SELECT * FROM credentials WHERE name = ? AND user_id = ?'
      );
      row = stmt.get(name, userId) as any;
    } else {
      stmt = this.db.getDb().prepare(
        'SELECT * FROM credentials WHERE name = ? AND user_id IS NULL'
      );
      row = stmt.get(name) as any;
    }

    if (!row) return null;

    return this.rowToCredential(row);
  }

  /**
   * Get all credentials for a skill
   */
  async getBySkill(skillId: string): Promise<Credential[]> {
    const stmt = this.db.getDb().prepare(
      'SELECT * FROM credentials WHERE skill_id = ? ORDER BY created_at DESC'
    );
    const rows = stmt.all(skillId) as any[];

    return rows.map(row => this.rowToCredential(row));
  }

  /**
   * Get all credentials for a user
   */
  async getByUser(userId: string): Promise<Credential[]> {
    const stmt = this.db.getDb().prepare(
      'SELECT * FROM credentials WHERE user_id = ? ORDER BY created_at DESC'
    );
    const rows = stmt.all(userId) as any[];

    return rows.map(row => this.rowToCredential(row));
  }

  /**
   * Get all credentials (no filter)
   */
  async getAll(): Promise<Credential[]> {
    const stmt = this.db.getDb().prepare(
      'SELECT * FROM credentials ORDER BY created_at DESC'
    );
    const rows = stmt.all() as any[];

    return rows.map(row => this.rowToCredential(row));
  }

  /**
   * Delete a credential
   */
  async delete(id: string): Promise<void> {
    const credential = await this.get(id);
    if (!credential) return;

    // Delete from database
    this.db.getDb().prepare('DELETE FROM credentials WHERE id = ?').run(id);

    // Delete JSON file
    const filePath = this.getFilePath(credential);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      // File might not exist, ignore
    }
  }

  /**
   * Update a credential
   */
  async update(id: string, updates: Partial<Credential>): Promise<void> {
    const credential = await this.get(id);
    if (!credential) throw new Error(`Credential ${id} not found`);

    const updated = {
      ...credential,
      ...updates,
      updatedAt: new Date()
    };

    await this.save(updated);
  }

  /**
   * Decrypt a credential's value
   */
  async decrypt(credential: Credential): Promise<string> {
    return await this.encryption.decrypt(
      credential.encryptedValue,
      credential.iv,
      credential.authTag
    );
  }

  /**
   * Save credential to JSON file
   */
  private async saveToFile(credential: Credential): Promise<void> {
    const filePath = this.getFilePath(credential);
    const dir = path.dirname(filePath);

    // Create directory if needed
    await fs.mkdir(dir, { recursive: true });

    // Save as JSON (encrypted data only, not plaintext)
    const data = {
      id: credential.id,
      name: credential.name,
      type: credential.type,
      encryptedValue: credential.encryptedValue,
      iv: credential.iv,
      authTag: credential.authTag,
      description: credential.description,
      skillId: credential.skillId,
      userId: credential.userId,
      refreshToken: credential.refreshToken,
      expiresAt: credential.expiresAt?.toISOString(),
      scopes: credential.scopes,
      createdAt: credential.createdAt.toISOString(),
      updatedAt: credential.updatedAt.toISOString(),
      lastUsed: credential.lastUsed?.toISOString()
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Get file path for a credential
   * SECURITY: Path traversal protection (M-14)
   */
  private getFilePath(credential: Credential): string {
    // SECURITY: Use basename() to prevent path traversal via userId or credential name
    const safeUserId = path.basename(credential.userId || 'global');
    const safeName = path.basename(credential.name).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName}.json`;
    return path.join(this.credentialsDir, safeUserId, filename);
  }

  /**
   * Convert database row to Credential object
   */
  private rowToCredential(row: any): Credential {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      encryptedValue: row.encrypted_value,
      iv: row.iv,
      authTag: row.auth_tag,
      description: row.description,
      skillId: row.skill_id,
      userId: row.user_id,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      scopes: row.scopes ? JSON.parse(row.scopes) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastUsed: row.last_used ? new Date(row.last_used) : undefined
    };
  }
}

// Singleton instance
let credentialStorage: CredentialStorage | null = null;

export function getCredentialStorage(): CredentialStorage {
  if (!credentialStorage) {
    credentialStorage = new CredentialStorage();
  }
  return credentialStorage;
}
