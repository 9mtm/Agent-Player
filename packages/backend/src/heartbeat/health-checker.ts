/**
 * Health Checker
 * Performs various health checks on components
 */

import { createConnection, type Socket } from 'net';
import type { HealthCheckConfig, HealthStatus } from './types.js';

export interface HealthCheckResult {
  status: HealthStatus;
  responseTime: number;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Perform a health check based on configuration
 */
export async function performHealthCheck(
  config: HealthCheckConfig
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    switch (config.type) {
      case 'http':
        return await httpHealthCheck(config, startTime);
      case 'tcp':
        return await tcpHealthCheck(config, startTime);
      case 'database':
        return await databaseHealthCheck(config, startTime);
      default:
        return {
          status: 'unknown',
          responseTime: Date.now() - startTime,
          error: `Unknown health check type: ${config.type}`,
        };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * HTTP health check
 */
async function httpHealthCheck(
  config: HealthCheckConfig,
  startTime: number
): Promise<HealthCheckResult> {
  if (!config.endpoint) {
    return {
      status: 'unhealthy',
      responseTime: 0,
      error: 'No endpoint configured for HTTP health check',
    };
  }

  const timeout = config.timeout || 5000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(config.endpoint, {
      method: config.method || 'GET',
      headers: config.headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    const expectedStatus = config.expectedStatus || 200;

    if (response.status === expectedStatus) {
      return {
        status: 'healthy',
        responseTime,
        details: {
          statusCode: response.status,
          statusText: response.statusText,
        },
      };
    } else if (response.status >= 500) {
      return {
        status: 'unhealthy',
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: { statusCode: response.status },
      };
    } else {
      return {
        status: 'degraded',
        responseTime,
        error: `Unexpected status: ${response.status}`,
        details: { statusCode: response.status },
      };
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (error.name === 'AbortError') {
      return {
        status: 'unhealthy',
        responseTime,
        error: `Request timeout after ${timeout}ms`,
      };
    }

    return {
      status: 'unhealthy',
      responseTime,
      error: error.message || 'HTTP request failed',
    };
  }
}

/**
 * TCP health check
 */
async function tcpHealthCheck(
  config: HealthCheckConfig,
  startTime: number
): Promise<HealthCheckResult> {
  if (!config.tcpAddress) {
    return {
      status: 'unhealthy',
      responseTime: 0,
      error: 'No TCP address configured',
    };
  }

  const [host, portStr] = config.tcpAddress.split(':');
  const port = parseInt(portStr);
  const timeout = config.timeout || 5000;

  return new Promise((resolve) => {
    const socket: Socket = createConnection({ host, port });
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
      }
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      resolve({
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: `Connection timeout after ${timeout}ms`,
      });
    }, timeout);

    socket.on('connect', () => {
      clearTimeout(timeoutId);
      cleanup();
      resolve({
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: { host, port },
      });
    });

    socket.on('error', (error) => {
      clearTimeout(timeoutId);
      cleanup();
      resolve({
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
      });
    });
  });
}

/**
 * Database health check (SQLite ping)
 */
async function databaseHealthCheck(
  config: HealthCheckConfig,
  startTime: number
): Promise<HealthCheckResult> {
  try {
    // For SQLite, we just check if we can import and use the module
    const Database = (await import('better-sqlite3')).default;

    // Try to open a memory database as a quick check
    const db = new Database(':memory:');
    db.exec('SELECT 1');
    db.close();

    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      details: { type: 'sqlite', check: 'memory' },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * System resource check
 */
export function getSystemResources(): {
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  uptime: number;
} {
  const memUsage = process.memoryUsage();

  return {
    cpuUsage: 0, // Would need external library for accurate CPU usage
    memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    memoryTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
    uptime: process.uptime(),
  };
}

/**
 * Check if external service is reachable
 */
export async function checkExternalService(
  url: string,
  timeout: number = 5000
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  return httpHealthCheck(
    {
      type: 'http',
      endpoint: url,
      method: 'HEAD',
      timeout,
    },
    startTime
  );
}

/**
 * Built-in health checks
 */
export const builtInChecks = {
  /**
   * Check API server health
   */
  async apiServer(port: number = 3001): Promise<HealthCheckResult> {
    return checkExternalService(`http://localhost:${port}/health`);
  },

  /**
   * Check database health
   */
  async database(): Promise<HealthCheckResult> {
    return databaseHealthCheck({ type: 'database' }, Date.now());
  },

  /**
   * Check memory usage
   */
  memoryUsage(maxMB: number = 512): HealthCheckResult {
    const resources = getSystemResources();
    const startTime = Date.now();

    if (resources.memoryUsage > maxMB * 1.5) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: `Memory usage critical: ${resources.memoryUsage}MB / ${maxMB}MB limit`,
        details: resources,
      };
    }

    if (resources.memoryUsage > maxMB) {
      return {
        status: 'degraded',
        responseTime: Date.now() - startTime,
        error: `Memory usage high: ${resources.memoryUsage}MB / ${maxMB}MB limit`,
        details: resources,
      };
    }

    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      details: resources,
    };
  },
};
