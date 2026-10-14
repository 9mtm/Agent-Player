/**
 * Workflow API Routes
 * CRUD operations for managing workflows
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import { q } from '../../repositories/sql-steps.js';
import { withIsoFields } from '../timestamps.js';
import { randomUUID } from 'crypto';
import { WorkflowExecutor } from '../../workflows/executor.js';
import { handleError } from '../error-handler.js';

interface WorkflowNode {
    id: string;
    type: 'trigger' | 'action' | 'condition' | 'loop' | 'delay';
    position: { x: number; y: number };
    data: Record<string, any>;
}

interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
}

interface Workflow {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    enabled: number;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    created_at: string;
    updated_at: string;
}

interface WorkflowExecution {
    id: string;
    workflow_id: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    started_at: string;
    completed_at?: string;
    error?: string;
    logs?: any[];
}

const WORKFLOW_TIMES = ['created_at', 'updated_at'] as const;
const EXECUTION_TIMES = ['started_at', 'completed_at'] as const;

/** A stored workflow row as the API returns it (JSON fields parsed, ISO UTC times). */
function parseWorkflow(w: Workflow) {
    return withIsoFields({
        ...w,
        nodes: JSON.parse(w.nodes as any),
        edges: JSON.parse(w.edges as any),
        enabled: Boolean(w.enabled)
    }, WORKFLOW_TIMES);
}

