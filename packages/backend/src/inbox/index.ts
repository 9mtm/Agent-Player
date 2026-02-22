/**
 * Inbox System - Main exports
 *
 * Smart inbox for incoming messages with auto-execution and approval workflows
 */

// Core exports
export {
  InboxGateway,
  MessageStore,
  RiskAnalyzer,
  AutoExecutor
} from './core/index.js';

// Approval exports
export { ApprovalEngine } from './approval/index.js';

// Type exports
export * from './types.js';

// Factory function to create inbox system
import Database from 'better-sqlite3';
import { InboxGateway } from './core/inbox-gateway.js';
import { MessageStore } from './core/message-store.js';
import { RiskAnalyzer } from './core/risk-analyzer.js';
import { AutoExecutor } from './core/auto-executor.js';
import { ApprovalEngine } from './approval/approval-engine.js';

export function createInboxSystem(db: Database.Database) {
  const messageStore = new MessageStore(db);
  const riskAnalyzer = new RiskAnalyzer();
  const autoExecutor = new AutoExecutor(messageStore);
  const approvalEngine = new ApprovalEngine(db);

  const inboxGateway = new InboxGateway(
    messageStore,
    riskAnalyzer,
    autoExecutor,
    approvalEngine
  );

  return {
    inboxGateway,
    messageStore,
    riskAnalyzer,
    autoExecutor,
    approvalEngine
  };
}
