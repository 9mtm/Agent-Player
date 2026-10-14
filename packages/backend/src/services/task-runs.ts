/**
 * Durable task runs (CORE-08, R2): store, leases, durable steps, budget gate.
 *
 * A run executes one orchestrator task. Each model call and each tool call
 * is a step (`task_run_steps`) with a deterministic idempotency key:
 *   sha256(runId | stepIndex | kind | tool | canonical JSON of the input).
 * Before a step runs it is stored 'started'; after it finishes it is stored
 * 'completed' with its result (encrypted). On resume the executor walks the
 * same steps again from the start:
 *  - completed  -> the stored result is replayed, nothing runs again;
 *  - started    -> outcome unknown. Idempotent steps (model calls, tools
 *                  declared idempotent) run again with the same key.
 *                  Anything else (sends, payments, deletes, installs, writes)
 *                  is NOT repeated: the step becomes 'unknown' and the run
 *                  'waiting_approval' until the owner says what happened
 *                  (resolveUncertainStep) or cancels it;
 *  - waiting_approval -> the linked tool approval decides: still pending =
 *                  the run keeps waiting; executed/denied/expired/failed =
 *                  its outcome becomes the step result (never re-run).
 *
 * One worker per run: claimRun() is a single atomic UPDATE that only
 * succeeds when nobody holds a live lease. Every claim bumps
 * lease_generation (fencing token); every step write checks lease owner +
 * generation, so a stale worker that lost its lease cannot record or start
 * steps any more. A heartbeat renews the lease while the run works.
 *
 * Budget gate: max_steps counts fresh step executions (replays are free);
 * max_duration_ms counts active time summed over attempts (time while the
 * server was down or the run waited for the owner does not count).
 */

