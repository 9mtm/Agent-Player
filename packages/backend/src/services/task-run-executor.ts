/**
 * Durable task-run executor + startup recovery (CORE-08, R2).
 *
 * executeTaskRun() claims a run's lease and walks the agentic tool loop as
 * durable steps (services/task-runs.ts): every model call and every tool
 * call is recorded before and after it runs, so after a crash or restart
 * the same loop is replayed from stored results and only the first
 * incomplete step actually runs. Permissions are re-checked on every
 * attempt (the tools registry is built from the agent's current grants).
 *
 * startTaskRunRecovery() runs once at boot and then on an interval: queued
 * runs (new, approval decided, owner resolved) and running runs whose lease
 * expired are claimed again (one worker per run via the atomic claim).
 */

import { getDatabase } from '../db/index.js';
import { getOrchestrator } from '../multi-agent/index.js';
import { ClaudeClient } from '../llm/claude-client.js';
import { createToolsRegistry } from '../tools/index.js';
import { approvalCategory } from '../tools/approvals.js';
import type { ToolResult } from '../tools/types.js';
import { UNKNOWN_PRINCIPAL } from '../tools/grants.js';
import { logActivity } from './activity-logger.js';
import { resolveProviderApiKey } from '../credentials/authority.js';
import {
  BudgetExceededError,
  LeaseLostError,
  RunCancelledError,
  RunPausedError,
  WORKER_ID,
  claimRun,
  claimableRunIds,
  durableStep,
  finishAttempt,
  getRun,
  heartbeat,
  isIdempotentTool,
  requeueDecidedApprovalRuns,
  runDefaults,
  runPrompt,
  setRecoveryKick,
  settleCancelledDeadRuns,
  type Lease,
} from './task-runs.js';

export interface AgentRow {
  id: string;
  name: string;
  model: string;
  provider: string;
  system_prompt: string | null;
  temperature: number;
  max_tokens: number;
  cron_schedule: string;
  cron_enabled: number;
}

/** Model calls per attempt walk (unchanged from the previous cron loop). */
const MAX_ITERATIONS = 15;

/**
 * Agents a task was delegated from (S1.2), from server-recorded fields only:
 * the spawner of the task and of every parent task, plus the parent tasks'
 * assignees. A task in the chain without a spawner that was not created by
 * the owner through the API (origin 'owner') counts as delegated from an
 * unknown principal: the run gets at most the minimal default set.
 */
export function delegatingAgents(taskId: string): string[] {
  const orchestrator = getOrchestrator();
  const out = new Set<string>();
  let task: any = orchestrator.getTask(taskId);
  if (!task) return [UNKNOWN_PRINCIPAL];
  for (let depth = 0; task; depth++) {
    if (depth >= 16) { out.add(UNKNOWN_PRINCIPAL); break; }
    if (typeof task.spawnedBy === 'string' && task.spawnedBy) out.add(task.spawnedBy);
    else if (task.origin !== 'owner') out.add(UNKNOWN_PRINCIPAL);
    if (depth > 0 && typeof task.assignedTo === 'string' && task.assignedTo) out.add(task.assignedTo);
    if (!task.parentId) break;
    const parent = orchestrator.getTask(task.parentId);
    if (!parent) { out.add(UNKNOWN_PRINCIPAL); break; }
    task = parent;
  }
  return [...out];
}

export interface AttemptResult {
  status: 'completed' | 'failed' | 'cancelled' | 'waiting_approval' | 'not_claimed' | 'lease_lost';
  output?: string;
  reason?: string;
}

interface StoredModelResponse {
  content: string;
  toolCalls?: Array<{ id: string; tool: string; arguments: Record<string, any> }>;
  rawBlocks?: any[];
}

function loadAgent(agentId: string): AgentRow | undefined {
  return getDatabase().prepare(`
    SELECT id, name, model, provider, system_prompt, temperature, max_tokens, cron_schedule, cron_enabled
    FROM agents_config WHERE id = ?
  `).get(agentId) as AgentRow | undefined;
}

function hasToolSteps(runId: string): boolean {
  return !!getDatabase().prepare(`SELECT 1 FROM task_run_steps WHERE run_id = ? AND kind = 'tool' LIMIT 1`).get(runId);
}

function approvalOutcome(a: { status: string; result_preview: string | null; error: string | null }): ToolResult {
  switch (a.status) {
    case 'executed':
      return { content: [{ type: 'text', text: `The owner approved this action and it ran once. Result: ${a.result_preview ?? '(no output)'}` }] };
    case 'failed':
      return { content: [{ type: 'text', text: `The owner approved this action but it failed: ${a.error ?? 'unknown error'}. Do not retry it on your own.` }], error: a.error ?? 'approved call failed' };
    case 'denied':
      return { content: [{ type: 'text', text: 'The owner denied this action; it was not run. Do not try it again.' }], error: 'denied by owner' };
    default:
      return { content: [{ type: 'text', text: 'The approval request expired; the action was not run.' }], error: 'approval expired' };
  }
}

