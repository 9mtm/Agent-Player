/**
 * Webhook Delivery System
 * Handles sending webhooks with retry logic
 *
 * B2.2c: delivery rows are written through the webhook manager's runner
 * (its SQLite file, or the main PostgreSQL database). The writes are
 * outside any open transaction of the caller (a rolled-back caller never
 * removes the record of a request that was sent).
 */

import { v4 as uuidv4 } from 'uuid';
import { createHmac } from 'crypto';
import { outsidePgTransaction } from '../db/pg/pool.js';
import { all, one, run, type SqlParam, type StepRunner } from '../repositories/sql-steps.js';
import {
  type WebhookConfig,
  type WebhookPayload,
  type WebhookDelivery,
  type WebhookEventType,
} from './types.js';
import { getWebhookManager } from './manager.js';

export class WebhookDeliveryService {
  private runner: StepRunner | null = null;
  private retryQueue: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private processing: boolean = false;

  /**
   * Set the store's runner (the webhook manager's)
   */
  setRunner(runner: StepRunner | null): void {
    this.runner = runner;
  }

  /** Write outside the caller's transaction (PostgreSQL); SQLite runs it as before. */
  private write(sql: string, ...params: SqlParam[]): Promise<unknown> {
    const runner = this.runner;
    if (!runner) return Promise.resolve();
    return outsidePgTransaction(() => runner.read(run(sql, ...params)));
  }

  /**
   * Trigger webhooks for an event
   */
  async trigger(
    eventType: WebhookEventType,
    data: Record<string, unknown>,
    source: { type: string; id: string; name?: string }
  ): Promise<{ triggered: number; webhookIds: string[] }> {
    const manager = getWebhookManager();
    const webhooks = await manager.getWebhooksForEvent(eventType);

    const triggered: string[] = [];

    for (const webhook of webhooks) {
      // Check filters
      if (!manager.matchesFilters(data, webhook.filters)) {
        continue;
      }

      // Create payload
      const payload = this.createPayload(eventType, data, source, webhook);

      // Queue delivery
      await this.queueDelivery(webhook, payload);
      triggered.push(webhook.id);
    }

    return { triggered: triggered.length, webhookIds: triggered };
  }

  /**
   * Create webhook payload
   */
  private createPayload(
    eventType: WebhookEventType,
    data: Record<string, unknown>,
    source: { type: string; id: string; name?: string },
    webhook: WebhookConfig
  ): WebhookPayload {
    return {
      id: uuidv4(),
      type: eventType,
      timestamp: new Date().toISOString(),
      data,
      source,
      webhook: {
        id: webhook.id,
        name: webhook.name,
        attempt: 1,
      },
    };
  }

  /**
   * Queue a delivery
   */
  private async queueDelivery(
    webhook: WebhookConfig,
    payload: WebhookPayload
  ): Promise<WebhookDelivery> {
    const delivery: WebhookDelivery = {
      id: `del_${uuidv4()}`,
      webhookId: webhook.id,
      eventType: payload.type,
      eventId: payload.id,
      url: webhook.url,
      method: webhook.method,
      requestHeaders: this.buildHeaders(webhook, payload),
      requestBody: JSON.stringify(payload),
      status: 'pending',
      attempt: 1,
      timestamp: new Date(),
    };

    // Store delivery
    await this.storeDelivery(delivery);

    // Execute delivery
    void this.executeDelivery(delivery, webhook);

    return delivery;
  }

  /**
   * Build request headers
   */
  private buildHeaders(
    webhook: WebhookConfig,
    payload: WebhookPayload
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AgentPlayer-Webhook/1.0',
      'X-Webhook-ID': webhook.id,
      'X-Event-ID': payload.id,
      'X-Event-Type': payload.type,
      'X-Timestamp': payload.timestamp,
    };

    // Add custom headers
    if (webhook.headers) {
      Object.assign(headers, webhook.headers);
    }

    // Add authentication
    if (webhook.auth) {
      switch (webhook.auth.type) {
        case 'bearer':
          if (webhook.auth.token) {
            headers['Authorization'] = `Bearer ${webhook.auth.token}`;
          }
          break;
        case 'basic':
          if (webhook.auth.username && webhook.auth.password) {
            const credentials = Buffer.from(
              `${webhook.auth.username}:${webhook.auth.password}`
            ).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
          }
          break;
        case 'api_key':
          if (webhook.auth.apiKeyName && webhook.auth.apiKeyValue) {
            headers[webhook.auth.apiKeyName] = webhook.auth.apiKeyValue;
          }
          break;
        case 'custom':
          if (webhook.auth.customHeader && webhook.auth.customValue) {
            headers[webhook.auth.customHeader] = webhook.auth.customValue;
          }
          break;
      }
    }

