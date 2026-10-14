/**
 * Credential Vault
 * Secure encrypted storage for credentials
 *
 * B2.2b-2: rows go through a row store (row-store.ts). SQLite keeps its own
 * file (.data/encryption/credentials.db, table `credentials`); on PostgreSQL
 * (AGENT_PLAYER_DB=postgres) the rows live in the main database, table
 * `vault_credentials` (migrations-pg r002; the main database already has a
 * different `credentials` table). Encryption is unchanged and shared: the
 * same crypto-utils encrypt/decrypt with the key manager's data keys; only
 * the encrypted JSON envelope is stored. Methods that were synchronous
 * (getById, query, delete, getStats, ...) stay synchronous on SQLite and
 * return a promise on PostgreSQL (`Maybe<T>`); callers await them.
 */

import { dataPathOr } from '../config/data-root.js';
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
import { dbDriver, type DbDriver } from '../db/pg/config.js';
import { pgRowStore, requirePgTable, sqliteRowStore, mapMaybe, mapAll, type Maybe, type RowParam, type RowStore } from './row-store.js';

/** Vault table name per driver (SQLite: its own file; PostgreSQL: the main database). */
export function vaultTableFor(driver: DbDriver): string {
  return driver === 'postgres' ? 'vault_credentials' : 'credentials';
}

/**
 * DDL of the vault table. SQLite runs it at start (table `credentials` in
 * its own file); scripts/pg/runtime/r002_vault_credentials.sql is the same
 * DDL for `vault_credentials`, translated into migrations-pg by the
 * translator (test/pg-runtime-ddl.test.mjs keeps the two equal).
 */
export function vaultSchemaSql(table: string = 'credentials'): string {
  return `
      CREATE TABLE IF NOT EXISTS ${table} (
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

      CREATE INDEX IF NOT EXISTS idx_cred_owner ON ${table}(owner_id, owner_type);
      CREATE INDEX IF NOT EXISTS idx_cred_type ON ${table}(type);
      CREATE INDEX IF NOT EXISTS idx_cred_service ON ${table}(service);
      CREATE INDEX IF NOT EXISTS idx_cred_name ON ${table}(name);
    `;
}

