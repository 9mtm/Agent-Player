/**
 * Evolution -> personality drift proposals (CORE-01d, MEM-03).
 *
 * Evolution proposes, never applies: it reads verified task-run outcomes,
 * turns repeated patterns into a small bounded drift and files it as a
 * pending proposal (source 'evolution') through
 * repositories.agents.proposePersonalityDrift with the system actor. Only the
 * owner approves (personality-store.ts approvePersonalityProposal). At most
 * one Evolution proposal per agent is pending at a time (409
 * `pending_exists`, checked inside the insert transaction).
 *
 * Signals used (all deterministic, recorded by R1 task contracts; nothing
 * judged by a model here):
 *   firstRoundFailures     task_run_verifications round 0 = failed_verification:
 *                          the agent declared a result done that failed its
 *                          acceptance checks (a claim it had not checked)
 *                          -> doubt + thoroughness up
 *   ownerRejections        task_runs.review_decision = 'rejected' by the owner
 *                          (reviewer_kind 'owner'): the owner refused a result
 *                          -> thoroughness up
 *   verificationExhausted  final task_runs.verification_status =
 *                          failed_verification: every verification retry was
 *                          used and the result still failed -> persistence up
 * Not used (no reliable signal exists yet): owner refusals because the agent
 * asked too much (would lower caution). Tool-approval denials say the owner
 * refused an action, not that asking was unwanted.
 */

import { all, dialect, one, sql } from '../repositories/sql-steps.js';
import { nowPlusText, offset } from '../db/pg/dialect.js';
import { repositories } from '../repositories/index.js';
import { SYSTEM_ACTOR } from '../repositories/actor.js';
import type { TraitName } from './personality.js';
import {
  MAX_DRIFT_STEP,
  MAX_EVIDENCE_ITEMS,
  PersonalityProposalError,
  agentExists,
  pendingProposalFrom,
  type PersonalityProposal,
} from './personality-store.js';

export interface OutcomeStats {
  windowDays: number;
  /** Finished runs that had a task contract (verification_status set). */
  contractRuns: number;
  /** Run ids whose first verification round failed. */
  firstRoundFailures: string[];
  /** Run ids the owner rejected in review. */
  ownerRejections: string[];
  /** Run ids that ended failed_verification after all retries. */
  verificationExhausted: string[];
}

export interface DriftSuggestion {
  delta: Partial<Record<TraitName, number>>;
  reason: string;
  evidence: string[];
}

/** A pattern counts once it happened this often in the window... */
export const MIN_REPEATS = 3;
/** ...and in at least this share of the contract runs. */
export const MIN_SHARE = 0.2;
export const MIN_STEP = 2;

/** 3 -> 2, 4 -> 3, 5 -> 4, 6+ -> 5 points. */
export function stepFor(count: number): number {
  return Math.max(MIN_STEP, Math.min(MAX_DRIFT_STEP, count - 1));
}

const evidenceRef = (runId: string) => `task-run:${runId}`;

/**
 * Pure rule: verified outcome counts -> a bounded drift suggestion, or null
 * when nothing repeats often enough. Per trait the largest step wins (never a
 * sum), so no trait moves more than MAX_DRIFT_STEP.
 */
export function suggestPersonalityDrift(stats: OutcomeStats): DriftSuggestion | null {
  const total = Math.max(0, Math.floor(stats.contractRuns || 0));
  const repeated = (ids: readonly string[]) => ids.length >= MIN_REPEATS && total > 0 && ids.length / total >= MIN_SHARE;
  const delta: Partial<Record<TraitName, number>> = {};
  const raise = (trait: TraitName, by: number) => { delta[trait] = Math.max(delta[trait] ?? 0, by); };
  const reasons: string[] = [];
  const evidence: string[] = [];
  // Evidence: each matching rule's run ids in turn, at most MAX_EVIDENCE_ITEMS.
  const cite = (ids: readonly string[]) => {
    for (const id of ids) {
      const ref = evidenceRef(id);
      if (evidence.length >= MAX_EVIDENCE_ITEMS) return;
      if (!evidence.includes(ref)) evidence.push(ref);
    }
  };
  const days = stats.windowDays;

  if (repeated(stats.firstRoundFailures)) {
    const n = stats.firstRoundFailures.length;
    raise('doubt', stepFor(n));
    raise('thoroughness', stepFor(n));
    reasons.push(`${n} of ${total} contract runs in the last ${days} days first reported a result that failed its acceptance checks (claims not checked before answering).`);
    cite(stats.firstRoundFailures);
  }
  if (repeated(stats.ownerRejections)) {
    const n = stats.ownerRejections.length;
    raise('thoroughness', stepFor(n));
    reasons.push(`The owner rejected ${n} of ${total} contract results in review in the last ${days} days.`);
    cite(stats.ownerRejections);
  }
  if (repeated(stats.verificationExhausted)) {
    const n = stats.verificationExhausted.length;
    raise('persistence', stepFor(n));
    reasons.push(`${n} of ${total} contract runs in the last ${days} days used every verification retry and still failed.`);
    cite(stats.verificationExhausted);
  }
  if (!reasons.length) return null;
  return { delta, reason: `Evolution: ${reasons.join(' ')}`, evidence };
}

