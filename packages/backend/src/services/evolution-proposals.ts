/**
 * Evolution proposals (S0-Q.23).
 *
 * The old Evolution cycle changed agents by itself (system prompt, the
 * agent's PERSONALITY.md and capabilities). Under D-PERSONALITY it only
 * proposes: each change is a pending row in evolution_proposals (migration
 * 077) and only the owner's approval applies it. Mirrors the personality
 * drift proposals (personality-store.ts, CORE-01c/01d): reviewHash, atomic
 * claim (`changes === 1`), CAS on the target's content hash, owner-only
 * decisions (enforced by the routes).
 *
 * Evolution never enables or changes capabilities, tool grants or
 * permissions. There is no proposal kind for that, and rollback refuses old
 * capability history rows.
 */

import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { isoUtc } from '../api/timestamps.js';
import { getDatabase } from '../db/index.js';
import { getAgentDir } from './agent-files.js';

export const EVOLUTION_PROPOSAL_KINDS = ['prompt_append', 'personality_text'] as const;
export type EvolutionProposalKind = (typeof EVOLUTION_PROPOSAL_KINDS)[number];
export const EVOLUTION_PROPOSAL_STATUSES = ['pending', 'approved', 'rejected', 'stale', 'cancelled'] as const;
export type EvolutionProposalStatus = (typeof EVOLUTION_PROPOSAL_STATUSES)[number];

export const MAX_PROPOSED_TEXT_CHARS = 4000;
export const MAX_TITLE_CHARS = 200;
export const MAX_REASON_CHARS = 1000;
export const MAX_DECISION_NOTE_CHARS = 500;
/** Pending proposals per agent before Evolution stops filing new ones. */
export const MAX_PENDING_EVOLUTION_PROPOSALS = 50;
/** Author recorded on proposals filed by the Evolution cycle. */
export const EVOLUTION_AUTHOR = 'evolution';

/** Machine codes sent to clients. */
export type EvolutionProposalErrorCode =
  | 'invalid_input' | 'not_found' | 'already_decided' | 'stale' | 'review_changed' | 'review_hash_required'
  | 'already_rolled_back' | 'rollback_unsupported';

export class EvolutionProposalError extends Error {
  constructor(readonly status: 400 | 404 | 409, message: string, readonly code: EvolutionProposalErrorCode) { super(message); }
}

export interface EvolutionProposal {
  id: string;
  agentId: string;
  kind: EvolutionProposalKind;
  title: string;
  /** The text that approval appends (plain text, data only). */
  proposedText: string;
  reason: string;
  insightType: string | null;
  confidence: number | null;
  /** sha256 hex of the target content when proposed. */
  baseHash: string;
  source: 'evolution';
  status: EvolutionProposalStatus;
  createdBy: string;
  createdAt: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  appliedHistoryId: string | null;
  /**
   * sha256 hex of ['evolution-proposal-review/v1', id, agentId, kind, baseHash,
   * title, proposedText, reason]. Approve/reject/cancel must send it back as
   * expectedReviewHash.
   */
  reviewHash: string;
}

interface Row {
  id: string; agent_id: string; kind: string; title: string; proposed_text: string; reason: string;
  insight_type: string | null; confidence: number | null; base_hash: string; source: string; status: string;
  review_hash: string; created_by: string; created_at: string; decided_by: string | null; decided_at: string | null;
  decision_note: string | null; applied_history_id: string | null;
}

export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function evolutionProposalReviewHash(
  p: Pick<EvolutionProposal, 'id' | 'agentId' | 'kind' | 'baseHash' | 'title' | 'proposedText' | 'reason'>,
): string {
  return sha256(JSON.stringify(['evolution-proposal-review/v1', p.id, p.agentId, p.kind, p.baseHash, p.title, p.proposedText, p.reason]));
}

function fromRow(row: Row): EvolutionProposal {
  const p = {
    id: row.id, agentId: row.agent_id, kind: row.kind as EvolutionProposalKind, title: row.title,
    proposedText: row.proposed_text, reason: row.reason, insightType: row.insight_type, confidence: row.confidence,
    baseHash: row.base_hash, source: 'evolution' as const, status: row.status as EvolutionProposalStatus,
    createdBy: row.created_by, createdAt: isoUtc(row.created_at), decidedBy: row.decided_by,
    decidedAt: isoUtc(row.decided_at), decisionNote: row.decision_note, appliedHistoryId: row.applied_history_id,
  };
  // Recomputed from what is shown, so the reviewer approves exactly what they saw.
  return { ...p, reviewHash: evolutionProposalReviewHash(p) };
}