import { createHash, randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { getDatabase } from '../db/index.js';
import { getEncryptionService } from '../credentials/encryption.js';

export type TaskRunStatus = 'queued' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'started' | 'completed' | 'failed' | 'unknown' | 'waiting_approval' | 'retry';
export const ACTIVE_RUN_STATUSES: readonly TaskRunStatus[] = ['queued', 'running', 'waiting_approval'];

function envInt(name: string, fallback: number, min: number, max: number): number {
  const v = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(v) && v >= min && v <= max ? v : fallback;
}

/** Defaults (env overrides, read at call time). */
export function runDefaults() {
  const leaseMs = envInt('TASK_RUN_LEASE_MS', 30_000, 500, 600_000);
  return {
    maxSteps: envInt('TASK_RUN_MAX_STEPS', 60, 1, 10_000),
    maxDurationMs: envInt('TASK_RUN_MAX_DURATION_MS', 30 * 60_000, 1_000, 24 * 3_600_000),
    leaseMs,
    heartbeatMs: Math.max(100, Math.floor(leaseMs / 3)),
  };
}

/** This process's worker id (lease owner). */
export const WORKER_ID = `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;

/** Built-in tools without external side effects: safe to run again after an interruption. */
export const IDEMPOTENT_TOOLS: ReadonlySet<string> = new Set([
  'read', 'memory_search', 'memory_stats', 'storage_search',
]);

/**
 * True when a step for this tool may run again after an unknown outcome.
 * Tools that need owner approval or are exec-class never count as idempotent.
 */
export function isIdempotentTool(
  tool: { name: string; idempotent?: boolean; execClass?: boolean } | undefined,
  needsApproval: boolean,
): boolean {
  if (!tool || needsApproval || tool.execClass) return false;
  return IDEMPOTENT_TOOLS.has(tool.name) || tool.idempotent === true;
}

/** Deterministic JSON (sorted keys). */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map((v) => canonical(v)).join(',')}]`;
  const keys = Object.keys(value as object).filter((k) => (value as any)[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical((value as any)[k])}`).join(',')}}`;
}

export function idempotencyKey(runId: string, stepIndex: number, kind: 'model' | 'tool', name: string, input: unknown): string {
  const inputHash = createHash('sha256').update(canonical(input)).digest('hex');
  return createHash('sha256').update(`${runId}|${stepIndex}|${kind}|${name}|${inputHash}`).digest('hex');
}

// ---------------------------------------------------------------------------
// Errors that stop an attempt
// ---------------------------------------------------------------------------

export class LeaseLostError extends Error { constructor() { super('lease lost'); } }
export class BudgetExceededError extends Error { constructor(readonly which: 'steps' | 'duration', detail: string) { super(`budget: ${detail}`); } }
export class RunCancelledError extends Error { constructor() { super('cancelled'); } }
export class ReplayMismatchError extends Error { constructor(index: number) { super(`replay mismatch at step ${index}: the stored step has a different input`); } }
/** The run paused (waits for the owner); not a failure. */
export class RunPausedError extends Error { constructor(readonly reason: string) { super(`paused: ${reason}`); } }

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export interface TaskRunRow {
  id: string; task_id: string; agent_id: string; user_id: string | null;
  status: TaskRunStatus; status_reason: string | null;
  lease_owner: string | null; lease_expires_at: number | null; lease_generation: number;
  attempt: number; checkpoint_step: number; steps_used: number;
  max_steps: number; max_duration_ms: number; active_ms: number; segment_started_ms: number | null;
  cancel_requested: number;
  input_encrypted: string | null; input_iv: string | null; input_tag: string | null;
  output_preview: string | null;
  created_at: string; started_at: string | null; updated_at: string; finished_at: string | null;
}

export interface TaskRunStepRow {
  run_id: string; step_index: number; kind: 'model' | 'tool'; tool_name: string | null;
  idempotency_key: string; idempotent: number; status: StepStatus; attempt: number;
  approval_id: string | null;
  result_encrypted: string | null; result_iv: string | null; result_tag: string | null;
  error: string | null; resolved_by: string | null; started_at: string; completed_at: string | null;
}

export function getRun(id: string): TaskRunRow | undefined {
  return getDatabase().prepare('SELECT * FROM task_runs WHERE id = ?').get(id) as TaskRunRow | undefined;
}

export function activeRunForTask(taskId: string): TaskRunRow | undefined {
  return getDatabase().prepare(
    `SELECT * FROM task_runs WHERE task_id = ? AND status IN ('queued', 'running', 'waiting_approval') LIMIT 1`
  ).get(taskId) as TaskRunRow | undefined;
}

export function getSteps(runId: string): TaskRunStepRow[] {
  return getDatabase().prepare('SELECT * FROM task_run_steps WHERE run_id = ? ORDER BY step_index').all(runId) as TaskRunStepRow[];
}

export interface CreateRunInput {
  taskId: string;
  agentId: string;
  userId?: string | null;
  prompt: string;
  maxSteps?: number;
  maxDurationMs?: number;
}

/** Create a queued run, or return the task's unfinished run (one per task). */
export async function createRun(input: CreateRunInput): Promise<TaskRunRow> {
  const existing = activeRunForTask(input.taskId);
  if (existing) return existing;
  const d = runDefaults();
  const { encrypted, iv, authTag } = await getEncryptionService().encrypt(JSON.stringify({ prompt: input.prompt }));
  const id = randomUUID();
  try {
    getDatabase().prepare(`
      INSERT INTO task_runs (id, task_id, agent_id, user_id, status, max_steps, max_duration_ms, input_encrypted, input_iv, input_tag)
      VALUES (?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?)
    `).run(id, input.taskId, input.agentId, input.userId ?? null,
      clampInt(input.maxSteps, d.maxSteps, 1, 10_000), clampInt(input.maxDurationMs, d.maxDurationMs, 1, 24 * 3_600_000),
      encrypted, iv, authTag);
  } catch (err: any) {
    // Another process created the task's run at the same moment.
    const raced = activeRunForTask(input.taskId);
    if (raced) return raced;
    throw err;
  }
  return getRun(id)!;
}

function clampInt(v: unknown, fallback: number, min: number, max: number): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

export async function runPrompt(run: TaskRunRow): Promise<string> {
  if (!run.input_encrypted || !run.input_iv || !run.input_tag) return '';
  const plain = await getEncryptionService().decrypt(run.input_encrypted, run.input_iv, run.input_tag);
  return String(JSON.parse(plain).prompt ?? '');
}

export interface Lease { runId: string; owner: string; generation: number }

/**
 * Atomic claim: succeeds only for a queued run, or a running run whose lease
 * expired. Exactly one of several concurrent claimers wins.
 */
export function claimRun(runId: string, owner = WORKER_ID, now = Date.now()): Lease | null {
  const { leaseMs } = runDefaults();
  const res = getDatabase().prepare(`
    UPDATE task_runs SET
      status = 'running', status_reason = NULL,
      lease_owner = ?, lease_expires_at = ?, lease_generation = lease_generation + 1,
      attempt = attempt + 1, segment_started_ms = ?,
      started_at = COALESCE(started_at, datetime('now')), updated_at = datetime('now')
    WHERE id = ? AND cancel_requested = 0 AND (
      status = 'queued' OR (status = 'running' AND (lease_owner IS NULL OR lease_expires_at IS NULL OR lease_expires_at < ?))
    )
  `).run(owner, now + leaseMs, now, runId, now);
  if (res.changes !== 1) return null;
  const row = getRun(runId)!;
  return { runId, owner, generation: row.lease_generation };
}

const FENCE = `id = ? AND lease_owner = ? AND lease_generation = ? AND status = 'running'`;

/** Renew the lease and fold active time. False = lease lost. */
export function heartbeat(lease: Lease, now = Date.now()): boolean {
  const { leaseMs } = runDefaults();
  const res = getDatabase().prepare(`
    UPDATE task_runs SET lease_expires_at = ?,
      active_ms = active_ms + MAX(0, ? - COALESCE(segment_started_ms, ?)), segment_started_ms = ?, updated_at = datetime('now')
    WHERE ${FENCE}
  `).run(now + leaseMs, now, now, now, lease.runId, lease.owner, lease.generation);
  return res.changes === 1;
}

export function holdsLease(lease: Lease): boolean {
  const row = getDatabase().prepare(`SELECT 1 AS ok FROM task_runs WHERE ${FENCE}`).get(lease.runId, lease.owner, lease.generation);
  return !!row;
}

/** Leave the running state (fenced). Folds active time and releases the lease. */
export function finishAttempt(lease: Lease, status: TaskRunStatus, reason: string | null, outputPreview?: string | null): boolean {
  const now = Date.now();
  const terminal = status === 'completed' || status === 'failed' || status === 'cancelled';
  const res = getDatabase().prepare(`
    UPDATE task_runs SET status = ?, status_reason = ?,
      output_preview = COALESCE(?, output_preview),
      active_ms = active_ms + MAX(0, ? - COALESCE(segment_started_ms, ?)), segment_started_ms = NULL,
      lease_owner = NULL, lease_expires_at = NULL,
      finished_at = CASE WHEN ? THEN datetime('now') ELSE finished_at END,
      updated_at = datetime('now')
    WHERE ${FENCE}
  `).run(status, reason, outputPreview ?? null, now, now, terminal ? 1 : 0, lease.runId, lease.owner, lease.generation);
  return res.changes === 1;
}

export function elapsedMs(run: TaskRunRow, now = Date.now()): number {
  return run.active_ms + (run.segment_started_ms ? Math.max(0, now - run.segment_started_ms) : 0);
}

// ---------------------------------------------------------------------------
// Durable steps
// ---------------------------------------------------------------------------

async function encryptJson(value: unknown) {
  return getEncryptionService().encrypt(JSON.stringify(value ?? null));
}

async function stepResult<T>(row: TaskRunStepRow): Promise<T> {
  if (!row.result_encrypted || !row.result_iv || !row.result_tag) return null as T;
  return JSON.parse(await getEncryptionService().decrypt(row.result_encrypted, row.result_iv, row.result_tag)) as T;
}

/** Store a completed step result (fenced by the lease). */
async function completeStep(lease: Lease, index: number, result: unknown, extra: { resolvedBy?: string } = {}): Promise<void> {
  const enc = await encryptJson(result);
  const db = getDatabase();
  db.transaction(() => {
    if (!holdsLease(lease)) throw new LeaseLostError();
    db.prepare(`
      UPDATE task_run_steps SET status = 'completed', result_encrypted = ?, result_iv = ?, result_tag = ?,
        error = NULL, completed_at = datetime('now'), resolved_by = COALESCE(?, resolved_by)
      WHERE run_id = ? AND step_index = ?
    `).run(enc.encrypted, enc.iv, enc.authTag, extra.resolvedBy ?? null, lease.runId, index);
    db.prepare(`UPDATE task_runs SET checkpoint_step = MAX(checkpoint_step, ?), updated_at = datetime('now') WHERE id = ?`)
      .run(index, lease.runId);
  });
}

function setStepStatus(lease: Lease, index: number, status: StepStatus, error: string | null, approvalId?: string | null): void {
  const db = getDatabase();
  db.transaction(() => {
    if (!holdsLease(lease)) throw new LeaseLostError();
    db.prepare(`UPDATE task_run_steps SET status = ?, error = ?, approval_id = COALESCE(?, approval_id) WHERE run_id = ? AND step_index = ?`)
      .run(status, error, approvalId ?? null, lease.runId, index);
  });
}

/** Budget + cancellation check before a fresh execution; reserves one step. */
function reserveFreshStep(lease: Lease): number {
  const db = getDatabase();
  return db.transaction(() => {
    const run = getRun(lease.runId);
    if (!run || run.lease_owner !== lease.owner || run.lease_generation !== lease.generation || run.status !== 'running') throw new LeaseLostError();
    if (run.cancel_requested) throw new RunCancelledError();
    if (run.steps_used >= run.max_steps) throw new BudgetExceededError('steps', `max steps ${run.max_steps} reached`);
    const elapsed = elapsedMs(run);
    if (elapsed >= run.max_duration_ms) throw new BudgetExceededError('duration', `max duration ${run.max_duration_ms} ms reached`);
    db.prepare(`UPDATE task_runs SET steps_used = steps_used + 1 WHERE id = ?`).run(lease.runId);
    return run.max_duration_ms - elapsed;
  });
}

export interface StepSpec<T> {
  kind: 'model' | 'tool';
  /** 'model' or the tool name. */
  name: string;
  /** Hashed into the idempotency key (not stored). */
  input: unknown;
  idempotent: boolean;
  /** Runs the step. `key` is the step's idempotency key. */
  run: (key: string, stepIndex: number) => Promise<T>;
  /** When the result says "waiting for approval", its approval id (the run pauses). */
  pendingApprovalOf?: (result: T) => string | null;
  /** Result recorded when a linked approval was decided (tool steps). */
  approvalOutcome?: (approval: { status: string; result_preview: string | null; error: string | null }) => T;
}

export interface StepOutcome<T> { result: T; replayed: boolean }

const APPROVAL_FINAL = new Set(['executed', 'denied', 'expired', 'failed']);

function approvalFor(runId: string, index: number, approvalId: string | null): { id: string; status: string; result_preview: string | null; error: string | null; tool_name: string } | undefined {
  const db = getDatabase();
  if (approvalId) {
    return db.prepare('SELECT id, status, result_preview, error, tool_name FROM tool_approvals WHERE id = ?').get(approvalId) as any;
  }
  return db.prepare('SELECT id, status, result_preview, error, tool_name FROM tool_approvals WHERE run_id = ? AND run_step = ? ORDER BY requested_at DESC LIMIT 1')
    .get(runId, index) as any;
}

/** Expire pending approvals past their TTL (same rule as tools/approvals.ts). */
function expireApprovals(): void {
  getDatabase().prepare(
    `UPDATE tool_approvals SET status = 'expired' WHERE status = 'pending' AND requested_at < datetime('now', '-24 hours')`
  ).run();
}

/**
 * Run (or replay) one step. Throws RunPausedError when the run must wait for
 * the owner, LeaseLostError / BudgetExceededError / RunCancelledError /
 * ReplayMismatchError to stop the attempt.
 */
export async function durableStep<T>(lease: Lease, index: number, spec: StepSpec<T>): Promise<StepOutcome<T>> {
  const db = getDatabase();
  const key = idempotencyKey(lease.runId, index, spec.kind, spec.name, spec.input);
  const row = db.prepare('SELECT * FROM task_run_steps WHERE run_id = ? AND step_index = ?').get(lease.runId, index) as TaskRunStepRow | undefined;

  let attempt = 1;
  if (row) {
    if (row.idempotency_key !== key) throw new ReplayMismatchError(index);
    if (row.status === 'completed') return { result: await stepResult<T>(row), replayed: true };
    if (row.status === 'failed') throw new Error(`step ${index} failed earlier: ${row.error ?? 'unknown error'}`);

    // An approval linked to this step decides it (also when the crash came
    // after the approval was stored but before the step was marked).
    if (row.status === 'waiting_approval' || row.status === 'started' || row.status === 'unknown') {
      expireApprovals();
      const approval = spec.kind === 'tool' ? approvalFor(lease.runId, index, row.approval_id) : undefined;
      if (approval && approval.tool_name === spec.name) {
        if (APPROVAL_FINAL.has(approval.status) && spec.approvalOutcome) {
          const result = spec.approvalOutcome(approval);
          await completeStep(lease, index, result);
          return { result, replayed: true };
        }
        setStepStatus(lease, index, 'waiting_approval', null, approval.id);
        throw new RunPausedError('approval');
      }
    }

    if (row.status === 'waiting_approval') {
      // Approval row missing: never guess; the owner decides.
      setStepStatus(lease, index, 'unknown', 'linked approval not found');
      throw new RunPausedError(`uncertain_step:${index}`);
    }
    if ((row.status === 'started' || row.status === 'unknown') && !row.idempotent) {
      setStepStatus(lease, index, 'unknown', 'interrupted after it started; it may or may not have happened. Not repeated automatically.');
      throw new RunPausedError(`uncertain_step:${index}`);
    }
    // idempotent started/unknown, or owner-chosen retry: run again with the same key
    attempt = row.attempt + 1;
  }

  const remainingMs = reserveFreshStep(lease);
  db.transaction(() => {
    if (!holdsLease(lease)) throw new LeaseLostError();
    if (row) {
      db.prepare(`UPDATE task_run_steps SET status = 'started', attempt = ?, error = NULL, started_at = datetime('now') WHERE run_id = ? AND step_index = ?`)
        .run(attempt, lease.runId, index);
    } else {
      db.prepare(`
        INSERT INTO task_run_steps (run_id, step_index, kind, tool_name, idempotency_key, idempotent, status, attempt)
        VALUES (?, ?, ?, ?, ?, ?, 'started', 1)
      `).run(lease.runId, index, spec.kind, spec.kind === 'tool' ? spec.name : null, key, spec.idempotent ? 1 : 0);
    }
  });

  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new BudgetExceededError('duration', 'max duration reached during a step')), Math.max(1, remainingMs));
    timer.unref?.();
  });
  let result: T;
  try {
    result = await Promise.race([spec.run(key, index), timeout]);
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      // Outcome of the interrupted step is unknown.
      try { setStepStatus(lease, index, spec.idempotent ? 'failed' : 'unknown', 'stopped by the duration budget while running'); } catch { /* lease gone */ }
      throw err;
    }
    try { setStepStatus(lease, index, 'failed', String((err as any)?.message ?? err).slice(0, 300)); } catch { /* lease gone */ }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }

  const approvalId = spec.pendingApprovalOf?.(result) ?? null;
  if (approvalId) {
    setStepStatus(lease, index, 'waiting_approval', null, approvalId);
    throw new RunPausedError('approval');
  }
  await completeStep(lease, index, result);
  return { result, replayed: false };
}

