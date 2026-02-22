/**
 * Approval Engine - Manage approval rules and decisions
 *
 * Checks approval rules, requests approvals, and learns from decisions
 */

import Database from 'better-sqlite3';
import type {
  InboxMessage,
  RiskAssessment,
  ApprovalRule,
  ApprovalRuleRow
} from '../types.js';

export class ApprovalEngine {
  constructor(private db: Database.Database) {}

  /**
   * Check if message matches any approval rules
   */
  async checkRules(
    message: InboxMessage,
    risk: RiskAssessment
  ): Promise<ApprovalRule | null> {
    // Get enabled rules for this user, ordered by priority (highest first)
    const rows = this.db.prepare(`
      SELECT * FROM approval_rules
      WHERE user_id = ? AND enabled = 1
      ORDER BY priority DESC, confidence_score DESC
    `).all(message.userId) as ApprovalRuleRow[];

    // Check each rule
    for (const row of rows) {
      if (await this.ruleMatches(row, message, risk)) {
        // Update times_applied counter
        this.db.prepare(`
          UPDATE approval_rules
          SET times_applied = times_applied + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(row.id);

        return this.mapRowToRule(row);
      }
    }

    return null;
  }

  /**
   * Request approval from user
   */
  async requestApproval(message: InboxMessage, risk: RiskAssessment): Promise<void> {
    // Mark message as needs approval
    // (Already done in inbox-gateway, but double-check)

    // TODO: Send notification via WebSocket, WhatsApp, etc.
    console.log(`[Approval] Requesting approval for message ${message.id}`);
    console.log(`  Risk: ${risk.level}`);
    console.log(`  Message: ${message.message}`);
  }

  /**
   * Record user's approval decision for learning
   */
  async recordDecision(
    message: InboxMessage,
    decision: 'approved' | 'denied',
    userId: string
  ): Promise<void> {
    // Update message
    // (Already done in inbox-gateway)

    // TODO: Learn from this decision
    // - If user always approves similar messages → suggest auto-approval rule
    // - Track patterns
    console.log(`[Learning] User ${decision} message ${message.id}`);
  }

  /**
   * Create approval rule
   */
  async createRule(rule: Partial<ApprovalRule>): Promise<ApprovalRule> {
    const id = crypto.randomUUID();

    this.db.prepare(`
      INSERT INTO approval_rules (
        id, user_id, name, description,
        source_type, action_pattern, risk_level,
        auto_approve, auto_deny, priority, enabled,
        confidence_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      rule.userId,
      rule.name,
      rule.description || null,
      rule.sourceType || null,
      rule.actionPattern || null,
      rule.riskLevel || null,
      rule.autoApprove ? 1 : 0,
      rule.autoDeny ? 1 : 0,
      rule.priority || 5,
      rule.enabled !== false ? 1 : 0,
      rule.confidenceScore || 0.0
    );

    return this.getRule(id);
  }

  /**
   * Get rule by ID
   */
  async getRule(id: string): Promise<ApprovalRule> {
    const row = this.db.prepare('SELECT * FROM approval_rules WHERE id = ?')
      .get(id) as ApprovalRuleRow;

    if (!row) {
      throw new Error(`Approval rule not found: ${id}`);
    }

    return this.mapRowToRule(row);
  }

  /**
   * List rules for user
   */
  async listRules(userId: string): Promise<ApprovalRule[]> {
    const rows = this.db.prepare(`
      SELECT * FROM approval_rules
      WHERE user_id = ?
      ORDER BY priority DESC, created_at DESC
    `).all(userId) as ApprovalRuleRow[];

    return rows.map(r => this.mapRowToRule(r));
  }

  /**
   * Delete rule
   */
  async deleteRule(id: string): Promise<void> {
    this.db.prepare('DELETE FROM approval_rules WHERE id = ?').run(id);
  }

  // ===================
  // Private helpers
  // ===================

  private async ruleMatches(
    rule: ApprovalRuleRow,
    message: InboxMessage,
    risk: RiskAssessment
  ): Promise<boolean> {
    // Check source type
    if (rule.source_type && rule.source_type !== message.sourceType) {
      return false;
    }

    // Check risk level
    if (rule.risk_level && rule.risk_level !== risk.level) {
      return false;
    }

    // Check action pattern (regex)
    if (rule.action_pattern) {
      try {
        const regex = new RegExp(rule.action_pattern, 'i');
        if (!regex.test(message.message)) {
          return false;
        }
      } catch (error) {
        // Invalid regex - skip this rule
        console.error(`Invalid regex in rule ${rule.id}: ${rule.action_pattern}`);
        return false;
      }
    }

    // All checks passed
    return true;
  }

  private mapRowToRule(row: ApprovalRuleRow): ApprovalRule {
    return {
      id: row.id,
      userId: row.user_id,
      sourceType: row.source_type as any,
      actionPattern: row.action_pattern || undefined,
      riskLevel: row.risk_level as any,
      autoApprove: Boolean(row.auto_approve),
      autoDeny: Boolean(row.auto_deny),
      priority: row.priority,
      name: row.name,
      description: row.description || undefined,
      enabled: Boolean(row.enabled),
      timesApplied: row.times_applied,
      confidenceScore: row.confidence_score,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
