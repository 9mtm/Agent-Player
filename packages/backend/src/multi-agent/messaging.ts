/**
 * Agent Messaging System
 * Inter-agent communication and coordination
 */

import { v4 as uuidv4 } from 'uuid';
import {
  type AgentMessage,
  type MessageType,
  type HandoffRequest,
  type MemoryEntry,
} from './types.js';
import { getOrchestrator } from './orchestrator.js';

type MessageHandler = (message: AgentMessage) => void | Promise<void>;
type HandoffHandler = (request: HandoffRequest) => void | Promise<void>;

export class AgentMessaging {
  private messageQueue: Map<string, AgentMessage[]> = new Map();
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private broadcastHandlers: MessageHandler[] = [];
  private handoffHandlers: HandoffHandler[] = [];
  private pendingHandoffs: Map<string, HandoffRequest> = new Map();
  private messageHistory: AgentMessage[] = [];
  private maxHistorySize: number = 1000;

  /**
   * Send message to an agent
   */
  send(params: {
    from: string;
    to: string;
    type: MessageType;
    content: string;
    taskId?: string;
    teamId?: string;
    data?: Record<string, unknown>;
    replyTo?: string;
  }): AgentMessage {
    const message: AgentMessage = {
      id: uuidv4(),
      from: params.from,
      to: params.to,
      type: params.type,
      content: params.content,
      taskId: params.taskId,
      teamId: params.teamId,
      data: params.data,
      timestamp: new Date(),
      read: false,
      replyTo: params.replyTo,
    };

    // Add to queue
    if (!this.messageQueue.has(params.to)) {
      this.messageQueue.set(params.to, []);
    }
    this.messageQueue.get(params.to)!.push(message);

    // Add to history
    this.addToHistory(message);

    // Notify handlers
    this.notifyHandlers(message);

    return message;
  }

  /**
   * Broadcast message to all team members
   */
  broadcast(params: {
    from: string;
    teamId: string;
    type: MessageType;
    content: string;
    taskId?: string;
    data?: Record<string, unknown>;
  }): AgentMessage {
    const message: AgentMessage = {
      id: uuidv4(),
      from: params.from,
      to: 'all',
      type: params.type,
      content: params.content,
      taskId: params.taskId,
      teamId: params.teamId,
      data: params.data,
      timestamp: new Date(),
      read: false,
    };

    // Get team members from orchestrator
    const orchestrator = getOrchestrator();
    const team = orchestrator.getTeam(params.teamId);

    if (team) {
      for (const agentId of team.definition.agentIds) {
        if (agentId !== params.from) {
          if (!this.messageQueue.has(agentId)) {
            this.messageQueue.set(agentId, []);
          }
          this.messageQueue.get(agentId)!.push({ ...message, to: agentId });
        }
      }
    }

    // Add to history
    this.addToHistory(message);

    // Notify broadcast handlers
    for (const handler of this.broadcastHandlers) {
      try {
        handler(message);
      } catch (error) {
        console.error('[Messaging] Broadcast handler error:', error);
      }
    }

    return message;
  }

  /**
   * Get messages for an agent
   */
  getMessages(agentId: string, options?: {
    unreadOnly?: boolean;
    type?: MessageType;
    limit?: number;
  }): AgentMessage[] {
    let messages = this.messageQueue.get(agentId) || [];

    if (options?.unreadOnly) {
      messages = messages.filter((m) => !m.read);
    }

    if (options?.type) {
      messages = messages.filter((m) => m.type === options.type);
    }

    if (options?.limit) {
      messages = messages.slice(-options.limit);
    }

    return messages;
  }

  /**
   * Mark message as read
   */
  markAsRead(messageId: string): boolean {
    for (const messages of this.messageQueue.values()) {
      const message = messages.find((m) => m.id === messageId);
      if (message) {
        message.read = true;
        return true;
      }
    }
    return false;
  }

  /**
   * Mark all messages for agent as read
   */
  markAllAsRead(agentId: string): number {
    const messages = this.messageQueue.get(agentId) || [];
    let count = 0;
    for (const message of messages) {
      if (!message.read) {
        message.read = true;
        count++;
      }
    }
    return count;
  }

