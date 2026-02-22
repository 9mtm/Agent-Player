/**
 * Audit Logging Service
 * SECURITY: Comprehensive audit trail for security and compliance (L-02, L-08)
 */

import { getDatabase } from '../db/index.js';
import type { FastifyRequest } from 'fastify';

export type AuditEventType =
    // Authentication events
    | 'auth.login'
    | 'auth.login.failed'
    | 'auth.logout'
    | 'auth.register'
    | 'auth.password.change'
    | 'auth.token.refresh'
    | 'auth.account.locked'
    // Authorization events
    | 'authz.access.denied'
    | 'authz.permission.change'
    // Data access
    | 'data.read'
    | 'data.export'
    // Data modification
    | 'data.create'
    | 'data.update'
    | 'data.delete'
    | 'data.import'
    // System events
    | 'system.config.change'
    | 'system.backup.create'
    | 'system.backup.restore'
    | 'system.maintenance'
    // Security events
    | 'security.suspicious.activity'
    | 'security.rate.limit'
    | 'security.csrf.blocked'
    | 'security.sql.injection.attempt';

export type AuditCategory =
    | 'authentication'
    | 'authorization'
    | 'data_access'
    | 'data_modification'
    | 'system'
    | 'security';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLogEntry {
    event_type: AuditEventType;
    event_category: AuditCategory;
    severity?: AuditSeverity;
    user_id?: string;
    username?: string;
    ip_address?: string;
    user_agent?: string;
    request_method?: string;
    request_path?: string;
    resource_type?: string;
    resource_id?: string;
    action?: string;
    success: boolean;
    error_message?: string;
    metadata?: Record<string, any>;
}

/**
 * Log an audit event
 * SECURITY: Creates immutable audit trail (L-02, L-08)
 */
export function logAudit(entry: AuditLogEntry): void {
    try {
        const db = getDatabase();

        db.execute(
            `INSERT INTO audit_logs (
                event_type, event_category, severity,
                user_id, username,
                ip_address, user_agent, request_method, request_path,
                resource_type, resource_id, action,
                success, error_message, metadata,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            entry.event_type,
            entry.event_category,
            entry.severity || 'info',
            entry.user_id || null,
            entry.username || null,
            entry.ip_address || null,
            entry.user_agent || null,
            entry.request_method || null,
            entry.request_path || null,
            entry.resource_type || null,
            entry.resource_id || null,
            entry.action || null,
            entry.success ? 1 : 0,
            entry.error_message || null,
            entry.metadata ? JSON.stringify(entry.metadata) : null
        );
    } catch (error: any) {
        // SECURITY: Never fail the main operation due to audit logging
        // But log to console for monitoring
        console.error('[AuditLogger] Failed to log audit event:', error.message);
    }
}

/**
 * Log authentication event
 * SECURITY: Tracks all auth attempts (L-02)
 */
export function logAuthEvent(
    event_type: Extract<AuditEventType, `auth.${string}`>,
    request: FastifyRequest,
    userId?: string,
    username?: string,
    success: boolean = true,
    error?: string
): void {
    logAudit({
        event_type,
        event_category: 'authentication',
        severity: success ? 'info' : 'warning',
        user_id: userId,
        username,
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        request_method: request.method,
        request_path: request.url,
        action: event_type.split('.')[1], // 'login', 'logout', etc.
        success,
        error_message: error,
    });
}

/**
 * Log data modification event
 * SECURITY: Tracks all data changes (L-08)
 */
export function logDataEvent(
    action: 'create' | 'update' | 'delete',
    resource_type: string,
    resource_id: string,
    request: FastifyRequest,
    userId?: string,
    success: boolean = true,
    error?: string,
    metadata?: Record<string, any>
): void {
    logAudit({
        event_type: `data.${action}` as AuditEventType,
        event_category: 'data_modification',
        severity: success ? 'info' : 'error',
        user_id: userId,
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        request_method: request.method,
        request_path: request.url,
        resource_type,
        resource_id,
        action,
        success,
        error_message: error,
        metadata,
    });
}

/**
 * Log security event
 * SECURITY: Tracks security incidents (L-02, L-08)
 */
export function logSecurityEvent(
    event_type: Extract<AuditEventType, `security.${string}`>,
    request: FastifyRequest,
    severity: AuditSeverity = 'warning',
    details?: string,
    metadata?: Record<string, any>
): void {
    logAudit({
        event_type,
        event_category: 'security',
        severity,
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        request_method: request.method,
        request_path: request.url,
        success: false, // Security events are always "failures" from attacker perspective
        error_message: details,
        metadata,
    });
}

/**
 * Query audit logs
 * @param filters Optional filters
 * @param limit Max results (default 100, max 1000)
 * @returns Array of audit log entries
 */
export function queryAuditLogs(filters?: {
    user_id?: string;
    event_type?: string;
    event_category?: AuditCategory;
    severity?: AuditSeverity;
    start_date?: string;
    end_date?: string;
    limit?: number;
}): any[] {
    const db = getDatabase();

    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (filters?.user_id) {
        sql += ' AND user_id = ?';
        params.push(filters.user_id);
    }

    if (filters?.event_type) {
        sql += ' AND event_type = ?';
        params.push(filters.event_type);
    }

    if (filters?.event_category) {
        sql += ' AND event_category = ?';
        params.push(filters.event_category);
    }

    if (filters?.severity) {
        sql += ' AND severity = ?';
        params.push(filters.severity);
    }

    if (filters?.start_date) {
        sql += ' AND created_at >= ?';
        params.push(filters.start_date);
    }

    if (filters?.end_date) {
        sql += ' AND created_at <= ?';
        params.push(filters.end_date);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Math.min(filters?.limit || 100, 1000));

    return db.queryAll(sql, ...params);
}

/**
 * Cleanup old audit logs (run periodically)
 * Removes logs older than retention period (default 90 days)
 * SECURITY: Uses parameterized date calculation to prevent SQL injection (C-06)
 */
export function cleanupAuditLogs(retentionDays: number = 90): number {
    const db = getDatabase();

    // SECURITY: Validate retentionDays is a positive integer (C-06)
    const safeDays = Math.max(1, Math.floor(Math.abs(retentionDays)));

    // SECURITY: Use parameterized query with validated integer (C-06)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - safeDays);

    const result = db.execute(
        `DELETE FROM audit_logs WHERE created_at < ?`,
        cutoffDate.toISOString()
    );

    return result.changes || 0;
}
