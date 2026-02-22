/**
 * Security Audit System Types
 * Track and monitor all sensitive operations
 */

/** Audit event severity levels */
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

/** Audit event categories */
export type AuditCategory =
  | 'auth'           // Authentication events
  | 'access'         // Resource access
  | 'data'           // Data operations
  | 'config'         // Configuration changes
  | 'execution'      // Command execution
  | 'network'        // Network operations
  | 'agent'          // Agent actions
  | 'system';        // System events

/** Audit event actions */
export type AuditAction =
  // Auth actions
  | 'login' | 'logout' | 'login_failed' | 'token_refresh' | 'password_change'
  // Access actions
  | 'read' | 'write' | 'delete' | 'list' | 'export'
  // Execution actions
  | 'execute' | 'execute_blocked' | 'sandbox_create' | 'sandbox_destroy'
  // Config actions
  | 'config_update' | 'settings_change' | 'permission_grant' | 'permission_revoke'
  // Agent actions
  | 'agent_start' | 'agent_stop' | 'agent_message' | 'skill_invoke'
  // System actions
  | 'startup' | 'shutdown' | 'error' | 'warning';

/** Audit event interface */
export interface AuditEvent {
  /** Unique event ID */
  id: string;
  /** Timestamp */
  timestamp: Date;
  /** Event category */
  category: AuditCategory;
  /** Specific action */
  action: AuditAction;
  /** Severity level */
  severity: AuditSeverity;
  /** Actor (user/agent/system) */
  actor: AuditActor;
  /** Target resource */
  target?: AuditTarget;
  /** Event details */
  details?: Record<string, unknown>;
  /** Result of the action */
  result: 'success' | 'failure' | 'blocked';
  /** Error message if failed */
  error?: string;
  /** Request metadata */
  request?: AuditRequestMeta;
  /** Session ID */
  sessionId?: string;
  /** Correlation ID for tracking related events */
  correlationId?: string;
}

/** Actor who performed the action */
export interface AuditActor {
  /** Actor type */
  type: 'user' | 'agent' | 'system' | 'api';
  /** Actor ID */
  id: string;
  /** Actor name/label */
  name?: string;
  /** IP address */
  ip?: string;
  /** User agent string */
  userAgent?: string;
}

/** Target of the action */
export interface AuditTarget {
  /** Target type */
  type: 'file' | 'database' | 'api' | 'config' | 'credential' | 'agent' | 'session';
  /** Target ID */
  id: string;
  /** Target name/path */
  name?: string;
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

/** Request metadata */
export interface AuditRequestMeta {
  /** HTTP method */
  method?: string;
  /** Request path */
  path?: string;
  /** Query parameters */
  query?: Record<string, string>;
  /** Request body (sanitized) */
  body?: Record<string, unknown>;
}

/** Audit query filters */
export interface AuditQuery {
  /** Start date */
  startDate?: Date;
  /** End date */
  endDate?: Date;
  /** Filter by category */
  category?: AuditCategory | AuditCategory[];
  /** Filter by action */
  action?: AuditAction | AuditAction[];
  /** Filter by severity */
  severity?: AuditSeverity | AuditSeverity[];
  /** Filter by actor ID */
  actorId?: string;
  /** Filter by result */
  result?: 'success' | 'failure' | 'blocked';
  /** Search in details */
  search?: string;
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Order by */
  orderBy?: 'timestamp' | 'severity';
  /** Order direction */
  orderDir?: 'asc' | 'desc';
}

/** Audit statistics */
export interface AuditStats {
  /** Total events */
  totalEvents: number;
  /** Events by category */
  byCategory: Record<AuditCategory, number>;
  /** Events by severity */
  bySeverity: Record<AuditSeverity, number>;
  /** Events by result */
  byResult: Record<string, number>;
  /** Recent critical events */
  recentCritical: number;
  /** Failed login attempts (last 24h) */
  failedLogins24h: number;
  /** Blocked executions (last 24h) */
  blockedExecutions24h: number;
}

/** Audit configuration */
export interface AuditConfig {
  /** Enable audit logging */
  enabled: boolean;
  /** Minimum severity to log */
  minSeverity: AuditSeverity;
  /** Categories to log */
  categories: AuditCategory[];
  /** Retention period in days */
  retentionDays: number;
  /** Max events to keep */
  maxEvents: number;
  /** Log to console */
  logToConsole: boolean;
  /** Log to file */
  logToFile: boolean;
  /** File path for logs */
  filePath?: string;
  /** Sanitize sensitive data */
  sanitize: boolean;
  /** Fields to sanitize */
  sensitiveFields: string[];
}

/** Default audit configuration */
export const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  enabled: true,
  minSeverity: 'low',
  categories: ['auth', 'access', 'data', 'config', 'execution', 'network', 'agent', 'system'],
  retentionDays: 90,
  maxEvents: 100000,
  logToConsole: process.env.NODE_ENV === 'development',
  logToFile: true,
  filePath: './.data/audit/audit.log',
  sanitize: true,
  sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'credential', 'key'],
};

/** Severity weights for sorting/filtering */
export const SEVERITY_WEIGHTS: Record<AuditSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};
