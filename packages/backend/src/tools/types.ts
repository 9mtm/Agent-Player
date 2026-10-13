/**
 * Tools System - Type Definitions
 *
 * Tools are executable functions that the LLM can call.
 * Unlike Skills (which are instructions), Tools actually DO things.
 */

export interface ToolParameter {
  type: string;
  description?: string;
  enum?: string[];
  required?: boolean;
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolParameter>;
  required?: string[];
  examples?: Array<Record<string, any>>; // Professional examples for better AI understanding
}

export interface ToolResult {
  content: Array<{
    type: 'text' | 'image';
    text?: string;
    source?: {
      type: 'base64';
      media_type: string;
      data: string;
    };
  }>;
  details?: Record<string, any>;
  error?: string;
}

export interface Tool {
  name: string;
  description: string;
  input_schema: ToolParameters;
  execute: (params: Record<string, any>, context?: ToolExecutionContext) => Promise<ToolResult>;
  extensionId?: string; // Optional: tracks which extension registered this tool
  /** Set by the Extension SDK when the extension's manifest declares `process`/`exec`. */
  execClass?: boolean;
  /** Parameter holding the destination (chat id, channel, number) for destination scopes (S1.2). */
  destinationParam?: string;
  /** Extension tools may ask for one-time owner approval per call (S1.3); built-in risky tools always need it. */
  requiresApproval?: boolean;
}

export interface ToolExecutionContext {
  workspaceDir: string;
  timeout?: number;
  userId?: string;
  sessionId?: string;
  /** Agent the tools run for (agents_config.id). Its grants limit the tools (S1.2). */
  agentId?: string;
  /** Orchestrator task this run executes (cron runner); new tasks become its subtasks. */
  taskId?: string;
  /** Agents this run was delegated from (task spawners): grants are intersected with theirs. */
  delegatedFrom?: string[];
  /** Effective grants; computed by createToolsRegistry from agentId when absent (S1.2). */
  grants?: import('./grants.js').AgentToolGrants;
  /** Present for channel-originated turns: restricts which tools may be offered/run (S0-Q.8). */
  toolPolicy?: import('./channel-policy.js').ChannelToolPolicy;
}
