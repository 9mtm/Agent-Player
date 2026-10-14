/**
 * Key Management Service
 * Secure key storage and rotation
 *
 * B2.2b-2: the key rows go through a row store (row-store.ts). SQLite keeps
 * its own file (.data/encryption/keys.db, table `keys`); on PostgreSQL
 * (AGENT_PLAYER_DB=postgres) they live in the main database, table
 * `vault_keys` (migrations-pg r003). Only where the rows are stored differs:
 * the master key source (env / key file), the PBKDF2 derivation, the AES-GCM
 * wrapping of data keys and the cache are the same code on both drivers.
 * Methods that were synchronous stay synchronous on SQLite and return a
 * promise on PostgreSQL (`Maybe<T>`); callers await them.
 */

import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import {
  type KeyEntry,
  type MasterKeyConfig,
  type EncryptionConfig,
  type EncryptionStats,
  DEFAULT_ENCRYPTION_CONFIG,
} from './types.js';
import {
  generateKey,
  generateSalt,
  deriveKeyPBKDF2,
  encrypt,
  decrypt,
  hashSHA256,
  secureWipe,
} from './crypto-utils.js';
import { dbDriver, type DbDriver } from '../db/pg/config.js';
import { pgRowStore, requirePgTable, sqliteRowStore, mapMaybe, mapAll, type Maybe, type RowStore } from './row-store.js';

/** Key table name per driver (SQLite: its own file; PostgreSQL: the main database). */
export function keysTableFor(driver: DbDriver): string {
  return driver === 'postgres' ? 'vault_keys' : 'keys';
}

/**
 * DDL of the key table. SQLite runs it at start (table `keys`);
 * scripts/pg/runtime/r003_vault_keys.sql is the same DDL for `vault_keys`,
 * translated into migrations-pg by the translator (test/pg-runtime-ddl.test.mjs
 * keeps the two equal).
 */
export function keysSchemaSql(table: string = 'keys'): string {
  return `
      CREATE TABLE IF NOT EXISTS ${table} (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        algorithm TEXT NOT NULL,
        encrypted_key TEXT,
        kdf_config TEXT,
        created_at TEXT NOT NULL,
        expires_at TEXT,
        last_used_at TEXT,
        active INTEGER DEFAULT 1,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_keys_type ON ${table}(type);
      CREATE INDEX IF NOT EXISTS idx_keys_active ON ${table}(active);
    `;
}

export class KeyManager {
  /** Row store (null until initialize). */
  rows: RowStore | null = null;
  private driver: DbDriver;
  private table: string;
  private config: EncryptionConfig;
  private masterKey: Buffer | null = null;
  private keyCache: Map<string, { key: Buffer; expiresAt: number }> = new Map();
  private stats: EncryptionStats = {
    totalEncryptions: 0,
    totalDecryptions: 0,
    activeKeys: 0,
    expiredKeys: 0,
    credentialsCount: 0,
  };

  constructor(config: Partial<EncryptionConfig> = {}, driver: DbDriver = dbDriver()) {
    this.config = { ...DEFAULT_ENCRYPTION_CONFIG, ...config };
    this.driver = driver;
    this.table = keysTableFor(driver);
  }

  private get db(): RowStore {
    if (!this.rows) throw new Error('Key manager not initialized');
    return this.rows;
  }

  /**
   * Where the dialects differ: "now" and a text timestamp as a time.
   * Timestamps are stored as ISO text (`2026-10-14T12:00:00.000Z`). On SQLite
   * both sides go through julianday(): comparing that text with
   * datetime('now') (`2026-10-14 12:00:00`) as strings is wrong within the
   * expiry day ('T' sorts above ' '). julianday() also reads the older
   * `YYYY-MM-DD HH:MM:SS` form. PostgreSQL compares real timestamps.
   */
  private get now(): string {
    return this.db.dialect === 'postgres' ? 'now()' : "julianday('now')";
  }

  private ts(column: string): string {
    return this.db.dialect === 'postgres' ? `(${column})::timestamptz` : `julianday(${column})`;
  }

