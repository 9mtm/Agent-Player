/**
 * Task runs repository (B1-core): durable runs, their steps, review and
 * owner decisions (CORE-08, R1). Scope rules (scope.ts):
 *
 *   list / get / detail   owner: every run; user/admin: their own runs;
 *                         agent run: its own user's runs (never owner-wide);
 *                         guest, service: refused. Others' runs -> 404.
 *   cancel                owner or the run's own user (not agents/services)
 *   resolveStep / review  owner only
 *
 * SQLite implementation over services/task-runs.ts (sync under the hood).
 */

import type { Actor } from './actor.js';
import { ScopeError, canSeeRecord, ownerWideUserFilter, requireMember, requireOwnUser, requireOwner } from './scope.js';
import {
  cancelRun,
  getRun,
  getSteps,
  listRuns,
  resolveUncertainStep,
  runDetailView,
  type TaskRunDetailView,
  type TaskRunRow,
  type TaskRunStepRow,
  type UncertainOutcome,
} from '../services/task-runs.js';

export interface TaskRunListFilter { status?: string; taskId?: string; limit?: number }

export interface TaskRunsRepository {
  list(actor: Actor | null | undefined, filter?: TaskRunListFilter): Promise<TaskRunRow[]>;
  get(actor: Actor | null | undefined, runId: string): Promise<TaskRunRow>;
  steps(actor: Actor | null | undefined, runId: string): Promise<TaskRunStepRow[]>;
  detail(actor: Actor | null | undefined, runId: string): Promise<{ run: TaskRunDetailView; steps: TaskRunStepRow[] }>;
  cancel(actor: Actor | null | undefined, runId: string): Promise<{ before: TaskRunRow; after: TaskRunRow }>;
  resolveStep(actor: Actor | null | undefined, runId: string, stepIndex: number, outcome: UncertainOutcome): Promise<TaskRunRow>;
  review(actor: Actor | null | undefined, runId: string, decision: 'accept' | 'reject', reviewer: 'owner' | 'large_agent', note: string | null): Promise<TaskRunRow>;
}

const NOT_FOUND = 'Run not found';

function visibleRun(actor: Actor, runId: string): TaskRunRow {
  const run = getRun(runId);
  if (!run || !canSeeRecord(actor, run.user_id, { ownerWide: true })) throw new ScopeError(404, NOT_FOUND);
  return run;
}

function actorId(actor: Actor): string {
  return actor.userId ?? 'system';
}

export const sqliteTaskRuns: TaskRunsRepository = {
  async list(actor, filter = {}) {
    const a = requireOwnUser(actor);
    // Agent runs never get the owner-wide view, whatever the user's role.
    const userId = a.kind === 'agent' ? a.userId : ownerWideUserFilter(a);
    return listRuns({ userId, status: filter.status, taskId: filter.taskId, limit: filter.limit });
  },

  async get(actor, runId) {
    return visibleRun(requireOwnUser(actor), runId);
  },

  async steps(actor, runId) {
    const run = visibleRun(requireOwnUser(actor), runId);
    return getSteps(run.id);
  },

  async detail(actor, runId) {
    const run = visibleRun(requireOwnUser(actor), runId);
    return { run: await runDetailView(run), steps: getSteps(run.id) };
  },

  async cancel(actor, runId) {
    const a = requireMember(actor);
    const before = visibleRun(a, runId);
    return { before, after: cancelRun(before.id, actorId(a)) };
  },

  async resolveStep(actor, runId, stepIndex, outcome) {
    const a = requireOwner(actor);
    return resolveUncertainStep(runId, stepIndex, outcome, actorId(a));
  },

  async review(actor, runId, decision, reviewer, note) {
    const a = requireOwner(actor);
    // Loaded on use: the executor pulls in the tools registry, which itself
    // uses repositories (tools -> repositories -> executor -> tools cycle).
    const { applyRunReview } = await import('../services/task-run-executor.js');
    return applyRunReview(runId, decision, actorId(a), reviewer, note);
  },
};
