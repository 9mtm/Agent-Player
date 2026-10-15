/**
 * Message Store - Database layer for inbox messages
 *
 * CRUD operations for inbox_messages table, on the process driver
 * (B2.2d-17: it used the SQLite file on PostgreSQL too). Times are written as
 * ISO strings: SQLite keeps them as text (compared as ISO text), PostgreSQL
 * columns are timestamptz (the parameter is cast).
 */

import crypto from 'crypto';
import { num, q, type SqlParam } from '../../repositories/sql-steps.js';
import { isoUtc } from '../../api/timestamps.js';
import type {
  InboxMessage,
  InboxMessageRow,
  MessageFilter,
  MessageStatus,
  RiskLevel
} from '../types.js';

/**
 * A stored time as a Date. PostgreSQL returns timestamptz as UTC text without
 * a zone and SQLite's CURRENT_TIMESTAMP has none either; `new Date(text)`
 * would read those as local time, isoUtc() reads them as UTC.
 */
function toDate(value: unknown): Date | undefined {
  const iso = isoUtc(value);
  return iso ? new Date(iso) : undefined;
}

/** A bound ISO time compared with a time column (text on SQLite, timestamptz on PostgreSQL). */
function isoParam(): string {
  return q.dialect === 'postgres' ? '(?)::timestamptz' : '?';
}

export class MessageStore {

  /**
   * Save a new inbox message
   */
  async save(message: Partial<InboxMessage>): Promise<InboxMessage> {
    const id = message.id || crypto.randomUUID();

    await q.run(`
      INSERT INTO inbox_messages (
        id, user_id, source_type, source_id,
        message, metadata, status, risk_level,
        auto_executed, approval_needed, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${isoParam()})
    `,
      id,
      message.userId as string,
      message.sourceType as string,
      message.sourceId || null,
      message.message as string,
      JSON.stringify(message.metadata || {}),
      message.status || 'pending',
      message.riskLevel || null,
      message.autoExecuted ? 1 : 0,
      message.approvalNeeded ? 1 : 0,
      message.receivedAt?.toISOString() || new Date().toISOString()
    );

    return this.getById(id);
  }

  /**
   * Get message by ID
   */
  async getById(id: string): Promise<InboxMessage> {
    const row = await q.one<InboxMessageRow>('SELECT * FROM inbox_messages WHERE id = ?', id);

    if (!row) {
      throw new Error(`Inbox message not found: ${id}`);
    }

    return this.mapRowToMessage(row);
  }

  /**
   * Update message fields
   */
  async update(id: string, updates: Partial<InboxMessage>): Promise<void> {
    const allowedFields = [
      'status', 'risk_level', 'auto_executed', 'approval_needed',
      'approval_status', 'approved_by', 'approved_at',
      'result', 'error', 'processed_at', 'completed_at'
    ];

    const fields: string[] = [];
    const values: SqlParam[] = [];

    for (const [key, value] of Object.entries(updates)) {
      // Convert camelCase to snake_case
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();

      if (allowedFields.includes(dbField)) {
        const isTime = value instanceof Date;
        fields.push(`${dbField} = ${isTime ? isoParam() : '?'}`);

        // Handle different types
        if (value instanceof Date) {
          values.push(value.toISOString());
        } else if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else if (typeof value === 'object' && value !== null) {
          values.push(JSON.stringify(value));
        } else {
          values.push((value ?? null) as SqlParam);
        }
      }
    }

    if (fields.length === 0) {
      return; // Nothing to update
    }

    const query = `UPDATE inbox_messages SET ${fields.join(', ')} WHERE id = ?`;
    await q.run(query, ...values, id);
  }

  /**
   * List messages by user with filters
   */
  async listByUser(userId: string, filters?: MessageFilter): Promise<InboxMessage[]> {
    let query = 'SELECT * FROM inbox_messages WHERE user_id = ?';
    const params: SqlParam[] = [userId];

    // Apply filters
    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.sourceType) {
      query += ' AND source_type = ?';
      params.push(filters.sourceType);
    }

