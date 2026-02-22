/**
 * Tools Registry
 *
 * Central registry for all available tools.
 * Tools can be registered and executed through this registry.
 */

import type { Tool, ToolResult, ToolExecutionContext } from './types.js';

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
   * Get all registered tools
   */
  getAll(): Tool[] {
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
    params: Record<string, any>
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        content: [{ type: 'text', text: `Error: Tool "${toolName}" not found` }],
        error: `Tool not found: ${toolName}`,
      };
    }

    try {
      console.log(`[ToolsRegistry] 🔧 Executing tool: ${toolName}`);
      console.log(`[ToolsRegistry]   Params:`, JSON.stringify(params, null, 2));

      const result = await tool.execute(params);

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
