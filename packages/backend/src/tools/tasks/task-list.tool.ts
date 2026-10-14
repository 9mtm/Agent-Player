/**
 * task_list Tool
 *
 * Allows Claude to query tasks in the multi-agent orchestrator.
 * Useful for checking what tasks are pending, assigned, or completed.
 */

import type { Tool, ToolResult } from '../types.js';
import { getOrchestrator } from '../../multi-agent/index.js';
import { one, sql } from '../../repositories/sql-steps.js';

export const taskListTool: Tool = {
  name: 'task_list',
  description: 'List tasks in the multi-agent system. Filter by agent name, status, or get all tasks.',
  input_schema: {
    type: 'object',
    properties: {
      assigned_to: {
        type: 'string',
        description: 'Filter by agent name or ID. Use "me" for the current agent.',
      },
      status: {
        type: 'string',
        enum: ['pending', 'assigned', 'in_progress', 'review', 'completed', 'failed', 'cancelled'],
        description: 'Filter by task status.',
      },
      limit: {
        type: 'string',
        description: 'Max number of tasks to return. Default: 10',
      },
    },
    required: [],
  },

  async execute(params): Promise<ToolResult> {
    const { assigned_to, status, limit = '10' } = params as {
      assigned_to?: string;
      status?: string;
      limit?: string;
    };

    try {
      const orchestrator = getOrchestrator();

      // Resolve "me" or agent name to ID
      let agentIdFilter: string | undefined;
      if (assigned_to && assigned_to !== 'all') {
        // agents_config on the process driver (B2.2b-4); an id match wins over a name match.
        const agent = await sql().read(one<{ id: string }>(
          `SELECT id FROM agents_config WHERE name = ? OR id = ? ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, id LIMIT 1`,
          assigned_to, assigned_to, assigned_to));

        agentIdFilter = agent?.id ?? assigned_to;
      }

      const tasks = orchestrator.listTasks({
        status: status as any,
        assignedTo: agentIdFilter,
        limit: parseInt(limit, 10),
      });

      if (tasks.length === 0) {
        return {
          content: [{ type: 'text', text: 'No tasks found matching the criteria.' }],
        };
      }

      const lines = tasks.map((t: any) =>
        `• [${t.status.toUpperCase()}] "${t.title}" (ID: ${t.id}) — Priority: ${t.priority}${t.assignedTo ? ` — Agent: ${t.assignedTo}` : ''}`
      );

      return {
        content: [{
          type: 'text',
          text: `Found ${tasks.length} task(s):\n\n${lines.join('\n')}`,
        }],
        details: { tasks },
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Error listing tasks: ${err.message}` }],
        error: err.message,
      };
    }
  },
};
