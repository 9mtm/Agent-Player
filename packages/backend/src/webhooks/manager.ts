/**
 * Webhook Manager
 * Manages webhook configurations and triggers
 */

import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
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

export class WebhookManager {
  private db: Database.Database | null = null;
  private eventHandlers: Map<WebhookEventType, Set<string>> = new Map();

  /**
   * Initialize the webhook manager
   */
  async initialize(dbPath: string = './.data/webhooks/webhooks.db'): Promise<void> {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');

    this.createTables();
    this.buildEventIndex();

    console.log('[WebhookManager] Initialized');
  }

  /**
   * Create database tables
   */
  private createTables(): void {
    this.db!.exec(`
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
    `);
  }

  /**
   * Build event index for fast lookup
   */
  private buildEventIndex(): void {
    this.eventHandlers.clear();

    const rows = this.db!.prepare(
      "SELECT id, events FROM webhooks WHERE status = 'active'"
    ).all() as any[];

    for (const row of rows) {
      const events: WebhookEventType[] = JSON.parse(row.events);
      for (const event of events) {
        if (!this.eventHandlers.has(event)) {
          this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(row.id);
      }
    }
  }

  // ============ Outbound Webhooks ============

  /**
   * Create a new webhook
   */
  create(input: {
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
  }): WebhookConfig {
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

    this.db!.prepare(`
      INSERT INTO webhooks (
        id, name, description, url, method, events, status,
        auth, headers, retry, secret, filters, transform, timeout,
        created_at, updated_at, owner_id, tags, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
      webhook.secret,
      webhook.filters ? JSON.stringify(webhook.filters) : null,
      webhook.transform || null,
      webhook.timeout,
      webhook.createdAt.toISOString(),
      webhook.updatedAt.toISOString(),
      webhook.ownerId || null,
      webhook.tags ? JSON.stringify(webhook.tags) : null,
      webhook.metadata ? JSON.stringify(webhook.metadata) : null
    );

    // Update event index
    for (const event of webhook.events) {
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, new Set());
      }
      this.eventHandlers.get(event)!.add(id);
    }

    return webhook;
  }

  /**
   * Get webhook by ID
   */
  getById(id: string): WebhookConfig | null {
    const row = this.db!.prepare('SELECT * FROM webhooks WHERE id = ?').get(id) as any;
    return row ? this.rowToWebhook(row) : null;
  }

  /**
   * List all webhooks
   */
  list(filters?: {
    status?: WebhookStatus;
    event?: WebhookEventType;
    ownerId?: string;
    limit?: number;
    offset?: number;
  }): WebhookConfig[] {
    let sql = 'SELECT * FROM webhooks WHERE 1=1';
    const params: unknown[] = [];

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

    const rows = this.db!.prepare(sql).all(...params) as any[];
    return rows.map(this.rowToWebhook);
  }

  /**
   * Update a webhook
   */
  update(id: string, input: Partial<Omit<WebhookConfig, 'id' | 'createdAt'>>): WebhookConfig | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const updates: string[] = ['updated_at = ?'];
    const params: unknown[] = [new Date().toISOString()];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      params.push(input.description);
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
      params.push(input.transform);
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
    this.db!.prepare(`UPDATE webhooks SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Rebuild event index
    this.buildEventIndex();

    return this.getById(id);
  }

  /**
   * Delete a webhook
   */
  delete(id: string): boolean {
    const result = this.db!.prepare('DELETE FROM webhooks WHERE id = ?').run(id);
    if (result.changes > 0) {
      this.buildEventIndex();
      return true;
    }
    return false;
  }

  /**
   * Get webhooks for an event
   */
  getWebhooksForEvent(eventType: WebhookEventType): WebhookConfig[] {
    const webhookIds = this.eventHandlers.get(eventType);
    if (!webhookIds || webhookIds.size === 0) return [];

    return Array.from(webhookIds)
      .map((id) => this.getById(id))
      .filter((w): w is WebhookConfig => w !== null && w.status === 'active');
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
  createInbound(input: {
    name: string;
    description?: string;
    path?: string;
    allowedIps?: string[];
    handler: InboundHandler;
  }): InboundWebhook {
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

    this.db!.prepare(`
      INSERT INTO inbound_webhooks (
        id, name, description, path, secret, allowed_ips,
        status, handler, created_at, trigger_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
    );

    return webhook;
  }

  /**
   * Get inbound webhook by path
   */
  getInboundByPath(path: string): InboundWebhook | null {
    const row = this.db!.prepare('SELECT * FROM inbound_webhooks WHERE path = ?').get(path) as any;
    return row ? this.rowToInboundWebhook(row) : null;
  }

  /**
   * Get inbound webhook by ID
   */
  getInboundById(id: string): InboundWebhook | null {
    const row = this.db!.prepare('SELECT * FROM inbound_webhooks WHERE id = ?').get(id) as any;
    return row ? this.rowToInboundWebhook(row) : null;
  }

  /**
   * List inbound webhooks
   */
  listInbound(): InboundWebhook[] {
    const rows = this.db!.prepare('SELECT * FROM inbound_webhooks ORDER BY created_at DESC').all() as any[];
    return rows.map(this.rowToInboundWebhook);
  }

  /**
   * Update inbound webhook trigger count
   */
  recordInboundTrigger(id: string): void {
    this.db!.prepare(`
      UPDATE inbound_webhooks
      SET last_triggered = ?, trigger_count = trigger_count + 1
      WHERE id = ?
    `).run(new Date().toISOString(), id);
  }

  /**
   * Delete inbound webhook
   */
  deleteInbound(id: string): boolean {
    const result = this.db!.prepare('DELETE FROM inbound_webhooks WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // ============ Statistics ============

  /**
   * Get webhook statistics
   */
  getStats(): WebhookStats {
    const totalRow = this.db!.prepare('SELECT COUNT(*) as count FROM webhooks').get() as any;
    const activeRow = this.db!.prepare("SELECT COUNT(*) as count FROM webhooks WHERE status = 'active'").get() as any;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const deliveries24hRow = this.db!.prepare(
      'SELECT COUNT(*) as count FROM webhook_deliveries WHERE timestamp >= ?'
    ).get(oneDayAgo) as any;

    const successful24hRow = this.db!.prepare(
      "SELECT COUNT(*) as count FROM webhook_deliveries WHERE timestamp >= ? AND status = 'success'"
    ).get(oneDayAgo) as any;

    const failed24hRow = this.db!.prepare(
      "SELECT COUNT(*) as count FROM webhook_deliveries WHERE timestamp >= ? AND status = 'failed'"
    ).get(oneDayAgo) as any;

    const avgTimeRow = this.db!.prepare(
      'SELECT AVG(duration) as avg FROM webhook_deliveries WHERE timestamp >= ? AND duration IS NOT NULL'
    ).get(oneDayAgo) as any;

    const pendingRow = this.db!.prepare(
      "SELECT COUNT(*) as count FROM webhook_deliveries WHERE status IN ('pending', 'retrying')"
    ).get() as any;

    return {
      totalWebhooks: totalRow.count,
      activeWebhooks: activeRow.count,
      deliveries24h: deliveries24hRow.count,
      successful24h: successful24hRow.count,
      failed24h: failed24hRow.count,
      avgResponseTime: avgTimeRow.avg || 0,
      pendingRetries: pendingRow.count,
    };
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
