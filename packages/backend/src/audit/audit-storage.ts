/**
 * Audit Storage System
 * Persistent storage for security audit events.
 *
 * B2.2c, where the store lives:
 *   SQLite      its own better-sqlite3 file (AUDIT_DB_PATH, default
 *               <data>/audit/audit.db), table audit_events, as before.
 *               Methods are synchronous and return plain values.
 *   PostgreSQL  the main PostgreSQL database, table security_audit_events
 *               (migrations-pg r007, from scripts/pg/runtime/
 *               r007_security_audit_events.sql = auditEventsSchemaSql(
 *               'security_audit_events')). One backup and one restore cover
 *               it with everything else, it needs no second database or
 *               file next to a PostgreSQL deployment, and the name keeps it
 *               apart from audit_logs (the request audit trail). Methods
 *               return promises; the event insert runs outside any open
 *               transaction of the caller (a rollback never removes a
 *               security event), and the size cleanup runs under a
 *               transaction-scoped lock so two processes never both trim.
 * The SQL is one copy for both (encryption/row-store.ts).
 */

import { dataPathOr } from '../config/data-root.js';
import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import {
  type AuditEvent,
  type AuditQuery,
  type AuditStats,
  type AuditCategory,
  type AuditSeverity,
  type AuditConfig,
  DEFAULT_AUDIT_CONFIG,
} from './types.js';
import { validateColumnName, validateSortDirection } from '../db/sql-utils.js';
import { dbDriver } from '../db/pg/config.js';
import { likeCi } from '../db/pg/dialect.js';
import { outsidePgTransaction } from '../db/pg/pool.js';
import { mapAll, mapMaybe, pgRowStore, requirePgTable, sqliteRowStore, type Maybe, type RowStore } from '../encryption/row-store.js';

/** The security event table on each driver. */
export function auditEventsTableFor(driver: 'sqlite' | 'postgres'): string {
  return driver === 'postgres' ? 'security_audit_events' : 'audit_events';
}

/**
 * DDL of the event table and its indexes. SQLite: `audit_events` with the
 * idx_audit_* names, as before. PostgreSQL: `security_audit_events` with
 * idx_security_audit_* (the main database already has idx_audit_* on
 * audit_logs).
 */
export function auditEventsSchemaSql(table: string = 'audit_events'): string {
  const idx = table === 'audit_events' ? 'idx_audit' : `idx_${table.replace(/_events$/, '')}`;
  return `
      CREATE TABLE IF NOT EXISTS ${table} (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        category TEXT NOT NULL,
        action TEXT NOT NULL,
        severity TEXT NOT NULL,
        actor_type TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_name TEXT,
        actor_ip TEXT,
        target_type TEXT,
        target_id TEXT,
        target_name TEXT,
        result TEXT NOT NULL,
        error TEXT,
        details TEXT,
        request TEXT,
        session_id TEXT,
        correlation_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS ${idx}_timestamp ON ${table}(timestamp);
      CREATE INDEX IF NOT EXISTS ${idx}_category ON ${table}(category);
      CREATE INDEX IF NOT EXISTS ${idx}_severity ON ${table}(severity);
      CREATE INDEX IF NOT EXISTS ${idx}_actor ON ${table}(actor_id);
      CREATE INDEX IF NOT EXISTS ${idx}_result ON ${table}(result);
      CREATE INDEX IF NOT EXISTS ${idx}_session ON ${table}(session_id);
    `;
}

