/**
 * Versioned agent personality storage (CORE-01).
 *
 * The database (agent_personality_versions, migration 056) is canonical.
 * Every change appends a version; the current personality is the highest
 * version. PERSONALITY.md keeps a generated, readable copy of the current
 * version between markers; hand-written text in that file is kept.
 *
 * Drift (CORE-01c, MEM-03) is proposal-only: the agent, Evolution or a
 * person creates a pending row in personality_proposals (migration 075);
 * only the owner's approval appends the bounded change as a new version.
 * There is no exported way to apply drift directly.
 *
 * Personality never grants tools or permissions (see services/personality.ts).
 */

import { createHash, randomUUID } from 'node:crypto';
import { isoUtc } from '../api/timestamps.js';
import { getDatabase } from '../db/index.js';
import { readPersonality, writePersonality } from './agent-files.js';
import {
  DEFAULT_DIALECT,
  DEFAULT_TRAITS,
  PRESETS,
  PersonalityInputError,
  TRAIT_NAMES,
  boundedDrift,
  defaultPersonalityForRole,
  isDialect,
  isPresetId,
  isTraitName,
  renderPersonalityExport,
  upsertPersonalityExport,
  validateLockedTraits,
  validateTraitPatch,
  validateTraits,
  type AgentRole,
  type Dialect,
  type TraitName,
  type Traits,
} from './personality.js';

export type PersonalitySource = 'default' | 'seed' | 'owner' | 'rollback' | 'lock' | 'unlock' | 'evolution';

export interface PersonalityVersion {
  agentId: string;
  /** 0 = not stored yet (defaults). */
  version: number;
  traits: Traits;
  preset: string | null;
  dialect: Dialect;
  locked: boolean;
  lockedTraits: TraitName[];
  source: PersonalitySource;
  basedOnVersion: number | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string | null;
}

/** Thrown when a change is refused because the personality is locked. */
export class PersonalityLockedError extends Error {}
/** Thrown when the agent or version does not exist. */
export class PersonalityNotFoundError extends Error {}

interface Row {
  agent_id: string;
  version: number;
  traits: string;
  preset: string | null;
  dialect: string;
  locked: number;
  locked_traits: string;
  source: string;
  based_on_version: number | null;
  note: string | null;
  created_by: string;
  created_at: string;
}

function fromRow(row: Row): PersonalityVersion {
  let traits: Traits;
  try { traits = validateTraits(JSON.parse(row.traits)); } catch { traits = { ...DEFAULT_TRAITS }; }
  let lockedTraits: TraitName[] = [];
  try { lockedTraits = validateLockedTraits(JSON.parse(row.locked_traits)); } catch { lockedTraits = []; }
  return {
    agentId: row.agent_id,
    version: row.version,
    traits,
    preset: row.preset,
    dialect: isDialect(row.dialect) ? row.dialect : DEFAULT_DIALECT,
    locked: row.locked === 1,
    lockedTraits,
    source: row.source as PersonalitySource,
    basedOnVersion: row.based_on_version,
    note: row.note,
    createdBy: row.created_by,
    createdAt: isoUtc(row.created_at), // BE-UI-01: ISO UTC with Z
  };
}

function defaults(agentId: string): PersonalityVersion {
  return {
    agentId, version: 0, traits: { ...DEFAULT_TRAITS }, preset: null, dialect: DEFAULT_DIALECT,
    locked: false, lockedTraits: [], source: 'default', basedOnVersion: null, note: null, createdBy: null, createdAt: null,
  };
}

export function agentExists(agentId: string): boolean {
  return !!getDatabase().prepare('SELECT 1 FROM agents_config WHERE id = ?').get(agentId);
}

/** Current personality, or defaults (version 0) when nothing is stored. Null if the agent does not exist. */
export function getCurrentPersonality(agentId: string): PersonalityVersion | null {
  if (!agentExists(agentId)) return null;
  const row = getDatabase()
    .prepare('SELECT * FROM agent_personality_versions WHERE agent_id = ? ORDER BY version DESC LIMIT 1')
    .get(agentId) as Row | undefined;
  return row ? fromRow(row) : defaults(agentId);
}

