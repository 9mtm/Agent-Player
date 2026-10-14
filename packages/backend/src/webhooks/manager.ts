/**
 * Webhook Manager
 * Manages webhook configurations and triggers
 *
 * B2.2c, where the store lives:
 *   SQLite      its own better-sqlite3 file (<data>/webhooks/webhooks.db),
 *               created here as before (WEBHOOKS_SCHEMA_SQL).
 *   PostgreSQL  the main PostgreSQL database (tables webhooks,
 *               inbound_webhooks, webhook_deliveries from migrations-pg r008,
 *               translated from scripts/pg/runtime/r008_webhooks.sql =
 *               WEBHOOKS_SCHEMA_SQL), so one backup covers them.
 * One copy of the SQL as SQL steps; the runner is sqliteStepsOn(file) or
 * pgSteps. Every method is async. Timestamps are ISO text on both drivers.
 *
 * The webhooks for an event are read from the table (not from an
 * in-process index), so every process on one PostgreSQL database sees the
 * same hooks. An update reads and writes the row in one transaction under a
 * row lock.
 */

import { dataPathOr } from '../config/data-root.js';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { dbDriver } from '../db/pg/config.js';
import { requirePgTable } from '../encryption/row-store.js';
import { all, dialect, one, pgSteps, run, sqliteStepsOn, type SqlParam, type Step, type StepRunner } from '../repositories/sql-steps.js';
import { forUpdate } from '../db/pg/dialect.js';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import {
  type WebhookConfig,
  type WebhookEventType,
  type WebhookStatus,
  type WebhookFilter,
  type InboundWebhook,
  type InboundHandler,
  type WebhookStats,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_WEBHOOK_TIMEOUT,
} from './types.js';
import { generateSecureId } from '../encryption/crypto-utils.js';

/** The webhook tables (SQLite file DDL; r008 on PostgreSQL, test/pg-runtime-ddl.test.mjs). */
export const WEBHOOKS_SCHEMA_SQL = `
      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        url TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'POST',
        events TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        auth TEXT,
        headers TEXT,
        retry TEXT NOT NULL,
        secret TEXT,
        filters TEXT,
        transform TEXT,
        timeout INTEGER DEFAULT 30000,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        owner_id TEXT,
        tags TEXT,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS inbound_webhooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        path TEXT NOT NULL UNIQUE,
        secret TEXT NOT NULL,
        allowed_ips TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        handler TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_triggered TEXT,
        trigger_count INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id TEXT PRIMARY KEY,
        webhook_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_id TEXT NOT NULL,
        url TEXT NOT NULL,
        method TEXT NOT NULL,
        request_headers TEXT,
        request_body TEXT,
        response_status INTEGER,
        response_headers TEXT,
        response_body TEXT,
        status TEXT NOT NULL,
        attempt INTEGER NOT NULL,
        duration INTEGER,
        error TEXT,
        timestamp TEXT NOT NULL,
        next_retry TEXT,
        FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhooks(status);
      CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks(events);
      CREATE INDEX IF NOT EXISTS idx_deliveries_webhook ON webhook_deliveries(webhook_id);
      CREATE INDEX IF NOT EXISTS idx_deliveries_status ON webhook_deliveries(status);
      CREATE INDEX IF NOT EXISTS idx_deliveries_timestamp ON webhook_deliveries(timestamp);
      CREATE INDEX IF NOT EXISTS idx_inbound_path ON inbound_webhooks(path);
    `;

export class WebhookManager {
  private db: Database.Database | null = null;
  private runner: StepRunner | null = null;

  /**
   * Initialize the webhook manager
   */
  async initialize(dbPath: string = dataPathOr('./.data/webhooks/webhooks.db', 'webhooks', 'webhooks.db')): Promise<void> {
    if (dbDriver() === 'postgres') {
      // The tables come from the PostgreSQL migrations (no runtime DDL there).
      await requirePgTable('webhooks', 'migrations-pg r008');
      this.runner = pgSteps;
      console.log('[WebhookManager] Initialized in the main PostgreSQL database');
      return;
    }

    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(WEBHOOKS_SCHEMA_SQL);
    this.runner = sqliteStepsOn(this.db);

    console.log('[WebhookManager] Initialized');
  }