/** SQLite only (its own file): a stats cache table, unused by the code; kept as before. */
const SQLITE_STATS_CACHE_SQL = `
      CREATE TABLE IF NOT EXISTS audit_stats_cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

export class AuditStorage {
  private db: Database.Database | null = null;
  private store_: RowStore | null = null;
  private table = 'audit_events';
  private config: AuditConfig;
  private dbPath: string;

  constructor(dbPath: string = dataPathOr('./.data/audit/audit.db', 'audit', 'audit.db'), config: Partial<AuditConfig> = {}) {
    this.dbPath = dbPath;
    this.config = { ...DEFAULT_AUDIT_CONFIG, ...config };
  }

  /**
   * Initialize the storage
   */
  async initialize(): Promise<void> {
    if (dbDriver() === 'postgres') {
      // The table comes from the PostgreSQL migrations (no runtime DDL there).
      this.table = auditEventsTableFor('postgres');
      await requirePgTable(this.table, 'migrations-pg r007');
      this.store_ = pgRowStore;
      console.log('[Audit Storage] Initialized in the main PostgreSQL database:', this.table);
      return;
    }

    // Ensure directory exists
    const dir = dirname(this.dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');

    // Create tables and indexes
    this.db.exec(auditEventsSchemaSql('audit_events'));
    this.db.exec(SQLITE_STATS_CACHE_SQL);
    this.store_ = sqliteRowStore(this.db);

    console.log('[Audit Storage] Initialized at:', this.dbPath);
  }

  private get rows(): RowStore {
    if (!this.store_) throw new Error('Storage not initialized');
    return this.store_;
  }

  /**
   * Store an audit event (a duplicate id is ignored). PostgreSQL: outside
   * any open transaction of the caller.
   */
  store(event: AuditEvent): Maybe<void> {
    const rows = this.rows;
    const params = [
      event.id,
      event.timestamp.toISOString(),
      event.category,
      event.action,
      event.severity,
      event.actor.type,
      event.actor.id,
      event.actor.name || null,
      event.actor.ip || null,
      event.target?.type || null,
      event.target?.id || null,
      event.target?.name || null,
      event.result,
      event.error || null,
      event.details ? JSON.stringify(event.details) : null,
      event.request ? JSON.stringify(event.request) : null,
      event.sessionId || null,
      event.correlationId || null,
    ];
    // (A promise result flattens: Maybe<Maybe<void>> is Maybe<void> at run time.)
    const insert = (): Maybe<void> => mapMaybe(rows.run(`
      INSERT INTO ${this.table} (
        id, timestamp, category, action, severity,
        actor_type, actor_id, actor_name, actor_ip,
        target_type, target_id, target_name,
        result, error, details, request,
        session_id, correlation_id
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      ) ON CONFLICT (id) DO NOTHING
    `, ...params), () => this.cleanupIfNeeded()) as Maybe<void>;
    if (rows.dialect === 'postgres') return outsidePgTransaction(insert);
    return insert();
  }

  /**
   * Store multiple events
   */
  storeBatch(events: AuditEvent[]): Maybe<void> {
    if (!this.store_ || events.length === 0) return;

    if (this.db) {
      const insert = this.db.transaction((evts: AuditEvent[]) => {
        for (const event of evts) {
          this.store(event);
        }
      });
      insert(events);
      return;
    }
    return (async () => {
      for (const event of events) await this.store(event);
    })();
  }

  /**
   * Query audit events
   */
  query(filters: AuditQuery = {}): Maybe<AuditEvent[]> {
    const rowsStore = this.rows;

    let sql = `SELECT * FROM ${this.table} WHERE 1=1`;
    const params: Array<string | number | null> = [];

    // Date range
    if (filters.startDate) {
      sql += ' AND timestamp >= ?';
      params.push(filters.startDate.toISOString());
    }
    if (filters.endDate) {
      sql += ' AND timestamp <= ?';
      params.push(filters.endDate.toISOString());
    }

    // Category filter
    if (filters.category) {
      const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
      sql += ` AND category IN (${categories.map(() => '?').join(',')})`;
      params.push(...categories);
    }

    // Action filter
    if (filters.action) {
      const actions = Array.isArray(filters.action) ? filters.action : [filters.action];
      sql += ` AND action IN (${actions.map(() => '?').join(',')})`;
      params.push(...actions);
    }

    // Severity filter
    if (filters.severity) {
      const severities = Array.isArray(filters.severity) ? filters.severity : [filters.severity];
      sql += ` AND severity IN (${severities.map(() => '?').join(',')})`;
      params.push(...severities);
    }

    // Actor filter
    if (filters.actorId) {
      sql += ' AND actor_id = ?';
      params.push(filters.actorId);
    }

    // Result filter
    if (filters.result) {
      sql += ' AND result = ?';
      params.push(filters.result);
    }

    // Search in details
    if (filters.search) {
      const like = likeCi(rowsStore.dialect); // case-insensitive on both drivers
      sql += ` AND (details ${like} ? OR error ${like} ? OR action ${like} ?)`;
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // SECURITY: Validate ORDER BY to prevent SQL injection
    const allowedColumns = ['id', 'timestamp', 'category', 'action', 'severity', 'result', 'user_id', 'ip_address'];
    const orderBy = validateColumnName(filters.orderBy || 'timestamp', allowedColumns);
    const orderDir = validateSortDirection(filters.orderDir || 'desc');
    sql += ` ORDER BY ${orderBy} ${orderDir}`;

    // Pagination
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    return mapMaybe(rowsStore.all(sql, ...params), (rows: any[]) => rows.map(this.rowToEvent));
  }

  /**
   * Get a single event by ID
   */
  getById(id: string): Maybe<AuditEvent | null> {
    return mapMaybe(this.rows.one(`SELECT * FROM ${this.table} WHERE id = ?`, id), (row: any) => (row ? this.rowToEvent(row) : null));
  }

  /**
   * Get audit statistics
   */
  getStats(): Maybe<AuditStats> {
    const rows = this.rows;
    const t = this.table;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return mapAll([
      rows.one(`SELECT COUNT(*) as count FROM ${t}`),
      rows.all(`SELECT category, COUNT(*) as count FROM ${t} GROUP BY category`),
      rows.all(`SELECT severity, COUNT(*) as count FROM ${t} GROUP BY severity`),
      rows.all(`SELECT result, COUNT(*) as count FROM ${t} GROUP BY result`),
      // Recent critical, failed logins and blocked executions (last 24h)
      rows.one(`SELECT COUNT(*) as count FROM ${t} WHERE severity = 'critical' AND timestamp >= ?`, oneDayAgo),
      rows.one(`SELECT COUNT(*) as count FROM ${t} WHERE action = 'login_failed' AND timestamp >= ?`, oneDayAgo),
      rows.one(`SELECT COUNT(*) as count FROM ${t} WHERE action = 'execute_blocked' AND timestamp >= ?`, oneDayAgo),
    ] as const, ([totalRow, categoryRows, severityRows, resultRows, criticalRow, failedLoginRow, blockedRow]: any[]) => {
      const byCategory = {} as Record<AuditCategory, number>;
      for (const row of categoryRows) byCategory[row.category as AuditCategory] = row.count;
      const bySeverity = {} as Record<AuditSeverity, number>;
      for (const row of severityRows) bySeverity[row.severity as AuditSeverity] = row.count;
      const byResult = {} as Record<string, number>;
      for (const row of resultRows) byResult[row.result] = row.count;
      return {
        totalEvents: totalRow.count,
        byCategory,
        bySeverity,
        byResult,
        recentCritical: criticalRow.count,
        failedLogins24h: failedLoginRow.count,
        blockedExecutions24h: blockedRow.count,
      };
    });
  }

  /**
   * Get recent events
   */
  getRecent(limit: number = 50): Maybe<AuditEvent[]> {
    return this.query({ limit, orderBy: 'timestamp', orderDir: 'desc' });
  }

  /**
   * Delete events older than retention period
   */
  cleanup(): Maybe<number> {
    if (!this.store_) return 0;

    const cutoffDate = new Date(
      Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000
    ).toISOString();

    return mapMaybe(this.store_.run(`DELETE FROM ${this.table} WHERE timestamp < ?`, cutoffDate), (r) => r.changes);
  }

  /**
   * Cleanup if exceeding max events (PostgreSQL: one trimmer at a time)
   */
  private cleanupIfNeeded(): Maybe<void> {
    const rows = this.store_;
    if (!rows) return;
    const t = this.table;
    const trim = (): Maybe<void> => mapMaybe(rows.one(`SELECT COUNT(*) as count FROM ${t}`), (countRow: any): Maybe<void> => {
      if (countRow.count > this.config.maxEvents) {
        // Delete oldest 10% of events
        const deleteCount = Math.floor(this.config.maxEvents * 0.1);
        return mapMaybe(rows.run(`
          DELETE FROM ${t} WHERE id IN (
            SELECT id FROM ${t} ORDER BY timestamp ASC LIMIT ?
          )
        `, deleteCount), () => undefined);
      }
      return undefined;
    }) as Maybe<void>;
    if (rows.dialect !== 'postgres') return trim();
    return rows.transaction(async () => {
      await rows.one('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', `${t}:cleanup`);
      await trim();
    });
  }

  /**
   * Convert database row to AuditEvent
   */
  private rowToEvent(row: any): AuditEvent {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      category: row.category,
      action: row.action,
      severity: row.severity,
      actor: {
        type: row.actor_type,
        id: row.actor_id,
        name: row.actor_name || undefined,
        ip: row.actor_ip || undefined,
      },
      target: row.target_type ? {
        type: row.target_type,
        id: row.target_id,
        name: row.target_name || undefined,
      } : undefined,
      result: row.result,
      error: row.error || undefined,
      details: row.details ? JSON.parse(row.details) : undefined,
      request: row.request ? JSON.parse(row.request) : undefined,
      sessionId: row.session_id || undefined,
      correlationId: row.correlation_id || undefined,
    };
  }

  /**
   * Export events to JSON
   */
  exportToJson(filters: AuditQuery = {}): Maybe<string> {
    return mapMaybe(this.query(filters), (events) => JSON.stringify(events, null, 2));
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.store_ = null; // PostgreSQL: the process pool is closed by its owner
  }
}

// Singleton instance
let auditStorage: AuditStorage | null = null;

// Default audit database path (can be overridden via environment variable)
const DEFAULT_AUDIT_DB_PATH = process.env.AUDIT_DB_PATH || dataPathOr('./.data/audit/audit.db', 'audit', 'audit.db');

export function getAuditStorage(
  dbPath?: string,
  config?: Partial<AuditConfig>
): AuditStorage {
  if (!auditStorage) {
    auditStorage = new AuditStorage(dbPath || DEFAULT_AUDIT_DB_PATH, config);
  }
  return auditStorage;
}