  /**
   * Initialize the key manager
   */
  async initialize(dbPath: string = './.data/encryption/keys.db'): Promise<void> {
    if (this.driver === 'postgres') {
      // Main PostgreSQL database; the table comes from migrations-pg (no file, no PRAGMA).
      await requirePgTable(this.table, 'r003_vault_keys');
      this.rows = pgRowStore;
    } else {
      // Ensure directory exists
      const dir = dirname(dbPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // Open database
      const db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
      this.rows = sqliteRowStore(db);

      // Create tables
      db.exec(keysSchemaSql(this.table));
    }

    // Load or generate master key
    await this.loadMasterKey();

    // Ensure we have a data encryption key
    await this.ensureDataKey();

    console.log('[KeyManager] Initialized');
  }

  /**
   * Load or initialize master key
   */
  private async loadMasterKey(): Promise<void> {
    let masterKeyMaterial: string | undefined;

    // Try to get master key from configured source
    switch (this.config.masterKeySource) {
      case 'env':
        masterKeyMaterial = process.env[this.config.masterKeyEnv || 'MASTER_ENCRYPTION_KEY'];
        break;

      case 'file':
        if (this.config.masterKeyPath && existsSync(this.config.masterKeyPath)) {
          masterKeyMaterial = readFileSync(this.config.masterKeyPath, 'utf8').trim();
        }
        break;

      case 'vault':
        // Vault integration would go here
        console.warn('[KeyManager] Vault integration not implemented, using env fallback');
        masterKeyMaterial = process.env[this.config.masterKeyEnv || 'MASTER_ENCRYPTION_KEY'];
        break;
    }

    // If no master key found, generate one for development
    if (!masterKeyMaterial) {
      console.warn('[KeyManager] No master key found, generating one for development');
      console.warn('[KeyManager] Set MASTER_ENCRYPTION_KEY environment variable for production');

      // Check if we already have a stored master key config
      const existingConfig = await this.getMasterKeyConfig();
      if (existingConfig) {
        // In development, delete old config and create new one
        console.warn('[KeyManager] Deleting old master key config and generating new one');
        await this.db.run(`DELETE FROM ${this.table} WHERE type = 'master'`);
      }

      // Generate new master key for development
      masterKeyMaterial = generateKey(32).toString('base64');

      // Store in env for this session
      process.env.MASTER_ENCRYPTION_KEY = masterKeyMaterial;
    }

    // Derive the actual master key
    const existingConfig = await this.getMasterKeyConfig();
    if (existingConfig) {
      // Use existing salt and config
      const salt = Buffer.from(existingConfig.salt, 'base64');
      this.masterKey = deriveKeyPBKDF2(
        masterKeyMaterial,
        salt,
        existingConfig.iterations,
        existingConfig.keyLength
      );
    } else {
      // Create new master key config
      const salt = generateSalt(32);
      const config: MasterKeyConfig = {
        kdf: this.config.kdf,
        salt: salt.toString('base64'),
        iterations: this.config.pbkdf2Iterations,
        keyLength: 32,
      };

      this.masterKey = deriveKeyPBKDF2(
        masterKeyMaterial,
        salt,
        config.iterations,
        config.keyLength
      );

      // Store master key config
      await this.storeMasterKeyConfig(config);
    }
  }

  /**
   * Get master key configuration
   */
  private getMasterKeyConfig(): Maybe<MasterKeyConfig | null> {
    return mapMaybe(
      this.db.one(`SELECT kdf_config FROM ${this.table} WHERE type = 'master' AND active = 1`),
      (row: any) => (row ? JSON.parse(row.kdf_config) : null),
    );
  }

  /**
   * Store master key configuration
   */
  private storeMasterKeyConfig(config: MasterKeyConfig): Maybe<unknown> {
    return this.db.run(`
      INSERT INTO ${this.table} (id, type, algorithm, kdf_config, created_at, active)
      VALUES (?, 'master', 'aes-256-gcm', ?, ?, 1)
    `,
      uuidv4(),
      JSON.stringify(config),
      new Date().toISOString()
    );
  }

  /**
   * Ensure we have an active data encryption key
   */
  private async ensureDataKey(): Promise<void> {
    const existing = await this.getActiveDataKey();
    if (!existing) {
      await this.generateDataKey();
    }
    await this.updateStats();
  }

  /**
   * Get active data encryption key: the newest data key that is active and
   * not expired (the one new ciphertext must use).
   */
  private getActiveDataKey(): Maybe<KeyEntry | null> {
    return mapMaybe(this.db.one(`
      SELECT * FROM ${this.table}
      WHERE type = 'data' AND active = 1
      AND (expires_at IS NULL OR ${this.ts('expires_at')} > ${this.now})
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `), (row: any) => (row ? this.rowToKeyEntry(row) : null));
  }

  /**
   * Generate a new data encryption key
   */
  async generateDataKey(): Promise<KeyEntry> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    const keyId = `dek_${uuidv4()}`;
    const rawKey = generateKey(32);

    // Encrypt the data key with master key
    const encryptedKey = encrypt(rawKey, this.masterKey, 'master', this.config.algorithm);

    // Calculate expiration if auto-rotate is enabled
    const expiresAt = this.config.autoRotate
      ? new Date(Date.now() + this.config.keyRotationDays * 24 * 60 * 60 * 1000)
      : undefined;

    // Store in database
    await this.db.run(`
      INSERT INTO ${this.table} (id, type, algorithm, encrypted_key, created_at, expires_at, active)
      VALUES (?, 'data', ?, ?, ?, ?, 1)
    `,
      keyId,
      this.config.algorithm,
      JSON.stringify(encryptedKey),
      new Date().toISOString(),
      expiresAt?.toISOString() || null
    );

    // Cache the key
    this.cacheKey(keyId, rawKey);

    // Securely wipe raw key from memory
    secureWipe(rawKey);

    await this.updateStats();
    return (await this.getKeyById(keyId))!;
  }

