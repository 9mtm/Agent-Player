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
 * and review (tier rule + config.access). B1-core: the scope (own runs vs
 * owner-wide, owner-only decisions) is enforced by the task runs repository
 * (repositories/task-runs.ts) with the request's actor.
 */

import { actorOf } from '../../auth/auth-gate.js';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { logAudit } from '../../services/audit-logger.js';
import { RunStateError, runView, stepView } from '../../services/task-runs.js';
import { repositories } from '../../repositories/index.js';
import { ScopeError, sendScopeError } from '../../repositories/scope.js';

const ID = /^[0-9a-f-]{36}$/i;
const STATUSES = new Set(['queued', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled']);
const OUTCOMES = new Set(['done', 'skip', 'retry']);

function audit(request: FastifyRequest, userId: string | undefined, action: string, runId: string, success: boolean, metadata: Record<string, unknown>) {
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
  const runs = repositories.taskRuns;

  fastify.get<{ Querystring: { status?: string; taskId?: string; limit?: string } }>('/api/task-runs', async (request, reply) => {
    try {
      const { status, taskId, limit } = request.query ?? {};
      if (status !== undefined && !STATUSES.has(status)) return reply.code(400).send({ error: 'Invalid status' });
      if (taskId !== undefined && (typeof taskId !== 'string' || taskId.length > 200)) return reply.code(400).send({ error: 'Invalid taskId' });
      const rows = await runs.list(actorOf(request), { status, taskId, limit: Number(limit) || undefined });
      return { runs: rows.map((r) => runView(r)) };
    } catch (err) { return sendScopeError(reply, err); }
  });

  fastify.get<{ Params: { id: string } }>('/api/task-runs/:id', async (request, reply) => {
    try {
      if (!ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid id' });
      const { run, steps } = await runs.detail(actorOf(request), request.params.id);
      return { run, steps: steps.map(stepView) };
    } catch (err) { return sendScopeError(reply, err); }
  });

  fastify.post<{ Params: { id: string } }>('/api/task-runs/:id/cancel', async (request, reply) => {
    const userId = actorOf(request)?.userId;
    if (!ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid id' });
    try {
      const { before, after } = await runs.cancel(actorOf(request), request.params.id);
      audit(request, userId, 'cancel', before.id, true, { taskId: before.task_id, status: after.status });
      return { run: runView(after) };
    } catch (err: any) {
      if (err instanceof ScopeError) return sendScopeError(reply, err);
      audit(request, userId, 'cancel', request.params.id, false, { error: err?.message });
      if (err instanceof RunStateError) return reply.code(err.status).send({ error: err.message });
      throw err;
    }
  });

  fastify.post<{ Params: { id: string; index: string }; Body: { outcome?: string } }>(
    '/api/task-runs/:id/steps/:index/resolve',
    { config: { access: 'owner' as const } },
    async (request, reply) => {
      const userId = actorOf(request)?.userId;
      try {
        if (!ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid id' });
        const index = Number(request.params.index);
        if (!/^\d{1,6}$/.test(request.params.index) || !Number.isInteger(index)) return reply.code(400).send({ error: 'Invalid step index' });
        const outcome = request.body?.outcome;
        if (typeof outcome !== 'string' || !OUTCOMES.has(outcome)) return reply.code(400).send({ error: "outcome must be 'done', 'skip' or 'retry'" });
        try {
          const updated = await runs.resolveStep(actorOf(request), request.params.id, index, outcome as 'done' | 'skip' | 'retry');
          audit(request, userId, 'resolve_step', updated.id, true, { step: index, outcome });
          return { run: runView(updated), steps: (await runs.steps(actorOf(request), updated.id)).map(stepView) };
        } catch (err: any) {
          if (err instanceof ScopeError) throw err;
          audit(request, userId, 'resolve_step', request.params.id, false, { step: index, outcome, error: err?.message });
          if (err instanceof RunStateError) return reply.code(err.status).send({ error: err.message });
          throw err;
        }
      } catch (err) { return sendScopeError(reply, err); }
    },
  );

  fastify.post<{ Params: { id: string }; Body: { decision?: string; note?: unknown; reviewer?: unknown } }>(
    '/api/task-runs/:id/review',
    { config: { access: 'owner' as const } },
    async (request, reply) => {
      const userId = actorOf(request)?.userId;
      try {
        if (!ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid id' });
        const decision = request.body?.decision;
        if (decision !== 'accept' && decision !== 'reject') return reply.code(400).send({ error: "decision must be 'accept' or 'reject'" });
        const note = request.body?.note;
        if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > 2000)) return reply.code(400).send({ error: 'note must be a string (max 2000 characters)' });
        const reviewer = request.body?.reviewer ?? 'owner';
        if (reviewer !== 'owner' && reviewer !== 'large_agent') return reply.code(400).send({ error: "reviewer must be 'owner' or 'large_agent'" });
        try {
          const updated = await runs.review(actorOf(request), request.params.id, decision, reviewer, typeof note === 'string' && note ? note : null);
          audit(request, userId, 'review', updated.id, true, { decision, reviewer });
          return { run: (await runs.detail(actorOf(request), updated.id)).run };
        } catch (err: any) {
          if (err instanceof ScopeError) throw err;
          audit(request, userId, 'review', request.params.id, false, { decision, error: err?.message });
          if (err instanceof RunStateError) return reply.code(err.status).send({ error: err.message });
          throw err;
        }
      } catch (err) { return sendScopeError(reply, err); }
    },
  );
}