  /**
   * Reply to a message
   */
  reply(originalMessageId: string, params: {
    from: string;
    content: string;
    data?: Record<string, unknown>;
  }): AgentMessage | null {
    // Find original message
    let original: AgentMessage | undefined;
    for (const messages of this.messageQueue.values()) {
      original = messages.find((m) => m.id === originalMessageId);
      if (original) break;
    }

    // Check history
    if (!original) {
      original = this.messageHistory.find((m) => m.id === originalMessageId);
    }

    if (!original) return null;

    return this.send({
      from: params.from,
      to: original.from,
      type: 'answer',
      content: params.content,
      taskId: original.taskId,
      teamId: original.teamId,
      data: params.data,
      replyTo: originalMessageId,
    });
  }

  /**
   * Request help from another agent
   */
  requestHelp(params: {
    from: string;
    to: string;
    taskId: string;
    question: string;
    context?: Record<string, unknown>;
  }): AgentMessage {
    return this.send({
      from: params.from,
      to: params.to,
      type: 'request_help',
      content: params.question,
      taskId: params.taskId,
      data: params.context,
    });
  }

  /**
   * Provide information to another agent
   */
  provideInfo(params: {
    from: string;
    to: string;
    taskId?: string;
    info: string;
    data?: Record<string, unknown>;
  }): AgentMessage {
    return this.send({
      from: params.from,
      to: params.to,
      type: 'provide_info',
      content: params.info,
      taskId: params.taskId,
      data: params.data,
    });
  }

  // ============ Handoff System ============

  /**
   * Request task handoff to another agent
   */
  requestHandoff(params: {
    fromAgent: string;
    toAgent: string;
    taskId: string;
    reason: string;
    context: Record<string, unknown>;
  }): HandoffRequest {
    const request: HandoffRequest = {
      id: uuidv4(),
      fromAgent: params.fromAgent,
      toAgent: params.toAgent,
      taskId: params.taskId,
      reason: params.reason,
      context: params.context,
      status: 'pending',
      timestamp: new Date(),
    };

    this.pendingHandoffs.set(request.id, request);

    // Notify the target agent
    this.send({
      from: params.fromAgent,
      to: params.toAgent,
      type: 'handoff',
      content: params.reason,
      taskId: params.taskId,
      data: {
        handoffId: request.id,
        context: params.context,
      },
    });

    // Notify handoff handlers
    for (const handler of this.handoffHandlers) {
      try {
        handler(request);
      } catch (error) {
        console.error('[Messaging] Handoff handler error:', error);
      }
    }

    return request;
  }

  /**
   * Accept a handoff request
   */
  acceptHandoff(handoffId: string): boolean {
    const request = this.pendingHandoffs.get(handoffId);
    if (!request || request.status !== 'pending') return false;

    request.status = 'accepted';

    // Update task assignment in orchestrator
    const orchestrator = getOrchestrator();
    const task = orchestrator.getTask(request.taskId);

    if (task) {
      // Remove from old agent
      const oldAgent = orchestrator.getAgent(request.fromAgent);
      if (oldAgent) {
        oldAgent.currentTasks = oldAgent.currentTasks.filter((id) => id !== request.taskId);
        if (oldAgent.currentTasks.length === 0) {
          oldAgent.status = 'idle';
        }
      }

      // Assign to new agent
      orchestrator.assignTask(request.taskId, request.toAgent);
    }

    // Notify the original agent
    this.send({
      from: request.toAgent,
      to: request.fromAgent,
      type: 'task_update',
      content: `Handoff accepted for task ${request.taskId}`,
      taskId: request.taskId,
      data: { handoffId, status: 'accepted' },
    });

    return true;
  }

  /**
   * Reject a handoff request
   */
  rejectHandoff(handoffId: string, reason?: string): boolean {
    const request = this.pendingHandoffs.get(handoffId);
    if (!request || request.status !== 'pending') return false;

    request.status = 'rejected';

    // Notify the original agent
    this.send({
      from: request.toAgent,
      to: request.fromAgent,
      type: 'task_update',
      content: `Handoff rejected: ${reason || 'No reason provided'}`,
      taskId: request.taskId,
      data: { handoffId, status: 'rejected', reason },
    });

    return true;
  }

  /**
   * Get pending handoffs for an agent
   */
  getPendingHandoffs(agentId: string): HandoffRequest[] {
    return Array.from(this.pendingHandoffs.values()).filter(
      (h) => h.toAgent === agentId && h.status === 'pending'
    );
  }