  /**
   * Get a key by ID
   */
  getKeyById(id: string): Maybe<KeyEntry | null> {
    return mapMaybe(this.db.one(`SELECT * FROM ${this.table} WHERE id = ?`, id), (row: any) => (row ? this.rowToKeyEntry(row) : null));
  }

  /**
   * Get the current active data key for encryption.
   *
   * FU-05: always the key the key table names as active (newest active,
   * unexpired data key); the cache only saves the unwrap of that key. Before,
   * any cached key was returned, so right after a rotation (or once an old
   * key was read for decryption) new ciphertext could still use an old,
   * deactivated key.
   */
  async getCurrentKey(): Promise<{ keyId: string; key: Buffer }> {
    let keyEntry = await this.getActiveDataKey();
    if (!keyEntry) {
      keyEntry = await this.generateDataKey();
    }

    const cached = this.keyCache.get(keyEntry.id);
    if (cached && cached.expiresAt > Date.now()) {
      return { keyId: keyEntry.id, key: cached.key };
    }

    // Decrypt the key
    const key = this.decryptKey(keyEntry);

    // Cache it
    this.cacheKey(keyEntry.id, key);

    return { keyId: keyEntry.id, key };
  }

  /**
   * Get a specific key for decryption
   */
  async getKey(keyId: string): Promise<Buffer> {
    // Check cache
    const cached = this.keyCache.get(keyId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.key;
    }

    // Get from database
    const keyEntry = await this.getKeyById(keyId);
    if (!keyEntry) {
      throw new Error(`Key not found: ${keyId}`);
    }

    // Decrypt the key
    const key = this.decryptKey(keyEntry);

    // Cache it
    this.cacheKey(keyId, key);

    return key;
  }

  /**
   * Decrypt an encrypted key entry
   */
  private decryptKey(entry: KeyEntry): Buffer {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    if (!entry.encryptedKey) {
      throw new Error('Key entry has no encrypted key material');
    }

    const encryptedData = JSON.parse(entry.encryptedKey);
    return decrypt(encryptedData, this.masterKey);
  }

