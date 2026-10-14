/**
 * Durable task runs API (CORE-08). Runs and step metadata only: no task
 * input, no tool parameters, no results (those stay encrypted in the DB).
 *
 *   GET  /api/task-runs                              owner: all runs; other accounts: their own runs
 *   GET  /api/task-runs/:id                          run + steps (owner or the run's own user; others 404)
 *   POST /api/task-runs/:id/cancel                   owner or the run's own user; pending approvals of the run are denied
 *   POST /api/task-runs/:id/steps/:index/resolve     owner only: { outcome: 'done' | 'skip' | 'retry' } for a step
 *                                                    whose outcome is unknown after an interruption
 *   POST /api/task-runs/:id/review                   owner only (R1): { decision: 'accept' | 'reject', note?, reviewer?:
 *                                                    'owner' | 'large_agent' } for a run whose result needs review
 *
 * R1: GET /:id also shows the pinned contract (input VALUES never, keys
 * only; texts secret-redacted), verification status/reasons/rounds and the
 * run's cost (R2).
 *
 * Gate: 'user' tier (guests refused) for the first three, 'owner' for resolve
 * (tier rule + config.access); handlers check the role/ownership again.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { logAudit } from '../../services/audit-logger.js';
import {
  RunStateError,
  cancelRun,
  getRun,
  getSteps,
  listRuns,
  resolveUncertainStep,
  runDetailView,
  runView,
  stepView,
  type TaskRunRow,
} from '../../services/task-runs.js';
import { applyRunReview } from '../../services/task-run-executor.js';

const ID = /^[0-9a-f-]{36}$/i;
const STATUSES = new Set(['queued', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled']);
const OUTCOMES = new Set(['done', 'skip', 'retry']);

function caller(request: FastifyRequest, reply: FastifyReply) {
  const user = request.authUser;
  if (!user) { reply.code(401).send({ error: 'Authentication required' }); return null; }
  if (user.role === 'guest') { reply.code(403).send({ error: 'Guest accounts can only use public rooms' }); return null; }
  return user;
}

function visible(run: TaskRunRow | undefined, user: { id: string; role: string }): run is TaskRunRow {
  return !!run && (user.role === 'owner' || (run.user_id !== null && run.user_id === user.id));
}

function audit(request: FastifyRequest, userId: string, action: string, runId: string, success: boolean, metadata: Record<string, unknown>) {
  logAudit({
    event_type: 'data.update',
    event_category: 'data_modification',
    severity: 'warning',
    user_id: userId,
    ip_address: request.ip,
    user_agent: request.headers['user-agent'],
    request_method: request.method,
    request_path: request.routeOptions?.url ?? undefined,
    resource_type: 'task_run',
    resource_id: runId,
    action: `task_run.${action}`,
    success,
    metadata,
  });
}

export async function taskRunsRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { status?: string; taskId?: string; limit?: string } }>('/api/task-runs', async (request, reply) => {
    const user = caller(request, reply);
    if (!user) return reply;
    const { status, taskId, limit } = request.query ?? {};
    if (status !== undefined && !STATUSES.has(status)) return reply.code(400).send({ error: 'Invalid status' });
    if (taskId !== undefined && (typeof taskId !== 'string' || taskId.length > 200)) return reply.code(400).send({ error: 'Invalid taskId' });
    const rows = listRuns({ userId: user.role === 'owner' ? undefined : user.id, status, taskId, limit: Number(limit) || undefined });
    return { runs: rows.map((r) => runView(r)) };
  });

  fastify.get<{ Params: { id: string } }>('/api/task-runs/:id', async (request, reply) => {
    const user = caller(request, reply);
    if (!user) return reply;
    if (!ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid id' });
    const run = getRun(request.params.id);
    if (!visible(run, user)) return reply.code(404).send({ error: 'Run not found' });
    return { run: await runDetailView(run), steps: getSteps(run.id).map(stepView) };
  });

  fastify.post<{ Params: { id: string } }>('/api/task-runs/:id/cancel', async (request, reply) => {
    const user = caller(request, reply);
    if (!user) return reply;
    if (!ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid id' });
    const run = getRun(request.params.id);
    if (!visible(run, user)) return reply.code(404).send({ error: 'Run not found' });
    try {
      const updated = cancelRun(run.id, user.id);
      audit(request, user.id, 'cancel', run.id, true, { taskId: run.task_id, status: updated.status });
      return { run: runView(updated) };
    } catch (err: any) {
      audit(request, user.id, 'cancel', run.id, false, { error: err?.message });
      if (err instanceof RunStateError) return reply.code(err.status).send({ error: err.message });
      throw err;
    }
  });

  fastify.post<{ Params: { id: string; index: string }; Body: { outcome?: string } }>(
    '/api/task-runs/:id/steps/:index/resolve',
    { config: { access: 'owner' as const } },
    async (request, reply) => {
      const user = caller(request, reply);
      if (!user) return reply;
      if (user.role !== 'owner') return reply.code(403).send({ error: 'This action requires the owner account' });
      if (!ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid id' });
      const index = Number(request.params.index);
      if (!/^\d{1,6}$/.test(request.params.index) || !Number.isInteger(index)) return reply.code(400).send({ error: 'Invalid step index' });
      const outcome = request.body?.outcome;
      if (typeof outcome !== 'string' || !OUTCOMES.has(outcome)) return reply.code(400).send({ error: "outcome must be 'done', 'skip' or 'retry'" });
      try {
        const updated = await resolveUncertainStep(request.params.id, index, outcome as 'done' | 'skip' | 'retry', user.id);
        audit(request, user.id, 'resolve_step', updated.id, true, { step: index, outcome });
        return { run: runView(updated), steps: getSteps(updated.id).map(stepView) };
      } catch (err: any) {
        audit(request, user.id, 'resolve_step', request.params.id, false, { step: index, outcome, error: err?.message });
        if (err instanceof RunStateError) return reply.code(err.status).send({ error: err.message });
        throw err;
      }
    },
  );

  fastify.post<{ Params: { id: string }; Body: { decision?: string; note?: unknown; reviewer?: unknown } }>(
    '/api/task-runs/:id/review',
    { config: { access: 'owner' as const } },
    async (request, reply) => {
      const user = caller(request, reply);
      if (!user) return reply;
      if (user.role !== 'owner') return reply.code(403).send({ error: 'This action requires the owner account' });
      if (!ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid id' });
      const decision = request.body?.decision;
      if (decision !== 'accept' && decision !== 'reject') return reply.code(400).send({ error: "decision must be 'accept' or 'reject'" });
      const note = request.body?.note;
      if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > 2000)) return reply.code(400).send({ error: 'note must be a string (max 2000 characters)' });
      const reviewer = request.body?.reviewer ?? 'owner';
      if (reviewer !== 'owner' && reviewer !== 'large_agent') return reply.code(400).send({ error: "reviewer must be 'owner' or 'large_agent'" });
      try {
        const updated = await applyRunReview(request.params.id, decision, user.id, reviewer, typeof note === 'string' && note ? note : null);
        audit(request, user.id, 'review', updated.id, true, { decision, reviewer });
        return { run: await runDetailView(updated) };
      } catch (err: any) {
        audit(request, user.id, 'review', request.params.id, false, { decision, error: err?.message });
        if (err instanceof RunStateError) return reply.code(err.status).send({ error: err.message });
        throw err;
      }
    },
  );
}