    // Add HMAC signature
    if (webhook.secret) {
      const signature = this.signPayload(JSON.stringify(payload), webhook.secret);
      headers['X-Webhook-Signature'] = signature;
      headers['X-Webhook-Signature-256'] = `sha256=${signature}`;
    }

    return headers;
  }

  /**
   * Sign payload with HMAC
   */
  private signPayload(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Execute delivery
   */
  private async executeDelivery(
    delivery: WebhookDelivery,
    webhook: WebhookConfig
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeout);

      const response = await fetch(delivery.url, {
        method: delivery.method,
        headers: delivery.requestHeaders,
        body: delivery.requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const responseBody = await response.text().catch(() => '');

      // Update delivery record
      await this.updateDelivery(delivery.id, {
        responseStatus: response.status,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseBody: responseBody.slice(0, 10000), // Truncate
        duration,
        status: response.ok ? 'success' : 'failed',
        error: response.ok ? undefined : `HTTP ${response.status}`,
      });

      // Handle retry if needed
      if (!response.ok && webhook.retry.enabled) {
        const shouldRetry = this.shouldRetry(response.status, webhook, delivery.attempt);
        if (shouldRetry) {
          await this.scheduleRetry(delivery, webhook);
        }
      }

      console.log(
        `[Webhook] Delivery ${delivery.id}: ${response.ok ? 'success' : 'failed'} (${response.status}) in ${duration}ms`
      );
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error.name === 'AbortError' ? 'Timeout' : error.message;

      try {
        await this.updateDelivery(delivery.id, {
          duration,
          status: 'failed',
          error: errorMessage,
        });

        // Schedule retry
        if (webhook.retry.enabled && delivery.attempt < webhook.retry.maxAttempts) {
          await this.scheduleRetry(delivery, webhook);
        }
      } catch (storeError: any) {
        console.error(`[Webhook] Delivery ${delivery.id}: could not record the failure:`, storeError?.code ?? 'error');
      }

      console.error(`[Webhook] Delivery ${delivery.id} failed:`, errorMessage);
    }
  }

  /**
   * Check if should retry
   */
  private shouldRetry(
    status: number,
    webhook: WebhookConfig,
    attempt: number
  ): boolean {
    if (attempt >= webhook.retry.maxAttempts) return false;

    const retryStatuses = webhook.retry.retryOnStatus || [408, 429, 500, 502, 503, 504];
    return retryStatuses.includes(status);
  }

  /**
   * Schedule retry
   */
  private async scheduleRetry(delivery: WebhookDelivery, webhook: WebhookConfig): Promise<void> {
    const nextAttempt = delivery.attempt + 1;
    const delay = Math.min(
      webhook.retry.initialDelay * Math.pow(webhook.retry.backoffMultiplier, delivery.attempt - 1),
      webhook.retry.maxDelay
    );

    const nextRetry = new Date(Date.now() + delay);

    await this.updateDelivery(delivery.id, {
      status: 'retrying',
      nextRetry,
    });

    const timeoutId = setTimeout(async () => {
      this.retryQueue.delete(delivery.id);

      // Get fresh webhook config
      const manager = getWebhookManager();
      const freshWebhook = await manager.getById(webhook.id).catch(() => null);
      if (!freshWebhook || freshWebhook.status !== 'active') return;

      // Create new delivery for retry
      const retryDelivery: WebhookDelivery = {
        ...delivery,
        id: `del_${uuidv4()}`,
        attempt: nextAttempt,
        status: 'pending',
        timestamp: new Date(),
        responseStatus: undefined,
        responseHeaders: undefined,
        responseBody: undefined,
        duration: undefined,
        error: undefined,
        nextRetry: undefined,
      };

      // Update payload with attempt number
      const payload = JSON.parse(delivery.requestBody);
      payload.webhook.attempt = nextAttempt;
      retryDelivery.requestBody = JSON.stringify(payload);
      retryDelivery.requestHeaders = this.buildHeaders(freshWebhook, payload);

      try {
        await this.storeDelivery(retryDelivery);
      } catch (storeError: any) {
        console.error(`[Webhook] Retry ${retryDelivery.id}: could not store the delivery:`, storeError?.code ?? 'error');
        return;
      }
      void this.executeDelivery(retryDelivery, freshWebhook);
    }, delay);

    this.retryQueue.set(delivery.id, timeoutId);

    console.log(`[Webhook] Scheduled retry for ${delivery.id} in ${delay}ms (attempt ${nextAttempt})`);
  }

  /**
   * Store delivery record
   */
  private async storeDelivery(delivery: WebhookDelivery): Promise<void> {
    await this.write(`
      INSERT INTO webhook_deliveries (
        id, webhook_id, event_type, event_id, url, method,
        request_headers, request_body, status, attempt, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      delivery.id,
      delivery.webhookId,
      delivery.eventType,
      delivery.eventId,
      delivery.url,
      delivery.method,
      JSON.stringify(delivery.requestHeaders),
      delivery.requestBody,
      delivery.status,
      delivery.attempt,
      delivery.timestamp.toISOString()
    );
  }

  /**
   * Update delivery record
   */
  private async updateDelivery(
    id: string,
    updates: Partial<WebhookDelivery>
  ): Promise<void> {
    const sets: string[] = [];
    const params: SqlParam[] = [];

    if (updates.responseStatus !== undefined) {
      sets.push('response_status = ?');
      params.push(updates.responseStatus);
    }
    if (updates.responseHeaders !== undefined) {
      sets.push('response_headers = ?');
      params.push(JSON.stringify(updates.responseHeaders));
    }
    if (updates.responseBody !== undefined) {
      sets.push('response_body = ?');
      params.push(updates.responseBody);
    }
    if (updates.status !== undefined) {
      sets.push('status = ?');
      params.push(updates.status);
    }
    if (updates.duration !== undefined) {
      sets.push('duration = ?');
      params.push(updates.duration);
    }
    if (updates.error !== undefined) {
      sets.push('error = ?');
      params.push(updates.error);
    }
    if (updates.nextRetry !== undefined) {
      sets.push('next_retry = ?');
      params.push(updates.nextRetry.toISOString());
    }

    if (sets.length === 0) return;

    params.push(id);
    await this.write(`UPDATE webhook_deliveries SET ${sets.join(', ')} WHERE id = ?`, ...params);
  }

  /**
   * Get deliveries for a webhook
   */
  async getDeliveries(webhookId: string, limit: number = 50): Promise<WebhookDelivery[]> {
    if (!this.runner) return [];

    const rows = await this.runner.read(all<any>(`
      SELECT * FROM webhook_deliveries
      WHERE webhook_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `, webhookId, limit));

    return rows.map(this.rowToDelivery);
  }

  /**
   * Get delivery by ID
   */
  async getDeliveryById(id: string): Promise<WebhookDelivery | null> {
    if (!this.runner) return null;

    const row = await this.runner.read(one<any>('SELECT * FROM webhook_deliveries WHERE id = ?', id));
    return row ? this.rowToDelivery(row) : null;
  }

  /**
   * Convert row to delivery
   */
  private rowToDelivery(row: any): WebhookDelivery {
    return {
      id: row.id,
      webhookId: row.webhook_id,
      eventType: row.event_type,
      eventId: row.event_id,
      url: row.url,
      method: row.method,
      requestHeaders: JSON.parse(row.request_headers),
      requestBody: row.request_body,
      responseStatus: row.response_status || undefined,
      responseHeaders: row.response_headers ? JSON.parse(row.response_headers) : undefined,
      responseBody: row.response_body || undefined,
      status: row.status,
      attempt: row.attempt,
      duration: row.duration || undefined,
      error: row.error || undefined,
      timestamp: new Date(row.timestamp),
      nextRetry: row.next_retry ? new Date(row.next_retry) : undefined,
    };
  }

  /**
   * Cancel pending retries
   */
  async cancelRetries(webhookId?: string): Promise<number> {
    let cancelled = 0;

    for (const [deliveryId, timeoutId] of this.retryQueue.entries()) {
      if (!webhookId) {
        clearTimeout(timeoutId);
        this.retryQueue.delete(deliveryId);
        cancelled++;
      } else {
        const delivery = await this.getDeliveryById(deliveryId);
        if (delivery && delivery.webhookId === webhookId) {
          clearTimeout(timeoutId);
          this.retryQueue.delete(deliveryId);
          cancelled++;
        }
      }
    }

    return cancelled;
  }

  /**
   * Cleanup old deliveries
   */
  async cleanup(retentionDays: number = 30): Promise<number> {
    if (!this.runner) return 0;

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const result = await this.runner.read(run('DELETE FROM webhook_deliveries WHERE timestamp < ?', cutoff));
    return result.changes;
  }
}

// Singleton
let deliveryService: WebhookDeliveryService | null = null;

export function getDeliveryService(): WebhookDeliveryService {
  if (!deliveryService) {
    deliveryService = new WebhookDeliveryService();
  }
  return deliveryService;
}
