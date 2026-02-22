/**
 * Heartbeat System
 * Monitor component health and system status
 */

export * from './types.js';
export * from './monitor.js';
export * from './health-checker.js';

import { getHeartbeatMonitor, HeartbeatMonitor } from './monitor.js';
import { builtInChecks, getSystemResources } from './health-checker.js';
import type { HeartbeatConfig, SystemHealth, ComponentRegistration } from './types.js';

let initialized = false;

/**
 * Initialize the heartbeat system
 */
export async function initializeHeartbeat(
  config?: Partial<HeartbeatConfig>
): Promise<HeartbeatMonitor> {
  const monitor = getHeartbeatMonitor(config);

  // Register built-in components
  registerBuiltInComponents(monitor);

  initialized = true;
  console.log('[Heartbeat] System initialized');

  return monitor;
}

/**
 * Register built-in system components
 */
function registerBuiltInComponents(monitor: HeartbeatMonitor): void {
  // API Server
  monitor.register({
    id: 'api-server',
    type: 'service',
    name: 'API Server',
    description: 'Main Fastify API server',
    interval: 30000,
    timeout: 10000,
    critical: true,
    healthCheck: {
      type: 'http',
      endpoint: `http://localhost:${process.env.PORT || 3001}/health`,
      expectedStatus: 200,
    },
    thresholds: {
      maxResponseTime: 1000,
    },
  });

  // Database
  monitor.register({
    id: 'database',
    type: 'database',
    name: 'SQLite Database',
    description: 'Main application database',
    interval: 60000,
    timeout: 5000,
    critical: true,
    healthCheck: {
      type: 'database',
    },
  });

  // Memory Monitor
  monitor.register({
    id: 'memory',
    type: 'service',
    name: 'Memory Usage',
    description: 'Process memory monitoring',
    interval: 30000,
    timeout: 5000,
    critical: false,
    thresholds: {
      maxMemoryUsage: 512,
    },
  });

  // Start initial heartbeats
  const resources = getSystemResources();

  monitor.recordHeartbeat('api-server', {
    status: 'healthy',
    responseTime: 0,
  });

  monitor.recordHeartbeat('database', {
    status: 'healthy',
    responseTime: 0,
  });

  monitor.recordHeartbeat('memory', {
    status: resources.memoryUsage > 512 ? 'degraded' : 'healthy',
    memoryUsage: resources.memoryUsage,
  });
}

/**
 * Get heartbeat system status
 */
export function getHeartbeatStatus(): {
  initialized: boolean;
  systemHealth: SystemHealth;
  componentCount: number;
} {
  const monitor = getHeartbeatMonitor();
  const health = monitor.getSystemHealth();

  return {
    initialized,
    systemHealth: health,
    componentCount: health.totalComponents,
  };
}

/**
 * Register a custom component
 */
export function registerComponent(registration: ComponentRegistration): void {
  const monitor = getHeartbeatMonitor();
  monitor.register(registration);
}

/**
 * Send heartbeat for a component
 */
export function sendHeartbeat(
  componentId: string,
  data: {
    status?: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    cpuUsage?: number;
    memoryUsage?: number;
    metrics?: Record<string, number>;
    error?: string;
  } = {}
): void {
  const monitor = getHeartbeatMonitor();
  monitor.recordHeartbeat(componentId, data);
}

/**
 * Shutdown heartbeat system
 */
export function shutdownHeartbeat(): void {
  const monitor = getHeartbeatMonitor();
  monitor.stop();
  initialized = false;
  console.log('[Heartbeat] System shutdown');
}
