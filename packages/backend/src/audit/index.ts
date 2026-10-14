/**
 * Security Audit System
 * Track and monitor all sensitive operations
 */

export * from './types.js';
export * from './audit-logger.js';
export * from './audit-storage.js';

import { getAuditLogger, AuditLogger } from './audit-logger.js';
import { getAuditStorage, AuditStorage } from './audit-storage.js';
import type { AuditConfig, AuditEvent, AuditStats } from './types.js';

let initialized = false;

/**
 * Initialize the audit system
 */
export async function initializeAudit(config?: Partial<AuditConfig>): Promise<{
  logger: AuditLogger;
  storage: AuditStorage;
}> {
  const logger = getAuditLogger(config);
  const storage = getAuditStorage(undefined, config);

  // Initialize storage
  await storage.initialize();

  // Connect logger to storage (B2.2c: a promise on PostgreSQL; the logger
  // awaits handlers and logs their errors)
  logger.onEvent((event) => storage.store(event));

  // Start logger
  logger.start();

  initialized = true;
  console.log('[Audit] System initialized');

  return { logger, storage };
}

/**
 * Get audit system status
 */
export async function getAuditStatus(): Promise<{
  initialized: boolean;
  stats: AuditStats | null;
  config: AuditConfig;
}> {
  const logger = getAuditLogger();

  return {
    initialized,
    stats: initialized ? await getAuditStorage().getStats() : null,
    config: logger.getConfig(),
  };
}

/**
 * Shutdown audit system
 */
export async function shutdownAudit(): Promise<void> {
  const logger = getAuditLogger();
  const storage = getAuditStorage();

  // Flush remaining events
  const events = logger.flush();
  if (events.length > 0) {
    await storage.storeBatch(events);
  }

  // Stop logger and close storage
  logger.stop();
  storage.close();

  initialized = false;
  console.log('[Audit] System shutdown');
}
