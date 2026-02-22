/**
 * Audit Logger Service
 * Core service for logging audit events
 */

import { v4 as uuidv4 } from 'uuid';
import {
  type AuditEvent,
  type AuditConfig,
  type AuditCategory,
  type AuditAction,
  type AuditSeverity,
  type AuditActor,
  type AuditTarget,
  type AuditRequestMeta,
  DEFAULT_AUDIT_CONFIG,
  SEVERITY_WEIGHTS,
} from './types.js';

type AuditEventHandler = (event: AuditEvent) => void | Promise<void>;

export class AuditLogger {
  private config: AuditConfig;
  private handlers: AuditEventHandler[] = [];
  private buffer: AuditEvent[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<AuditConfig> = {}) {
    this.config = { ...DEFAULT_AUDIT_CONFIG, ...config };
  }

  /**
   * Start the audit logger
   */
  start(): void {
    if (this.flushInterval) return;

    // Flush buffer every 5 seconds
    this.flushInterval = setInterval(() => this.flush(), 5000);

    this.log({
      category: 'system',
      action: 'startup',
      severity: 'low',
      actor: { type: 'system', id: 'audit-logger' },
      details: { message: 'Audit logger started' },
    });
  }

  /**
   * Stop the audit logger
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }

  /**
   * Register an event handler
   */
  onEvent(handler: AuditEventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index > -1) this.handlers.splice(index, 1);
    };
  }

  /**
   * Log an audit event
   */
  log(params: {
    category: AuditCategory;
    action: AuditAction;
    severity: AuditSeverity;
    actor: AuditActor;
    target?: AuditTarget;
    details?: Record<string, unknown>;
    result?: 'success' | 'failure' | 'blocked';
    error?: string;
    request?: AuditRequestMeta;
    sessionId?: string;
    correlationId?: string;
  }): AuditEvent {
    if (!this.config.enabled) {
      return this.createEvent(params);
    }

    // Check if category is enabled
    if (!this.config.categories.includes(params.category)) {
      return this.createEvent(params);
    }

    // Check minimum severity
    if (SEVERITY_WEIGHTS[params.severity] < SEVERITY_WEIGHTS[this.config.minSeverity]) {
      return this.createEvent(params);
    }

    const event = this.createEvent(params);

    // Sanitize sensitive data
    if (this.config.sanitize) {
      this.sanitizeEvent(event);
    }

    // Add to buffer
    this.buffer.push(event);

    // Log to console if enabled
    if (this.config.logToConsole) {
      this.logToConsole(event);
    }

    // Notify handlers
    this.notifyHandlers(event);

    // Immediate flush for critical events
    if (params.severity === 'critical') {
      this.flush();
    }

    return event;
  }

  /**
   * Log authentication event
   */
  logAuth(
    action: 'login' | 'logout' | 'login_failed' | 'token_refresh' | 'password_change',
    actor: AuditActor,
    result: 'success' | 'failure',
    details?: Record<string, unknown>
  ): AuditEvent {
    return this.log({
      category: 'auth',
      action,
      severity: action === 'login_failed' ? 'high' : 'medium',
      actor,
      result,
      details,
    });
  }

  /**
   * Log access event
   */
  logAccess(
    action: 'read' | 'write' | 'delete' | 'list' | 'export',
    actor: AuditActor,
    target: AuditTarget,
    result: 'success' | 'failure' | 'blocked',
    details?: Record<string, unknown>
  ): AuditEvent {
    const severity: AuditSeverity =
      action === 'delete' ? 'high' :
      action === 'write' ? 'medium' : 'low';

    return this.log({
      category: 'access',
      action,
      severity,
      actor,
      target,
      result,
      details,
    });
  }

  /**
   * Log execution event
   */
  logExecution(
    action: 'execute' | 'execute_blocked' | 'sandbox_create' | 'sandbox_destroy',
    actor: AuditActor,
    result: 'success' | 'failure' | 'blocked',
    details?: Record<string, unknown>
  ): AuditEvent {
    return this.log({
      category: 'execution',
      action,
      severity: action === 'execute_blocked' ? 'high' : 'medium',
      actor,
      result,
      details,
    });
  }

  /**
   * Log configuration change
   */
  logConfigChange(
    actor: AuditActor,
    target: AuditTarget,
    details: { before?: unknown; after?: unknown; field?: string }
  ): AuditEvent {
    return this.log({
      category: 'config',
      action: 'config_update',
      severity: 'high',
      actor,
      target,
      result: 'success',
      details,
    });
  }

  /**
   * Log agent action
   */
  logAgent(
    action: 'agent_start' | 'agent_stop' | 'agent_message' | 'skill_invoke',
    actor: AuditActor,
    target?: AuditTarget,
    details?: Record<string, unknown>
  ): AuditEvent {
    return this.log({
      category: 'agent',
      action,
      severity: 'low',
      actor,
      target,
      result: 'success',
      details,
    });
  }

  /**
   * Log error/warning
   */
  logError(
    severity: 'medium' | 'high' | 'critical',
    error: Error | string,
    details?: Record<string, unknown>
  ): AuditEvent {
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    return this.log({
      category: 'system',
      action: severity === 'medium' ? 'warning' : 'error',
      severity,
      actor: { type: 'system', id: 'error-handler' },
      result: 'failure',
      error: errorMessage,
      details: { ...details, stack },
    });
  }

  /**
   * Create event object
   */
  private createEvent(params: Partial<AuditEvent> & {
    category: AuditCategory;
    action: AuditAction;
    severity: AuditSeverity;
    actor: AuditActor;
  }): AuditEvent {
    return {
      id: uuidv4(),
      timestamp: new Date(),
      result: 'success',
      ...params,
    };
  }

  /**
   * Sanitize sensitive data in event
   */
  private sanitizeEvent(event: AuditEvent): void {
    if (!event.details) return;

    const sanitize = (obj: Record<string, unknown>, path: string[] = []): void => {
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        const isSecret = this.config.sensitiveFields.some(
          (field) => key.toLowerCase().includes(field.toLowerCase())
        );

        if (isSecret && typeof value === 'string') {
          obj[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitize(value as Record<string, unknown>, [...path, key]);
        }
      }
    };

    sanitize(event.details);

    if (event.request?.body) {
      sanitize(event.request.body);
    }
  }

  /**
   * Log to console
   */
  private logToConsole(event: AuditEvent): void {
    const severityColors: Record<AuditSeverity, string> = {
      low: '\x1b[90m',      // Gray
      medium: '\x1b[33m',   // Yellow
      high: '\x1b[31m',     // Red
      critical: '\x1b[35m', // Magenta
    };
    const reset = '\x1b[0m';
    const color = severityColors[event.severity];

    const timestamp = event.timestamp.toISOString().slice(11, 19);
    const prefix = `[${timestamp}] [AUDIT]`;
    const severity = event.severity.toUpperCase().padEnd(8);
    const category = event.category.padEnd(10);
    const action = event.action;
    const actor = `${event.actor.type}:${event.actor.id}`;

    console.log(
      `${prefix} ${color}${severity}${reset} ${category} ${action} by ${actor}` +
      (event.result !== 'success' ? ` [${event.result}]` : '')
    );
  }

  /**
   * Notify event handlers
   */
  private async notifyHandlers(event: AuditEvent): Promise<void> {
    for (const handler of this.handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('[Audit] Handler error:', error);
      }
    }
  }

  /**
   * Flush buffer
   */
  flush(): AuditEvent[] {
    const events = [...this.buffer];
    this.buffer = [];
    return events;
  }

  /**
   * Get configuration
   */
  getConfig(): AuditConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AuditConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
let auditLogger: AuditLogger | null = null;

export function getAuditLogger(config?: Partial<AuditConfig>): AuditLogger {
  if (!auditLogger) {
    auditLogger = new AuditLogger(config);
  }
  return auditLogger;
}

/**
 * Quick audit log function
 */
export function audit(
  category: AuditCategory,
  action: AuditAction,
  actor: AuditActor,
  options: {
    severity?: AuditSeverity;
    target?: AuditTarget;
    details?: Record<string, unknown>;
    result?: 'success' | 'failure' | 'blocked';
  } = {}
): AuditEvent {
  const logger = getAuditLogger();
  return logger.log({
    category,
    action,
    severity: options.severity || 'low',
    actor,
    target: options.target,
    details: options.details,
    result: options.result,
  });
}
