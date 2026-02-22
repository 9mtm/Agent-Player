/**
 * Auto Executor - Automatically execute safe tasks
 *
 * Executes approved/safe inbox messages through the agent runtime
 */

import type { InboxMessage, ExecutionResult } from '../types.js';
import type { MessageStore } from './message-store.js';

export class AutoExecutor {
  constructor(
    private messageStore: MessageStore,
    private agentRuntime?: any  // AgentRuntime will be injected
  ) {}

  /**
   * Execute inbox message automatically
   */
  async execute(message: InboxMessage): Promise<ExecutionResult> {
    // Update status to processing
    await this.messageStore.update(message.id, {
      status: 'processing',
      processedAt: new Date()
    });

    try {
      // Execute through agent runtime
      const result = await this.executeMessage(message);

      // Save successful result
      await this.messageStore.update(message.id, {
        status: 'completed',
        autoExecuted: true,
        result: result.output,
        completedAt: new Date()
      });

      return {
        success: true,
        output: result.output,
        executedAt: new Date()
      };

    } catch (error: any) {
      // Save error
      await this.messageStore.update(message.id, {
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      });

      return {
        success: false,
        error: error.message,
        executedAt: new Date()
      };
    }
  }

  /**
   * Execute message through appropriate handler
   */
  private async executeMessage(message: InboxMessage): Promise<{ output: any }> {
    // If agent runtime is available, use it
    if (this.agentRuntime) {
      return await this.agentRuntime.process({
        userId: message.userId,
        message: message.message,
        context: {
          source: message.sourceType,
          sourceId: message.sourceId,
          metadata: message.metadata,
          inboxMessageId: message.id
        }
      });
    }

    // Fallback: Simple execution based on message content
    return await this.fallbackExecution(message);
  }

  /**
   * Fallback execution for simple tasks
   */
  private async fallbackExecution(message: InboxMessage): Promise<{ output: any }> {
    const text = message.message.toLowerCase();

    // Simple pattern matching for common tasks
    if (text.includes('weather')) {
      return {
        output: {
          type: 'text',
          content: `I would check the weather, but agent runtime is not connected yet. Message: "${message.message}"`
        }
      };
    }

    if (text.includes('status') || text.includes('check')) {
      return {
        output: {
          type: 'text',
          content: `Status check acknowledged. Message: "${message.message}"`
        }
      };
    }

    // Default response
    return {
      output: {
        type: 'text',
        content: `Message received and processed: "${message.message}"`
      }
    };
  }

  /**
   * Set agent runtime (dependency injection)
   */
  setAgentRuntime(runtime: any): void {
    this.agentRuntime = runtime;
  }
}
