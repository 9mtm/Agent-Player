/**
 * Heartbeat System Types
 * Monitor agent health and system status
 */

/** Health status levels */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/** Component types that can be monitored */
export type ComponentType =
  | 'agent'
  | 'service'
  | 'database'
  | 'cache'
  | 'queue'
  | 'external'
  | 'channel'
  | 'plugin';

/** Heartbeat entry */
export interface Heartbeat {
  /** Unique ID */
  id: string;
  /** Component ID */
  componentId: string;
  /** Component type */
  componentType: ComponentType;
  /** Component name */
  componentName: string;
  /** Current status */
  status: HealthStatus;
  /** Timestamp of this heartbeat */
  timestamp: Date;
  /** Response time in ms */
  responseTime?: number;
  /** CPU usage percentage */
  cpuUsage?: number;
  /** Memory usage in MB */
  memoryUsage?: number;
  /** Additional metrics */
  metrics?: Record<string, number>;
  /** Error message if unhealthy */
  error?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/** Component registration */
export interface ComponentRegistration {
  /** Unique component ID */
  id: string;
  /** Component type */
  type: ComponentType;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Expected heartbeat interval in ms */
  interval: number;
  /** Timeout before marking unhealthy */
  timeout: number;
  /** Health check endpoint/function */
  healthCheck?: HealthCheckConfig;
  /** Tags for grouping */
  tags?: string[];
  /** Owner/maintainer */
  owner?: string;
  /** Dependencies (other component IDs) */
  dependencies?: string[];
  /** Is critical (affects overall health) */
  critical: boolean;
  /** Custom thresholds */
  thresholds?: HealthThresholds;
}

/** Health check configuration */
export interface HealthCheckConfig {
  /** Check type */
  type: 'http' | 'tcp' | 'function' | 'database' | 'custom';
  /** HTTP endpoint */
  endpoint?: string;
  /** HTTP method */
  method?: 'GET' | 'POST' | 'HEAD';
  /** Expected status code */
  expectedStatus?: number;
  /** TCP host:port */
  tcpAddress?: string;
  /** Custom check function name */
  functionName?: string;
  /** Check timeout */
  timeout?: number;
  /** Headers for HTTP check */
  headers?: Record<string, string>;
}

/** Health thresholds */
export interface HealthThresholds {
  /** Max response time (ms) for healthy */
  maxResponseTime?: number;
  /** Max CPU usage (%) for healthy */
  maxCpuUsage?: number;
  /** Max memory usage (MB) for healthy */
  maxMemoryUsage?: number;
  /** Max consecutive failures before unhealthy */
  maxFailures?: number;
  /** Custom metric thresholds */
  custom?: Record<string, { warning: number; critical: number }>;
}

/** Component state */
export interface ComponentState {
  /** Registration info */
  registration: ComponentRegistration;
  /** Current status */
  status: HealthStatus;
  /** Last heartbeat received */
  lastHeartbeat?: Heartbeat;
  /** Last successful heartbeat */
  lastSuccessful?: Date;
  /** Consecutive failures */
  consecutiveFailures: number;
  /** Uptime percentage (last 24h) */
  uptime24h: number;
  /** Average response time (last 1h) */
  avgResponseTime: number;
  /** Is currently checking */
  checking: boolean;
}

/** Alert configuration */
export interface AlertConfig {
  /** Enable alerts */
  enabled: boolean;
  /** Alert channels */
  channels: AlertChannel[];
  /** Cooldown between alerts (ms) */
  cooldown: number;
  /** Minimum severity to alert */
  minSeverity: 'warning' | 'critical';
}

/** Alert channel */
export interface AlertChannel {
  /** Channel type */
  type: 'webhook' | 'email' | 'slack' | 'telegram' | 'log';
  /** Channel configuration */
  config: Record<string, unknown>;
  /** Is enabled */
  enabled: boolean;
}

/** Alert event */
export interface Alert {
  /** Alert ID */
  id: string;
  /** Component that triggered */
  componentId: string;
  /** Component name */
  componentName: string;
  /** Alert severity */
  severity: 'warning' | 'critical';
  /** Alert message */
  message: string;
  /** Timestamp */
  timestamp: Date;
  /** Previous status */
  previousStatus: HealthStatus;
  /** New status */
  newStatus: HealthStatus;
  /** Was notified */
  notified: boolean;
  /** Notification channels used */
  notifiedChannels?: string[];
  /** Resolved at */
  resolvedAt?: Date;
}

/** System health summary */
export interface SystemHealth {
  /** Overall status */
  status: HealthStatus;
  /** Total components */
  totalComponents: number;
  /** Healthy components */
  healthyCount: number;
  /** Degraded components */
  degradedCount: number;
  /** Unhealthy components */
  unhealthyCount: number;
  /** Unknown components */
  unknownCount: number;
  /** Critical components down */
  criticalDown: string[];
  /** Last check time */
  lastCheck: Date;
  /** System uptime */
  uptime: number;
  /** Active alerts */
  activeAlerts: number;
}

/** Heartbeat configuration */
export interface HeartbeatConfig {
  /** Default check interval (ms) */
  defaultInterval: number;
  /** Default timeout (ms) */
  defaultTimeout: number;
  /** History retention (hours) */
  historyRetention: number;
  /** Max history entries per component */
  maxHistoryEntries: number;
  /** Enable automatic health checks */
  autoCheck: boolean;
  /** Alert configuration */
  alerts: AlertConfig;
}

/** Default configuration */
export const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  defaultInterval: 30000, // 30 seconds
  defaultTimeout: 10000,  // 10 seconds
  historyRetention: 24,   // 24 hours
  maxHistoryEntries: 1000,
  autoCheck: true,
  alerts: {
    enabled: true,
    channels: [],
    cooldown: 300000, // 5 minutes
    minSeverity: 'warning',
  },
};