  // ============ Shared Memory ============

  /**
   * Share memory entry with team
   */
  shareMemory(params: {
    from: string;
    teamId: string;
    entry: {
      type: MemoryEntry['type'];
      content: string;
      importance?: number;
      related?: string[];
    };
  }): MemoryEntry {
    const entry: MemoryEntry = {
      id: uuidv4(),
      type: params.entry.type,
      content: params.entry.content,
      importance: params.entry.importance ?? 0.5,
      related: params.entry.related,
      source: params.from,
      timestamp: new Date(),
    };

    // Add to team shared memory
    const orchestrator = getOrchestrator();
    const team = orchestrator.getTeam(params.teamId);

    if (team) {
      team.sharedMemory.push(entry);

      // Notify team
      this.broadcast({
        from: params.from,
        teamId: params.teamId,
        type: 'provide_info',
        content: `Shared memory: ${entry.content}`,
        data: { memoryEntry: entry },
      });
    }

    return entry;
  }

  /**
   * Get team shared memory
   */
  getSharedMemory(teamId: string): MemoryEntry[] {
    const orchestrator = getOrchestrator();
    const team = orchestrator.getTeam(teamId);
    return team ? [...team.sharedMemory] : [];
  }

  // ============ Event Handlers ============

  /**
   * Register message handler for an agent
   */
  onMessage(agentId: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(agentId)) {
      this.messageHandlers.set(agentId, []);
    }
    this.messageHandlers.get(agentId)!.push(handler);

    return () => {
      const handlers = this.messageHandlers.get(agentId);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      }
    };
  }

  /**
   * Register broadcast handler
   */
  onBroadcast(handler: MessageHandler): () => void {
    this.broadcastHandlers.push(handler);
    return () => {
      const index = this.broadcastHandlers.indexOf(handler);
      if (index > -1) this.broadcastHandlers.splice(index, 1);
    };
  }

  /**
   * Register handoff handler
   */
  onHandoff(handler: HandoffHandler): () => void {
    this.handoffHandlers.push(handler);
    return () => {
      const index = this.handoffHandlers.indexOf(handler);
      if (index > -1) this.handoffHandlers.splice(index, 1);
    };
  }

  /**
   * Notify handlers of new message
   */
  private notifyHandlers(message: AgentMessage): void {
    const handlers = this.messageHandlers.get(message.to) || [];
    for (const handler of handlers) {
      try {
        handler(message);
      } catch (error) {
        console.error('[Messaging] Handler error:', error);
      }
    }
  }

  // ============ History ============

  /**
   * Add message to history
   */
  private addToHistory(message: AgentMessage): void {
    this.messageHistory.push(message);

    // Trim history
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.splice(0, this.messageHistory.length - this.maxHistorySize);
    }
  }

  /**
   * Get message history
   */
  getHistory(options?: {
    teamId?: string;
    agentId?: string;
    taskId?: string;
    limit?: number;
  }): AgentMessage[] {
    let history = [...this.messageHistory];

    if (options?.teamId) {
      history = history.filter((m) => m.teamId === options.teamId);
    }
    if (options?.agentId) {
      history = history.filter((m) => m.from === options.agentId || m.to === options.agentId);
    }
    if (options?.taskId) {
      history = history.filter((m) => m.taskId === options.taskId);
    }

    // Sort by timestamp
    history.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (options?.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * Clear message queue for agent
   */
  clearQueue(agentId: string): void {
    this.messageQueue.delete(agentId);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalMessages: number;
    pendingMessages: number;
    pendingHandoffs: number;
    queuedAgents: number;
  } {
    let pendingMessages = 0;
    for (const messages of this.messageQueue.values()) {
      pendingMessages += messages.filter((m) => !m.read).length;
    }

    return {
      totalMessages: this.messageHistory.length,
      pendingMessages,
      pendingHandoffs: Array.from(this.pendingHandoffs.values()).filter(
        (h) => h.status === 'pending'
      ).length,
      queuedAgents: this.messageQueue.size,
    };
  }
}

// Singleton
let messaging: AgentMessaging | null = null;

export function getMessaging(): AgentMessaging {
  if (!messaging) {
    messaging = new AgentMessaging();
  }
  return messaging;
}
