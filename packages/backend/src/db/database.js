/**
 * Real Database Manager using better-sqlite3
 * Replaces the temporary in-memory database
 */
import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
const __dirname = dirname(fileURLToPath(import.meta.url));
export class DatabaseManager {
    db;
    config;
    constructor(config) {
        this.config = config;
        // Ensure database directory exists
        const dbDir = dirname(config.path);
        if (!existsSync(dbDir)) {
            mkdirSync(dbDir, { recursive: true });
        }
        // Initialize database
        this.db = new Database(config.path, {
            readonly: config.readonly || false,
            verbose: config.verbose ? console.log : undefined
        });
        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');
        // Enable WAL mode for better concurrency
        this.db.pragma('journal_mode = WAL');
        console.log(`[Database] ✅ Connected to ${config.path}`);
    }
    /**
     * Initialize database schema
     */
    async initialize() {
        console.log('[Database] Initializing schema...');
        const schemaPath = join(__dirname, 'schema.sql');
        const schema = readFileSync(schemaPath, 'utf-8');
        // Execute schema (CREATE TABLE statements)
        this.db.exec(schema);
        console.log('[Database] ✅ Schema initialized');
        // Run migrations
        await this.runMigrations();
        // Ensure default system user exists for anonymous sessions
        await this.ensureDefaultUser();
    }
    /**
     * Ensure a default system user exists for anonymous/legacy sessions
     */
    async ensureDefaultUser() {
        const bcrypt = await import('bcryptjs');
        // Create default system user (string ID for legacy compatibility)
        const DEFAULT_USER_ID = 'mock-user';
        const existingUser = this.db.prepare('SELECT id FROM users WHERE id = ?').get(DEFAULT_USER_ID);
        if (!existingUser) {
            console.log('[Database] Creating default system user...');
            const passwordHash = await bcrypt.default.hash('system-user-not-for-login', 10);
            this.db.prepare(`
        INSERT INTO users (id, email, username, password_hash, full_name, role, status, email_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(DEFAULT_USER_ID, 'system@agent-player.local', 'system', passwordHash, 'System User', 'user', 'active', 1);
            console.log('[Database] ✅ Default system user created');
        }
        // Create demo user with ID '1' (string) for avatar/voice features
        const demoUserId = '1';
        const existingDemoUser = this.db.prepare('SELECT id FROM users WHERE id = ?').get(demoUserId);
        if (!existingDemoUser) {
            console.log('[Database] Creating demo user (ID: 1)...');
            const demoPasswordHash = await bcrypt.default.hash('demo-user-password', 10);
            this.db.prepare(`
        INSERT INTO users (id, email, username, password_hash, full_name, role, status, email_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(demoUserId, 'demo1@agent-player.local', 'demo1', demoPasswordHash, 'Demo User 1', 'user', 'active', 1);
            console.log('[Database] ✅ Demo user created (ID: 1)');
        }
    }
    /**
     * Run database migrations
     */
    async runMigrations() {
        // Create migrations table if not exists
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
        // Get applied migrations
        const applied = this.db.prepare('SELECT id FROM migrations').all();
        const appliedIds = new Set(applied.map(m => m.id));
        // Load migration files
        const migrations = this.loadMigrations();
        // Apply pending migrations
        for (const migration of migrations) {
            if (!appliedIds.has(migration.id)) {
                console.log(`[Database] Applying migration: ${migration.name}`);
                this.db.transaction(() => {
                    // Execute migration
                    this.db.exec(migration.up);
                    // Record migration
                    this.db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)').run(migration.id, migration.name);
                })();
                console.log(`[Database] ✅ Applied migration: ${migration.name}`);
            }
        }
    }
    /**
     * Load migration files
     */
    loadMigrations() {
        const migrationsDir = join(__dirname, 'migrations');
        if (!existsSync(migrationsDir)) {
            console.log('[Database] No migrations directory found');
            return [];
        }
        const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
        const migrations = files.map(file => {
            const filePath = join(migrationsDir, file);
            const content = readFileSync(filePath, 'utf-8');
            // Extract ID from filename (e.g., "003_avatar_voice.sql" -> "003")
            const id = file.split('_')[0];
            const name = file.replace('.sql', '');
            return {
                id,
                name,
                up: content,
                down: '' // We don't support down migrations for now
            };
        });
        console.log(`[Database] Found ${migrations.length} migration(s)`);
        return migrations;
    }
    /**
     * Get database instance
     */
    getDb() {
        return this.db;
    }
    /**
     * Backwards compatibility: Execute SQL (alias for getDb().exec())
     */
    exec(sql) {
        return this.db.exec(sql);
    }
    /**
     * Backwards compatibility: Prepare statement (alias for getDb().prepare())
     */
    prepare(sql) {
        return this.db.prepare(sql);
    }
    /**
     * Execute a query
     */
    query(sql, ...params) {
        return this.db.prepare(sql).all(...params);
    }
    /**
     * Execute a query and return first result
     */
    queryOne(sql, ...params) {
        return this.db.prepare(sql).get(...params);
    }
    /**
     * Execute an insert/update/delete
     */
    execute(sql, ...params) {
        return this.db.prepare(sql).run(...params);
    }
    /**
     * Begin a transaction
     */
    transaction(fn) {
        return this.db.transaction(fn)();
    }
    /**
     * Close database connection
     */
    close() {
        this.db.close();
        console.log('[Database] Connection closed');
    }
    /**
     * Get database statistics
     */
    getStats() {
        const size = this.db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get();
        const tables = this.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get();
        return {
            size: size.size || 0,
            tables: tables.count || 0,
            pageSize: this.db.pragma('page_size', { simple: true }),
            pageCount: this.db.pragma('page_count', { simple: true })
        };
    }
    /**
     * Optimize database (VACUUM)
     */
    optimize() {
        console.log('[Database] Optimizing...');
        this.db.exec('VACUUM;');
        this.db.exec('ANALYZE;');
        console.log('[Database] ✅ Optimized');
    }
    /**
     * Backup database
     */
    async backup(backupPath) {
        console.log(`[Database] Backing up to ${backupPath}...`);
        return new Promise((resolve, reject) => {
            const backup = this.db.backup(backupPath);
            backup
                .then(() => {
                console.log('[Database] ✅ Backup completed');
                resolve();
            })
                .catch(reject);
        });
    }
    /**
     * Get table row counts
     */
    getTableCounts() {
        const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
        const counts = {};
        for (const table of tables) {
            const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
            counts[table.name] = result.count;
        }
        return counts;
    }
}
// Singleton instance
let dbInstance = null;
/**
 * Get or create database instance
 */
export function getDatabase(config) {
    if (!dbInstance) {
        const defaultConfig = {
            path: process.env.DATABASE_PATH || join(process.cwd(), '.data', 'agent-player.db'),
            verbose: process.env.NODE_ENV === 'development'
        };
        dbInstance = new DatabaseManager(config || defaultConfig);
    }
    return dbInstance;
}
/**
 * Close database connection
 */
export function closeDatabase() {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}
export default DatabaseManager;