// ---------------------------------------------------------------------------
// Owner actions + approval hook
// ---------------------------------------------------------------------------

type RecoveryKick = () => void;
let kick: RecoveryKick | null = null;
/** The recovery loop registers itself so decided approvals continue promptly. */
export function setRecoveryKick(fn: RecoveryKick | null): void { kick = fn; }

/** Called by tools/approvals.ts after an approval was executed/failed/denied. */
export function onApprovalDecided(approvalId: string): void {
  try {
    const db = getDatabase();
    const a = db.prepare('SELECT run_id FROM tool_approvals WHERE id = ?').get(approvalId) as { run_id: string | null } | undefined;
    if (!a?.run_id) return;
    const res = db.prepare(`
      UPDATE task_runs SET status = 'queued', status_reason = 'approval decided', updated_at = datetime('now')
      WHERE id = ? AND status = 'waiting_approval' AND status_reason = 'approval' AND cancel_requested = 0
    `).run(a.run_id);
    if (res.changes === 1) kick?.();
  } catch (err: any) {
    console.warn('[TaskRuns] could not continue run after approval:', err?.message);
  }
}

/**
 * Runs waiting for an approval that has been decided meanwhile (e.g. the
 * decision came while this process was down) are queued again.
 */
export function requeueDecidedApprovalRuns(): number {
  expireApprovals();
  const res = getDatabase().prepare(`
    UPDATE task_runs SET status = 'queued', status_reason = 'approval decided', updated_at = datetime('now')
    WHERE status = 'waiting_approval' AND status_reason = 'approval' AND cancel_requested = 0
      AND EXISTS (SELECT 1 FROM task_run_steps s JOIN tool_approvals a ON a.id = s.approval_id
                  WHERE s.run_id = task_runs.id AND s.status = 'waiting_approval'
                    AND a.status IN ('executed', 'denied', 'expired', 'failed'))
  `).run();
  return res.changes;
}

