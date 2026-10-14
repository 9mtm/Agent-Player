/**
 * Tools Registry
 *
 * Central registry for all available tools.
 * Tools can be registered and executed through this registry.
 */

import type { Tool, ToolResult, ToolExecutionContext } from './types.js';
import { execToolRefusal, isToolAllowedByExecPolicy, isToolObjectAllowedByExecPolicy } from './exec-policy.js';
import { channelToolCallRefusal, isToolAllowedInChannel } from './channel-policy.js';
import { defaultGrants, grantCallRefusal, isToolGranted, type AgentToolGrants } from './grants.js';
import { approvalCategory, consumeApprovalTicket, isConfinedChannelReply, requestApproval } from './approvals.js';
import { actorFromToolContext } from '../repositories/actor.js';

export class ToolsRegistry {
  private tools = new Map<string, Tool>();
  private context: ToolExecutionContext;

  constructor(context: ToolExecutionContext) {
    this.context = context;
  }

  /**
   * Register a tool
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[ToolsRegistry] Tool "${tool.name}" already registered, replacing...`);
    }
    this.tools.set(tool.name, tool);
    console.log(`[ToolsRegistry] ✅ Registered tool: ${tool.name}`);
  }

  /**
   * Unregister a tool (used by extensions on disable)
   */
  unregister(name: string): void {
    if (this.tools.has(name)) {
      this.tools.delete(name);
      console.log(`[ToolsRegistry] ❌ Unregistered tool: ${name}`);
    } else {
      console.warn(`[ToolsRegistry] Tool "${name}" not found, cannot unregister`);
    }
  }

  /**
   * Get all tools usable right now. Exec-class tools are left out unless the
   * server enables them (AGENT_EXEC_TOOLS=true), see exec-policy.ts.
   * In a channel-originated turn only the channel policy's tools are left
   * (see channel-policy.ts). Only tools granted to the agent are kept
   * (see grants.ts).
   */
  getAll(): Tool[] {
    const policy = this.context.toolPolicy;
    const grants = this.grants();
    return Array.from(this.tools.values()).filter((tool) =>
      isToolObjectAllowedByExecPolicy(tool)
      && (!policy || isToolAllowedInChannel(policy, tool))
      && isToolGranted(grants, tool.name)
    );
  }

  /** The agent's effective grants; no agent -> the minimal default set (fail closed, S1.2). */
  private grants(): AgentToolGrants {
    return this.context.grants ?? defaultGrants();
  }

  /** All registered tools, unfiltered (used to seed grants and for the owner grants view). */
  listRegistered(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool by name
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Execute a tool
   */
  async execute(
    toolName: string,
    params: Record<string, any>,
    options: { approvalTicket?: unknown } = {}
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName);

    // SECURITY: exec-class tools are refused unless enabled by server env (S0-Q.5)
    if (!isToolAllowedByExecPolicy(toolName) || (tool && !isToolObjectAllowedByExecPolicy(tool))) {
      console.warn(`[ToolsRegistry] ⛔ Refused exec-class tool: ${toolName}`);
      return execToolRefusal(toolName);
    }

    // SECURITY: channel-originated turns may only run the channel policy's tools (S0-Q.8)
    const policy = this.context.toolPolicy;
    if (policy) {
      const refused = channelToolCallRefusal(policy, toolName, tool, params);
      if (refused) {
        console.warn(`[ToolsRegistry] ⛔ Refused tool in ${policy.channel} channel turn: ${toolName}`);
        return refused;
      }
    }

    if (!tool) {
      return {
        content: [{ type: 'text', text: `Error: Tool "${toolName}" not found` }],
        error: `Tool not found: ${toolName}`,
      };
    }

    // SECURITY (S1.2): only tools granted to this agent run, even if the model emits others
    const grantRefused = grantCallRefusal(this.grants(), toolName, tool, params);
    if (grantRefused) {
      console.warn(`[ToolsRegistry] ⛔ Refused ungranted tool for agent ${this.context.agentId ?? '(none)'}: ${toolName}`);
      return grantRefused;
    }

    // SECURITY (S1.3): risky tools (send, delete, spend, install, settings) wait
    // for a one-time owner approval. Only approveAndRun() holds a valid ticket.
    const category = approvalCategory(tool);
    if (category && !isConfinedChannelReply(policy, toolName) && !consumeApprovalTicket(options.approvalTicket, toolName)) {
      try {
        return await requestApproval(tool, params, this.context, category);
      } catch (error: any) {
        console.error('[ToolsRegistry] ❌ Could not store approval request:', error?.message);
        return {
          content: [{ type: 'text', text: `Tool "${toolName}" was not run: it needs owner approval and the request could not be stored.` }],
          error: 'Approval request failed',
        };
      }
    }

    try {
      console.log(`[ToolsRegistry] 🔧 Executing tool: ${toolName}`);
      // Parameter names only: values may hold secrets (e.g. credentials_save).
      console.log(`[ToolsRegistry]   Params:`, Object.keys(params || {}).join(', '));

      // B1-core: one actor per tool call, from the trusted run context only.
      const result = await tool.execute(params, { ...this.context, actor: actorFromToolContext(this.context) });

      console.log(`[ToolsRegistry] ✅ Tool executed successfully`);
      return result;
    } catch (error: any) {
      console.error(`[ToolsRegistry] ❌ Tool execution failed:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool "${toolName}": ${error.message}`,
          },
        ],
        error: error.message,
      };
    }
  }

  /**
   * Get tools in Anthropic API format
   */
  getToolsForAPI(): Array<{
    name: string;
    description: string;
    input_schema: any;
  }> {
    return this.getAll().map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema,
    }));
  }

  /**
   * Update context (e.g., change workspace dir)
   */
  updateContext(updates: Partial<ToolExecutionContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Get current context
   */
  getContext(): ToolExecutionContext {
    return this.context;
  }
}