export function listPersonalityVersions(agentId: string): PersonalityVersion[] | null {
  if (!agentExists(agentId)) return null;
  const rows = getDatabase()
    .prepare('SELECT * FROM agent_personality_versions WHERE agent_id = ? ORDER BY version DESC')
    .all(agentId) as Row[];
  return rows.map(fromRow);
}

interface NewVersion {
  traits: Traits;
  preset: string | null;
  dialect: Dialect;
  locked: boolean;
  lockedTraits: TraitName[];
  source: Exclude<PersonalitySource, 'default'>;
  basedOnVersion: number | null;
  note: string | null;
}

/** Append a version atomically (next number computed inside the transaction). */
function appendVersion(agentId: string, createdBy: string, v: NewVersion): PersonalityVersion {
  const db = getDatabase();
  // DatabaseManager.transaction runs the function at once inside a transaction.
  const version = db.transaction(() => {
    const max = (db.prepare('SELECT MAX(version) AS v FROM agent_personality_versions WHERE agent_id = ?').get(agentId) as { v: number | null }).v ?? 0;
    const version = max + 1;
    db.prepare(`
      INSERT INTO agent_personality_versions
        (agent_id, version, traits, preset, dialect, locked, locked_traits, source, based_on_version, note, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(agentId, version, JSON.stringify(v.traits), v.preset, v.dialect, v.locked ? 1 : 0,
      JSON.stringify(v.lockedTraits), v.source, v.basedOnVersion, v.note, createdBy);
    return version;
  });
  const row = db.prepare('SELECT * FROM agent_personality_versions WHERE agent_id = ? AND version = ?').get(agentId, version) as Row;
  return fromRow(row);
}

function validNote(note: unknown): string | null {
  if (note === undefined || note === null) return null;
  if (typeof note !== 'string' || note.length > 500) throw new PersonalityInputError('note must be a string of at most 500 characters');
  return note.trim() || null;
}

export interface SaveInput {
  traits?: unknown;
  preset?: unknown;
  dialect?: unknown;
  lockedTraits?: unknown;
  note?: unknown;
}

interface Start { traits: Traits; preset: string | null; dialect: Dialect; lockedTraits: TraitName[] }

/**
 * The owner's input over a starting point: the chosen preset (else the
 * start's traits), then the given traits override. Validates everything.
 */
function mergeOwnerInput(start: Start, input: SaveInput): Start & { note: string | null } {
  const allowed = new Set(['traits', 'preset', 'dialect', 'lockedTraits', 'note']);
  for (const k of Object.keys(input || {})) {
    if (!allowed.has(k)) throw new PersonalityInputError(`Unknown field: ${k.slice(0, 40)}`);
  }
  if (input.traits === undefined && input.preset === undefined && input.dialect === undefined && input.lockedTraits === undefined) {
    throw new PersonalityInputError('Nothing to save');
  }
  let preset: string | null = start.preset;
  let base: Traits = start.traits;
  if (input.preset !== undefined) {
    if (input.preset === null) {
      preset = null;
    } else if (isPresetId(input.preset)) {
      preset = input.preset;
      base = { ...PRESETS[input.preset].traits };
    } else {
      throw new PersonalityInputError('Unknown preset');
    }
  }
  // The preset is the starting point; traits given here override it.
  const traits = validateTraits({ ...base, ...validateTraitPatch(input.traits) });

  let dialect: Dialect = start.dialect;
  if (input.dialect !== undefined) {
    if (!isDialect(input.dialect)) throw new PersonalityInputError('Unsupported dialect');
    dialect = input.dialect;
  }
  const lockedTraits = input.lockedTraits === undefined ? start.lockedTraits : validateLockedTraits(input.lockedTraits);
  return { traits, preset, dialect, lockedTraits, note: validNote(input.note) };
}

/** Validate an owner's personality input without saving (e.g. before creating an agent). */
export function checkOwnerPersonalityInput(input: SaveInput): void {
  mergeOwnerInput({ traits: { ...DEFAULT_TRAITS }, preset: null, dialect: DEFAULT_DIALECT, lockedTraits: [] }, input);
}

/**
 * Owner saves a new version. Start values: the chosen preset, else the
 * current traits; then the given traits override. Refused while locked.
 */
export function savePersonalityVersion(agentId: string, input: SaveInput, createdBy: string): PersonalityVersion {
  const allowed = new Set(['traits', 'preset', 'dialect', 'lockedTraits', 'note']);
  for (const k of Object.keys(input || {})) {
    if (!allowed.has(k)) throw new PersonalityInputError(`Unknown field: ${k.slice(0, 40)}`);
  }
  const current = getCurrentPersonality(agentId);
  if (!current) throw new PersonalityNotFoundError('Agent not found');
  if (current.locked) throw new PersonalityLockedError('Personality is locked; unlock it first');
  const merged = mergeOwnerInput(current, input);
  return appendVersion(agentId, createdBy, {
    ...merged, locked: false, source: 'owner', basedOnVersion: current.version || null,
  });
}

/** Lock or unlock the whole personality. Adds a version (history stays complete). */
export function setPersonalityLocked(agentId: string, locked: boolean, createdBy: string): PersonalityVersion {
  const current = getCurrentPersonality(agentId);
  if (!current) throw new PersonalityNotFoundError('Agent not found');
  if (current.locked === locked) return current;
  return appendVersion(agentId, createdBy, {
    traits: current.traits, preset: current.preset, dialect: current.dialect, locked,
    lockedTraits: current.lockedTraits, source: locked ? 'lock' : 'unlock',
    basedOnVersion: current.version || null, note: null,
  });
}

/** Roll back: a new version with the traits, preset and dialect of an older one. Refused while locked. */
export function rollbackPersonality(agentId: string, toVersion: unknown, createdBy: string): PersonalityVersion {
  if (typeof toVersion !== 'number' || !Number.isInteger(toVersion) || toVersion < 1) {
    throw new PersonalityInputError('version must be a positive integer');
  }
  const current = getCurrentPersonality(agentId);
  if (!current) throw new PersonalityNotFoundError('Agent not found');
  if (current.locked) throw new PersonalityLockedError('Personality is locked; unlock it first');
  const row = getDatabase()
    .prepare('SELECT * FROM agent_personality_versions WHERE agent_id = ? AND version = ?')
    .get(agentId, toVersion) as Row | undefined;
  if (!row) throw new PersonalityNotFoundError('Version not found');
  const target = fromRow(row);
  return appendVersion(agentId, createdBy, {
    traits: target.traits, preset: target.preset, dialect: target.dialect, locked: false,
    lockedTraits: target.lockedTraits, source: 'rollback', basedOnVersion: target.version,
    note: `rollback to version ${target.version}`,
  });
}

// ---------------------------------------------------------------------------
// Version 1 of a newly created agent (CORE-01c, MEM-03)
// ---------------------------------------------------------------------------

/**
 * Seed version 1 of a just-created agent. Runs inside the creation
 * transaction (a throw rolls the new agent back).
 *  - `explicit` (the owner's preset/traits/dialect/lockedTraits) wins:
 *    source 'owner'; the role default is the starting point for traits
 *    that are not given.
 *  - otherwise the role default (defaultPersonalityForRole): source 'seed'.
 * Refused when the agent already has a version (never overwrites history).
 */
export function seedPersonalityForNewAgent(
  agentId: string,
  opts: { role: AgentRole | null; department: string | null; explicit?: SaveInput | null },
  createdBy: string,
): PersonalityVersion {
  const current = getCurrentPersonality(agentId);
  if (!current) throw new PersonalityNotFoundError('Agent not found');
  if (current.version !== 0) throw new PersonalityInputError('The agent already has a personality');
  const seed = defaultPersonalityForRole({ role: opts.role, department: opts.department });
  const start = { traits: seed.traits, preset: seed.preset as string | null, dialect: seed.dialect, lockedTraits: [] as TraitName[] };
  if (opts.explicit) {
    const merged = mergeOwnerInput(start, opts.explicit);
    return appendVersion(agentId, createdBy, { ...merged, locked: false, source: 'owner', basedOnVersion: null, note: merged.note ?? 'set at creation' });
  }
  const note = opts.role ? `default for role ${opts.role}${opts.department ? ` (${opts.department})` : ''}` : 'default';
  return appendVersion(agentId, createdBy, { ...start, locked: false, source: 'seed', basedOnVersion: null, note });
}

// ---------------------------------------------------------------------------
// Drift proposals (CORE-01c, MEM-03): proposal-only, owner approves
// ---------------------------------------------------------------------------

export type ProposalSource = 'agent' | 'evolution' | 'owner';
export const PROPOSAL_STATUSES = ['pending', 'approved', 'rejected', 'stale', 'cancelled'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

/** Machine codes: `personality_locked`, `no_change`, `too_many_pending`, `already_decided`, `stale`, `review_changed`, `review_hash_required`. */
export type ProposalErrorCode =
  | 'personality_locked' | 'no_change' | 'too_many_pending'
  | 'already_decided' | 'stale' | 'review_changed' | 'review_hash_required';

export class PersonalityProposalError extends Error {
  constructor(readonly status: 400 | 404 | 409 | 429, message: string, readonly code?: ProposalErrorCode) { super(message); }
}

export interface PersonalityProposal {
  id: string;
  agentId: string;
  /** Current version when the proposal was made (0 = nothing stored yet). */
  baseVersion: number;
  baseTraits: Traits;
  /** Complete traits after the change (bounded, locked traits unchanged). */
  proposedTraits: Traits;
  /** Only the traits that change: new value minus base value. */
  delta: Partial<Record<TraitName, number>>;
  reason: string;
  evidence: string[];
  source: ProposalSource;
  status: ProposalStatus;
  createdBy: string;
  createdAt: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  /** Version written by the approval. */
  appliedVersion: number | null;
  /**
   * sha256 hex of ['personality-proposal-review/v1', id, agentId, baseVersion,
   * proposedTraits, reason, evidence]. Approve/reject must send it back as
   * expectedReviewHash (the owner decides on exactly what they saw).
   */
  reviewHash: string;
}

export const MAX_DRIFT_STEP = 5;
export const MAX_REASON_CHARS = 1000;
export const MAX_EVIDENCE_ITEMS = 20;
export const MAX_EVIDENCE_CHARS = 200;
export const MAX_DECISION_NOTE_CHARS = 500;
/** Pending proposals per agent before new ones are refused (429 `too_many_pending`). */
export const MAX_PENDING_PROPOSALS = 50;

export function personalityProposalReviewHash(
  p: Pick<PersonalityProposal, 'id' | 'agentId' | 'baseVersion' | 'proposedTraits' | 'reason' | 'evidence'>,
): string {
  // Canonical trait order (TRAIT_NAMES), whatever order the object was built in.
  const traits = Object.fromEntries(TRAIT_NAMES.map((n) => [n, p.proposedTraits[n]]));
  return createHash('sha256')
    .update(JSON.stringify(['personality-proposal-review/v1', p.id, p.agentId, p.baseVersion, traits, p.reason, p.evidence]))
    .digest('hex');
}

interface ProposalRow {
  id: string; agent_id: string; base_version: number; base_traits: string; proposed_traits: string;
  reason: string; evidence: string; source: string; status: string; review_hash: string;
  created_by: string; created_at: string; decided_by: string | null; decided_at: string | null;
  decision_note: string | null; applied_version: number | null;
}

function parseTraits(json: string): Traits {
  try { return validateTraits(JSON.parse(json)); } catch { return { ...DEFAULT_TRAITS }; }
}

function proposalFromRow(row: ProposalRow): PersonalityProposal {
  const baseTraits = parseTraits(row.base_traits);
  const proposedTraits = parseTraits(row.proposed_traits);
  let evidence: string[] = [];
  try {
    const list = JSON.parse(row.evidence);
    evidence = Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch { evidence = []; }
  const delta: Partial<Record<TraitName, number>> = {};
  for (const n of TRAIT_NAMES) if (proposedTraits[n] !== baseTraits[n]) delta[n] = proposedTraits[n] - baseTraits[n];
  const p = {
    id: row.id, agentId: row.agent_id, baseVersion: row.base_version, baseTraits, proposedTraits, delta,
    reason: row.reason, evidence, source: row.source as ProposalSource, status: row.status as ProposalStatus,
    createdBy: row.created_by, createdAt: isoUtc(row.created_at),
    decidedBy: row.decided_by, decidedAt: isoUtc(row.decided_at), decisionNote: row.decision_note,
    appliedVersion: row.applied_version,
  };
  // Recomputed from what is shown (not the stored column), so a reviewer always
  // approves exactly the content they were given.
  return { ...p, reviewHash: personalityProposalReviewHash(p) };
}

function validReason(v: unknown): string {
  if (typeof v !== 'string') throw new PersonalityInputError('reason is required (text)');
  const out = v.trim();
  if (!out) throw new PersonalityInputError('reason is required (text)');
  if (out.length > MAX_REASON_CHARS) throw new PersonalityInputError(`reason must be at most ${MAX_REASON_CHARS} characters`);
  return out;
}

function validEvidence(v: unknown): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new PersonalityInputError('evidence must be an array of references');
  if (v.length > MAX_EVIDENCE_ITEMS) throw new PersonalityInputError(`evidence may list at most ${MAX_EVIDENCE_ITEMS} references`);
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== 'string' || !item.trim()) throw new PersonalityInputError('each evidence reference must be non-empty text');
    const ref = item.trim();
    if (ref.length > MAX_EVIDENCE_CHARS) throw new PersonalityInputError(`each evidence reference must be at most ${MAX_EVIDENCE_CHARS} characters`);
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f]/.test(ref)) throw new PersonalityInputError('evidence references must be single-line text');
    if (!out.includes(ref)) out.push(ref);
  }
  return out;
}

function validDecisionNote(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') throw new PersonalityInputError('note must be text');
  if (v.length > MAX_DECISION_NOTE_CHARS) throw new PersonalityInputError(`note must be at most ${MAX_DECISION_NOTE_CHARS} characters`);
  return v.trim() || null;
}

/** Target values from `traits` (absolute, partial) or `delta` (signed change per trait). */
function targetTraits(current: Traits, input: Record<string, unknown>): Partial<Traits> {
  const hasTraits = input.traits !== undefined;
  const hasDelta = input.delta !== undefined;
  if (hasTraits === hasDelta) throw new PersonalityInputError('Send either traits (target values) or delta (change per trait)');
  if (hasTraits) return validateTraitPatch(input.traits);
  const d = input.delta;
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new PersonalityInputError('delta must be an object');
  const out: Partial<Traits> = {};
  for (const [k, v] of Object.entries(d as Record<string, unknown>)) {
    if (!isTraitName(k)) throw new PersonalityInputError(`Unknown trait: ${k.slice(0, 40)}`);
    if (typeof v !== 'number' || !Number.isInteger(v) || v < -100 || v > 100) {
      throw new PersonalityInputError(`delta for ${k} must be an integer from -100 to 100`);
    }
    out[k] = Math.max(0, Math.min(100, current[k] + v));
  }
  return out;
}

export function getPersonalityProposal(agentId: string, id: string): PersonalityProposal | null {
  const row = getDatabase().prepare('SELECT * FROM personality_proposals WHERE id = ? AND agent_id = ?').get(id, agentId) as ProposalRow | undefined;
  return row ? proposalFromRow(row) : null;
}

/** Newest first (at most 200). Null when the agent does not exist. */
export function listPersonalityProposals(agentId: string, status?: ProposalStatus): PersonalityProposal[] | null {
  if (!agentExists(agentId)) return null;
  const rows = (status
    ? getDatabase().prepare('SELECT * FROM personality_proposals WHERE agent_id = ? AND status = ? ORDER BY created_at DESC, rowid DESC LIMIT 200').all(agentId, status)
    : getDatabase().prepare('SELECT * FROM personality_proposals WHERE agent_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 200').all(agentId)) as ProposalRow[];
  return rows.map(proposalFromRow);
}

/**
 * Create a pending drift proposal. Nothing about the personality changes.
 * Each trait moves at most MAX_DRIFT_STEP points from the current version;
 * locked traits are left out; a locked personality is refused (409
 * `personality_locked`). Body: { traits | delta, reason, evidence? }.
 * Callers pass a trusted `source`/`createdBy` (the repository decides them
 * from the actor, never from the body).
 */
export function createPersonalityProposal(agentId: string, raw: unknown, source: ProposalSource, createdBy: string): PersonalityProposal {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new PersonalityInputError('Body must be an object');
  const input = raw as Record<string, unknown>;
  const allowed = new Set(['traits', 'delta', 'reason', 'evidence']);
  for (const k of Object.keys(input)) {
    if (!allowed.has(k)) throw new PersonalityInputError(`Unknown field: ${k.slice(0, 40)}`);
  }
  const reason = validReason(input.reason);
  const evidence = validEvidence(input.evidence);
  const db = getDatabase();
  const id = randomUUID();
  db.transaction(() => {
    const current = getCurrentPersonality(agentId);
    if (!current) throw new PersonalityNotFoundError('Agent not found');
    if (current.locked) throw new PersonalityProposalError(409, 'Personality is locked; unlock it first', 'personality_locked');
    const target = targetTraits(current.traits, input);
    const proposedTraits = boundedDrift(current.traits, target, current.lockedTraits, MAX_DRIFT_STEP);
    if (TRAIT_NAMES.every((n) => proposedTraits[n] === current.traits[n])) {
      throw new PersonalityProposalError(400, 'Nothing would change (same values, or only locked traits)', 'no_change');
    }
    const pending = (db.prepare(`SELECT COUNT(*) AS n FROM personality_proposals WHERE agent_id = ? AND status = 'pending'`).get(agentId) as { n: number }).n;
    if (pending >= MAX_PENDING_PROPOSALS) {
      throw new PersonalityProposalError(429, 'Too many pending personality proposals for this agent; decide some first', 'too_many_pending');
    }
    const reviewHash = personalityProposalReviewHash({ id, agentId, baseVersion: current.version, proposedTraits, reason, evidence });
    db.prepare(`
      INSERT INTO personality_proposals (id, agent_id, base_version, base_traits, proposed_traits, reason, evidence, source, review_hash, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, agentId, current.version, JSON.stringify(current.traits), JSON.stringify(proposedTraits), reason,
      JSON.stringify(evidence), source, reviewHash, createdBy);
  });
  return getPersonalityProposal(agentId, id)!;
}

const REVIEW_HASH = /^[0-9a-f]{64}$/;

/** Exists for this agent, still pending, and the caller reviewed exactly this content. */
function decidable(agentId: string, id: string, expectedReviewHash: unknown): PersonalityProposal {
  const p = getPersonalityProposal(agentId, id);
  if (!p) throw new PersonalityProposalError(404, 'Proposal not found');
  if (p.status !== 'pending') throw new PersonalityProposalError(409, `Proposal is already ${p.status}`, 'already_decided');
  if (typeof expectedReviewHash !== 'string' || !REVIEW_HASH.test(expectedReviewHash)) {
    throw new PersonalityProposalError(400, 'expectedReviewHash is required (the reviewHash of the proposal you reviewed)', 'review_hash_required');
  }
  if (expectedReviewHash !== p.reviewHash) {
    throw new PersonalityProposalError(409, 'The proposal changed since it was reviewed; open it again', 'review_changed');
  }
  return p;
}

/** The claim: exactly one decision moves the row out of 'pending'. */
function claimDecision(agentId: string, id: string, status: 'approved' | 'rejected' | 'stale', decidedBy: string, note: string | null): void {
  const res = getDatabase().prepare(`
    UPDATE personality_proposals SET status = ?, decided_by = ?, decided_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), decision_note = ?
    WHERE id = ? AND agent_id = ? AND status = 'pending'
  `).run(status, decidedBy, note, id, agentId) as { changes: number };
  if (res.changes !== 1) throw new PersonalityProposalError(409, 'Proposal was already decided', 'already_decided');
}

/**
 * Bounded drift onto the current version. Module-private on purpose: the only
 * caller is approvePersonalityProposal, inside its transaction, after the
 * claim. There is no other way for drift to reach a personality.
 */
function applyPersonalityDrift(agentId: string, proposal: PersonalityProposal, createdBy: string): PersonalityVersion {
  const current = getCurrentPersonality(agentId);
  if (!current) throw new PersonalityNotFoundError('Agent not found');
  if (current.locked) throw new PersonalityProposalError(409, 'Personality is locked; unlock it first', 'personality_locked');
  // base_version == current (checked by the caller), so this re-bounding is a
  // no-op for an untouched row and a safety net for anything else.
  const traits = boundedDrift(current.traits, proposal.proposedTraits, current.lockedTraits, MAX_DRIFT_STEP);
  return appendVersion(agentId, createdBy, {
    traits, preset: current.preset, dialect: current.dialect, locked: false,
    lockedTraits: current.lockedTraits, source: 'evolution', basedOnVersion: proposal.baseVersion || null,
    note: `approved proposal ${proposal.id}`,
  });
}

/**
 * Owner approves: in one transaction re-check pending + reviewHash, refuse
 * (and mark 'stale') when the personality moved on since base_version, claim
 * the row, append the new version (source 'evolution', based_on_version =
 * base_version) and record it on the proposal. A concurrent decision makes
 * the claim fail and nothing is written (409 `already_decided`).
 */
export function approvePersonalityProposal(
  agentId: string, id: string, decidedBy: string, expectedReviewHash: unknown,
): { proposal: PersonalityProposal; version: PersonalityVersion } {
  const db = getDatabase();
  let stale = false;
  let version: PersonalityVersion | null = null;
  db.transaction(() => {
    const p = decidable(agentId, id, expectedReviewHash);
    const current = getCurrentPersonality(agentId);
    if (!current) throw new PersonalityNotFoundError('Agent not found');
    if (current.version !== p.baseVersion) {
      claimDecision(agentId, id, 'stale', decidedBy, null);
      stale = true;
      return;
    }
    claimDecision(agentId, id, 'approved', decidedBy, null);
    version = applyPersonalityDrift(agentId, p, decidedBy);
    db.prepare('UPDATE personality_proposals SET applied_version = ? WHERE id = ? AND agent_id = ?').run(version.version, id, agentId);
  });
  if (stale) throw new PersonalityProposalError(409, 'The personality changed after this proposal was made; it was marked stale', 'stale');
  return { proposal: getPersonalityProposal(agentId, id)!, version: version! };
}

/** Owner rejects: nothing in the personality changes. Same checks and claim as approve. */
export function rejectPersonalityProposal(
  agentId: string, id: string, decidedBy: string, expectedReviewHash: unknown, note?: unknown,
): PersonalityProposal {
  const decisionNote = validDecisionNote(note);
  getDatabase().transaction(() => {
    decidable(agentId, id, expectedReviewHash);
    claimDecision(agentId, id, 'rejected', decidedBy, decisionNote);
  });
  return getPersonalityProposal(agentId, id)!;
}

/** Write the readable copy of the current version into PERSONALITY.md. */
export async function exportPersonalityFile(p: PersonalityVersion): Promise<void> {
  const existing = await readPersonality(p.agentId);
  await writePersonality(p.agentId, upsertPersonalityExport(existing, renderPersonalityExport(p)));
}
