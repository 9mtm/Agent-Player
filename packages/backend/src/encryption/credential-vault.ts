/**
 * Credential Vault
 * Secure encrypted storage for credentials
 */

import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import {
  type EncryptedCredential,
  type CredentialType,
  type EncryptedData,
} from './types.js';
import { getKeyManager, KeyManager } from './key-manager.js';
import { encrypt, decrypt } from './crypto-utils.js';

export interface CredentialInput {
  name: string;
  type: CredentialType;
  data: Record<string, unknown>;
  service?: string;
  ownerId: string;
  ownerType: 'user' | 'agent' | 'system';
  expiresAt?: Date;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CredentialQuery {
  ownerId?: string;
  ownerType?: 'user' | 'agent' | 'system';
  type?: CredentialType | CredentialType[];
  service?: string;
  tags?: string[];
  search?: string;
  includeExpired?: boolean;
  limit?: number;
  offset?: number;
}

export class CredentialVault {
  private db: Database.Database | null = null;
  private keyManager: KeyManager;

  constructor() {
    this.keyManager = getKeyManager();
  }

  /**
   * Initialize the vault
   */
  async initialize(dbPath?: string): Promise<void> {
    // Use environment variable or default path
    const resolvedPath = dbPath || process.env.ENCRYPTION_DB_PATH || './.data/encryption/credentials.db';

    // Ensure key manager is initialized
    await this.keyManager.initialize();

    // Ensure directory exists
    const dir = dirname(resolvedPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.createTables();

    console.log('[CredentialVault] Initialized at:', resolvedPath);
  }

  /**
   * Create database tables
   */
  private createTables(): void {
    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS credentials (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        encrypted_data TEXT NOT NULL,
        service TEXT,
        owner_id TEXT NOT NULL,
        owner_type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_accessed_at TEXT,
        access_count INTEGER DEFAULT 0,
        expires_at TEXT,
        tags TEXT,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_cred_owner ON credentials(owner_id, owner_type);
      CREATE INDEX IF NOT EXISTS idx_cred_type ON credentials(type);
      CREATE INDEX IF NOT EXISTS idx_cred_service ON credentials(service);
      CREATE INDEX IF NOT EXISTS idx_cred_name ON credentials(name);
    `);
  }

  /**
   * Store a credential
   */
  async store(input: CredentialInput): Promise<EncryptedCredential> {
    if (!this.db) throw new Error('Vault not initialized');

    const id = `cred_${uuidv4()}`;
    const now = new Date();

    // Get current encryption key
    const { keyId, key } = await this.keyManager.getCurrentKey();

    // Encrypt the credential data
    const plaintext = JSON.stringify(input.data);
    const encryptedData = encrypt(plaintext, key, keyId);

    // Store in database
    this.db.prepare(`
      INSERT INTO credentials (
        id, name, type, encrypted_data, service,
        owner_id, owner_type, created_at, updated_at,
        expires_at, tags, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name,
      input.type,
      JSON.stringify(encryptedData),
      input.service || null,
      input.ownerId,
      input.ownerType,
      now.toISOString(),
      now.toISOString(),
      input.expiresAt?.toISOString() || null,
      input.tags ? JSON.stringify(input.tags) : null,
      input.metadata ? JSON.stringify(input.metadata) : null
    );

    this.keyManager.recordEncryption();
    this.keyManager.updateKeyUsage(keyId);

    return this.getById(id)!;
  }

  /**
   * Get a credential by ID (returns encrypted)
   */
  getById(id: string): EncryptedCredential | null {
    if (!this.db) throw new Error('Vault not initialized');

    const row = this.db.prepare('SELECT * FROM credentials WHERE id = ?').get(id) as any;
    return row ? this.rowToCredential(row) : null;
  }

  /**
   * Get and decrypt a credential
   */
  async retrieve(id: string): Promise<{ credential: EncryptedCredential; data: Record<string, unknown> } | null> {
    if (!this.db) throw new Error('Vault not initialized');

    const credential = this.getById(id);
    if (!credential) return null;

    // Check expiration
    if (credential.expiresAt && credential.expiresAt < new Date()) {
      throw new Error('Credential has expired');
    }

    // Decrypt the data
    const encryptedData = credential.data;
    const key = await this.keyManager.getKey(encryptedData.keyId);
    const decrypted = decrypt(encryptedData, key);
    const data = JSON.parse(decrypted.toString('utf8'));

    // Update access tracking
    this.db.prepare(`
      UPDATE credentials
      SET last_accessed_at = ?, access_count = access_count + 1
      WHERE id = ?
    `).run(new Date().toISOString(), id);

    this.keyManager.recordDecryption();
    this.keyManager.updateKeyUsage(encryptedData.keyId);

    // Return updated credential
    return {
      credential: this.getById(id)!,
      data,
    };
  }

  /**
   * Update a credential
   */
  async update(id: string, input: Partial<CredentialInput>): Promise<EncryptedCredential> {
    if (!this.db) throw new Error('Vault not initialized');

    const existing = this.getById(id);
    if (!existing) {
      throw new Error('Credential not found');
    }

    const now = new Date();
    const updates: string[] = ['updated_at = ?'];
    const params: unknown[] = [now.toISOString()];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name);
    }

    if (input.type !== undefined) {
      updates.push('type = ?');
      params.push(input.type);
    }

    if (input.service !== undefined) {
      updates.push('service = ?');
      params.push(input.service);
    }

    if (input.expiresAt !== undefined) {
      updates.push('expires_at = ?');
      params.push(input.expiresAt?.toISOString() || null);
    }

    if (input.tags !== undefined) {
      updates.push('tags = ?');
      params.push(input.tags ? JSON.stringify(input.tags) : null);
    }

    if (input.metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(input.metadata ? JSON.stringify(input.metadata) : null);
    }

    // If data is being updated, re-encrypt
    if (input.data !== undefined) {
      const { keyId, key } = await this.keyManager.getCurrentKey();
      const plaintext = JSON.stringify(input.data);
      const encryptedData = encrypt(plaintext, key, keyId);

      updates.push('encrypted_data = ?');
      params.push(JSON.stringify(encryptedData));

      this.keyManager.recordEncryption();
    }

    params.push(id);

    this.db.prepare(`UPDATE credentials SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    return this.getById(id)!;
  }

  /**
   * Delete a credential
   */
  delete(id: string): boolean {
    if (!this.db) throw new Error('Vault not initialized');

    const result = this.db.prepare('DELETE FROM credentials WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Query credentials
   */
  query(filters: CredentialQuery = {}): EncryptedCredential[] {
    if (!this.db) throw new Error('Vault not initialized');

    let sql = 'SELECT * FROM credentials WHERE 1=1';
    const params: unknown[] = [];

    if (filters.ownerId) {
      sql += ' AND owner_id = ?';
      params.push(filters.ownerId);
    }

    if (filters.ownerType) {
      sql += ' AND owner_type = ?';
      params.push(filters.ownerType);
    }

    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      sql += ` AND type IN (${types.map(() => '?').join(',')})`;
      params.push(...types);
    }

    if (filters.service) {
      sql += ' AND service = ?';
      params.push(filters.service);
    }

    if (filters.tags && filters.tags.length > 0) {
      for (const tag of filters.tags) {
        sql += ' AND tags LIKE ?';
        params.push(`%"${tag}"%`);
      }
    }

    if (filters.search) {
      sql += ' AND (name LIKE ? OR service LIKE ?)';
      const pattern = `%${filters.search}%`;
      params.push(pattern, pattern);
    }

    if (!filters.includeExpired) {
      sql += " AND (expires_at IS NULL OR expires_at > datetime('now'))";
    }

    sql += ' ORDER BY updated_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(this.rowToCredential);
  }

  /**
   * Get credentials by owner
   */
  getByOwner(ownerId: string, ownerType: 'user' | 'agent' | 'system'): EncryptedCredential[] {
    return this.query({ ownerId, ownerType });
  }

  /**
   * Get credentials by service
   */
  getByService(service: string): EncryptedCredential[] {
    return this.query({ service });
  }

  /**
   * Re-encrypt all credentials with new key
   */
  async reEncryptAll(): Promise<number> {
    if (!this.db) throw new Error('Vault not initialized');

    const credentials = this.query({ includeExpired: true });
    let count = 0;

    for (const cred of credentials) {
      try {
        // Decrypt with old key
        const oldKey = await this.keyManager.getKey(cred.data.keyId);
        const decrypted = decrypt(cred.data, oldKey);

        // Encrypt with new key
        const { keyId, key } = await this.keyManager.getCurrentKey();
        const newEncrypted = encrypt(decrypted, key, keyId);

        // Update in database
        this.db.prepare('UPDATE credentials SET encrypted_data = ?, updated_at = ? WHERE id = ?').run(
          JSON.stringify(newEncrypted),
          new Date().toISOString(),
          cred.id
        );

        count++;
      } catch (error) {
        console.error(`[CredentialVault] Failed to re-encrypt ${cred.id}:`, error);
      }
    }

    return count;
  }

  /**
   * Get vault statistics
   */
  getStats(): {
    totalCredentials: number;
    byType: Record<string, number>;
    byOwnerType: Record<string, number>;
    expiringSoon: number;
    expired: number;
  } {
    if (!this.db) throw new Error('Vault not initialized');

    const totalRow = this.db.prepare('SELECT COUNT(*) as count FROM credentials').get() as any;

    const typeRows = this.db.prepare(
      'SELECT type, COUNT(*) as count FROM credentials GROUP BY type'
    ).all() as any[];

    const ownerRows = this.db.prepare(
      'SELECT owner_type, COUNT(*) as count FROM credentials GROUP BY owner_type'
    ).all() as any[];

    // Expiring in next 7 days
    const expiringRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM credentials
      WHERE expires_at IS NOT NULL
      AND expires_at > datetime('now')
      AND expires_at < datetime('now', '+7 days')
    `).get() as any;

    // Already expired
    const expiredRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM credentials
      WHERE expires_at IS NOT NULL
      AND expires_at < datetime('now')
    `).get() as any;

    const byType: Record<string, number> = {};
    for (const row of typeRows) {
      byType[row.type] = row.count;
    }

    const byOwnerType: Record<string, number> = {};
    for (const row of ownerRows) {
      byOwnerType[row.owner_type] = row.count;
    }

    return {
      totalCredentials: totalRow.count,
      byType,
      byOwnerType,
      expiringSoon: expiringRow.count,
      expired: expiredRow.count,
    };
  }

  /**
   * Convert database row to EncryptedCredential
   */
  private rowToCredential(row: any): EncryptedCredential {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      data: JSON.parse(row.encrypted_data),
      service: row.service || undefined,
      ownerId: row.owner_id,
      ownerType: row.owner_type,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastAccessedAt: row.last_accessed_at ? new Date(row.last_accessed_at) : undefined,
      accessCount: row.access_count,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  /**
   * Close the vault
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.keyManager.close();
  }
}

// Singleton instance
let credentialVault: CredentialVault | null = null;

export function getCredentialVault(): CredentialVault {
  if (!credentialVault) {
    credentialVault = new CredentialVault();
  }
  return credentialVault;
}
