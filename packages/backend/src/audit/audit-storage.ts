/**
 * Audit Storage System
 * Persistent storage for audit events using SQLite
 */

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

export class AuditStorage {
  private db: Database.Database | null = null;
  private config: AuditConfig;
  private dbPath: string;

  constructor(dbPath: string = './.data/audit/audit.db', config: Partial<AuditConfig> = {}) {
    this.dbPath = dbPath;
    this.config = { ...DEFAULT_AUDIT_CONFIG, ...config };
  }

  /**
   * Initialize the storage
   */
  async initialize(): Promise<void> {
    // Ensure directory exists
    const dir = dirname(this.dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.createTables();

    // Create indexes
    this.createIndexes();

    console.log('[Audit Storage] Initialized at:', this.dbPath);
  }

  /**
   * Create database tables
   */
  private createTables(): void {
    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS audit_events (
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

      CREATE TABLE IF NOT EXISTS audit_stats_cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Create indexes for efficient querying
   */
  private createIndexes(): void {
    this.db!.exec(`
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_events(category);
      CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_events(severity);
      CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_events(actor_id);
      CREATE INDEX IF NOT EXISTS idx_audit_result ON audit_events(result);
      CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_events(session_id);
    `);
  }

  /**
   * Store an audit event
   */
  store(event: AuditEvent): void {
    if (!this.db) throw new Error('Storage not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO audit_events (
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
      )
    `);

    stmt.run(
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
      event.correlationId || null
    );

    // Cleanup old events if needed
    this.cleanupIfNeeded();
  }

  /**
   * Store multiple events
   */
  storeBatch(events: AuditEvent[]): void {
    if (!this.db || events.length === 0) return;

    const insert = this.db.transaction((evts: AuditEvent[]) => {
      for (const event of evts) {
        this.store(event);
      }
    });

    insert(events);
  }

  /**
   * Query audit events
   */
  query(filters: AuditQuery = {}): AuditEvent[] {
    if (!this.db) throw new Error('Storage not initialized');

    let sql = 'SELECT * FROM audit_events WHERE 1=1';
    const params: unknown[] = [];

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
      sql += ' AND (details LIKE ? OR error LIKE ? OR action LIKE ?)';
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

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(this.rowToEvent);
  }

  /**
   * Get a single event by ID
   */
  getById(id: string): AuditEvent | null {
    if (!this.db) throw new Error('Storage not initialized');

    const row = this.db.prepare('SELECT * FROM audit_events WHERE id = ?').get(id) as any;
    return row ? this.rowToEvent(row) : null;
  }

  /**
   * Get audit statistics
   */
  getStats(): AuditStats {
    if (!this.db) throw new Error('Storage not initialized');

    // Total events
    const totalRow = this.db.prepare('SELECT COUNT(*) as count FROM audit_events').get() as any;
    const totalEvents = totalRow.count;

    // By category
    const categoryRows = this.db.prepare(`
      SELECT category, COUNT(*) as count FROM audit_events GROUP BY category
    `).all() as any[];
    const byCategory = {} as Record<AuditCategory, number>;
    for (const row of categoryRows) {
      byCategory[row.category as AuditCategory] = row.count;
    }

    // By severity
    const severityRows = this.db.prepare(`
      SELECT severity, COUNT(*) as count FROM audit_events GROUP BY severity
    `).all() as any[];
    const bySeverity = {} as Record<AuditSeverity, number>;
    for (const row of severityRows) {
      bySeverity[row.severity as AuditSeverity] = row.count;
    }

    // By result
    const resultRows = this.db.prepare(`
      SELECT result, COUNT(*) as count FROM audit_events GROUP BY result
    `).all() as any[];
    const byResult = {} as Record<string, number>;
    for (const row of resultRows) {
      byResult[row.result] = row.count;
    }

    // Recent critical (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const criticalRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM audit_events
      WHERE severity = 'critical' AND timestamp >= ?
    `).get(oneDayAgo) as any;

    // Failed logins (last 24h)
    const failedLoginRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM audit_events
      WHERE action = 'login_failed' AND timestamp >= ?
    `).get(oneDayAgo) as any;

    // Blocked executions (last 24h)
    const blockedRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM audit_events
      WHERE action = 'execute_blocked' AND timestamp >= ?
    `).get(oneDayAgo) as any;

    return {
      totalEvents,
      byCategory,
      bySeverity,
      byResult,
      recentCritical: criticalRow.count,
      failedLogins24h: failedLoginRow.count,
      blockedExecutions24h: blockedRow.count,
    };
  }

  /**
   * Get recent events
   */
  getRecent(limit: number = 50): AuditEvent[] {
    return this.query({ limit, orderBy: 'timestamp', orderDir: 'desc' });
  }

  /**
   * Delete events older than retention period
   */
  cleanup(): number {
    if (!this.db) return 0;

    const cutoffDate = new Date(
      Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const result = this.db.prepare('DELETE FROM audit_events WHERE timestamp < ?').run(cutoffDate);
    return result.changes;
  }

  /**
   * Cleanup if exceeding max events
   */
  private cleanupIfNeeded(): void {
    if (!this.db) return;

    const countRow = this.db.prepare('SELECT COUNT(*) as count FROM audit_events').get() as any;

    if (countRow.count > this.config.maxEvents) {
      // Delete oldest 10% of events
      const deleteCount = Math.floor(this.config.maxEvents * 0.1);
      this.db.prepare(`
        DELETE FROM audit_events WHERE id IN (
          SELECT id FROM audit_events ORDER BY timestamp ASC LIMIT ?
        )
      `).run(deleteCount);
    }
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
  exportToJson(filters: AuditQuery = {}): string {
    const events = this.query(filters);
    return JSON.stringify(events, null, 2);
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
let auditStorage: AuditStorage | null = null;

// Default audit database path (can be overridden via environment variable)
const DEFAULT_AUDIT_DB_PATH = process.env.AUDIT_DB_PATH || './.data/audit/audit.db';

export function getAuditStorage(
  dbPath?: string,
  config?: Partial<AuditConfig>
): AuditStorage {
  if (!auditStorage) {
    auditStorage = new AuditStorage(dbPath || DEFAULT_AUDIT_DB_PATH, config);
  }
  return auditStorage;
}
