/**
 * Credential Storage
 *
 * Stores credentials in JSON files + the database
 * JSON files for backup, the database for fast access
 *
 * B2.2b-2: the rows go through a SQL runner (repositories/sql-runner.ts),
 * so the SQL exists once for both drivers:
 *   SQLite      the main SQLite database, as before; initialize() still
 *               creates the table and indexes and upgrades a legacy table.
 *   PostgreSQL  the `credentials` table of migrations-pg (000_schema) with
 *               its indexes (r001); initialize() only checks they exist (no
 *               DDL, no PRAGMA at run time).
 * Encryption is unchanged (credentials/encryption.ts, AES-256-GCM with
 * ENCRYPTION_KEY); only ciphertext, IV and auth tag are stored.
 */

import { dataPathOr } from '../config/data-root.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { getDatabase } from '../db/index.js';
import { getEncryptionService } from './encryption.js';
import type { Credential, ICredentialStorage } from './types.js';
import { sqliteRunner, type SqlRunner } from '../repositories/sql-runner.js';
import { pgRunner } from '../repositories/pg/sql-runner.js';
import { dbDriver, type DbDriver } from '../db/pg/config.js';
import { withPgTransaction, afterPgCommit } from '../db/pg/pool.js';
import { randomBytes } from 'crypto';

/**
 * Indexes of the credentials table (the table itself is in schema.sql).
 * SQLite creates them in initialize(); scripts/pg/runtime/r001_credentials_indexes.sql
 * is the same DDL, translated into migrations-pg by the translator
 * (test/pg-runtime-ddl.test.mjs keeps the two equal).
 */
export const CREDENTIALS_INDEXES_SQL = `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_credentials_name_user
        ON credentials(name, user_id);
      CREATE INDEX IF NOT EXISTS idx_credentials_skill
        ON credentials(skill_id);
      CREATE INDEX IF NOT EXISTS idx_credentials_user
        ON credentials(user_id);
    `;

const COLUMNS = `id, name, type, encrypted_value, iv, auth_tag,
        description, skill_id, user_id, refresh_token,
        expires_at, scopes, created_at, updated_at, last_used`;

/** The SQL runner of a driver. */
export function credentialsRunnerFor(driver: DbDriver): SqlRunner {
  return driver === 'postgres' ? pgRunner : sqliteRunner;
}

export class CredentialStorage implements ICredentialStorage {
  private credentialsDir: string;
  private sql: SqlRunner;
  private encryption: ReturnType<typeof getEncryptionService>;

  constructor(credentialsDir?: string, runner: SqlRunner = credentialsRunnerFor(dbDriver())) {
    // Default to home directory
    this.credentialsDir = credentialsDir || dataPathOr(path.join(
      os.homedir(),
      '.agent-player',
      'credentials'
    ), 'credentials');
    this.sql = runner;
    this.encryption = getEncryptionService();
  }

  /**
   * Initialize storage
   */
  async initialize(): Promise<void> {
    // Create credentials directory
    await fs.mkdir(this.credentialsDir, { recursive: true });

    if (this.sql.dialect === 'postgres') {
      // Table and indexes come from migrations-pg (000_schema, r001).
      const row = await this.sql.one<{ present: boolean }>(
        `SELECT to_regclass('credentials') IS NOT NULL AND to_regclass('idx_credentials_name_user') IS NOT NULL AS present`
      );
      if (!row?.present) throw new Error('PostgreSQL credentials table or its indexes are missing; run the PostgreSQL migrations (r001_credentials_indexes)');
      console.log(`[Credentials] 🔐 Storage initialized on PostgreSQL: ${this.credentialsDir}`);
      return;
    }

    // Older databases may hold a legacy `credentials` table (from an earlier
    // schema.sql) without skill_id etc. Upgrade it before creating indexes.
    this.upgradeLegacyTable();

    // Create database table
    getDatabase().getDb().exec(`
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
${CREDENTIALS_INDEXES_SQL}`);

    console.log(`[Credentials] 🔐 Storage initialized: ${this.credentialsDir}`);
  }

  /**
   * F-03: bring a legacy `credentials` table (old schema.sql: no skill_id,
   * user_id NOT NULL, type CHECK without oauth_token/secret) up to date.
   * - Table missing or already current: nothing happens.
   * - Legacy and empty: dropped, so the current definition is created below.
   * - Legacy with rows: never dropped; only the missing columns are added
   *   (old NOT NULL/CHECK constraints stay until an explicit, approved rebuild).
   */
  private upgradeLegacyTable(): void {
    const db = getDatabase().getDb(); // SQLite only (initialize returns earlier on PostgreSQL)
    const columns = db.prepare("SELECT name FROM pragma_table_info('credentials')").all() as Array<{ name: string }>;
    if (columns.length === 0) return;
    const have = new Set(columns.map(c => c.name));
    if (have.has('skill_id')) return;

    const { count } = db.prepare('SELECT COUNT(*) AS count FROM credentials').get() as { count: number };
    if (count === 0) {
      db.exec('DROP TABLE credentials');
      console.log('[Credentials] Replaced empty legacy credentials table with the current definition');
      return;
    }

    const wanted: Array<[string, string]> = [
      ['description', 'TEXT'],
      ['skill_id', 'TEXT'],
      ['refresh_token', 'TEXT'],
      ['expires_at', 'TEXT'],
      ['scopes', 'TEXT'],
      ['last_used', 'TEXT'],
    ];
    for (const [name, type] of wanted) {
      if (!have.has(name)) db.exec(`ALTER TABLE credentials ADD COLUMN ${name} ${type}`);
    }
    console.warn('[Credentials] Legacy credentials table upgraded in place (columns added; existing rows kept)');
  }