    if (filters?.riskLevel) {
      query += ' AND risk_level = ?';
      params.push(filters.riskLevel);
    }

    if (filters?.dateFrom) {
      query += ` AND received_at >= ${isoParam()}`;
      params.push(filters.dateFrom.toISOString());
    }

    if (filters?.dateTo) {
      query += ` AND received_at <= ${isoParam()}`;
      params.push(filters.dateTo.toISOString());
    }

    // Order by received_at descending (newest first)
    query += ' ORDER BY received_at DESC';

    // Pagination
    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const rows = await q.all<InboxMessageRow>(query, ...params);
    return rows.map(r => this.mapRowToMessage(r));
  }

  /**
   * Count messages by status
   */
  async countByStatus(userId: string): Promise<Record<MessageStatus, number>> {
    const result = await q.all<{ status: MessageStatus; count: number }>(`
      SELECT
        status,
        COUNT(*) as count
      FROM inbox_messages
      WHERE user_id = ?
      GROUP BY status
    `, userId);

    const counts: Record<string, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      needs_approval: 0
    };

    for (const row of result) {
      counts[row.status] = num<number>(row.count);
    }

    return counts as Record<MessageStatus, number>;
  }

  /**
   * Get statistics
   */
  async getStats(userId: string): Promise<{
    total: number;
    needsApproval: number;
    processing: number;
    completed: number;
    failed: number;
    autoExecuted: number;
    byRiskLevel: Record<RiskLevel, number>;
  }> {
    const stats = await q.one<any>(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'needs_approval' THEN 1 ELSE 0 END) as needs_approval,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN auto_executed = 1 THEN 1 ELSE 0 END) as auto_executed,
        SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END) as low_risk,
        SUM(CASE WHEN risk_level = 'medium' THEN 1 ELSE 0 END) as medium_risk,
        SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END) as high_risk
      FROM inbox_messages
      WHERE user_id = ?
    `, userId);
    const n = (v: unknown): number => num<number | null>(v) || 0;

    return {
      total: n(stats?.total),
      needsApproval: n(stats?.needs_approval),
      processing: n(stats?.processing),
      completed: n(stats?.completed),
      failed: n(stats?.failed),
      autoExecuted: n(stats?.auto_executed),
      byRiskLevel: {
        low: n(stats?.low_risk),
        medium: n(stats?.medium_risk),
        high: n(stats?.high_risk)
      }
    };
  }

  /**
   * Delete message
   */
  async delete(id: string): Promise<void> {
    await q.run('DELETE FROM inbox_messages WHERE id = ?', id);
  }

  /**
   * Delete old completed messages (cleanup)
   */
  async deleteOldCompleted(userId: string, olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await q.run(`
      DELETE FROM inbox_messages
      WHERE user_id = ?
        AND status = 'completed'
        AND completed_at < ${isoParam()}
    `, userId, cutoffDate.toISOString());

    return result.changes;
  }

  // ===================
  // Private helpers
  // ===================

  private mapRowToMessage(row: InboxMessageRow): InboxMessage {
    return {
      id: row.id,
      userId: row.user_id,
      sourceType: row.source_type as any,
      sourceId: row.source_id || undefined,
      message: row.message,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      status: row.status as MessageStatus,
      riskLevel: row.risk_level as RiskLevel | undefined,
      autoExecuted: Boolean(row.auto_executed),
      approvalNeeded: Boolean(row.approval_needed),
      approvalStatus: row.approval_status as any,
      approvedBy: row.approved_by || undefined,
      approvedAt: toDate(row.approved_at),
      result: row.result ? JSON.parse(row.result) : undefined,
      error: row.error || undefined,
      receivedAt: toDate(row.received_at) ?? new Date(NaN),
      processedAt: toDate(row.processed_at),
      completedAt: toDate(row.completed_at)
    };
  }
}