function recreateIfRecurring(taskId: string, agentId: string): void {
  const orchestrator = getOrchestrator();
  const completedTask = orchestrator.getTask(taskId);
  const taskMeta = (completedTask?.input as any)?._meta as { repeat_schedule?: string } | undefined;
  if (!taskMeta?.repeat_schedule || !completedTask) return;
  try {
    // SECURITY (S1.2): never take the assignee from task input; keep the
    // original delegation origin on the copy.
    const assignToId = completedTask.assignedTo ?? agentId;
    // Preserve _meta but strip _upstream from input for the fresh run
    const { _upstream, ...cleanInput } = (completedTask.input as Record<string, unknown> | undefined) ?? {};
    const newTask = orchestrator.createTask({
      title: completedTask.title,
      description: completedTask.description,
      priority: completedTask.priority as any,
      inputData: Object.keys(cleanInput).length > 0 ? cleanInput : undefined,
      parentId: completedTask.parentId,
      spawnedBy: (completedTask as any).spawnedBy,
      origin: (completedTask as any).origin,
    });
    orchestrator.assignTask(newTask.id, assignToId);
    console.log(`[TaskRun] 🔄 Recurring task "${completedTask.title}" re-queued (schedule: ${taskMeta.repeat_schedule})`);
  } catch (err: any) {
    console.warn(`[TaskRun] ⚠️  Failed to re-queue recurring task: ${err.message}`);
  }
}

/**
 * Claim and execute (or resume) one run. Returns without doing anything
 * when another worker holds a live lease.
 */
export async function executeTaskRun(runId: string, owner: string = WORKER_ID): Promise<AttemptResult> {
  const lease = claimRun(runId, owner);
  if (!lease) return { status: 'not_claimed' };

  let lost = false;
  const hb = setInterval(() => {
    try { if (!heartbeat(lease)) lost = true; } catch { lost = true; }
  }, runDefaults().heartbeatMs);
  hb.unref?.();

  const run = getRun(runId)!;
  const taskId = run.task_id;
  const orchestrator = getOrchestrator();

  const fail = async (reason: string, agentId: string): Promise<AttemptResult> => {
    if (!finishAttempt(lease, 'failed', reason)) return { status: 'lease_lost' };
    orchestrator.failTask(taskId, reason, { noRetry: hasToolSteps(runId) });
    await logActivity({ agentId, taskId, actionType: 'task_failed', summary: reason.slice(0, 200) });
    return { status: 'failed', reason, output: reason };
  };

  try {
    const agent = loadAgent(run.agent_id);
    if (!agent) return await fail(`Agent "${run.agent_id}" no longer exists.`, run.agent_id);
    if (!orchestrator.getTask(taskId)) return await fail(`Task ${taskId} no longer exists.`, agent.id);

    // SECURITY (S1.1): key from the credential authority (agent's own key,
    // then the historical cron fallback row); never another agent's key.
    const apiKey = await resolveProviderApiKey('claude', { agentId: agent.id, noGlobal: true, legacySettingsRow: 'claude_api_key' });
    if (!apiKey || agent.provider !== 'claude') {
      const msg = `Agent "${agent.name}" has no Claude API key configured or provider is not claude.`;
      console.warn(`[TaskRun] ⚠️  ${msg}`);
      return await fail(msg, agent.id);
    }

    const claude = new ClaudeClient(apiKey, agent.model);
    // SECURITY (S1.2): the agent's current grants, intersected with every
    // agent this task was delegated from; re-checked on every attempt.
    const registry = createToolsRegistry({
      userId: agent.id,
      sessionId: `cron-${taskId}`,
      workspaceDir: process.cwd(),
      agentId: agent.id,
      taskId,
      delegatedFrom: delegatingAgents(taskId),
    });
    const tools = registry.getToolsForAPI();
    const systemPrompt = agent.system_prompt ?? `You are ${agent.name}, an AI agent.`;
    const prompt = await runPrompt(run);

    const loopMessages: Array<{ role: 'user' | 'assistant'; content: string | any[] }> = [{ role: 'user', content: prompt }];
    let stepIndex = 0;
    let finalContent = '';

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      if (lost) throw new LeaseLostError();
      const { result: response } = await durableStep<StoredModelResponse>(lease, stepIndex++, {
        kind: 'model',
        name: 'model',
        input: { messages: loopMessages },
        idempotent: true, // no external side effect: safe to call again
        run: async () => {
          const r = await claude.sendMessage(loopMessages, {
            systemPrompt,
            tools: tools.length > 0 ? tools : undefined,
            temperature: agent.temperature,
            maxTokens: agent.max_tokens,
          });
          return { content: r.content, toolCalls: r.toolCalls, rawBlocks: r.rawBlocks };
        },
      });

      if (!response.toolCalls || response.toolCalls.length === 0) {
        finalContent = response.content ?? '';
        break;
      }
      loopMessages.push({ role: 'assistant', content: response.rawBlocks || response.content });

      const toolResults: any[] = [];
      for (const toolCall of response.toolCalls) {
        if (lost) throw new LeaseLostError();
        const tool = registry.get(toolCall.tool);
        const needsApproval = tool ? approvalCategory(tool) !== null : false;
        const { result, replayed } = await durableStep<ToolResult>(lease, stepIndex++, {
          kind: 'tool',
          name: toolCall.tool,
          input: toolCall.arguments ?? {},
          idempotent: isIdempotentTool(tool, needsApproval),
          run: async (key, index) => {
            registry.updateContext({ taskRun: { runId, stepIndex: index, idempotencyKey: key } });
            try {
              return await registry.execute(toolCall.tool, toolCall.arguments ?? {});
            } finally {
              registry.updateContext({ taskRun: undefined });
            }
          },
          pendingApprovalOf: (r) => (r?.details?.status === 'pending_approval' && typeof r.details.approvalId === 'string' ? r.details.approvalId : null),
          approvalOutcome,
        });
        const resultText = result?.content?.[0]?.text ?? JSON.stringify(result);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: result?.content ?? [{ type: 'text', text: resultText }],
          ...(result?.error ? { is_error: true } : {}),
        });
        if (!replayed) {
          await logActivity({
            agentId: agent.id, taskId, sessionId: `cron-${taskId}`,
            actionType: 'tool_called', toolName: toolCall.tool, summary: String(resultText).slice(0, 200),
          });
        }
      }
      loopMessages.push({ role: 'user', content: toolResults });
    }

    // The run is recorded completed first (fenced): a crash after this point
    // never runs the task again.
    if (!finishAttempt(lease, 'completed', null, finalContent.slice(0, 500))) return { status: 'lease_lost' };
    orchestrator.completeTask(taskId, { output: finalContent });
    await logActivity({ agentId: agent.id, taskId, actionType: 'task_completed', summary: finalContent.slice(0, 200) });
    recreateIfRecurring(taskId, agent.id);
    try { await registry.execute('desktop_control', { action: 'hide_indicator' }); } catch { /* ignore */ }
    return { status: 'completed', output: finalContent };
  } catch (err: any) {
    if (err instanceof LeaseLostError) {
      console.warn(`[TaskRun] ⚠️  Run ${runId}: lease lost; another worker owns it now`);
      return { status: 'lease_lost' };
    }
    if (err instanceof RunPausedError) {
      if (!finishAttempt(lease, 'waiting_approval', err.reason)) return { status: 'lease_lost' };
      await logActivity({ agentId: run.agent_id, taskId, actionType: 'task_started', summary: `Run waiting for the owner (${err.reason})` });
      return { status: 'waiting_approval', reason: err.reason };
    }
    if (err instanceof RunCancelledError) {
      if (!finishAttempt(lease, 'cancelled', 'cancelled')) return { status: 'lease_lost' };
      orchestrator.failTask(taskId, 'cancelled', { cancelled: true });
      return { status: 'cancelled', reason: 'cancelled' };
    }
    if (err instanceof BudgetExceededError) {
      const res = await fail(err.message, run.agent_id);
      return res.status === 'failed' ? { ...res, reason: err.message } : res;
    }
    const msg = `Run error: ${String(err?.message ?? err).slice(0, 300)}`;
    return await fail(msg, run.agent_id);
  } finally {
    clearInterval(hb);
  }
}