  /** The runner of the store (the delivery service shares it). */
  getRunner(): StepRunner {
    if (!this.runner) throw new Error('Webhook manager not initialized');
    return this.runner;
  }

  // ============ Outbound Webhooks ============

  /**
   * Create a new webhook
   */
  async create(input: {
    name: string;
    url: string;
    events: WebhookEventType[];
    description?: string;
    method?: 'POST' | 'PUT' | 'PATCH';
    auth?: WebhookConfig['auth'];
    headers?: Record<string, string>;
    retry?: Partial<WebhookConfig['retry']>;
    secret?: string;
    filters?: WebhookFilter[];
    transform?: string;
    timeout?: number;
    ownerId?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<WebhookConfig> {
    const id = `wh_${uuidv4()}`;
    const now = new Date();
    const secret = input.secret || generateSecureId('whsec');

    const webhook: WebhookConfig = {
      id,
      name: input.name,
      description: input.description,
      url: input.url,
      method: input.method || 'POST',
      events: input.events,
      status: 'active',
      auth: input.auth,
      headers: input.headers,
      retry: { ...DEFAULT_RETRY_CONFIG, ...input.retry },
      secret,
      filters: input.filters,
      transform: input.transform,
      timeout: input.timeout || DEFAULT_WEBHOOK_TIMEOUT,
      createdAt: now,
      updatedAt: now,
      ownerId: input.ownerId,
      tags: input.tags,
      metadata: input.metadata,
    };

    await this.getRunner().read(run(`
      INSERT INTO webhooks (
        id, name, description, url, method, events, status,
        auth, headers, retry, secret, filters, transform, timeout,
        created_at, updated_at, owner_id, tags, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      webhook.id,
      webhook.name,
      webhook.description || null,
      webhook.url,
      webhook.method,
      JSON.stringify(webhook.events),
      webhook.status,
      webhook.auth ? JSON.stringify(webhook.auth) : null,
      webhook.headers ? JSON.stringify(webhook.headers) : null,
      JSON.stringify(webhook.retry),
      webhook.secret ?? null,
      webhook.filters ? JSON.stringify(webhook.filters) : null,
      webhook.transform || null,
      webhook.timeout,
      webhook.createdAt.toISOString(),
      webhook.updatedAt.toISOString(),
      webhook.ownerId || null,
      webhook.tags ? JSON.stringify(webhook.tags) : null,
      webhook.metadata ? JSON.stringify(webhook.metadata) : null
    ));

    return webhook;
  }

  /**
   * Get webhook by ID
   */
  async getById(id: string): Promise<WebhookConfig | null> {
    const row = await this.getRunner().read(one<any>('SELECT * FROM webhooks WHERE id = ?', id));
    return row ? this.rowToWebhook(row) : null;
  }

  /**
   * List all webhooks
   */
  async list(filters?: {
    status?: WebhookStatus;
    event?: WebhookEventType;
    ownerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<WebhookConfig[]> {
    let sql = 'SELECT * FROM webhooks WHERE 1=1';
    const params: SqlParam[] = [];

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.event) {
      sql += ' AND events LIKE ?';
      params.push(`%"${filters.event}"%`);
    }

    if (filters?.ownerId) {
      sql += ' AND owner_id = ?';
      params.push(filters.ownerId);
    }

    sql += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    const rows = await this.getRunner().read(all<any>(sql, ...params));
    return rows.map(this.rowToWebhook);
  }

  /**
   * Update a webhook
   */
  async update(id: string, input: Partial<Omit<WebhookConfig, 'id' | 'createdAt'>>): Promise<WebhookConfig | null> {
    const updates: string[] = ['updated_at = ?'];
    const params: SqlParam[] = [new Date().toISOString()];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      params.push(input.description ?? null);
    }
    if (input.url !== undefined) {
      updates.push('url = ?');
      params.push(input.url);
    }
    if (input.method !== undefined) {
      updates.push('method = ?');
      params.push(input.method);
    }
    if (input.events !== undefined) {
      updates.push('events = ?');
      params.push(JSON.stringify(input.events));
    }
    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
    }
    if (input.auth !== undefined) {
      updates.push('auth = ?');
      params.push(input.auth ? JSON.stringify(input.auth) : null);
    }
    if (input.headers !== undefined) {
      updates.push('headers = ?');
      params.push(input.headers ? JSON.stringify(input.headers) : null);
    }
    if (input.retry !== undefined) {
      updates.push('retry = ?');
      params.push(JSON.stringify(input.retry));
    }
    if (input.filters !== undefined) {
      updates.push('filters = ?');
      params.push(input.filters ? JSON.stringify(input.filters) : null);
    }
    if (input.transform !== undefined) {
      updates.push('transform = ?');
      params.push(input.transform ?? null);
    }
    if (input.timeout !== undefined) {
      updates.push('timeout = ?');
      params.push(input.timeout);
    }
    if (input.tags !== undefined) {
      updates.push('tags = ?');
      params.push(input.tags ? JSON.stringify(input.tags) : null);
    }

    params.push(id);
    const self = this;
    // One transaction: the row is locked, updated and read back.
    return this.getRunner().tx(function* (): Step<WebhookConfig | null> {
      const d = yield* dialect();
      const existing = yield* one<any>(`SELECT id FROM webhooks WHERE id = ?${forUpdate(d)}`, id);
      if (!existing) return null;
      yield* run(`UPDATE webhooks SET ${updates.join(', ')} WHERE id = ?`, ...params);
      const row = yield* one<any>('SELECT * FROM webhooks WHERE id = ?', id);
      return row ? self.rowToWebhook(row) : null;
    });
  }

  /**
   * Delete a webhook
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.getRunner().read(run('DELETE FROM webhooks WHERE id = ?', id));
    return result.changes > 0;
  }

  /**
   * Get webhooks for an event
   */
  async getWebhooksForEvent(eventType: WebhookEventType): Promise<WebhookConfig[]> {
    const rows = await this.getRunner().read(all<any>("SELECT * FROM webhooks WHERE status = 'active' ORDER BY created_at, id"));
    return rows
      .map(this.rowToWebhook)
      .filter((w) => Array.isArray(w.events) && w.events.includes(eventType));
  }

  /**
   * Check if data matches filters
   */
  matchesFilters(data: Record<string, unknown>, filters?: WebhookFilter[]): boolean {
    if (!filters || filters.length === 0) return true;

    for (const filter of filters) {
      const value = this.getNestedValue(data, filter.field);

      switch (filter.operator) {
        case 'eq':
          if (value !== filter.value) return false;
          break;
        case 'ne':
          if (value === filter.value) return false;
          break;
        case 'gt':
          if (typeof value !== 'number' || value <= (filter.value as number)) return false;
          break;
        case 'lt':
          if (typeof value !== 'number' || value >= (filter.value as number)) return false;
          break;
        case 'contains':
          if (typeof value !== 'string' || !value.includes(filter.value as string)) return false;
          break;
        case 'regex':
          if (typeof value !== 'string' || !new RegExp(filter.value as string).test(value)) return false;
          break;
      }
    }

    return true;
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: any, key) => current?.[key], obj);
  }

  // ============ Inbound Webhooks ============

  /**
   * Create inbound webhook
   */
  async createInbound(input: {
    name: string;
    description?: string;
    path?: string;
    allowedIps?: string[];
    handler: InboundHandler;
  }): Promise<InboundWebhook> {
    const id = `iwh_${uuidv4()}`;
    const path = input.path || `/webhook/${id}`;
    const secret = generateSecureId('iwhsec');
    const now = new Date();

    const webhook: InboundWebhook = {
      id,
      name: input.name,
      description: input.description,
      path,
      secret,
      allowedIps: input.allowedIps,
      status: 'active',
      handler: input.handler,
      createdAt: now,
      triggerCount: 0,
    };

    await this.getRunner().read(run(`
      INSERT INTO inbound_webhooks (
        id, name, description, path, secret, allowed_ips,
        status, handler, created_at, trigger_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      webhook.id,
      webhook.name,
      webhook.description || null,
      webhook.path,
      webhook.secret,
      webhook.allowedIps ? JSON.stringify(webhook.allowedIps) : null,
      webhook.status,
      JSON.stringify(webhook.handler),
      webhook.createdAt.toISOString(),
      webhook.triggerCount
    ));

    return webhook;
  }

  /**
   * Get inbound webhook by path
   */
  async getInboundByPath(path: string): Promise<InboundWebhook | null> {
    const row = await this.getRunner().read(one<any>('SELECT * FROM inbound_webhooks WHERE path = ?', path));
    return row ? this.rowToInboundWebhook(row) : null;
  }

  /**
   * Get inbound webhook by ID
   */
  async getInboundById(id: string): Promise<InboundWebhook | null> {
    const row = await this.getRunner().read(one<any>('SELECT * FROM inbound_webhooks WHERE id = ?', id));
    return row ? this.rowToInboundWebhook(row) : null;
  }

  /**
   * List inbound webhooks
   */
  async listInbound(): Promise<InboundWebhook[]> {
    const rows = await this.getRunner().read(all<any>('SELECT * FROM inbound_webhooks ORDER BY created_at DESC'));
    return rows.map(this.rowToInboundWebhook);
  }

  /**
   * Update inbound webhook trigger count
   */
  async recordInboundTrigger(id: string): Promise<void> {
    // One statement: concurrent triggers never lose a count.
    await this.getRunner().read(run(`
      UPDATE inbound_webhooks
      SET last_triggered = ?, trigger_count = trigger_count + 1
      WHERE id = ?
    `, new Date().toISOString(), id));
  }

  /**
   * Delete inbound webhook
   */
  async deleteInbound(id: string): Promise<boolean> {
    const result = await this.getRunner().read(run('DELETE FROM inbound_webhooks WHERE id = ?', id));
    return result.changes > 0;
  }

  // ============ Statistics ============

  /**
   * Get webhook statistics
   */
  async getStats(): Promise<WebhookStats> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return this.getRunner().read((function* (): Step<WebhookStats> {
      const totalRow = yield* one<any>('SELECT COUNT(*) as count FROM webhooks');
      const activeRow = yield* one<any>("SELECT COUNT(*) as count FROM webhooks WHERE status = 'active'");
      const deliveries24hRow = yield* one<any>('SELECT COUNT(*) as count FROM webhook_deliveries WHERE timestamp >= ?', oneDayAgo);
      const successful24hRow = yield* one<any>("SELECT COUNT(*) as count FROM webhook_deliveries WHERE timestamp >= ? AND status = 'success'", oneDayAgo);
      const failed24hRow = yield* one<any>("SELECT COUNT(*) as count FROM webhook_deliveries WHERE timestamp >= ? AND status = 'failed'", oneDayAgo);
      const avgTimeRow = yield* one<any>('SELECT AVG(duration) as avg FROM webhook_deliveries WHERE timestamp >= ? AND duration IS NOT NULL', oneDayAgo);
      const pendingRow = yield* one<any>("SELECT COUNT(*) as count FROM webhook_deliveries WHERE status IN ('pending', 'retrying')");
      return {
        totalWebhooks: totalRow.count,
        activeWebhooks: activeRow.count,
        deliveries24h: deliveries24hRow.count,
        successful24h: successful24hRow.count,
        failed24h: failed24hRow.count,
        // PostgreSQL AVG is numeric (read as text): a number on both drivers.
        avgResponseTime: Number(avgTimeRow.avg) || 0,
        pendingRetries: pendingRow.count,
      };
    })());
  }

  // ============ Helpers ============

  private rowToWebhook(row: any): WebhookConfig {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      url: row.url,
      method: row.method,
      events: JSON.parse(row.events),
      status: row.status,
      auth: row.auth ? JSON.parse(row.auth) : undefined,
      headers: row.headers ? JSON.parse(row.headers) : undefined,
      retry: JSON.parse(row.retry),
      secret: row.secret,
      filters: row.filters ? JSON.parse(row.filters) : undefined,
      transform: row.transform || undefined,
      timeout: row.timeout,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      ownerId: row.owner_id || undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  private rowToInboundWebhook(row: any): InboundWebhook {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      path: row.path,
      secret: row.secret,
      allowedIps: row.allowed_ips ? JSON.parse(row.allowed_ips) : undefined,
      status: row.status,
      handler: JSON.parse(row.handler),
      createdAt: new Date(row.created_at),
      lastTriggered: row.last_triggered ? new Date(row.last_triggered) : undefined,
      triggerCount: row.trigger_count,
    };
  }

  /**
   * Close database
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.runner = null;
  }
}

// Singleton
let webhookManager: WebhookManager | null = null;

export function getWebhookManager(): WebhookManager {
  if (!webhookManager) {
    webhookManager = new WebhookManager();
  }
  return webhookManager;
}
