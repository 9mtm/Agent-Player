/**
 * Multi-Agent API Routes
 * REST endpoints for agent coordination and orchestration
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getOrchestrator,
  getMessaging,
  type AgentDefinition,
  type TeamDefinition,
  type Task,
  type MessageType,
} from '../../multi-agent/index.js';
import { getDatabase } from '../../db/index.js';

export async function multiAgentRoutes(fastify: FastifyInstance): Promise<void> {
  const prefix = '/api/multi-agent';

  // ============ Agents ============

  /**
   * GET /api/multi-agent/agents - List all agents
   */
  fastify.get(`${prefix}/agents`, {
    schema: {
      tags: ['Agents'],
      summary: 'List all agents',
      description: 'Returns a list of all registered agents with optional filtering',
      querystring: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: ['leader', 'worker', 'specialist', 'reviewer', 'assistant'] },
          status: { type: 'string', enum: ['idle', 'busy', 'waiting', 'error', 'offline'] },
        },
      },
      // response: {
      //   200: {
      //     type: 'object',
      //     properties: {
      //       agents: { type: 'array', items: { $ref: 'AgentInstance' } },
      //     },
      //   },
      // },
    },
  }, async (request, reply) => {
    const { role, status } = request.query as { role?: string; status?: string };
    const orchestrator = getOrchestrator();
    const agents = orchestrator.listAgents({ role, status });
    return reply.send({ agents });
  });

  /**
   * POST /api/multi-agent/agents - Register a new agent
   */
  fastify.post(`${prefix}/agents`, {
    schema: {
      tags: ['Agents'],
      summary: 'Register a new agent',
      description: 'Creates and registers a new AI agent with the specified configuration',
      // body: { $ref: 'AgentDefinition' },
      // response: {
      //   201: {
      //     type: 'object',
      //     properties: {
      //       success: { type: 'boolean' },
      //       agent: { $ref: 'AgentInstance' },
      //     },
      //   },
      //   400: { $ref: 'ErrorResponse' },
      //   409: { $ref: 'ErrorResponse' },
      // },
    },
  }, async (request, reply) => {
    const body = request.body as AgentDefinition;

    if (!body.id || !body.name || !body.role) {
      return reply.status(400).send({ error: 'Missing required fields: id, name, role' });
    }

    const orchestrator = getOrchestrator();

    // Check if agent already exists
    if (orchestrator.getAgent(body.id)) {
      return reply.status(409).send({ error: 'Agent already exists' });
    }

    orchestrator.registerAgent(body);
    return reply.status(201).send({ success: true, agent: orchestrator.getAgent(body.id) });
  });

  /**
   * GET /api/multi-agent/agents/:id - Get agent by ID
   */
  fastify.get(`${prefix}/agents/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const orchestrator = getOrchestrator();
    const agent = orchestrator.getAgent(id);

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    return reply.send({ agent });
  });

  /**
   * PUT /api/multi-agent/agents/:id/status - Update agent status
   */
  fastify.put(`${prefix}/agents/:id/status`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: 'idle' | 'busy' | 'offline' };

    const orchestrator = getOrchestrator();
    const agent = orchestrator.getAgent(id);

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    agent.status = status;
    return reply.send({ success: true, agent });
  });

  /**
   * DELETE /api/multi-agent/agents/:id - Remove agent
   */
  fastify.delete(`${prefix}/agents/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const orchestrator = getOrchestrator();
    const success = orchestrator.removeAgent(id);

    if (!success) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    return reply.send({ success: true });
  });

  // ============ Teams ============

  /**
   * GET /api/multi-agent/teams - List all teams
   */
  fastify.get(`${prefix}/teams`, async (_request, reply) => {
    const orchestrator = getOrchestrator();
    const teams = orchestrator.listTeams();
    return reply.send({ teams });
  });

  /**
   * POST /api/multi-agent/teams - Create a new team
   */
  fastify.post(`${prefix}/teams`, async (request, reply) => {
    const body = request.body as TeamDefinition;

    if (!body.id || !body.name || !body.agentIds || body.agentIds.length === 0) {
      return reply.status(400).send({ error: 'Missing required fields: id, name, agentIds' });
    }

    const orchestrator = getOrchestrator();

    // Check if team already exists
    if (orchestrator.getTeam(body.id)) {
      return reply.status(409).send({ error: 'Team already exists' });
    }

    orchestrator.createTeam(body);
    return reply.status(201).send({ success: true, team: orchestrator.getTeam(body.id) });
  });

  /**
   * GET /api/multi-agent/teams/:id - Get team by ID
   */
  fastify.get(`${prefix}/teams/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const orchestrator = getOrchestrator();
    const team = orchestrator.getTeam(id);

    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    return reply.send({ team });
  });

  /**
   * DELETE /api/multi-agent/teams/:id - Disband team
   */
  fastify.delete(`${prefix}/teams/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const orchestrator = getOrchestrator();
    const success = orchestrator.disbandTeam(id);

    if (!success) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    return reply.send({ success: true });
  });

  // ============ Tasks ============

  /**
   * GET /api/multi-agent/tasks - List all tasks
   */
  fastify.get(`${prefix}/tasks`, {
    schema: {
      tags: ['Tasks'],
      summary: 'List all tasks',
      description: 'Returns a list of tasks with optional filtering by status, assignee, or team',
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'assigned', 'in_progress', 'review', 'completed', 'failed', 'cancelled'] },
          assignedTo: { type: 'string', description: 'Filter by assigned agent ID' },
          teamId: { type: 'string', description: 'Filter by team ID' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            tasks: { type: 'array', items: { $ref: 'Task' } },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { status, assignedTo, teamId, limit } = request.query as {
      status?: string;
      assignedTo?: string;
      teamId?: string;
      limit?: string;
    };

    const orchestrator = getOrchestrator();
    const tasks = orchestrator.listTasks({
      status: status as any,
      assignedTo,
      teamId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return reply.send({ tasks });
  });

  /**
   * POST /api/multi-agent/tasks - Create a new task
   */
  fastify.post(`${prefix}/tasks`, async (request, reply) => {
    const body = request.body as {
      title: string;
      description: string;
      priority?: string;
      requiredCapabilities?: string[];
      teamId?: string;
      parentId?: string;
      dependencies?: string[];
      inputData?: Record<string, unknown>;
      deadline?: string;
      maxRetries?: number;
      assignedTo?: string;   // agent id or name — if provided, auto-assign after creation
    };

    if (!body.title || !body.description) {
      return reply.status(400).send({ error: 'Missing required fields: title, description' });
    }

    const orchestrator = getOrchestrator();
    const task = orchestrator.createTask({
      title: body.title,
      description: body.description,
      priority: body.priority as any,
      requiredCapabilities: body.requiredCapabilities,
      teamId: body.teamId,
      parentId: body.parentId,
      dependencies: body.dependencies,
      inputData: body.inputData,
      deadline: body.deadline ? new Date(body.deadline) : undefined,
      maxRetries: body.maxRetries,
    });

    // If an agent was specified, resolve it and auto-assign
    if (body.assignedTo) {
      const db = getDatabase();
      const agent = db.prepare(
        `SELECT id, auto_approve_tasks FROM agents_config WHERE id = ? OR name = ? LIMIT 1`
      ).get(body.assignedTo, body.assignedTo) as { id: string; auto_approve_tasks: number } | undefined;

      if (agent) {
        orchestrator.assignTask(task.id, agent.id);
      }
    }

    return reply.status(201).send({ success: true, task: orchestrator.getTask(task.id) ?? task });
  });

  /**
   * GET /api/multi-agent/tasks/:id - Get task by ID
   */
  fastify.get(`${prefix}/tasks/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const orchestrator = getOrchestrator();
    const task = orchestrator.getTask(id);

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return reply.send({ task });
  });

  /**
   * PUT /api/multi-agent/tasks/:id/status - Update task status
   */
  fastify.put(`${prefix}/tasks/:id/status`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status, result, error, progress } = request.body as {
      status?: Task['status'];
      result?: Record<string, unknown>;
      error?: string;
      progress?: number;
    };

    const orchestrator = getOrchestrator();
    const task = orchestrator.getTask(id);

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    let success = false;

    // Update progress if provided
    if (progress !== undefined) {
      orchestrator.updateTaskProgress(id, progress, result);
      success = true;
    }

    // Handle status transitions
    if (status) {
      switch (status) {
        case 'in_progress':
          success = orchestrator.startTask(id);
          break;
        case 'completed':
          success = orchestrator.completeTask(id, result);
          break;
        case 'failed':
          success = orchestrator.failTask(id, error || 'Unknown error');
          break;
        default:
          success = true; // Other status changes not directly supported
      }
    }

    return reply.send({ success, task: orchestrator.getTask(id) });
  });

  /**
   * PATCH /api/multi-agent/tasks/:id - Update task title/description
   */
  fastify.patch(`${prefix}/tasks/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { title, description } = request.body as { title?: string; description?: string };

    const orchestrator = getOrchestrator();
    const task = orchestrator.getTask(id);
    if (!task) return reply.status(404).send({ error: 'Task not found' });

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    (orchestrator as any).persistTask(task);

    return reply.send({ success: true, task: orchestrator.getTask(id) });
  });

  /**
   * POST /api/multi-agent/tasks/:id/assign - Manually assign task
   */
  fastify.post(`${prefix}/tasks/:id/assign`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { agentId } = request.body as { agentId: string };

    if (!agentId) {
      return reply.status(400).send({ error: 'Missing required field: agentId' });
    }

    const orchestrator = getOrchestrator();
    const success = orchestrator.assignTask(id, agentId);

    if (!success) {
      return reply.status(400).send({ error: 'Failed to assign task' });
    }

    return reply.send({ success: true, task: orchestrator.getTask(id) });
  });

  /**
   * POST /api/multi-agent/tasks/:id/approve - Approve pending task and assign to agent
   */
  fastify.post(`${prefix}/tasks/:id/approve`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { agentId } = request.body as { agentId: string };

    if (!agentId) {
      return reply.status(400).send({ error: 'Missing required field: agentId' });
    }

    const orchestrator = getOrchestrator();
    const success = orchestrator.assignTask(id, agentId);

    if (!success) {
      return reply.status(400).send({ error: 'Failed to approve task' });
    }

    return reply.send({ success: true, task: orchestrator.getTask(id) });
  });

  // ============ Messaging ============

  /**
   * POST /api/multi-agent/messages - Send a message
   */
  fastify.post(`${prefix}/messages`, async (request, reply) => {
    const body = request.body as {
      from: string;
      to: string;
      type: MessageType;
      content: string;
      taskId?: string;
      teamId?: string;
      data?: Record<string, unknown>;
    };

    if (!body.from || !body.to || !body.type || !body.content) {
      return reply.status(400).send({ error: 'Missing required fields: from, to, type, content' });
    }

    const messaging = getMessaging();
    const message = messaging.send(body);

    return reply.status(201).send({ success: true, message });
  });

  /**
   * POST /api/multi-agent/messages/broadcast - Broadcast message to team
   */
  fastify.post(`${prefix}/messages/broadcast`, async (request, reply) => {
    const body = request.body as {
      from: string;
      teamId: string;
      type: MessageType;
      content: string;
      taskId?: string;
      data?: Record<string, unknown>;
    };

    if (!body.from || !body.teamId || !body.type || !body.content) {
      return reply.status(400).send({ error: 'Missing required fields: from, teamId, type, content' });
    }

    const messaging = getMessaging();
    const message = messaging.broadcast(body);

    return reply.status(201).send({ success: true, message });
  });

  /**
   * GET /api/multi-agent/messages/:agentId - Get messages for an agent
   */
  fastify.get(`${prefix}/messages/:agentId`, async (request, reply) => {
    const { agentId } = request.params as { agentId: string };
    const { unreadOnly, type, limit } = request.query as {
      unreadOnly?: string;
      type?: string;
      limit?: string;
    };

    const messaging = getMessaging();
    const messages = messaging.getMessages(agentId, {
      unreadOnly: unreadOnly === 'true',
      type: type as MessageType | undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return reply.send({ messages });
  });

  /**
   * PUT /api/multi-agent/messages/:id/read - Mark message as read
   */
  fastify.put(`${prefix}/messages/:id/read`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const messaging = getMessaging();
    const success = messaging.markAsRead(id);

    return reply.send({ success });
  });

  /**
   * POST /api/multi-agent/messages/:id/reply - Reply to a message
   */
  fastify.post(`${prefix}/messages/:id/reply`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { from, content, data } = request.body as {
      from: string;
      content: string;
      data?: Record<string, unknown>;
    };

    if (!from || !content) {
      return reply.status(400).send({ error: 'Missing required fields: from, content' });
    }

    const messaging = getMessaging();
    const message = messaging.reply(id, { from, content, data });

    if (!message) {
      return reply.status(404).send({ error: 'Original message not found' });
    }

    return reply.status(201).send({ success: true, message });
  });

  // ============ Handoffs ============

  /**
   * POST /api/multi-agent/handoffs - Request task handoff
   */
  fastify.post(`${prefix}/handoffs`, async (request, reply) => {
    const body = request.body as {
      fromAgent: string;
      toAgent: string;
      taskId: string;
      reason: string;
      context: Record<string, unknown>;
    };

    if (!body.fromAgent || !body.toAgent || !body.taskId || !body.reason) {
      return reply.status(400).send({
        error: 'Missing required fields: fromAgent, toAgent, taskId, reason'
      });
    }

    const messaging = getMessaging();
    const handoff = messaging.requestHandoff({
      ...body,
      context: body.context || {},
    });

    return reply.status(201).send({ success: true, handoff });
  });

  /**
   * GET /api/multi-agent/handoffs/:agentId - Get pending handoffs for agent
   */
  fastify.get(`${prefix}/handoffs/:agentId`, async (request, reply) => {
    const { agentId } = request.params as { agentId: string };
    const messaging = getMessaging();
    const handoffs = messaging.getPendingHandoffs(agentId);

    return reply.send({ handoffs });
  });

  /**
   * POST /api/multi-agent/handoffs/:id/accept - Accept handoff
   */
  fastify.post(`${prefix}/handoffs/:id/accept`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const messaging = getMessaging();
    const success = messaging.acceptHandoff(id);

    if (!success) {
      return reply.status(400).send({ error: 'Failed to accept handoff' });
    }

    return reply.send({ success: true });
  });

  /**
   * POST /api/multi-agent/handoffs/:id/reject - Reject handoff
   */
  fastify.post(`${prefix}/handoffs/:id/reject`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason?: string };
    const messaging = getMessaging();
    const success = messaging.rejectHandoff(id, reason);

    if (!success) {
      return reply.status(400).send({ error: 'Failed to reject handoff' });
    }

    return reply.send({ success: true });
  });

  // ============ Shared Memory ============

  /**
   * POST /api/multi-agent/teams/:teamId/memory - Share memory with team
   */
  fastify.post(`${prefix}/teams/:teamId/memory`, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const body = request.body as {
      from: string;
      type: 'fact' | 'task' | 'decision' | 'observation' | 'note';
      content: string;
      importance?: number;
      related?: string[];
    };

    if (!body.from || !body.type || !body.content) {
      return reply.status(400).send({ error: 'Missing required fields: from, type, content' });
    }

    const messaging = getMessaging();
    const entry = messaging.shareMemory({
      from: body.from,
      teamId,
      entry: {
        type: body.type,
        content: body.content,
        importance: body.importance ?? 0.5,
        related: body.related,
      },
    });

    return reply.status(201).send({ success: true, entry });
  });

  /**
   * GET /api/multi-agent/teams/:teamId/memory - Get team shared memory
   */
  fastify.get(`${prefix}/teams/:teamId/memory`, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const messaging = getMessaging();
    const memory = messaging.getSharedMemory(teamId);

    return reply.send({ memory });
  });

  // ============ History ============

  /**
   * GET /api/multi-agent/history - Get message history
   */
  fastify.get(`${prefix}/history`, async (request, reply) => {
    const { teamId, agentId, taskId, limit } = request.query as {
      teamId?: string;
      agentId?: string;
      taskId?: string;
      limit?: string;
    };

    const messaging = getMessaging();
    const history = messaging.getHistory({
      teamId,
      agentId,
      taskId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return reply.send({ history });
  });

  // ============ Stats ============

  /**
   * GET /api/multi-agent/stats - Get system statistics
   */
  fastify.get(`${prefix}/stats`, {
    schema: {
      tags: ['Multi-Agent'],
      summary: 'Get system statistics',
      description: 'Returns comprehensive statistics about the multi-agent system including agents, teams, tasks, and messaging',
      response: {
        200: {
          type: 'object',
          properties: {
            orchestrator: { $ref: 'MultiAgentStats' },
            messaging: {
              type: 'object',
              properties: {
                totalMessages: { type: 'integer' },
                pendingMessages: { type: 'integer' },
                pendingHandoffs: { type: 'integer' },
                queuedAgents: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  }, async (_request, reply) => {
    const orchestrator = getOrchestrator();
    const messaging = getMessaging();

    return reply.send({
      orchestrator: orchestrator.getStats(),
      messaging: messaging.getStats(),
    });
  });
}
