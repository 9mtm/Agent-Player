/**
 * task_create Tool
 *
 * Allows Claude (in the agentic loop) to create a task and delegate it to
 * another agent. The task is registered in the multi-agent orchestrator.
 *
 * If the target agent has auto_approve_tasks=1, the task is immediately
 * assigned. Otherwise it enters 'pending' state and waits for human approval
 * in the Kanban board.
 */

import type { Tool, ToolResult } from '../types.js';
import { getOrchestrator } from '../../multi-agent/index.js';
import { getDatabase } from '../../db/index.js';

export const taskCreateTool: Tool = {
  name: 'task_create',
  description: 'Create a task and assign it to a specific agent. The agent will execute it on their next cron tick (or immediately if auto-approved). Use this to delegate work to specialized agents.',
  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Short title for the task (e.g. "Research competitors", "Write blog post")',
      },
      description: {
        type: 'string',
        description: 'Full description of what the agent needs to do. Be specific and detailed.',
      },
      assigned_to: {
        type: 'string',
        description: 'Agent name or ID to assign this task to. Use the exact agent name from the system.',
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'Task priority. Default: medium',
      },
      requires_approval: {
        type: 'string',
        enum: ['true', 'false'],
        description: 'Whether a human must approve before execution. Default: based on agent auto_approve setting.',
      },
      dependencies: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional list of task IDs that must complete before this task starts. Use this to chain tasks in a pipeline: Task A → Task B → Task C.',
      },
      input_data: {
        type: 'object',
        description: 'Optional initial input data for the task. The agent will receive this as context. Example: { "topic": "Python best practices", "format": "markdown" }',
      },
    },
    required: ['title', 'description', 'assigned_to'],
  },

  async execute(params): Promise<ToolResult> {
    const { title, description, assigned_to, priority = 'medium', requires_approval, dependencies, input_data } = params as {
      title: string;
      description: string;
      assigned_to: string;
      priority?: string;
      requires_approval?: string;
      dependencies?: string[];
      input_data?: Record<string, unknown>;
    };

    try {
      // Resolve agent name → id from agents_config
      const db = getDatabase();
      const agent = db.prepare(
        `SELECT id, name, auto_approve_tasks FROM agents_config WHERE name = ? OR id = ? LIMIT 1`
      ).get(assigned_to, assigned_to) as { id: string; name: string; auto_approve_tasks: number } | undefined;

      if (!agent) {
        return {
          content: [{ type: 'text', text: `Error: Agent "${assigned_to}" not found. Use task_list to see available agents.` }],
          error: 'Agent not found',
        };
      }

      // Determine if approval is required
      const needsApproval = requires_approval === 'true'
        ? true
        : requires_approval === 'false'
          ? false
          : !agent.auto_approve_tasks; // default: inverse of auto_approve

      const orchestrator = getOrchestrator();

      // Create task in orchestrator
      const task = orchestrator.createTask({
        title,
        description,
        priority: priority as 'low' | 'medium' | 'high' | 'urgent',
        requiredCapabilities: [],
        dependencies: dependencies ?? [],
        inputData: input_data,
      });

      // If approved, immediately assign to agent
      if (!needsApproval) {
        orchestrator.assignTask(task.id, agent.id);
      }

      const statusMsg = needsApproval
        ? `Task created (pending approval). Approve it in the Tasks dashboard to start execution.`
        : `Task created and assigned to ${agent.name}. Will execute on next cron tick.`;

      return {
        content: [{
          type: 'text',
          text: `✅ Task created successfully!\n\nTask ID: ${task.id}\nTitle: ${title}\nAssigned to: ${agent.name}\nStatus: ${needsApproval ? 'pending (needs approval)' : 'assigned'}\nPriority: ${priority}\n\n${statusMsg}`,
        }],
        details: { taskId: task.id, agentId: agent.id, agentName: agent.name, status: task.status },
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Error creating task: ${err.message}` }],
        error: err.message,
      };
    }
  },
};
