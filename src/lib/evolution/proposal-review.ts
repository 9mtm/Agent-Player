/**
 * Pending-proposal review helpers (FU-01). Pure: no fetch, no React.
 *
 * Two proposal families share one review flow:
 *  - evolution proposals  /api/evolution/:agentId/proposals[...]
 *  - personality proposals /api/agents/:id/personality/proposals[...]
 * A decision (approve / reject / cancel) sends back the reviewHash of the
 * detail the owner looked at, so the backend can refuse it when the
 * proposal changed (409 review_changed).
 */

export type ProposalFamily = 'evolution' | 'personality';
export type DecisionAction = 'approve' | 'reject' | 'cancel';

export const DECISION_ACTIONS: readonly DecisionAction[] = ['approve', 'reject', 'cancel'];
export const PROPOSAL_STATUSES = ['pending', 'approved', 'rejected', 'stale', 'cancelled'] as const;

/** Same shapes the backend accepts. */
const AGENT_ID_RE = /^[A-Za-z0-9_.:-]{1,128}$/;
const PROPOSAL_ID_RE = /^[0-9a-f-]{36}$/;
const REVIEW_HASH_RE = /^[0-9a-f]{64}$/;
const MAX_NOTE_CHARS = 500;

export function isDecisionAction(v: unknown): v is DecisionAction {
    return typeof v === 'string' && (DECISION_ACTIONS as readonly string[]).includes(v);
}

export function isAgentId(v: unknown): v is string {
    return typeof v === 'string' && AGENT_ID_RE.test(v) && v !== '.' && v !== '..';
}

export function isProposalId(v: unknown): v is string {
    return typeof v === 'string' && PROPOSAL_ID_RE.test(v);
}

export function isReviewHash(v: unknown): v is string {
    return typeof v === 'string' && REVIEW_HASH_RE.test(v);
}

/** A known `?status=` value, else null (the filter is dropped). */
export function statusQuery(v: string | null | undefined): string | null {
    return typeof v === 'string' && (PROPOSAL_STATUSES as readonly string[]).includes(v) ? v : null;
}

/** Backend path for a proposal list, detail or decision; ids are encoded. */
export function proposalPath(
    family: ProposalFamily,
    agentId: string,
    proposalId?: string,
    action?: DecisionAction,
): string {
    const base = family === 'evolution'
        ? `/api/evolution/${encodeURIComponent(agentId)}/proposals`
        : `/api/agents/${encodeURIComponent(agentId)}/personality/proposals`;
    if (!proposalId) return base;
    const detail = `${base}/${encodeURIComponent(proposalId)}`;
    return action ? `${detail}/${action}` : detail;
}

export interface DecisionBody {
    expectedReviewHash?: string;
    note?: string;
}

/**
 * Only the documented fields of a decision body:
 *  - every action: expectedReviewHash (string);
 *  - evolution reject: also note (string, at most 500 characters).
 * Anything else in `raw` is dropped.
 */
export function pickDecisionBody(family: ProposalFamily, action: DecisionAction, raw: unknown): DecisionBody {
    const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    const out: DecisionBody = {};
    if (typeof src.expectedReviewHash === 'string') out.expectedReviewHash = src.expectedReviewHash;
    if (family === 'evolution' && action === 'reject' && typeof src.note === 'string') {
        const note = src.note.trim().slice(0, MAX_NOTE_CHARS);
        if (note) out.note = note;
    }
    return out;
}

/** Body the page sends for a decision on the detail it shows. */
export function buildDecisionBody(
    family: ProposalFamily,
    action: DecisionAction,
    reviewHash: string,
    note?: string,
): DecisionBody {
    return pickDecisionBody(family, action, { expectedReviewHash: reviewHash, note });
}

/** POST /api/evolution/:agentId/personality-proposal body: only windowDays (1..90). */
export function pickPersonalityTriggerBody(raw: unknown): { windowDays?: number } {
    const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    const w = src.windowDays;
    return typeof w === 'number' && Number.isInteger(w) && w >= 1 && w <= 90 ? { windowDays: w } : {};
}

const NOTICES: Record<string, string> = {
    already_decided: 'This proposal was already decided. Showing its current state.',
    review_changed: 'This proposal changed since you opened it. Review it again.',
    stale: 'The agent changed after this proposal was made. It is now stale.',
    already_rolled_back: 'This change was already rolled back.',
    rollback_unsupported: 'This change cannot be rolled back.',
    review_hash_required: 'Open the proposal again before deciding.',
    invalid_input: 'The request was not valid.',
    not_found: 'Proposal not found.',
    pending_exists: 'A personality proposal is already pending.',
    personality_locked: 'The personality is locked. Unlock it first.',
    too_many_pending: 'Too many pending proposals. Decide some first.',
};

/** Short notice for a failed request, by HTTP status and backend error code. */
export function decisionNotice(status: number, code?: unknown): string {
    if (status === 401) return 'Sign in again.';
    if (status === 403) return 'Owner only';
    if (typeof code === 'string' && Object.prototype.hasOwnProperty.call(NOTICES, code)) return NOTICES[code];
    if (status === 404) return NOTICES.not_found;
    if (status === 409) return 'This proposal changed. Showing its current state.';
    if (status === 400) return NOTICES.invalid_input;
    return 'Request failed';
}

/** 409: the detail on screen is out of date; fetch it again. */
export function shouldRefetchDetail(status: number): boolean {
    return status === 409;
}

/** Personality delta as readable lines: "warmth +2", "humor -1". */
export function formatDelta(delta: unknown): string[] {
    if (!delta || typeof delta !== 'object' || Array.isArray(delta)) return [];
    const out: string[] = [];
    for (const [trait, value] of Object.entries(delta as Record<string, unknown>)) {
        if (typeof value !== 'number' || !Number.isFinite(value)) continue;
        out.push(`${trait} ${value > 0 ? '+' : ''}${value}`);
    }
    return out;
}

/** Evidence (or any list) as plain strings; other values are dropped. */
export function textList(v: unknown): string[] {
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export interface SuggestedCapability {
    capability: string;
    title: string;
    description: string;
    confidence: number | null;
}

/** `suggestedCapabilities` from an evolve result (informational only). */
export function suggestedCapabilities(result: unknown): SuggestedCapability[] {
    const list = result && typeof result === 'object' ? (result as Record<string, unknown>).suggestedCapabilities : undefined;
    if (!Array.isArray(list)) return [];
    return list.flatMap((s) => {
        if (!s || typeof s !== 'object') return [];
        const r = s as Record<string, unknown>;
        return [{
            capability: typeof r.capability === 'string' ? r.capability : '',
            title: typeof r.title === 'string' ? r.title : '',
            description: typeof r.description === 'string' ? r.description : '',
            confidence: typeof r.confidence === 'number' && Number.isFinite(r.confidence) ? r.confidence : null,
        }];
    });
}