  /**
   * Cache a decrypted key
   */
  private cacheKey(keyId: string, key: Buffer): void {
    // Cache for 5 minutes
    this.keyCache.set(keyId, {
      key: Buffer.from(key),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
  }

  /**
   * Rotate data encryption keys
   */
  async rotateKeys(): Promise<KeyEntry> {
    // One transaction on PostgreSQL: the old keys stay active unless the new
    // key is stored (SQLite: unchanged, no transaction).
    let newKey: KeyEntry;
    try {
      newKey = await this.db.transaction(async () => {
        // Deactivate old keys
        await this.db.run(`UPDATE ${this.table} SET active = 0 WHERE type = 'data'`);

        // Generate new key
        return this.generateDataKey();
      });
    } catch (err) {
      // A key cached by a rolled-back attempt must not be used.
      this.clearCache();
      throw err;
    }

    // The deactivated keys leave the cache (wiped). They stay readable for
    // decryption: getKey() loads any key by id, active or not.
    this.evictCacheExcept(newKey.id);

    this.stats.lastKeyRotation = new Date();
    await this.updateStats();

    console.log('[KeyManager] Keys rotated, new key:', newKey.id);
    return newKey;
  }

  /**
   * List all keys
   */
  listKeys(type?: string): Maybe<KeyEntry[]> {
    let sql = `SELECT * FROM ${this.table}`;
    const params: unknown[] = [];

    if (type) {
      sql += ' WHERE type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC';

    return mapMaybe(this.db.all(sql, ...(params as Array<string>)), (rows: any[]) => rows.map(this.rowToKeyEntry));
  }

  /**
   * Deactivate a key
   */
  deactivateKey(keyId: string): Maybe<void> {
    return mapMaybe(this.db.run(`UPDATE ${this.table} SET active = 0 WHERE id = ?`, keyId), () => {
      const cached = this.keyCache.get(keyId);
      if (cached) secureWipe(cached.key);
      this.keyCache.delete(keyId);
      return this.updateStats();
    }) as Maybe<void>; // a promise returned inside mapMaybe() is flattened
  }

  /**
   * Update key last used timestamp
   */
  updateKeyUsage(keyId: string): Maybe<void> {
    return mapMaybe(this.db.run(`UPDATE ${this.table} SET last_used_at = ? WHERE id = ?`,
      new Date().toISOString(),
      keyId
    ), () => undefined);
  }

  /**
   * Convert database row to KeyEntry
   */
  private rowToKeyEntry(row: any): KeyEntry {
    return {
      id: row.id,
      type: row.type,
      algorithm: row.algorithm,
      encryptedKey: row.encrypted_key || undefined,
      kdfConfig: row.kdf_config ? JSON.parse(row.kdf_config) : undefined,
      createdAt: new Date(row.created_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
      active: row.active === 1,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  /**
   * Update statistics
   */
  private updateStats(): Maybe<void> {
    return mapAll([
      this.db.one(`SELECT COUNT(*) as count FROM ${this.table} WHERE active = 1`),
      this.db.one(`SELECT COUNT(*) as count FROM ${this.table} WHERE active = 0 OR (expires_at IS NOT NULL AND ${this.ts('expires_at')} < ${this.now})`),
    ] as const, ([activeRow, expiredRow]: [any, any]) => {
      this.stats.activeKeys = activeRow.count;
      this.stats.expiredKeys = expiredRow.count;
    });
  }

  /**
   * Get statistics
   */
  getStats(): EncryptionStats {
    return { ...this.stats };
  }

  /**
   * Increment encryption counter
   */
  recordEncryption(): void {
    this.stats.totalEncryptions++;
  }

  /**
   * Increment decryption counter
   */
  recordDecryption(): void {
    this.stats.totalDecryptions++;
  }

  /** Drop (and wipe) every cached key except `keepId`. */
  private evictCacheExcept(keepId: string): void {
    for (const [id, cached] of this.keyCache.entries()) {
      if (id === keepId) continue;
      secureWipe(cached.key);
      this.keyCache.delete(id);
    }
  }

  /**
   * Clear key cache
   */
  clearCache(): void {
    for (const cached of this.keyCache.values()) {
      secureWipe(cached.key);
    }
    this.keyCache.clear();
  }

  /**
   * Close and cleanup
   */
  close(): void {
    this.clearCache();
    if (this.masterKey) {
      secureWipe(this.masterKey);
      this.masterKey = null;
    }
    if (this.rows) {
      this.rows.close();
      this.rows = null;
    }
  }
}

// Singleton instance
let keyManager: KeyManager | null = null;

export function getKeyManager(config?: Partial<EncryptionConfig>): KeyManager {
  if (!keyManager) {
    keyManager = new KeyManager(config);
  }
  return keyManager;
}