export const DEFAULT_WINDOW_DAYS = 30;

function windowOf(v: unknown): number {
  const n = typeof v === 'number' && Number.isInteger(v) ? v : DEFAULT_WINDOW_DAYS;
  return Math.max(1, Math.min(90, n));
}

/** Verified outcomes of an agent's finished task runs in the last `windowDays` days. */
export function collectOutcomeStats(agentId: string, windowDays: unknown = DEFAULT_WINDOW_DAYS): Promise<OutcomeStats> {
  const days = windowOf(windowDays);
  // '-30 days': the same modifier text SQLite read before; an interval on PostgreSQL.
  const since = offset(-days, 'days');
  return sql().read((function* () {
    const d = yield* dialect();
    // finished_at is TEXT ('YYYY-MM-DD HH:MM:SS', UTC) on both drivers: compared as text.
    const scope = `r.agent_id = ? AND r.finished_at IS NOT NULL AND r.finished_at >= ${nowPlusText(d)}`;
    const ids = function* (q: string) { return (yield* all<{ id: string }>(q, agentId, since)).map((r) => r.id); };
    const contractRuns = (yield* one<{ n: number }>(`SELECT COUNT(*) AS n FROM task_runs r WHERE ${scope} AND r.verification_status IS NOT NULL`,
      agentId, since))!.n;
    return {
    windowDays: days,
    contractRuns,
    firstRoundFailures: yield* ids(`
      SELECT r.id FROM task_runs r JOIN task_run_verifications v ON v.run_id = r.id AND v.round = 0
      WHERE ${scope} AND v.status = 'failed_verification' ORDER BY r.finished_at DESC, r.id`),
    ownerRejections: yield* ids(`
      SELECT r.id FROM task_runs r
      WHERE ${scope} AND r.review_decision = 'rejected' AND r.reviewer_kind = 'owner' ORDER BY r.finished_at DESC, r.id`),
    verificationExhausted: yield* ids(`
      SELECT r.id FROM task_runs r
      WHERE ${scope} AND r.verification_status = 'failed_verification' ORDER BY r.finished_at DESC, r.id`),
    };
  })());
}

export type DriftProposalOutcome =
  | { status: 'proposed'; proposal: PersonalityProposal; stats: OutcomeStats }
  | { status: 'skipped'; reason: 'agent_not_found' | 'pending_exists' | 'no_signal' | 'personality_locked' | 'no_change' | 'too_many_pending'; proposalId?: string; stats?: OutcomeStats };

/**
 * Evolution step: collect the outcomes, apply the rule and file a pending
 * proposal as the system actor. Never approves; never writes a personality
 * version. Skips (no error) when nothing repeats, an Evolution proposal is
 * already pending, or the personality/traits are locked.
 */
export async function proposeDriftFromOutcomes(agentId: string, opts: { windowDays?: unknown } = {}): Promise<DriftProposalOutcome> {
  if (!(await agentExists(agentId))) return { status: 'skipped', reason: 'agent_not_found' };
  const open = await pendingProposalFrom(agentId, 'evolution');
  if (open) return { status: 'skipped', reason: 'pending_exists', proposalId: open.id };
  const stats = await collectOutcomeStats(agentId, opts.windowDays);
  const suggestion = suggestPersonalityDrift(stats);
  if (!suggestion) return { status: 'skipped', reason: 'no_signal', stats };
  try {
    const proposal = await repositories.agents.proposePersonalityDrift(SYSTEM_ACTOR, agentId, suggestion);
    return { status: 'proposed', proposal, stats };
  } catch (err) {
    if (err instanceof PersonalityProposalError && (err.code === 'pending_exists' || err.code === 'personality_locked' || err.code === 'no_change' || err.code === 'too_many_pending')) {
      return { status: 'skipped', reason: err.code, stats };
    }
    throw err;
  }
}
