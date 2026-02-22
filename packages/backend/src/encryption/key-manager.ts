/**
 * Key Management Service
 * Secure key storage and rotation
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

export class KeyManager {
  private db: Database.Database | null = null;
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

  constructor(config: Partial<EncryptionConfig> = {}) {
    this.config = { ...DEFAULT_ENCRYPTION_CONFIG, ...config };
  }

  /**
   * Initialize the key manager
   */
  async initialize(dbPath: string = './.data/encryption/keys.db'): Promise<void> {
    // Ensure directory exists
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.createTables();

    // Load or generate master key
    await this.loadMasterKey();

    // Ensure we have a data encryption key
    await this.ensureDataKey();

    console.log('[KeyManager] Initialized');
  }

  /**
   * Create database tables
   */
  private createTables(): void {
    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS keys (
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

      CREATE INDEX IF NOT EXISTS idx_keys_type ON keys(type);
      CREATE INDEX IF NOT EXISTS idx_keys_active ON keys(active);
    `);
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
      const existingConfig = this.getMasterKeyConfig();
      if (existingConfig) {
        // In development, delete old config and create new one
        console.warn('[KeyManager] Deleting old master key config and generating new one');
        this.db!.prepare("DELETE FROM keys WHERE type = 'master'").run();
      }

      // Generate new master key for development
      masterKeyMaterial = generateKey(32).toString('base64');

      // Store in env for this session
      process.env.MASTER_ENCRYPTION_KEY = masterKeyMaterial;
    }

    // Derive the actual master key
    const existingConfig = this.getMasterKeyConfig();
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
      this.storeMasterKeyConfig(config);
    }
  }

  /**
   * Get master key configuration
   */
  private getMasterKeyConfig(): MasterKeyConfig | null {
    const row = this.db!.prepare(
      "SELECT kdf_config FROM keys WHERE type = 'master' AND active = 1"
    ).get() as any;

    return row ? JSON.parse(row.kdf_config) : null;
  }

  /**
   * Store master key configuration
   */
  private storeMasterKeyConfig(config: MasterKeyConfig): void {
    this.db!.prepare(`
      INSERT INTO keys (id, type, algorithm, kdf_config, created_at, active)
      VALUES (?, 'master', 'aes-256-gcm', ?, ?, 1)
    `).run(
      uuidv4(),
      JSON.stringify(config),
      new Date().toISOString()
    );
  }

  /**
   * Ensure we have an active data encryption key
   */
  private async ensureDataKey(): Promise<void> {
    const existing = this.getActiveDataKey();
    if (!existing) {
      await this.generateDataKey();
    }
    this.updateStats();
  }

  /**
   * Get active data encryption key
   */
  private getActiveDataKey(): KeyEntry | null {
    const row = this.db!.prepare(`
      SELECT * FROM keys
      WHERE type = 'data' AND active = 1
      AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY created_at DESC
      LIMIT 1
    `).get() as any;

    return row ? this.rowToKeyEntry(row) : null;
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
    this.db!.prepare(`
      INSERT INTO keys (id, type, algorithm, encrypted_key, created_at, expires_at, active)
      VALUES (?, 'data', ?, ?, ?, ?, 1)
    `).run(
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

    this.updateStats();
    return this.getKeyById(keyId)!;
  }

  /**
   * Get a key by ID
   */
  getKeyById(id: string): KeyEntry | null {
    const row = this.db!.prepare('SELECT * FROM keys WHERE id = ?').get(id) as any;
    return row ? this.rowToKeyEntry(row) : null;
  }

  /**
   * Get the current active data key for encryption
   */
  async getCurrentKey(): Promise<{ keyId: string; key: Buffer }> {
    // Check for cached key first
    for (const [keyId, cached] of this.keyCache.entries()) {
      if (cached.expiresAt > Date.now()) {
        return { keyId, key: cached.key };
      }
    }

    // Get active data key
    let keyEntry = this.getActiveDataKey();
    if (!keyEntry) {
      keyEntry = await this.generateDataKey();
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
    const keyEntry = this.getKeyById(keyId);
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
    // Deactivate old keys
    this.db!.prepare("UPDATE keys SET active = 0 WHERE type = 'data'").run();

    // Generate new key
    const newKey = await this.generateDataKey();

    this.stats.lastKeyRotation = new Date();
    this.updateStats();

    console.log('[KeyManager] Keys rotated, new key:', newKey.id);
    return newKey;
  }

  /**
   * List all keys
   */
  listKeys(type?: string): KeyEntry[] {
    let sql = 'SELECT * FROM keys';
    const params: unknown[] = [];

    if (type) {
      sql += ' WHERE type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = this.db!.prepare(sql).all(...params) as any[];
    return rows.map(this.rowToKeyEntry);
  }

  /**
   * Deactivate a key
   */
  deactivateKey(keyId: string): void {
    this.db!.prepare('UPDATE keys SET active = 0 WHERE id = ?').run(keyId);
    this.keyCache.delete(keyId);
    this.updateStats();
  }

  /**
   * Update key last used timestamp
   */
  updateKeyUsage(keyId: string): void {
    this.db!.prepare('UPDATE keys SET last_used_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      keyId
    );
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
  private updateStats(): void {
    const activeRow = this.db!.prepare(
      'SELECT COUNT(*) as count FROM keys WHERE active = 1'
    ).get() as any;
    const expiredRow = this.db!.prepare(
      "SELECT COUNT(*) as count FROM keys WHERE active = 0 OR (expires_at IS NOT NULL AND expires_at < datetime('now'))"
    ).get() as any;

    this.stats.activeKeys = activeRow.count;
    this.stats.expiredKeys = expiredRow.count;
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
    if (this.db) {
      this.db.close();
      this.db = null;
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