// ---------------------------------------------------------------------------
// Recovery loop
// ---------------------------------------------------------------------------

const inFlight = new Set<string>();
let recoveryTimer: NodeJS.Timeout | null = null;
let scanning: Promise<number> | null = null;
let rescan = false;

/**
 * One recovery pass: settle cancelled dead runs, queue runs whose approval
 * was decided, then claim every claimable run. Returns how many attempts
 * this pass executed.
 */
export async function recoverTaskRuns(owner: string = WORKER_ID): Promise<number> {
  if (scanning) { rescan = true; return scanning; }
  scanning = (async () => {
    let n = 0;
    try {
      do {
        rescan = false;
        settleCancelledDeadRuns();
        requeueDecidedApprovalRuns();
        for (const id of claimableRunIds()) {
          if (inFlight.has(id)) continue;
          inFlight.add(id);
          try {
            const res = await executeTaskRun(id, owner);
            if (res.status !== 'not_claimed') n++;
          } catch (err: any) {
            console.warn(`[TaskRun] ⚠️  Recovery of run ${id} failed: ${err?.message}`);
          } finally {
            inFlight.delete(id);
          }
        }
      } while (rescan);
    } finally {
      scanning = null;
    }
    return n;
  })();
  return scanning;
}

/** Start at boot: one pass now, then every lease period. */
export function startTaskRunRecovery(): void {
  if (recoveryTimer) return;
  const every = Math.max(1_000, runDefaults().leaseMs);
  const pass = () => { recoverTaskRuns().catch((err) => console.warn('[TaskRun] recovery pass failed:', err?.message)); };
  setRecoveryKick(() => setImmediate(pass));
  recoveryTimer = setInterval(pass, every);
  recoveryTimer.unref?.();
  pass();
  console.log(`[TaskRun] ✅ Durable task-run recovery started (every ${every} ms)`);
}

export function stopTaskRunRecovery(): void {
  if (recoveryTimer) clearInterval(recoveryTimer);
  recoveryTimer = null;
  setRecoveryKick(null);
}

export { type Lease };
