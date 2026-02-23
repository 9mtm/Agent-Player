/**
 * Memory Search Tool
 *
 * Search the agent's memory system for relevant information
 * Uses semantic search to find related memories
 */

import type { Tool, ToolResult } from './types.js';
import { getMemoryStorage } from '../../memory/storage.js';
import type { MemoryType } from '../../memory/types.js';

interface MemorySearchParams {
  /** Search query */
  query: string;
  /** User ID (provided by context) */
  userId: string;
  /** Maximum number of results (default: 5) */
  limit?: number;
  /** Filter by memory type (optional) */
  type?: MemoryType;
  /** Minimum importance level to include (1-10, optional) */
  minImportance?: number;
  /** Filter by tags (optional) */
  tags?: string[];
}

export const memorySearchTool: Tool = {
  name: 'memory_search',
  description: `Search the agent's memory for relevant information.

Use this tool when you need to:
- Recall information about the user
- Find user preferences
- Look up facts you previously learned
- Check if you know something
- Retrieve context from past conversations

The search uses semantic similarity, so:
- You don't need exact keywords
- Related concepts will be found
- More recent and important memories rank higher

Examples:
- "What is the user's name?" → Finds name facts
- "User's programming preferences" → Finds language/tool preferences
- "Did user mention any goals?" → Finds goal-type memories
- "User's location" → Finds location facts

Filters:
- type: Filter by memory type (fact, preference, task, conversation, goal)
- minImportance: Only include memories above this importance (1-10)
- tags: Filter by specific tags
- limit: Maximum results to return (default: 5)

Returns:
- Relevant memories with their content
- Importance scores
- When they were saved
- Associated metadata`,

  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'What to search for',
      },
      userId: {
        type: 'string',
        description: 'User ID (automatically provided)',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 20,
        description: 'Maximum number of results (default: 5)',
      },
      type: {
        type: 'string',
        enum: ['fact', 'preference', 'task', 'conversation', 'goal'],
        description: 'Filter by memory type',
      },
      minImportance: {
        type: 'number',
        minimum: 1,
        maximum: 10,
        description: 'Minimum importance level',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by tags',
      },
    },
    required: ['query', 'userId'],
    examples: [
      {
        query: 'user preferences',
        userId: 'user-123',
        description: 'Search for user preferences in memory',
      },
      {
        query: 'authentication discussion',
        type: 'conversation',
        userId: 'user-123',
        description: 'Find conversations about authentication',
      },
      {
        query: 'API keys',
        tags: ['security', 'credentials'],
        limit: 5,
        userId: 'user-123',
        description: 'Search for API key related memories with tags',
      },
    ],
  },

  async execute(params: MemorySearchParams): Promise<ToolResult> {
    try {
      const storage = getMemoryStorage();

      // Search memories
      const memories = await storage.search(
        params.query,
        params.userId,
        params.limit || 5
      );

      // Apply filters
      let filtered = memories;

      if (params.type) {
        filtered = filtered.filter((m) => m.type === params.type);
      }

      if (params.minImportance) {
        filtered = filtered.filter((m) => m.importance >= params.minImportance!);
      }

      if (params.tags && params.tags.length > 0) {
        filtered = filtered.filter((m) => {
          const memoryTags = m.metadata?.tags || [];
          return params.tags!.some((tag) => memoryTags.includes(tag));
        });
      }

      if (filtered.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No memories found for: "${params.query}"${
                params.type ? `\nType filter: ${params.type}` : ''
              }${params.minImportance ? `\nMinimum importance: ${params.minImportance}` : ''}${
                params.tags ? `\nTags filter: ${params.tags.join(', ')}` : ''
              }\n\nTry:\n- Using a broader search query\n- Removing filters\n- Checking if this information was previously saved`,
            },
          ],
          data: {
            success: true,
            count: 0,
            memories: [],
          },
        };
      }

      // Format response text
      let responseText = `Found ${filtered.length} relevant ${filtered.length === 1 ? 'memory' : 'memories'} for: "${params.query}"\n\n`;

      filtered.forEach((memory, index) => {
        const savedDate = new Date(memory.createdAt).toLocaleDateString();
        const savedTime = new Date(memory.createdAt).toLocaleTimeString();

        responseText += `${index + 1}. ${memory.content}\n`;
        responseText += `   Type: ${memory.type} | Importance: ${memory.importance}/10\n`;
        responseText += `   Saved: ${savedDate} ${savedTime}\n`;
        responseText += `   Layer: ${memory.layer} | Access count: ${memory.accessCount}\n`;

        if (memory.metadata?.tags && memory.metadata.tags.length > 0) {
          responseText += `   Tags: ${memory.metadata.tags.join(', ')}\n`;
        }

        responseText += '\n';
      });

      // Include helpful tips if filters were applied
      if (params.type || params.minImportance || params.tags) {
        responseText += '---\n';
        responseText += 'Filters applied:\n';
        if (params.type) responseText += `- Type: ${params.type}\n`;
        if (params.minImportance) responseText += `- Min importance: ${params.minImportance}\n`;
        if (params.tags) responseText += `- Tags: ${params.tags.join(', ')}\n`;
      }

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
        data: {
          success: true,
          count: filtered.length,
          query: params.query,
          memories: filtered.map((m) => ({
            id: m.id,
            content: m.content,
            type: m.type,
            importance: m.importance,
            layer: m.layer,
            createdAt: m.createdAt,
            accessCount: m.accessCount,
            tags: m.metadata?.tags || [],
          })),
        },
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error searching memories: ${error.message}`,
          },
        ],
        error: error.message,
      };
    }
  },
};
