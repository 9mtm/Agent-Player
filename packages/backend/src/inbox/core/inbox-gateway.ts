/**
 * Inbox Gateway - Main entry point for inbox system
 *
 * Receives messages from any source, assesses risk,
 * and either auto-executes or requests approval
 */

import type {
  InboxMessage,
  InboxReceipt,
  ApprovalDecision
} from '../types.js';
import { MessageStore } from './message-store.js';
import { RiskAnalyzer } from './risk-analyzer.js';
import { AutoExecutor } from './auto-executor.js';
import { ApprovalEngine } from '../approval/approval-engine.js';

export class InboxGateway {
  constructor(
    private messageStore: MessageStore,
    private riskAnalyzer: RiskAnalyzer,
    private autoExecutor: AutoExecutor,
    private approvalEngine: ApprovalEngine
  ) {}

  /**
   * Main entry point - receive message from any source
   */
  async receive(message: Partial<InboxMessage>): Promise<InboxReceipt> {
    // 1. Validate message
    if (!message.userId || !message.message) {
      throw new Error('Missing required fields: userId and message');
    }

    // 2. Store message in database
    const stored = await this.messageStore.save({
      ...message,
      status: 'pending',
      receivedAt: new Date()
    });

    try {
      // 3. Assess risk level
      const risk = await this.riskAnalyzer.assess(stored);

      // Update with risk level
      await this.messageStore.update(stored.id, {
        riskLevel: risk.level
      });

      // 4. Auto-execute if low risk
      if (risk.level === 'low') {
        const result = await this.autoExecutor.execute(stored);

        return {
          status: 'completed',
          messageId: stored.id,
          autoExecuted: true,
          riskLevel: risk.level,
          result: result.output
        };
      }

      // 5. Check approval rules for medium/high risk
      const rule = await this.approvalEngine.checkRules(stored, risk);

      if (rule?.autoApprove) {
        // Rule exists - auto-approve based on rule
        const result = await this.autoExecutor.execute(stored);

        return {
          status: 'completed',
          messageId: stored.id,
          autoExecuted: true,
          approvedByRule: rule.id,
          riskLevel: risk.level,
          result: result.output
        };
      }

      // 6. Request human approval
      await this.messageStore.update(stored.id, {
        status: 'needs_approval',
        approvalNeeded: true,
        approvalStatus: 'pending'
      });

      await this.approvalEngine.requestApproval(stored, risk);

      return {
        status: 'pending_approval',
        messageId: stored.id,
        riskLevel: risk.level
      };

    } catch (error: any) {
      // Handle errors
      await this.messageStore.update(stored.id, {
        status: 'failed',
        error: error.message
      });

      return {
        status: 'failed',
        messageId: stored.id,
        error: error.message
      };
    }
  }

  /**
   * Process approval decision from user
   */
  async processApproval(
    messageId: string,
    decision: ApprovalDecision,
    userId: string
  ): Promise<InboxReceipt> {
    const message = await this.messageStore.getById(messageId);

    // Verify ownership
    if (message.userId !== userId) {
      throw new Error('Unauthorized: Cannot approve message from another user');
    }

    if (decision.decision === 'approved') {
      // Update approval status
      await this.messageStore.update(messageId, {
        approvalStatus: 'approved',
        approvedBy: userId,
        approvedAt: new Date()
      });

      // Execute the task
      const result = await this.autoExecutor.execute(message);

      // Learn from this decision
      await this.approvalEngine.recordDecision(message, 'approved', userId);

      return {
        status: 'completed',
        messageId: messageId,
        autoExecuted: false, // Was manually approved
        result: result.output
      };

    } else {
      // Denied
      await this.messageStore.update(messageId, {
        status: 'failed',
        approvalStatus: 'denied',
        error: decision.reason || 'Denied by user'
      });

      // Learn from this decision
      await this.approvalEngine.recordDecision(message, 'denied', userId);

      return {
        status: 'failed',
        messageId: messageId,
        error: 'Denied by user'
      };
    }
  }

  /**
   * Get pending approvals for user
   */
  async getPendingApprovals(userId: string): Promise<InboxMessage[]> {
    return await this.messageStore.listByUser(userId, {
      status: 'needs_approval',
      limit: 50
    });
  }

  /**
   * Get inbox statistics
   */
  async getStats(userId: string) {
    return await this.messageStore.getStats(userId);
  }
}
