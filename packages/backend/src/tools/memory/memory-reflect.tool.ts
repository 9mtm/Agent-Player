/**
 * Memory Reflect Tool
 *
 * Reads recent memories, finds patterns and duplicate/related entries,
 * then writes a consolidated [REFLECTION] memory summarizing key insights.
 *
 * Inspired by the 6Rs pipeline — implements the "Reflect" and "Reduce" steps.
 */

import type { Tool, ToolResult } from '../types.js';
import { getMemoryStorage } from '../../memory/storage.js';
import { v4 as uuidv4 } from 'uuid';
import type { Memory } from '../../memory/types.js';

interface MemoryReflectParams {
  userId: string;
  lookbackCount?: number;
  focus?: string;
}

export const memoryReflectTool: Tool = {
  name: 'memory_reflect',
  description: `Analyze recent memories, find patterns, and save a consolidated reflection.

Use this tool after completing a complex task or conversation to:
- Identify recurring themes and patterns in recent memories
- Spot duplicate or near-duplicate entries
- Summarize key insights into a single [REFLECTION] memory
- Surface the most important facts learned recently

Returns a structured reflection that helps build long-term understanding.

Parameters:
- userId: User whose memories to analyze (auto-provided)
- lookbackCount: How many recent memories to analyze (default: 20, max: 50)
- focus: Optional topic to focus the reflection on (e.g. "coding preferences")`,

  input_schema: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'User ID (automatically provided)',
      },
      lookbackCount: {
        type: 'number',
        description: 'Number of recent memories to analyze (default: 20, max: 50)',
      },
      focus: {
        type: 'string',
        description: 'Optional topic to focus the reflection on',
      },
    },
    required: ['userId'],
    examples: [
      {
        userId: 'user-123',
        lookbackCount: 30,
        description: 'Analyze patterns from last 30 memories',
      },
      {
        userId: 'user-123',
        focus: 'coding preferences',
        description: 'Reflect on coding-related patterns',
      },
    ],
  },

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const { userId, lookbackCount = 20, focus } = params as MemoryReflectParams;
    const limit = Math.min(50, Math.max(1, lookbackCount));

    try {
      const storage = getMemoryStorage();
      const allMemories = await storage.getByUser(userId);

      if (allMemories.length === 0) {
        return {
          content: [{ type: 'text', text: 'No memories found to reflect on.' }],
        };
      }

      // Take the most recent N memories (getByUser returns ordered by importance DESC, created DESC)
      const recentMemories = allMemories.slice(0, limit);

      // Filter by focus topic if provided
      const targetMemories = focus
        ? recentMemories.filter(m =>
            m.content.toLowerCase().includes(focus.toLowerCase()) ||
            (m.metadata?.tags as string[] || []).some((t: string) =>
              t.toLowerCase().includes(focus.toLowerCase())
            )
          )
        : recentMemories;

      if (targetMemories.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No memories found matching focus topic: "${focus}"`,
          }],
        };
      }

      // === Reduce: Find patterns ===
      const byType: Record<string, Memory[]> = {};
      const tagCounts: Record<string, number> = {};
      const highImportance: Memory[] = [];
      const potentialDuplicates: Array<[Memory, Memory]> = [];

      for (const mem of targetMemories) {
        // Group by type
        if (!byType[mem.type]) byType[mem.type] = [];
        byType[mem.type].push(mem);

        // Count tags
        const tags = (mem.metadata?.tags as string[]) || [];
        for (const tag of tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }

        // Track high-importance memories (use new importanceScore or legacy importance)
        const importance = mem.importanceScore ? mem.importanceScore * 10 : (mem.importance || 5);
        if (importance >= 7) {
          highImportance.push(mem);
        }
      }

      // Find near-duplicates (same type + first 40 chars similar)
      for (let i = 0; i < targetMemories.length; i++) {
        for (let j = i + 1; j < targetMemories.length; j++) {
          const a = targetMemories[i];
          const b = targetMemories[j];
          if (a.type === b.type) {
            const aPrefix = a.content.slice(0, 40).toLowerCase();
            const bPrefix = b.content.slice(0, 40).toLowerCase();
            if (aPrefix === bPrefix || a.content === b.content) {
              potentialDuplicates.push([a, b]);
            }
          }
        }
      }

      // === Build reflection text ===
      const lines: string[] = [];
      lines.push(`[REFLECTION] Analysis of ${targetMemories.length} memories${focus ? ` (focus: ${focus})` : ''}`);
      lines.push('');

      // Type breakdown
      lines.push('## Memory Distribution');
      for (const [type, mems] of Object.entries(byType)) {
        lines.push(`- ${type}: ${mems.length} entries`);
      }

      // Top tags
      const topTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
      if (topTags.length > 0) {
        lines.push('');
        lines.push('## Most Frequent Tags');
        for (const [tag, count] of topTags) {
          lines.push(`- ${tag}: mentioned ${count}x`);
        }
      }

      // High-importance highlights
      if (highImportance.length > 0) {
        lines.push('');
        lines.push('## High-Priority Facts');
        for (const mem of highImportance.slice(0, 5)) {
          const imp = mem.importanceScore ? Math.round(mem.importanceScore * 10) : (mem.importance || 5);
          lines.push(`- [${mem.type}, importance:${imp}/10] ${mem.content.slice(0, 100)}`);
        }
      }

      // Duplicates warning
      if (potentialDuplicates.length > 0) {
        lines.push('');
        lines.push(`## Possible Duplicates (${potentialDuplicates.length} pairs)`);
        for (const [a, b] of potentialDuplicates.slice(0, 3)) {
          lines.push(`- "${a.content.slice(0, 60)}" ↔ "${b.content.slice(0, 60)}"`);
        }
      }

      const reflectionContent = lines.join('\n');

      // Save reflection as a new memory (Multi-Tier Memory: experiential layer)
      const reflectionMemory: Memory = {
        id: uuidv4(),
        userId,
        type: 'fact',
        content: reflectionContent,
        importance: 6,
        importanceScore: 0.6,
        memoryLayer: 'experiential', // Reflections are medium-term insights
        consolidationStatus: 'consolidated', // Already consolidated by nature
        expiryTimestamp: Date.now() + (90 * 24 * 60 * 60 * 1000), // 90 days
        metadata: {
          tags: ['reflection', 'analysis', ...(focus ? [focus] : [])],
          source: 'memory_reflect',
          analyzedCount: targetMemories.length,
          generatedAt: new Date().toISOString(),
        },
        status: 'active',
        createdAt: new Date(),
        lastAccessedAt: Date.now(),
        accessCount: 0,
      };

      await storage.save(reflectionMemory);

      return {
        content: [{
          type: 'text',
          text: `Reflection saved (ID: ${reflectionMemory.id})\n\n${reflectionContent}`,
        }],
        data: {
          reflectionId: reflectionMemory.id,
          analyzedCount: targetMemories.length,
          duplicatesFound: potentialDuplicates.length,
          highImportanceCount: highImportance.length,
        },
      } as any;

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error running reflection: ${error.message}`,
        }],
        error: error.message,
      };
    }
  },
};
