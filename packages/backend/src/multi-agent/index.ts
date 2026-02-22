/**
 * Multi-Agent System
 * Coordination and orchestration for multiple AI agents
 */

export * from './types.js';
export * from './orchestrator.js';
export * from './messaging.js';

import { getOrchestrator, AgentOrchestrator } from './orchestrator.js';
import { getMessaging, AgentMessaging } from './messaging.js';
import type { AgentDefinition, TeamDefinition, Task, AgentMessage } from './types.js';

let initialized = false;

/**
 * Initialize the multi-agent system
 */
export async function initializeMultiAgent(): Promise<{
  orchestrator: AgentOrchestrator;
  messaging: AgentMessaging;
}> {
  const orchestrator = getOrchestrator();
  const messaging = getMessaging();

  initialized = true;
  console.log('[MultiAgent] System initialized');

  return { orchestrator, messaging };
}

/**
 * Create and register an agent
 */
export function createAgent(definition: AgentDefinition): void {
  const orchestrator = getOrchestrator();
  orchestrator.registerAgent(definition);
}

/**
 * Create a team of agents
 */
export function createTeam(definition: TeamDefinition): void {
  const orchestrator = getOrchestrator();
  orchestrator.createTeam(definition);
}

/**
 * Create a task for execution
 */
export function createTask(input: {
  title: string;
  description: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  requiredCapabilities?: string[];
  teamId?: string;
  parentId?: string;
  dependencies?: string[];
  inputData?: Record<string, unknown>;
  deadline?: Date;
  maxRetries?: number;
}): Task {
  const orchestrator = getOrchestrator();
  return orchestrator.createTask(input);
}

/**
 * Send message between agents
 */
export function sendMessage(params: {
  from: string;
  to: string;
  type: AgentMessage['type'];
  content: string;
  taskId?: string;
  teamId?: string;
  data?: Record<string, unknown>;
}): AgentMessage {
  const messaging = getMessaging();
  return messaging.send(params);
}

/**
 * Broadcast message to team
 */
export function broadcastMessage(params: {
  from: string;
  teamId: string;
  type: AgentMessage['type'];
  content: string;
  taskId?: string;
  data?: Record<string, unknown>;
}): AgentMessage {
  const messaging = getMessaging();
  return messaging.broadcast(params);
}

/**
 * Get multi-agent system status
 */
export function getMultiAgentStatus(): {
  initialized: boolean;
  orchestratorStats: ReturnType<AgentOrchestrator['getStats']>;
  messagingStats: ReturnType<AgentMessaging['getStats']>;
} {
  const orchestrator = getOrchestrator();
  const messaging = getMessaging();

  return {
    initialized,
    orchestratorStats: orchestrator.getStats(),
    messagingStats: messaging.getStats(),
  };
}

/**
 * Shutdown multi-agent system
 */
export function shutdownMultiAgent(): void {
  // Clear all queues and handlers
  const messaging = getMessaging();
  const orchestrator = getOrchestrator();

  // Get all agents and clear their queues
  for (const agent of orchestrator.listAgents()) {
    messaging.clearQueue(agent.definition.id);
  }

  orchestrator.close();
  initialized = false;
  console.log('[MultiAgent] System shutdown');
}
