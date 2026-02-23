/**
 * Memory Save Tool
 *
 * Save important information to the agent's memory system
 * Information persists across conversations and can be recalled later
 */

import type { Tool, ToolResult } from './types.js';
import { getMemoryStorage } from '../../memory/storage.js';
import type { Memory, MemoryType, ImportanceLevel } from '../../memory/types.js';
import { v4 as uuidv4 } from 'uuid';

interface MemorySaveParams {
  /** The information to remember */
  content: string;
  /** Type of memory: fact, preference, task, conversation, goal */
  type?: MemoryType;
  /** How important is this information (1-10, default: 5) */
  importance?: number;
  /** Tags for categorization (optional) */
  tags?: string[];
  /** Additional metadata (optional) */
  metadata?: Record<string, any>;
  /** User ID (provided by context) */
  userId: string;
}

export const memorySaveTool: Tool = {
  name: 'memory_save',
  description: `Save important information to memory for future recall.

Use this tool when you learn something important about:
- User preferences (favorite color, language, etc.)
- Facts about the user (name, location, job, etc.)
- Tasks or goals the user mentioned
- Important conversation context
- User's habits or patterns

The saved information will be:
- Stored permanently in the memory system
- Searchable via memory_search tool
- Automatically recalled in relevant future conversations

Memory types:
- "fact": Factual information (user's name, location, etc.)
- "preference": User preferences (likes, dislikes, settings)
- "task": Tasks, TODOs, or goals
- "conversation": Important conversation context
- "goal": Long-term goals or objectives

Importance scale (1-10):
- 1-3: Low importance (minor details)
- 4-6: Medium importance (useful context)
- 7-9: High importance (critical facts)
- 10: Critical (user's name, core preferences)

Examples:
- "User's name is Ahmed" (type: fact, importance: 10)
- "User prefers Arabic language" (type: preference, importance: 8)
- "User wants to learn Python" (type: goal, importance: 7)
- "User mentioned visiting Paris last summer" (type: conversation, importance: 4)`,

  input_schema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'The information to remember',
      },
      type: {
        type: 'string',
        enum: ['fact', 'preference', 'task', 'conversation', 'goal'],
        description: 'Type of memory (default: conversation)',
      },
      importance: {
        type: 'number',
        minimum: 1,
        maximum: 10,
        description: 'Importance level 1-10 (default: 5)',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags for categorization',
      },
      metadata: {
        type: 'object',
        description: 'Additional metadata',
      },
      userId: {
        type: 'string',
        description: 'User ID (automatically provided)',
      },
    },
    required: ['content', 'userId'],
    examples: [
      {
        content: 'User prefers dark mode and concise responses',
        type: 'preference',
        userId: 'user-123',
        description: 'Save user preference to memory',
      },
      {
        content: 'Discussed implementing authentication using JWT tokens',
        type: 'conversation',
        tags: ['auth', 'jwt', 'security'],
        userId: 'user-123',
        description: 'Save conversation topic with tags',
      },
      {
        content: 'User birthday is March 15th',
        type: 'fact',
        userId: 'user-123',
        description: 'Save personal fact about user',
      },
    ],
  },

  async execute(params: MemorySaveParams): Promise<ToolResult> {
    try {
      const storage = getMemoryStorage();

      // Validate importance
      const importance = Math.max(1, Math.min(10, params.importance || 5));

      // Determine memory layer based on importance (Multi-Tier Memory System)
      let memoryLayer: 'working' | 'experiential' | 'factual' = 'working';
      let expiryTimestamp: number | null = Date.now() + (24 * 60 * 60 * 1000); // 24h default

      if (importance >= 8) {
        // High importance → Factual (permanent)
        memoryLayer = 'factual';
        expiryTimestamp = null; // Never expires
      } else if (importance >= 6) {
        // Medium importance → Experiential (90 days)
        memoryLayer = 'experiential';
        expiryTimestamp = Date.now() + (90 * 24 * 60 * 60 * 1000);
      }
      // Low importance stays in working memory (24h expiry)

      // Create memory object
      const memory: Memory = {
        id: uuidv4(),
        userId: params.userId,
        type: params.type || 'conversation',
        content: params.content,
        importance: importance as ImportanceLevel,
        importanceScore: importance / 10, // Convert 1-10 to 0-1
        memoryLayer,
        consolidationStatus: 'pending',
        expiryTimestamp,
        metadata: {
          ...params.metadata,
          tags: params.tags || [],
          source: 'agent',
          savedAt: new Date().toISOString(),
        },
        status: 'active',
        createdAt: new Date(),
        lastAccessedAt: Date.now(),
        accessCount: 0,
      };

      // Save to storage
      await storage.save(memory);

      // Layer display name
      const layerDisplay = memoryLayer === 'working'
        ? 'Working (24h)'
        : memoryLayer === 'experiential'
        ? 'Experiential (90 days)'
        : 'Factual (permanent)';

      return {
        content: [
          {
            type: 'text',
            text: `✓ Memory saved successfully!\n\nContent: ${params.content}\nType: ${memory.type}\nImportance: ${importance}/10 (${layerDisplay})\nID: ${memory.id}${
              params.tags && params.tags.length > 0 ? `\nTags: ${params.tags.join(', ')}` : ''
            }\n\nThis information will be recalled automatically in future relevant conversations.`,
          },
        ],
        data: {
          success: true,
          memoryId: memory.id,
          type: memory.type,
          importance,
          memoryLayer,
          expiryTimestamp,
        },
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error saving memory: ${error.message}`,
          },
        ],
        error: error.message,
      };
    }
  },
};
