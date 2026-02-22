/**
 * Webhooks System
 * Outbound and inbound webhook management
 */

export * from './types.js';
export * from './manager.js';
export * from './delivery.js';

import { getWebhookManager, WebhookManager } from './manager.js';
import { getDeliveryService, WebhookDeliveryService } from './delivery.js';
import type { WebhookEventType, WebhookStats } from './types.js';

let initialized = false;

/**
 * Initialize the webhooks system
 */
export async function initializeWebhooks(): Promise<{
  manager: WebhookManager;
  delivery: WebhookDeliveryService;
}> {
  const manager = getWebhookManager();
  await manager.initialize();

  const delivery = getDeliveryService();
  // Share database reference
  delivery.setDatabase((manager as any).db);

  initialized = true;
  console.log('[Webhooks] System initialized');

  return { manager, delivery };
}

/**
 * Trigger webhooks for an event
 */
export async function triggerWebhooks(
  eventType: WebhookEventType,
  data: Record<string, unknown>,
  source: { type: string; id: string; name?: string }
): Promise<{ triggered: number; webhookIds: string[] }> {
  const delivery = getDeliveryService();
  return delivery.trigger(eventType, data, source);
}

/**
 * Get webhooks status
 */
export function getWebhooksStatus(): {
  initialized: boolean;
  stats: WebhookStats;
} {
  const manager = getWebhookManager();

  return {
    initialized,
    stats: manager.getStats(),
  };
}

/**
 * Shutdown webhooks system
 */
export function shutdownWebhooks(): void {
  const delivery = getDeliveryService();
  delivery.cancelRetries();

  const manager = getWebhookManager();
  manager.close();

  initialized = false;
  console.log('[Webhooks] System shutdown');
}
