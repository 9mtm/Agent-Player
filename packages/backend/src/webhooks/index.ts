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
  // Share the store's runner
  delivery.setRunner(manager.getRunner());

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
export async function getWebhooksStatus(): Promise<{
  initialized: boolean;
  stats: WebhookStats;
}> {
  const manager = getWebhookManager();

  return {
    initialized,
    stats: await manager.getStats(),
  };
}

/**
 * Shutdown webhooks system
 */
export function shutdownWebhooks(): void {
  const delivery = getDeliveryService();
  void delivery.cancelRetries();
  delivery.setRunner(null);

  const manager = getWebhookManager();
  manager.close();

  initialized = false;
  console.log('[Webhooks] System shutdown');
}
