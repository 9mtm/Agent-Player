/**
 * Memory Stats Tool
 *
 * Returns a summary of what the agent knows about a user:
 * total count, breakdown by type, most-used tags, oldest/newest entries.
 *
 * Useful for agents to understand their own knowledge base before
 * deciding whether to save new information or run a reflection.
 */

import type { Tool, ToolResult } from '../types.js';
import { getDatabase } from '../../db/index.js';

interface MemoryStatsParams {
  userId: string;
}

export const memoryStatsTool: Tool = {
  name: 'memory_stats',
  description: `Get a quick summary of stored memories for a user.

Returns:
- Total memory count and size breakdown by type
- Top 10 most-used tags
- Oldest and newest memory timestamps
- How many high-importance (>= 7) memories exist

Use this before memory_reflect or memory_search to understand what you know.`,

  input_schema: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'User ID (automatically provided)',
      },
    },
    required: ['userId'],
    examples: [
      {
        userId: 'user-123',
        description: 'Get overview of stored memories and knowledge base',
      },
    ],
  },

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const { userId } = params as MemoryStatsParams;

    try {
      const db = getDatabase().getDb();

      // Total count
      const total = (db.prepare('SELECT COUNT(*) as n FROM memories WHERE user_id = ?').get(userId) as any)?.n ?? 0;

      if (total === 0) {
        return {
          content: [{ type: 'text', text: 'No memories stored yet for this user.' }],
        };
      }

      // Count by type
      const byType = db.prepare(`
        SELECT type, COUNT(*) as n
        FROM memories WHERE user_id = ?
        GROUP BY type ORDER BY n DESC
      `).all(userId) as Array<{ type: string; n: number }>;

      // Count by importance bracket
      const highImp = (db.prepare(`
        SELECT COUNT(*) as n FROM memories WHERE user_id = ? AND importance >= 7
      `).get(userId) as any)?.n ?? 0;

      // Date range
      const dates = db.prepare(`
        SELECT MIN(created_at) as oldest, MAX(created_at) as newest
        FROM memories WHERE user_id = ?
      `).get(userId) as any;

      // Top tags (tags is stored as JSON array string)
      const allTagRows = db.prepare(`
        SELECT tags FROM memories WHERE user_id = ? AND tags IS NOT NULL
      `).all(userId) as Array<{ tags: string }>;

      const tagCounts: Record<string, number> = {};
      for (const row of allTagRows) {
        try {
          const tags: string[] = JSON.parse(row.tags);
          for (const tag of tags) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        } catch {
          // skip malformed
        }
      }
      const topTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      // Build readable output
      const lines: string[] = [];
      lines.push(`Memory Stats for user: ${userId}`);
      lines.push(`Total: ${total} memories`);
      lines.push(`High importance (>= 7): ${highImp}`);
      lines.push('');

      lines.push('By type:');
      for (const row of byType) {
        lines.push(`  ${row.type}: ${row.n}`);
      }

      if (topTags.length > 0) {
        lines.push('');
        lines.push('Top tags:');
        for (const [tag, count] of topTags) {
          lines.push(`  ${tag}: ${count}x`);
        }
      }

      lines.push('');
      lines.push(`Date range: ${dates?.oldest?.slice(0, 10) ?? '?'} → ${dates?.newest?.slice(0, 10) ?? '?'}`);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
        data: {
          total,
          highImportance: highImp,
          byType: Object.fromEntries(byType.map(r => [r.type, r.n])),
          topTags: Object.fromEntries(topTags),
          oldest: dates?.oldest,
          newest: dates?.newest,
        },
      } as any;

    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error getting memory stats: ${error.message}` }],
        error: error.message,
      };
    }
  },
};
