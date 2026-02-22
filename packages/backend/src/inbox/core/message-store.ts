/**
 * Message Store - Database layer for inbox messages
 *
 * CRUD operations for inbox_messages table
 */

import Database from 'better-sqlite3';
import crypto from 'crypto';
import type {
  InboxMessage,
  InboxMessageRow,
  MessageFilter,
  MessageStatus,
  RiskLevel
} from '../types.js';

export class MessageStore {
  constructor(private db: Database.Database) {}

  /**
   * Save a new inbox message
   */
  async save(message: Partial<InboxMessage>): Promise<InboxMessage> {
    const id = message.id || crypto.randomUUID();

    const stmt = this.db.prepare(`
      INSERT INTO inbox_messages (
        id, user_id, source_type, source_id,
        message, metadata, status, risk_level,
        auto_executed, approval_needed, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      message.userId,
      message.sourceType,
      message.sourceId || null,
      message.message,
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
    const row = this.db.prepare('SELECT * FROM inbox_messages WHERE id = ?').get(id) as InboxMessageRow;

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
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      // Convert camelCase to snake_case
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();

      if (allowedFields.includes(dbField)) {
        fields.push(`${dbField} = ?`);

        // Handle different types
        if (value instanceof Date) {
          values.push(value.toISOString());
        } else if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else if (typeof value === 'object' && value !== null) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    if (fields.length === 0) {
      return; // Nothing to update
    }

    const query = `UPDATE inbox_messages SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(query).run(...values, id);
  }

  /**
   * List messages by user with filters
   */
  async listByUser(userId: string, filters?: MessageFilter): Promise<InboxMessage[]> {
    let query = 'SELECT * FROM inbox_messages WHERE user_id = ?';
    const params: any[] = [userId];

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
      query += ' AND received_at >= ?';
      params.push(filters.dateFrom.toISOString());
    }

    if (filters?.dateTo) {
      query += ' AND received_at <= ?';
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

    const rows = this.db.prepare(query).all(...params) as InboxMessageRow[];
    return rows.map(r => this.mapRowToMessage(r));
  }

  /**
   * Count messages by status
   */
  async countByStatus(userId: string): Promise<Record<MessageStatus, number>> {
    const result = this.db.prepare(`
      SELECT
        status,
        COUNT(*) as count
      FROM inbox_messages
      WHERE user_id = ?
      GROUP BY status
    `).all(userId) as Array<{ status: MessageStatus; count: number }>;

    const counts: Record<string, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      needs_approval: 0
    };

    for (const row of result) {
      counts[row.status] = row.count;
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
    const stats = this.db.prepare(`
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
    `).get(userId) as any;

    return {
      total: stats.total || 0,
      needsApproval: stats.needs_approval || 0,
      processing: stats.processing || 0,
      completed: stats.completed || 0,
      failed: stats.failed || 0,
      autoExecuted: stats.auto_executed || 0,
      byRiskLevel: {
        low: stats.low_risk || 0,
        medium: stats.medium_risk || 0,
        high: stats.high_risk || 0
      }
    };
  }

  /**
   * Delete message
   */
  async delete(id: string): Promise<void> {
    this.db.prepare('DELETE FROM inbox_messages WHERE id = ?').run(id);
  }

  /**
   * Delete old completed messages (cleanup)
   */
  async deleteOldCompleted(userId: string, olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = this.db.prepare(`
      DELETE FROM inbox_messages
      WHERE user_id = ?
        AND status = 'completed'
        AND completed_at < ?
    `).run(userId, cutoffDate.toISOString());

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
      approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
      result: row.result ? JSON.parse(row.result) : undefined,
      error: row.error || undefined,
      receivedAt: new Date(row.received_at),
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined
    };
  }
}
