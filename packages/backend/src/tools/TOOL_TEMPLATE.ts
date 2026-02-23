/**
 * TOOL TEMPLATE - Professional Standard
 *
 * Use this template when creating new tools.
 * Follow this pattern for consistency and professional quality.
 *
 * CHECKLIST:
 * - [ ] Clear, descriptive name (verb_noun format preferred)
 * - [ ] Comprehensive description with use cases
 * - [ ] Complete input_schema with all parameters
 * - [ ] 3-5 professional examples showing different use cases
 * - [ ] Proper error handling with helpful messages
 * - [ ] Security validation where applicable
 * - [ ] Logging for debugging (console.log with [ToolName] prefix)
 * - [ ] TypeScript types for params
 */

import type { Tool, ToolResult } from './types.js';

/**
 * Define parameter types for better type safety
 */
interface MyToolParams {
  /** Required parameter description */
  requiredParam: string;
  /** Optional parameter description */
  optionalParam?: string;
  /** Number parameter with default */
  timeout?: number;
}

/**
 * Export your tool following this pattern
 */
export const myTool: Tool = {
  // Tool name: lowercase, snake_case, verb_noun format
  name: 'my_tool',

  // Description: Start with action verb, explain what it does and when to use it
  description: `Do something useful with the system.

Use this tool when you need to:
- Specific use case 1
- Specific use case 2
- Specific use case 3

The tool will perform X and return Y.
Security/Performance/Other important notes go here.`,

  // Input schema: Define all parameters with clear descriptions
  input_schema: {
    type: 'object',
    properties: {
      requiredParam: {
        type: 'string',
        description: 'Clear explanation of what this parameter does and valid values',
      },
      optionalParam: {
        type: 'string',
        description: 'Optional parameter - explain what it does if provided',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000)',
      },
    },
    required: ['requiredParam'],

    // CRITICAL: Always add professional examples (3-5 examples)
    examples: [
      {
        requiredParam: 'example value 1',
        description: 'Basic usage - explain what this example does',
      },
      {
        requiredParam: 'example value 2',
        optionalParam: 'with option',
        description: 'Advanced usage with optional parameter',
      },
      {
        requiredParam: 'example value 3',
        timeout: 60000,
        description: 'Edge case or special scenario',
      },
    ],
  },

  // Execute function: Implement the tool logic
  async execute(params, context): Promise<ToolResult> {
    // 1. Extract and validate parameters
    const {
      requiredParam,
      optionalParam,
      timeout = 30000,
    } = params as MyToolParams;

    // 2. Validate required parameters
    if (!requiredParam) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Error: requiredParam is required',
          },
        ],
        error: 'Missing required parameter',
      };
    }

    try {
      // 3. Log execution start
      console.log('[MyTool] 🚀 Starting execution');
      console.log('[MyTool]   Required param:', requiredParam);
      if (optionalParam) {
        console.log('[MyTool]   Optional param:', optionalParam);
      }
      console.log('[MyTool]   Timeout:', timeout, 'ms');

      // 4. Perform the actual work
      // Replace this with your tool's logic
      const result = await doSomething(requiredParam, optionalParam, timeout);

      // 5. Log success
      console.log('[MyTool] ✅ Execution successful');
      console.log('[MyTool]   Result:', result.slice(0, 100), '...');

      // 6. Return successful result
      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
        details: {
          // Optional metadata about the execution
          requiredParam,
          executionTime: Date.now(),
          // ... other useful info
        },
      };
    } catch (error: any) {
      // 7. Log and handle errors gracefully
      console.error('[MyTool] ❌ Execution failed:', error.message);

      return {
        content: [
          {
            type: 'text',
            text: `❌ Tool execution failed: ${error.message}`,
          },
        ],
        error: error.message,
        details: {
          requiredParam,
          failedAt: Date.now(),
        },
      };
    }
  },
};

/**
 * Helper functions (if needed)
 */
async function doSomething(
  param: string,
  optional?: string,
  timeout: number = 30000
): Promise<string> {
  // Implement your tool's core logic here
  return `Result for ${param}`;
}

/**
 * USAGE EXAMPLE:
 *
 * 1. Copy this template to a new file: `my-tool.ts`
 * 2. Replace `MyTool` with your tool name
 * 3. Implement your logic in the execute function
 * 4. Add 3-5 real examples
 * 5. Export in index.ts: `export { myTool } from './my-tool.js';`
 * 6. Register in tools/index.ts:
 *    - Import: `import { myTool } from './category/index.js';`
 *    - Register: `registry.register(myTool);`
 * 7. Update tool count in createToolsRegistry()
 */