export class RunStateError extends Error { constructor(message: string, readonly status: number) { super(message); } }

/**
 * Cancel a run. Queued/waiting runs (or running runs whose lease expired)
 * stop at once; a live running run stops before its next step. Pending
 * approvals of the run are denied so they can never run later.
 */
export function cancelRun(runId: string, actor: string): TaskRunRow {
  const db = getDatabase();
  const now = Date.now();
  db.transaction(() => {
    const run = getRun(runId);
    if (!run) throw new RunStateError('Run not found', 404);
    if (!ACTIVE_RUN_STATUSES.includes(run.status)) throw new RunStateError(`Run is ${run.status}`, 409);
    db.prepare(`UPDATE task_runs SET cancel_requested = 1, updated_at = datetime('now') WHERE id = ?`).run(runId);
    const live = run.status === 'running' && run.lease_owner && (run.lease_expires_at ?? 0) >= now;
    if (!live) {
      db.prepare(`
        UPDATE task_runs SET status = 'cancelled', status_reason = ?, lease_owner = NULL, lease_expires_at = NULL,
          segment_started_ms = NULL, finished_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(`cancelled by ${actor}`, runId);
    }
    db.prepare(`
      UPDATE tool_approvals SET status = 'denied', decided_at = datetime('now'), decided_by = 'run-cancelled'
      WHERE run_id = ? AND status = 'pending'
    `).run(runId);
  });
  return getRun(runId)!;
}

export type UncertainOutcome = 'done' | 'skip' | 'retry';

/**
 * Owner decision for a step whose outcome is unknown after an interruption:
 *  - done:  it happened; it is recorded as completed and not repeated;
 *  - skip:  it is recorded as not done; the agent is told and continues;
 *  - retry: it runs again (same idempotency key) when the run resumes.
 */
export async function resolveUncertainStep(runId: string, stepIndex: number, outcome: UncertainOutcome, ownerId: string): Promise<TaskRunRow> {
  const db = getDatabase();
  const run = getRun(runId);
  if (!run) throw new RunStateError('Run not found', 404);
  const step = db.prepare('SELECT * FROM task_run_steps WHERE run_id = ? AND step_index = ?').get(runId, stepIndex) as TaskRunStepRow | undefined;
  if (!step) throw new RunStateError('Step not found', 404);
  if (run.status !== 'waiting_approval' || step.status !== 'unknown' || run.status_reason !== `uncertain_step:${stepIndex}`) {
    throw new RunStateError('This step is not waiting for an owner decision', 409);
  }
  let enc: { encrypted: string; iv: string; authTag: string } | null = null;
  if (outcome !== 'retry') {
    const text = outcome === 'done'
      ? `The owner confirmed this action already happened before an interruption; it was not repeated.`
      : `The owner chose not to run this action after an interruption; it was not run.`;
    const result = { content: [{ type: 'text', text }], ...(outcome === 'skip' ? { error: 'skipped by owner' } : {}) };
    enc = await encryptJson(result);
  }
  db.transaction(() => {
    const cur = getRun(runId)!;
    if (cur.status !== 'waiting_approval' || cur.status_reason !== `uncertain_step:${stepIndex}`) throw new RunStateError('Run changed meanwhile', 409);
    if (enc) {
      db.prepare(`
        UPDATE task_run_steps SET status = 'completed', result_encrypted = ?, result_iv = ?, result_tag = ?,
          completed_at = datetime('now'), resolved_by = ? WHERE run_id = ? AND step_index = ?
      `).run(enc.encrypted, enc.iv, enc.authTag, `${ownerId}:${outcome}`, runId, stepIndex);
    } else {
      db.prepare(`UPDATE task_run_steps SET status = 'retry', resolved_by = ? WHERE run_id = ? AND step_index = ?`)
        .run(`${ownerId}:retry`, runId, stepIndex);
    }
    db.prepare(`UPDATE task_runs SET status = 'queued', status_reason = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(`owner resolved step ${stepIndex}: ${outcome}`, runId);
  });
  kick?.();
  return getRun(runId)!;
}

/** Runs a recovery worker may claim now: queued, or running with an expired lease. */
export function claimableRunIds(now = Date.now(), limit = 20): string[] {
  return (getDatabase().prepare(`
    SELECT id FROM task_runs
    WHERE cancel_requested = 0 AND (status = 'queued' OR (status = 'running' AND (lease_expires_at IS NULL OR lease_expires_at < ?)))
    ORDER BY created_at LIMIT ?
  `).all(now, limit) as Array<{ id: string }>).map((r) => r.id);
}

/** Running runs whose lease expired and that were asked to cancel: cancel them now. */
export function settleCancelledDeadRuns(now = Date.now()): number {
  return getDatabase().prepare(`
    UPDATE task_runs SET status = 'cancelled', status_reason = COALESCE(status_reason, 'cancelled'),
      lease_owner = NULL, lease_expires_at = NULL, segment_started_ms = NULL,
      finished_at = datetime('now'), updated_at = datetime('now')
    WHERE cancel_requested = 1 AND status IN ('queued', 'running') AND (status = 'queued' OR lease_expires_at IS NULL OR lease_expires_at < ?)
  `).run(now).changes;
}

// ---------------------------------------------------------------------------
// Views (no secrets: no inputs, no results, no parameters)
// ---------------------------------------------------------------------------

export interface TaskRunView {
  id: string; taskId: string; agentId: string; userId: string | null;
  status: TaskRunStatus; statusReason: string | null;
  attempt: number; checkpointStep: number; stepsUsed: number;
  budget: { maxSteps: number; maxDurationMs: number; activeMs: number };
  leaseActive: boolean; cancelRequested: boolean;
  outputPreview: string | null;
  createdAt: string; startedAt: string | null; updatedAt: string; finishedAt: string | null;
}

export interface TaskRunStepView {
  index: number; kind: 'model' | 'tool'; tool: string | null; status: StepStatus;
  idempotent: boolean; attempt: number; idempotencyKey: string;
  approvalId: string | null; error: string | null; resolvedBy: string | null;
  startedAt: string; completedAt: string | null;
}

export function runView(row: TaskRunRow, now = Date.now()): TaskRunView {
  return {
    id: row.id, taskId: row.task_id, agentId: row.agent_id, userId: row.user_id,
    status: row.status, statusReason: row.status_reason,
    attempt: row.attempt, checkpointStep: row.checkpoint_step, stepsUsed: row.steps_used,
    budget: { maxSteps: row.max_steps, maxDurationMs: row.max_duration_ms, activeMs: elapsedMs(row, now) },
    leaseActive: row.status === 'running' && !!row.lease_owner && (row.lease_expires_at ?? 0) >= now,
    cancelRequested: row.cancel_requested === 1,
    outputPreview: row.output_preview,
    createdAt: row.created_at, startedAt: row.started_at, updatedAt: row.updated_at, finishedAt: row.finished_at,
  };
}

export function stepView(row: TaskRunStepRow): TaskRunStepView {
  return {
    index: row.step_index, kind: row.kind, tool: row.tool_name, status: row.status,
    idempotent: row.idempotent === 1, attempt: row.attempt, idempotencyKey: row.idempotency_key,
    approvalId: row.approval_id, error: row.error, resolvedBy: row.resolved_by,
    startedAt: row.started_at, completedAt: row.completed_at,
  };
}

export function listRuns(filter: { userId?: string | null; status?: string; taskId?: string; limit?: number }): TaskRunRow[] {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter.userId !== undefined) { where.push('user_id IS ?'); args.push(filter.userId); }
  if (filter.status) { where.push('status = ?'); args.push(filter.status); }
  if (filter.taskId) { where.push('task_id = ?'); args.push(filter.taskId); }
  const limit = Math.min(Math.max(Number(filter.limit) || 50, 1), 200);
  return getDatabase().prepare(
    `SELECT * FROM task_runs ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, rowid DESC LIMIT ?`
  ).all(...args, limit) as TaskRunRow[];
}
