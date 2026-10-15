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
import { InboxGateway } from './core/inbox-gateway.js';
import { MessageStore } from './core/message-store.js';
import { RiskAnalyzer } from './core/risk-analyzer.js';
import { AutoExecutor } from './core/auto-executor.js';
import { ApprovalEngine } from './approval/approval-engine.js';

// The inbox parts api/startup.ts decorates the Fastify instance with
// (routes/inbox.ts reads them; absent until startup ran).
declare module 'fastify' {
  interface FastifyInstance {
    inboxGateway?: InboxGateway;
    messageStore?: MessageStore;
    riskAnalyzer?: RiskAnalyzer;
    approvalEngine?: ApprovalEngine;
  }
}

export function createInboxSystem() {
  const messageStore = new MessageStore();
  const riskAnalyzer = new RiskAnalyzer();
  const autoExecutor = new AutoExecutor(messageStore);
  const approvalEngine = new ApprovalEngine();

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