export interface VaultStats {
  totalCredentials: number;
  byType: Record<string, number>;
  byOwnerType: Record<string, number>;
  expiringSoon: number;
  expired: number;
}

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
  /** Row store (null until initialize). */
  rows: RowStore | null = null;
  private keyManager: KeyManager;
  private driver: DbDriver;
  private table: string;

  constructor(driver: DbDriver = dbDriver(), keyManager: KeyManager = getKeyManager()) {
    this.keyManager = keyManager;
    this.driver = driver;
    this.table = vaultTableFor(driver);
  }

  private get db(): RowStore {
    if (!this.rows) throw new Error('Vault not initialized');
    return this.rows;
  }

  private get pg(): boolean {
    return this.db.dialect === 'postgres';
  }

  /**
   * "now" in a comparison with a text timestamp column (stored as ISO
   * strings, `2026-10-14T12:00:00.000Z`). On SQLite both sides go through
   * julianday(): a text comparison with datetime('now')
   * (`2026-10-14 12:00:00`) is wrong within the expiry day ('T' sorts above
   * ' '). PostgreSQL compares real timestamps.
   */
  private get now(): string {
    return this.pg ? 'now()' : "julianday('now')";
  }

  private ts(column: string): string {
    return this.pg ? `(${column})::timestamptz` : `julianday(${column})`;
  }

  /** SQLite LIKE ignores ASCII case; PostgreSQL needs ILIKE for the same match. */
  private get like(): string {
    return this.pg ? 'ILIKE' : 'LIKE';
  }

  /**
   * Initialize the vault
   */
  async initialize(dbPath?: string): Promise<void> {
    // Use environment variable or default path
    const resolvedPath = dbPath || process.env.ENCRYPTION_DB_PATH || dataPathOr('./.data/encryption/credentials.db', 'encryption', 'credentials.db');

    // Ensure key manager is initialized
    await this.keyManager.initialize();

    if (this.driver === 'postgres') {
      // Main PostgreSQL database; the table comes from migrations-pg (no file, no PRAGMA).
      await requirePgTable(this.table, 'r002_vault_credentials');
      this.rows = pgRowStore;
      console.log('[CredentialVault] Initialized on PostgreSQL:', this.table);
      return;
    }

    // Ensure directory exists
    const dir = dirname(resolvedPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Open database
    const db = new Database(resolvedPath);
    db.pragma('journal_mode = WAL');
    this.rows = sqliteRowStore(db);

    // Create tables
    db.exec(vaultSchemaSql(this.table));

    console.log('[CredentialVault] Initialized at:', resolvedPath);
  }

  /**
   * Store a credential
   */
  async store(input: CredentialInput): Promise<EncryptedCredential> {
    if (!this.rows) throw new Error('Vault not initialized');

    const id = `cred_${uuidv4()}`;
    const now = new Date();

    // Get current encryption key
    const { keyId, key } = await this.keyManager.getCurrentKey();

    // Encrypt the credential data
    const plaintext = JSON.stringify(input.data);
    const encryptedData = encrypt(plaintext, key, keyId);

    // Store in database
    await this.db.run(`
      INSERT INTO ${this.table} (
        id, name, type, encrypted_data, service,
        owner_id, owner_type, created_at, updated_at,
        expires_at, tags, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
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
    await this.keyManager.updateKeyUsage(keyId);

    return (await this.getById(id))!;
  }

  /**
   * Get a credential by ID (returns encrypted)
   */
  getById(id: string): Maybe<EncryptedCredential | null> {
    if (!this.rows) throw new Error('Vault not initialized');

    return mapMaybe(this.db.one(`SELECT * FROM ${this.table} WHERE id = ?`, id), (row: any) => (row ? this.rowToCredential(row) : null));
  }

  /**
   * Get and decrypt a credential
   */
  async retrieve(id: string): Promise<{ credential: EncryptedCredential; data: Record<string, unknown> } | null> {
    if (!this.rows) throw new Error('Vault not initialized');

    const credential = await this.getById(id);
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
    await this.db.run(`
      UPDATE ${this.table}
      SET last_accessed_at = ?, access_count = access_count + 1
      WHERE id = ?
    `, new Date().toISOString(), id);

    this.keyManager.recordDecryption();
    await this.keyManager.updateKeyUsage(encryptedData.keyId);

    // Return updated credential
    return {
      credential: (await this.getById(id))!,
      data,
    };
  }

  /**
   * Update a credential
   */
  async update(id: string, input: Partial<CredentialInput>): Promise<EncryptedCredential> {
    if (!this.rows) throw new Error('Vault not initialized');

    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Credential not found');
    }

    const now = new Date();
    const updates: string[] = ['updated_at = ?'];
    const params: RowParam[] = [now.toISOString()];

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
      params.push(input.service ?? null);
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

    await this.db.run(`UPDATE ${this.table} SET ${updates.join(', ')} WHERE id = ?`, ...params);

    return (await this.getById(id))!;
  }

  /**
   * Delete a credential
   */
  delete(id: string): Maybe<boolean> {
    if (!this.rows) throw new Error('Vault not initialized');

    return mapMaybe(this.db.run(`DELETE FROM ${this.table} WHERE id = ?`, id), (result) => result.changes > 0);
  }

  /**
   * Query credentials
   */
  query(filters: CredentialQuery = {}): Maybe<EncryptedCredential[]> {
    if (!this.rows) throw new Error('Vault not initialized');

    let sql = `SELECT * FROM ${this.table} WHERE 1=1`;
    const params: RowParam[] = [];

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
        sql += ` AND tags ${this.like} ?`;
        params.push(`%"${tag}"%`);
      }
    }

    if (filters.search) {
      sql += ` AND (name ${this.like} ? OR service ${this.like} ?)`;
      const pattern = `%${filters.search}%`;
      params.push(pattern, pattern);
    }

    if (!filters.includeExpired) {
      sql += ` AND (expires_at IS NULL OR ${this.ts('expires_at')} > ${this.now})`;
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

    return mapMaybe(this.db.all(sql, ...params), (rows: any[]) => rows.map(this.rowToCredential));
  }

  /**
   * Get credentials by owner
   */
  getByOwner(ownerId: string, ownerType: 'user' | 'agent' | 'system'): Maybe<EncryptedCredential[]> {
    return this.query({ ownerId, ownerType });
  }

  /**
   * Get credentials by service
   */
  getByService(service: string): Maybe<EncryptedCredential[]> {
    return this.query({ service });
  }

  /**
   * Re-encrypt all credentials with the current (newest active) data key.
   * FU-05: the key is taken once, before the loop, so every row is written
   * with the same new key id; each row is decrypted with the key its
   * envelope names (old keys stay readable by id).
   */
  async reEncryptAll(): Promise<number> {
    if (!this.rows) throw new Error('Vault not initialized');

    const credentials = await this.query({ includeExpired: true });
    const { keyId, key } = await this.keyManager.getCurrentKey();
    let count = 0;

    for (const cred of credentials) {
      try {
        // Decrypt with the key the envelope was written with
        const oldKey = await this.keyManager.getKey(cred.data.keyId);
        const decrypted = decrypt(cred.data, oldKey);

        // Encrypt with the current key
        const newEncrypted = encrypt(decrypted, key, keyId);

        // Update in database
        await this.db.run(`UPDATE ${this.table} SET encrypted_data = ?, updated_at = ? WHERE id = ?`,
          JSON.stringify(newEncrypted),
          new Date().toISOString(),
          cred.id
        );

        this.keyManager.recordEncryption();
        count++;
      } catch (error) {
        // Id and error kind only: never the envelope or key material.
        console.error(`[CredentialVault] Failed to re-encrypt ${cred.id}:`, (error as Error)?.message ?? 'unknown error');
      }
    }

    if (count > 0) await this.keyManager.updateKeyUsage(keyId);
    return count;
  }

  /**
   * Get vault statistics
   */
  getStats(): Maybe<VaultStats> {
    if (!this.rows) throw new Error('Vault not initialized');

    const t = this.table;
    const exp = this.ts('expires_at');
    const inSevenDays = this.pg ? `now() + interval '7 days'` : `julianday('now', '+7 days')`;
    return mapAll([
      this.db.one(`SELECT COUNT(*) as count FROM ${t}`),
      this.db.all(`SELECT type, COUNT(*) as count FROM ${t} GROUP BY type`),
      this.db.all(`SELECT owner_type, COUNT(*) as count FROM ${t} GROUP BY owner_type`),
      // Expiring in next 7 days
      this.db.one(`
      SELECT COUNT(*) as count FROM ${t}
      WHERE expires_at IS NOT NULL
      AND ${exp} > ${this.now}
      AND ${exp} < ${inSevenDays}
    `),
      // Already expired
      this.db.one(`
      SELECT COUNT(*) as count FROM ${t}
      WHERE expires_at IS NOT NULL
      AND ${exp} < ${this.now}
    `),
    ] as const, ([totalRow, typeRows, ownerRows, expiringRow, expiredRow]: [any, any[], any[], any, any]) => {
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
    });
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
    if (this.rows) {
      this.rows.close();
      this.rows = null;
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