// --- target content ---------------------------------------------------------

function personalityPath(agentId: string): string {
  return path.join(getAgentDir(agentId), 'PERSONALITY.md');
}

/** Current PERSONALITY.md text, or '' when the file does not exist. */
function readPersonalitySync(agentId: string): string {
  try {
    return readFileSync(personalityPath(agentId), 'utf-8');
  } catch (err: any) {
    if (err?.code === 'ENOENT') return '';
    throw err;
  }
}

function writePersonalitySync(agentId: string, content: string): void {
  mkdirSync(getAgentDir(agentId), { recursive: true });
  writeFileSync(personalityPath(agentId), content, 'utf-8');
}

/** Current content of the proposal's target; null when the agent does not exist. */
function targetContent(agentId: string, kind: EvolutionProposalKind): string | null {
  const agent = getDatabase().prepare('SELECT system_prompt FROM agents_config WHERE id = ?').get(agentId) as
    { system_prompt: string | null } | undefined;
  if (!agent) return null;
  return kind === 'prompt_append' ? (agent.system_prompt ?? '') : readPersonalitySync(agentId);
}

// --- validation -------------------------------------------------------------

function text(v: unknown, field: string, max: number): string {
  if (typeof v !== 'string' || !v.trim()) throw new EvolutionProposalError(400, `${field} is required (text)`, 'invalid_input');
  if (v.length > max) throw new EvolutionProposalError(400, `${field} must be at most ${max} characters`, 'invalid_input');
  return v;
}

function decisionNote(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') throw new EvolutionProposalError(400, 'note must be text', 'invalid_input');
  if (v.length > MAX_DECISION_NOTE_CHARS) throw new EvolutionProposalError(400, `note must be at most ${MAX_DECISION_NOTE_CHARS} characters`, 'invalid_input');
  return v.trim() || null;
}

// --- read -------------------------------------------------------------------

export function getEvolutionProposal(agentId: string, id: string): EvolutionProposal | null {
  const row = getDatabase().prepare('SELECT * FROM evolution_proposals WHERE id = ? AND agent_id = ?').get(id, agentId) as Row | undefined;
  return row ? fromRow(row) : null;
}

/** Newest first (at most 200). Null when the agent does not exist. */
export function listEvolutionProposals(agentId: string, status?: EvolutionProposalStatus): EvolutionProposal[] | null {
  const db = getDatabase();
  if (!db.prepare('SELECT 1 FROM agents_config WHERE id = ?').get(agentId)) return null;
  const rows = (status
    ? db.prepare('SELECT * FROM evolution_proposals WHERE agent_id = ? AND status = ? ORDER BY created_at DESC, rowid DESC LIMIT 200').all(agentId, status)
    : db.prepare('SELECT * FROM evolution_proposals WHERE agent_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 200').all(agentId)) as Row[];
  return rows.map(fromRow);
}

// --- create -----------------------------------------------------------------

export interface NewEvolutionProposal {
  kind: EvolutionProposalKind;
  title: string;
  proposedText: string;
  reason: string;
  insightType?: string | null;
  confidence?: number | null;
}

export type CreateOutcome =
  | { status: 'proposed'; proposal: EvolutionProposal }
  | { status: 'skipped'; reason: 'agent_not_found' | 'pending_exists' | 'too_many_pending'; proposalId?: string };

/**
 * File a pending proposal. Nothing about the agent changes. The same text
 * for the same target that is already pending is not filed twice.
 */