export async function workflowRoutes(fastify: FastifyInstance) {

    // SECURITY (S0-A.6): the user is the verified token user (the auth gate
    // sets request.authUser; getUserIdFromRequest is the second line), never
    // "the first user in the database".
    function getUserId(request: FastifyRequest): string {
        const authUser = (request as any).authUser as { id: string } | null | undefined;
        return authUser?.id || getUserIdFromRequest(request);
    }

    // Get all workflows for current user
    fastify.get('/api/workflows', async (request, reply) => {
        try {
            // TODO: Get user_id from JWT token in request.headers.authorization
            // For now, we'll use a default user
            const user_id = getUserId(request);

            const workflows = await q.all<Workflow>(`
                SELECT id, user_id, name, description, enabled, nodes, edges, created_at, updated_at
                FROM workflows
                WHERE user_id = ?
                ORDER BY updated_at DESC`,
                user_id);

            const parsedWorkflows = workflows.map(parseWorkflow);

            return reply.send({ workflows: parsedWorkflows });
        } catch (error: any) {
            console.error('Error fetching workflows:', error);
            // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
            return handleError(reply, error, 'internal', '[Workflows] List failed');
        }
    });

    // Get single workflow by ID
    fastify.get('/api/workflows/:id', async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const user_id = getUserId(request);

            const workflow = await q.one<Workflow>(`
                SELECT id, user_id, name, description, enabled, nodes, edges, created_at, updated_at
                FROM workflows
                WHERE id = ? AND user_id = ?`,
                id, user_id);

            if (!workflow) {
                return reply.status(404).send({ error: 'Workflow not found' });
            }

            return reply.send({ workflow: parseWorkflow(workflow) });
        } catch (error: any) {
            console.error('Error fetching workflow:', error);
            // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
            return handleError(reply, error, 'internal', '[Workflows] Get failed');
        }
    });

    // Create new workflow
    fastify.post('/api/workflows', async (request, reply) => {
        try {
            const { name, description, nodes, edges, enabled } = request.body as {
                name: string;
                description?: string;
                nodes: WorkflowNode[];
                edges: WorkflowEdge[];
                enabled?: boolean;
            };

            // Validation
            if (!name || !name.trim()) {
                return reply.status(400).send({ error: 'Workflow name is required' });
            }

            if (!Array.isArray(nodes)) {
                return reply.status(400).send({ error: 'Nodes must be an array' });
            }

            if (!Array.isArray(edges)) {
                return reply.status(400).send({ error: 'Edges must be an array' });
            }

            const user_id = getUserId(request);
            const id = randomUUID();
            const now = new Date().toISOString();

            await q.run(`
                INSERT INTO workflows (id, user_id, name, description, enabled, nodes, edges, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                id,
                user_id,
                name.trim(),
                description?.trim() || null,
                enabled ? 1 : 0,
                JSON.stringify(nodes),
                JSON.stringify(edges),
                now,
                now
            );

            const workflow = {
                id,
                user_id,
                name: name.trim(),
                description: description?.trim(),
                enabled: enabled || false,
                nodes,
                edges,
                created_at: now,
                updated_at: now
            };

            return reply.status(201).send({
                success: true,
                message: 'Workflow created successfully',
                workflow
            });
        } catch (error: any) {
            console.error('Error creating workflow:', error);
            // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
            return handleError(reply, error, 'internal', '[Workflows] Create failed');
        }
    });

    // Update existing workflow
    fastify.put('/api/workflows/:id', async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const { name, description, nodes, edges, enabled } = request.body as {
                name?: string;
                description?: string;
                nodes?: WorkflowNode[];
                edges?: WorkflowEdge[];
                enabled?: boolean;
            };

            const user_id = getUserId(request);

            // Check if workflow exists
            const existing = await q.one('SELECT id FROM workflows WHERE id = ? AND user_id = ?', id, user_id);

            if (!existing) {
                return reply.status(404).send({ error: 'Workflow not found' });
            }

            // Build update query dynamically
            const updates: string[] = [];
            const values: Array<string | number | null> = [];

            if (name !== undefined) {
                if (!name.trim()) {
                    return reply.status(400).send({ error: 'Workflow name cannot be empty' });
                }
                updates.push('name = ?');
                values.push(name.trim());
            }

            if (description !== undefined) {
                updates.push('description = ?');
                values.push(description?.trim() || null);
            }

            if (nodes !== undefined) {
                if (!Array.isArray(nodes)) {
                    return reply.status(400).send({ error: 'Nodes must be an array' });
                }
                updates.push('nodes = ?');
                values.push(JSON.stringify(nodes));
            }

            if (edges !== undefined) {
                if (!Array.isArray(edges)) {
                    return reply.status(400).send({ error: 'Edges must be an array' });
                }
                updates.push('edges = ?');
                values.push(JSON.stringify(edges));
            }

            if (enabled !== undefined) {
                updates.push('enabled = ?');
                values.push(enabled ? 1 : 0);
            }

            if (updates.length === 0) {
                return reply.status(400).send({ error: 'No fields to update' });
            }

            updates.push('updated_at = ?');
            values.push(new Date().toISOString());

            values.push(id, user_id);

            await q.run(`
                UPDATE workflows
                SET ${updates.join(', ')}
                WHERE id = ? AND user_id = ?`,
                ...values);

            // Fetch updated workflow
            const workflow = await q.one<Workflow>(`
                SELECT id, user_id, name, description, enabled, nodes, edges, created_at, updated_at
                FROM workflows
                WHERE id = ? AND user_id = ?`,
                id, user_id);
            if (!workflow) {
                return reply.status(404).send({ error: 'Workflow not found' });
            }

            const parsedWorkflow = parseWorkflow(workflow);

            return reply.send({
                success: true,
                message: 'Workflow updated successfully',
                workflow: parsedWorkflow
            });
        } catch (error: any) {
            console.error('Error updating workflow:', error);
            // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
            return handleError(reply, error, 'internal', '[Workflows] Update failed');
        }
    });

    // Delete workflow
    fastify.delete('/api/workflows/:id', async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const user_id = getUserId(request);

            // Check if workflow exists
            const existing = await q.one('SELECT id FROM workflows WHERE id = ? AND user_id = ?', id, user_id);

            if (!existing) {
                return reply.status(404).send({ error: 'Workflow not found' });
            }

            // Delete workflow (cascade will delete executions)
            await q.run('DELETE FROM workflows WHERE id = ? AND user_id = ?', id, user_id);

            return reply.send({
                success: true,
                message: 'Workflow deleted successfully'
            });
        } catch (error: any) {
            console.error('Error deleting workflow:', error);
            // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
            return handleError(reply, error, 'internal', '[Workflows] Delete failed');
        }
    });

    // Execute workflow
    fastify.post('/api/workflows/:id/execute', async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const user_id = getUserId(request);

            // Get workflow
            const workflow = await q.one<Workflow>(`
                SELECT id, user_id, name, description, enabled, nodes, edges
                FROM workflows
                WHERE id = ? AND user_id = ?`,
                id, user_id);

            if (!workflow) {
                return reply.status(404).send({ error: 'Workflow not found' });
            }

            if (!workflow.enabled) {
                return reply.status(400).send({ error: 'Workflow is disabled' });
            }

            // Parse nodes and edges
            const nodes = JSON.parse(workflow.nodes as any) as WorkflowNode[];
            const edges = JSON.parse(workflow.edges as any) as WorkflowEdge[];

            // Create execution record
            const execution_id = randomUUID();
            const now = new Date().toISOString();

            await q.run(`
                INSERT INTO workflow_executions (id, workflow_id, status, started_at)
                VALUES (?, ?, 'running', ?)`,
                execution_id, id, now);

            // Execute workflow asynchronously using WorkflowExecutor
            const executor = new WorkflowExecutor(id, execution_id, nodes, edges);

            // Execute in background (non-blocking)
            executor.execute().catch(error => {
                console.error('Workflow execution error:', error);
            });

            return reply.send({
                success: true,
                message: 'Workflow execution started',
                execution: {
                    id: execution_id,
                    workflow_id: id,
                    status: 'running',
                    started_at: now
                }
            });
        } catch (error: any) {
            console.error('Error executing workflow:', error);
            // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
            return handleError(reply, error, 'internal', '[Workflows] Execute failed');
        }
    });

    // Get workflow executions
    fastify.get('/api/workflows/:id/executions', async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const { limit: rawLimit } = request.query as { limit?: string | number };
            // A bound integer on both drivers (a non-numeric limit used to reach the SQL).
            const parsedLimit = Number.parseInt(String(rawLimit ?? 10), 10);
            const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 10;
            const user_id = getUserId(request);

            // Verify workflow belongs to user
            const workflow = await q.one('SELECT id FROM workflows WHERE id = ? AND user_id = ?', id, user_id);

            if (!workflow) {
                return reply.status(404).send({ error: 'Workflow not found' });
            }

            const executions = await q.all<WorkflowExecution>(`
                SELECT id, workflow_id, status, started_at, completed_at, error, logs
                FROM workflow_executions
                WHERE workflow_id = ?
                ORDER BY started_at DESC
                LIMIT ?`,
                id, limit);

            // Parse logs
            const parsedExecutions = executions.map(e => withIsoFields({
                ...e,
                logs: e.logs ? JSON.parse(e.logs as any) : []
            }, EXECUTION_TIMES));

            return reply.send({ executions: parsedExecutions });
        } catch (error: any) {
            console.error('Error fetching executions:', error);
            // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
            return handleError(reply, error, 'internal', '[Workflows] Get executions failed');
        }
    });

    console.log('[Workflow API] ✅ Routes registered');
}