  /**
   * Save a credential
   */
  async save(credential: Credential): Promise<void> {
    // Save to database
    const values = [
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
    ];
    const insert = `INTO credentials (
        ${COLUMNS}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    if (this.sql.dialect === 'postgres') {
      // INSERT OR REPLACE as SQLite does it: every row that conflicts on the
      // primary key or on the unique (name, user_id) index is deleted, then
      // the row is inserted; in one transaction (a failure keeps the old row).
      await withPgTransaction(async () => {
        await this.sql.run('DELETE FROM credentials WHERE id = ? OR (name = ? AND user_id = ?)', credential.id, credential.name, credential.userId || null);
        await this.sql.run(`INSERT ${insert}`, ...values);
        // FU-05: the JSON backup follows committed state only. Inside a
        // caller's transaction this runs after its COMMIT, never on rollback.
        await afterPgCommit(() => this.backupFromCommittedRow(credential.id));
      });
    } else {
      await this.sql.run(`INSERT OR REPLACE ${insert}`, ...values);
      await this.backupFromCommittedRow(credential.id);
    }
  }

  /**
   * FU-05: rebuild the JSON backup of credential `id` from its committed row
   * (ciphertext, IV and auth tag only), never from the caller's object. Runs
   * after the write committed (PostgreSQL: afterPgCommit). On SQLite a
   * better-sqlite3 transaction is synchronous and has ended by the time this
   * runs; if the connection is still inside a transaction (a caller's raw
   * BEGIN) the row is not committed yet, so no backup is written and the
   * file keeps the last committed state (the next save rewrites it).
   */
  private async backupFromCommittedRow(id: string): Promise<void> {
    if (this.sql.dialect === 'sqlite' && getDatabase().getDb().inTransaction) {
      console.warn('[Credentials] Backup not written: the credential write is not committed yet');
      return;
    }
    const row = await this.sql.one('SELECT * FROM credentials WHERE id = ?', id);
    if (!row) return; // not committed (or deleted since): nothing to back up
    await this.saveToFile(this.rowToCredential(row));
  }

  /**
   * Get credential by ID
   */
  async get(id: string): Promise<Credential | null> {
    const row = await this.sql.one('SELECT * FROM credentials WHERE id = ?', id);

    if (!row) return null;

    // Update last used timestamp
    await this.sql.run(`
      UPDATE credentials
      SET last_used = ?
      WHERE id = ?
    `, new Date().toISOString(), id);

    return this.rowToCredential(row);
  }

  /**
   * Get credential by name
   */
  async getByName(name: string, userId?: string): Promise<Credential | null> {
    let row;

    if (userId) {
      row = await this.sql.one(
        'SELECT * FROM credentials WHERE name = ? AND user_id = ?', name, userId
      );
    } else {
      row = await this.sql.one(
        'SELECT * FROM credentials WHERE name = ? AND user_id IS NULL', name
      );
    }

    if (!row) return null;

    return this.rowToCredential(row);
  }

  /**
   * Get all credentials for a skill
   */
  async getBySkill(skillId: string): Promise<Credential[]> {
    const rows = await this.sql.all(
      'SELECT * FROM credentials WHERE skill_id = ? ORDER BY created_at DESC', skillId
    );

    return rows.map(row => this.rowToCredential(row));
  }

  /**
   * Get all credentials for a user
   */
  async getByUser(userId: string): Promise<Credential[]> {
    const rows = await this.sql.all(
      'SELECT * FROM credentials WHERE user_id = ? ORDER BY created_at DESC', userId
    );

    return rows.map(row => this.rowToCredential(row));
  }

  /**
   * Get all credentials (no filter)
   */
  async getAll(): Promise<Credential[]> {
    const rows = await this.sql.all(
      'SELECT * FROM credentials ORDER BY created_at DESC'
    );

    return rows.map(row => this.rowToCredential(row));
  }

  /**
   * Delete a credential
   */
  async delete(id: string): Promise<void> {
    const credential = await this.get(id);
    if (!credential) return;

    // Delete from database
    await this.sql.run('DELETE FROM credentials WHERE id = ?', id);

    // Delete the JSON file once the delete is committed (FU-05): a rolled-back
    // delete keeps its backup.
    const removeBackup = async () => {
      if (this.sql.dialect === 'sqlite' && getDatabase().getDb().inTransaction) return;
      if (await this.sql.one('SELECT id FROM credentials WHERE id = ?', id)) return; // still there
      try {
        await fs.unlink(this.getFilePath(credential));
      } catch (err) {
        // File might not exist, ignore
      }
    };
    if (this.sql.dialect === 'postgres') await afterPgCommit(removeBackup);
    else await removeBackup();
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

    // Create directory if needed (owner only)
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });

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

    // FU-05: atomic write. A temp file in the same directory (mode 0600,
    // created exclusively), then rename over the backup: a reader sees the
    // old file or the new one, never a partial write.
    const tmpPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`);
    try {
      await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600, flag: 'wx' });
      await fs.chmod(tmpPath, 0o600);
      await fs.rename(tmpPath, filePath);
    } catch (err) {
      await fs.rm(tmpPath, { force: true }).catch(() => undefined);
      throw err;
    }
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

// One instance per driver (the process uses dbDriver(); tests may ask for either)
const credentialStorages = new Map<DbDriver, CredentialStorage>();

export function credentialStorageFor(driver: DbDriver): CredentialStorage {
  let storage = credentialStorages.get(driver);
  if (!storage) {
    storage = new CredentialStorage(undefined, credentialsRunnerFor(driver));
    credentialStorages.set(driver, storage);
  }
  return storage;
}

export function getCredentialStorage(): CredentialStorage {
  return credentialStorageFor(dbDriver());
}