export function createEvolutionProposal(agentId: string, input: NewEvolutionProposal, createdBy: string = EVOLUTION_AUTHOR): CreateOutcome {
  if (!EVOLUTION_PROPOSAL_KINDS.includes(input.kind)) throw new EvolutionProposalError(400, 'Unknown proposal kind', 'invalid_input');
  const title = text(input.title, 'title', MAX_TITLE_CHARS).trim();
  const proposedText = text(input.proposedText, 'proposedText', MAX_PROPOSED_TEXT_CHARS);
  const reason = text(input.reason, 'reason', MAX_REASON_CHARS).trim();
  const confidence = typeof input.confidence === 'number' && Number.isFinite(input.confidence) ? input.confidence : null;
  const insightType = typeof input.insightType === 'string' ? input.insightType.slice(0, 40) : null;
  const db = getDatabase();
  const id = randomUUID();
  let outcome: CreateOutcome | null = null;
  db.transaction(() => {
    const base = targetContent(agentId, input.kind);
    if (base === null) { outcome = { status: 'skipped', reason: 'agent_not_found' }; return; }
    const dup = db.prepare(`SELECT id FROM evolution_proposals WHERE agent_id = ? AND kind = ? AND proposed_text = ? AND status = 'pending' LIMIT 1`)
      .get(agentId, input.kind, proposedText) as { id: string } | undefined;
    if (dup) { outcome = { status: 'skipped', reason: 'pending_exists', proposalId: dup.id }; return; }
    const pending = (db.prepare(`SELECT COUNT(*) AS n FROM evolution_proposals WHERE agent_id = ? AND status = 'pending'`).get(agentId) as { n: number }).n;
    if (pending >= MAX_PENDING_EVOLUTION_PROPOSALS) { outcome = { status: 'skipped', reason: 'too_many_pending' }; return; }
    const baseHash = sha256(base);
    const reviewHash = evolutionProposalReviewHash({ id, agentId, kind: input.kind, baseHash, title, proposedText, reason });
    db.prepare(`
      INSERT INTO evolution_proposals (id, agent_id, kind, title, proposed_text, reason, insight_type, confidence, base_hash, review_hash, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, agentId, input.kind, title, proposedText, reason, insightType, confidence, baseHash, reviewHash, createdBy);
  });
  return outcome ?? { status: 'proposed', proposal: getEvolutionProposal(agentId, id)! };
}

// --- decide -----------------------------------------------------------------

const REVIEW_HASH = /^[0-9a-f]{64}$/;

function decidable(agentId: string, id: string, expectedReviewHash: unknown): EvolutionProposal {
  const p = getEvolutionProposal(agentId, id);
  if (!p) throw new EvolutionProposalError(404, 'Proposal not found', 'not_found');
  if (p.status !== 'pending') throw new EvolutionProposalError(409, `Proposal is already ${p.status}`, 'already_decided');
  if (typeof expectedReviewHash !== 'string' || !REVIEW_HASH.test(expectedReviewHash)) {
    throw new EvolutionProposalError(400, 'expectedReviewHash is required (the reviewHash of the proposal you reviewed)', 'review_hash_required');
  }
  if (expectedReviewHash !== p.reviewHash) {
    throw new EvolutionProposalError(409, 'The proposal changed since it was reviewed; open it again', 'review_changed');
  }
  return p;
}

/** Exactly one decision moves the row out of 'pending'. */
function claim(agentId: string, id: string, status: Exclude<EvolutionProposalStatus, 'pending'>, decidedBy: string, note: string | null): void {
  const res = getDatabase().prepare(`
    UPDATE evolution_proposals SET status = ?, decided_by = ?, decided_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), decision_note = ?
    WHERE id = ? AND agent_id = ? AND status = 'pending'
  `).run(status, decidedBy, note, id, agentId) as { changes: number };
  if (res.changes !== 1) throw new EvolutionProposalError(409, 'Proposal was already decided', 'already_decided');
}

const HISTORY_TYPE: Record<EvolutionProposalKind, string> = {
  prompt_append: 'prompt_update',
  personality_text: 'personality_text',
};

/**
 * Owner approves. One transaction: pending + reviewHash re-checked, the
 * target's content hash must still equal base_hash (else the row is marked
 * 'stale' and 409 `stale`), the claim, the change, a history row. The
 * PERSONALITY.md write happens inside the transaction, so a failed write
 * rolls the decision back.
 */
export function approveEvolutionProposal(
  agentId: string, id: string, decidedBy: string, expectedReviewHash: unknown,
): { proposal: EvolutionProposal; historyId: string } {
  const db = getDatabase();
  let stale = false;
  const historyId = randomUUID();
  db.transaction(() => {
    const p = decidable(agentId, id, expectedReviewHash);
    const before = targetContent(agentId, p.kind);
    if (before === null) throw new EvolutionProposalError(404, 'Agent not found', 'not_found');
    if (sha256(before) !== p.baseHash) {
      claim(agentId, id, 'stale', decidedBy, null);
      stale = true;
      return;
    }
    claim(agentId, id, 'approved', decidedBy, null);
    const after = before + p.proposedText;
    db.prepare(`
      INSERT INTO agent_evolution_history (id, agent_id, evolution_type, change_description, before_value, after_value, trigger_reason, insight_ids, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(historyId, agentId, HISTORY_TYPE[p.kind], `Approved proposal: ${p.title}`.slice(0, 300), before, after, p.reason,
      JSON.stringify([]));
    db.prepare('UPDATE evolution_proposals SET applied_history_id = ? WHERE id = ? AND agent_id = ?').run(historyId, id, agentId);
    if (p.kind === 'prompt_append') {
      db.prepare('UPDATE agents_config SET system_prompt = ?, updated_at = ? WHERE id = ?').run(after, new Date().toISOString(), agentId);
    } else {
      writePersonalitySync(agentId, after); // last step: a throw rolls everything back
    }
  });
  if (stale) throw new EvolutionProposalError(409, 'The target changed after this proposal was made; it was marked stale', 'stale');
  return { proposal: getEvolutionProposal(agentId, id)!, historyId };
}

export function rejectEvolutionProposal(
  agentId: string, id: string, decidedBy: string, expectedReviewHash: unknown, note?: unknown,
): EvolutionProposal {
  const n = decisionNote(note);
  getDatabase().transaction(() => {
    decidable(agentId, id, expectedReviewHash);
    claim(agentId, id, 'rejected', decidedBy, n);
  });
  return getEvolutionProposal(agentId, id)!;
}

export function cancelEvolutionProposal(
  agentId: string, id: string, decidedBy: string, expectedReviewHash: unknown,
): EvolutionProposal {
  getDatabase().transaction(() => {
    decidable(agentId, id, expectedReviewHash);
    claim(agentId, id, 'cancelled', decidedBy, null);
  });
  return getEvolutionProposal(agentId, id)!;
}

// --- rollback of an applied change -----------------------------------------

/**
 * Undo one history row: restore before_value, only when the target still
 * holds exactly that row's after_value (else 409 `stale`: something changed
 * since, restoring would silently drop it). Only prompt and PERSONALITY.md
 * rows: old capability rows are refused (409 `rollback_unsupported`);
 * capabilities are changed by the owner in the agent settings, never by
 * Evolution.
 */
export function rollbackEvolutionHistory(agentId: string, evolutionId: string): { evolutionId: string; type: string } {
  const db = getDatabase();
  let type = '';
  db.transaction(() => {
    const h = db.prepare('SELECT * FROM agent_evolution_history WHERE id = ? AND agent_id = ?').get(evolutionId, agentId) as
      { evolution_type: string; before_value: string | null; after_value: string | null; status: string } | undefined;
    if (!h) throw new EvolutionProposalError(404, 'Evolution not found for this agent', 'not_found');
    if (h.status === 'rolled_back') throw new EvolutionProposalError(409, 'Evolution already rolled back', 'already_rolled_back');
    type = h.evolution_type;
    const kind: EvolutionProposalKind | null = type === 'prompt_update' ? 'prompt_append' : type === 'personality_text' ? 'personality_text' : null;
    if (!kind) {
      throw new EvolutionProposalError(409, 'Only prompt and PERSONALITY.md changes can be rolled back here; capabilities are edited in the agent settings', 'rollback_unsupported');
    }
    const current = targetContent(agentId, kind);
    if (current === null) throw new EvolutionProposalError(404, 'Agent not found', 'not_found');
    if (current !== (h.after_value ?? '')) {
      throw new EvolutionProposalError(409, 'The content changed after this evolution; it cannot be rolled back safely', 'stale');
    }
    const res = db.prepare(`UPDATE agent_evolution_history SET status = 'rolled_back', rolled_back_at = ? WHERE id = ? AND status != 'rolled_back'`)
      .run(new Date().toISOString(), evolutionId) as { changes: number };
    if (res.changes !== 1) throw new EvolutionProposalError(409, 'Evolution already rolled back', 'already_rolled_back');
    if (kind === 'prompt_append') {
      db.prepare('UPDATE agents_config SET system_prompt = ?, updated_at = ? WHERE id = ?').run(h.before_value ?? '', new Date().toISOString(), agentId);
    } else {
      writePersonalitySync(agentId, h.before_value ?? '');
    }
  });
  return { evolutionId, type };
}
