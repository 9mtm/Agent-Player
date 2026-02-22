/**
 * Tools Registry
 *
 * Central registry for all available tools.
 * Tools can be registered and executed through this registry.
 */
export class ToolsRegistry {
    tools = new Map();
    context;
    constructor(context) {
        this.context = context;
    }
    /**
     * Register a tool
     */
    register(tool) {
        if (this.tools.has(tool.name)) {
            console.warn(`[ToolsRegistry] Tool "${tool.name}" already registered, replacing...`);
        }
        this.tools.set(tool.name, tool);
        console.log(`[ToolsRegistry] ✅ Registered tool: ${tool.name}`);
    }
    /**
     * Unregister a tool (used by extensions on disable)
     */
    unregister(name) {
        if (this.tools.has(name)) {
            this.tools.delete(name);
            console.log(`[ToolsRegistry] ❌ Unregistered tool: ${name}`);
        }
        else {
            console.warn(`[ToolsRegistry] Tool "${name}" not found, cannot unregister`);
        }
    }
    /**
     * Get all registered tools
     */
    getAll() {
        return Array.from(this.tools.values());
    }
    /**
     * Get tool by name
     */
    get(name) {
        return this.tools.get(name);
    }
    /**
     * Execute a tool
     */
    async execute(toolName, params) {
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
        }
        catch (error) {
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
    getToolsForAPI() {
        return this.getAll().map((tool) => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.input_schema,
        }));
    }
    /**
     * Update context (e.g., change workspace dir)
     */
    updateContext(updates) {
        this.context = { ...this.context, ...updates };
    }
    /**
     * Get current context
     */
    getContext() {
        return this.context;
    }
}
