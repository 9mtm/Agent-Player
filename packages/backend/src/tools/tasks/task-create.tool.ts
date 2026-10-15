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

import type { Tool, ToolResult, ToolExecutionContext } from '../types.js';
import { getOrchestrator } from '../../multi-agent/index.js';
import { normalizeTaskPriority } from '../../multi-agent/orchestrator.js';
import { one, sql } from '../../repositories/sql-steps.js';

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
        enum: ['low', 'normal', 'high', 'urgent'],
        description: 'Task priority. Default: normal',
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

  async execute(params, context?: ToolExecutionContext): Promise<ToolResult> {
    const { title, description, assigned_to, priority, dependencies, input_data } = params as {
      title: string;
      description: string;
      assigned_to: string;
      priority?: string;
      dependencies?: string[];
      input_data?: Record<string, unknown>;
    };
    // SECURITY (S1.2): the model may not set reserved keys (recurrence, assignee
    // override, upstream results) nor the approval flag.
    const safeInput = input_data && typeof input_data === 'object' && !Array.isArray(input_data)
      ? Object.fromEntries(Object.entries(input_data).filter(([k]) => !k.startsWith('_')))
      : undefined;

    try {
      // Resolve agent name → id from agents_config
      // agents_config on the process driver (B2.2b-4); an id match wins over a name match.
      const agent = await sql().read(one<{ id: string; name: string; auto_approve_tasks: number }>(
        `SELECT id, name, auto_approve_tasks FROM agents_config WHERE name = ? OR id = ? ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, id LIMIT 1`,
        assigned_to, assigned_to, assigned_to));

      if (!agent) {
        return {
          content: [{ type: 'text', text: `Error: Agent "${assigned_to}" not found. Use task_list to see available agents.` }],
          error: 'Agent not found',
        };
      }

      // Approval follows the target agent's owner-set auto_approve flag only.
      const needsApproval = !agent.auto_approve_tasks;

      const orchestrator = getOrchestrator();

      // Create task in orchestrator
      const task = orchestrator.createTask({
        title,
        description,
        // Unknown values (and the old 'medium') become 'normal' in the orchestrator.
        priority: normalizeTaskPriority(priority),
        requiredCapabilities: [],
        dependencies: dependencies ?? [],
        inputData: safeInput && Object.keys(safeInput).length ? safeInput : undefined,
        // SECURITY (S1.2): origin recorded server-side, never from model input.
        // No calling agent -> no spawner -> runs fail closed to the minimal set.
        spawnedBy: context?.agentId,
        parentId: context?.taskId,
        origin: 'agent',
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
