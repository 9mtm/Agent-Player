/**
 * Request and notice helpers for the older evolution proxies (FU-02):
 * status, history, insights, analyze, config, measure and rollback.
 * Pure: no fetch, no React.
 *
 * The proxies validate and encode the ids, forward only the documented
 * fields, and keep the backend status code; the page maps status + code to
 * a short notice with evolutionNotice().
 */

/** Same shape the backend accepts for agent ids; history ids use it too. */
const ID_RE = /^[A-Za-z0-9_.:-]{1,128}$/;
const WORD_RE = /^[a-z_]{1,40}$/;
const FREQUENCIES = ['hourly', 'daily', 'weekly', 'manual'] as const;
const EVOLUTION_TYPES = ['prompt_update', 'capability_added', 'capability_removed', 'config_change'] as const;

export type EvolutionAction = 'status' | 'analyze' | 'config' | 'measure' | 'rollback';

/** An evolution history id (old rows are free-form, new ones are UUIDs). */
export function isEvolutionId(v: unknown): v is string {
    return typeof v === 'string' && ID_RE.test(v) && v !== '.' && v !== '..';
}

/** Backend path under /api/evolution/:agentId; every segment is encoded. */
export function evolutionPath(agentId: string, ...rest: string[]): string {
    return ['/api/evolution', agentId, ...rest].map((s, i) => (i === 0 ? s : encodeURIComponent(s))).join('/');
}

function intParam(v: string | null, min: number, max: number): number | null {
    if (v === null || !/^\d{1,6}$/.test(v)) return null;
    const n = Number(v);
    return n >= min && n <= max ? n : null;
}

function query(parts: Record<string, string | number | null>): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(parts)) if (v !== null) q.set(k, String(v));
    const s = q.toString();
    return s ? `?${s}` : '';
}

/** GET history: limit (1..200, default 20), status and type (plain words). */
export function historyQuery(params: URLSearchParams): string {
    const status = params.get('status');
    const type = params.get('type');
    return query({
        limit: intParam(params.get('limit'), 1, 200) ?? 20,
        status: status && WORD_RE.test(status) ? status : null,
        type: type && WORD_RE.test(type) ? type : null,
    });
}

/** GET insights: limit (1..200, default 20), applied (true|false), type, minConfidence (0..1). */
export function insightsQuery(params: URLSearchParams): string {
    const applied = params.get('applied');
    const type = params.get('type');
    const minRaw = params.get('minConfidence');
    const min = minRaw !== null && /^(0(\.\d{1,4})?|1(\.0{1,4})?)$/.test(minRaw) ? minRaw : null;
    return query({
        limit: intParam(params.get('limit'), 1, 200) ?? 20,
        applied: applied === 'true' || applied === 'false' ? applied : null,
        type: type && WORD_RE.test(type) ? type : null,
        minConfidence: min,
    });
}

function objectOf(raw: unknown): Record<string, unknown> {
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
}

function numIn(v: unknown, min: number, max: number, integer = false): v is number {
    return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v));
}

/** POST analyze body: only periodDays (integer 1..365). */
export function pickAnalyzeBody(raw: unknown): { periodDays?: number } {
    const p = objectOf(raw).periodDays;
    return numIn(p, 1, 365, true) ? { periodDays: p } : {};
}

export interface BackendEvolutionConfig {
    enabled?: boolean;
    min_confidence_threshold?: number;
    min_sample_size?: number;
    evolution_frequency?: (typeof FREQUENCIES)[number];
    allowed_evolutions?: string[];
    max_evolutions_per_cycle?: number;
    rollback_on_degradation?: boolean;
    degradation_threshold?: number;
}

/** PUT config body: only the documented backend fields, each type-checked. */
export function pickConfigBody(raw: unknown): BackendEvolutionConfig {
    const s = objectOf(raw);
    const out: BackendEvolutionConfig = {};
    if (typeof s.enabled === 'boolean') out.enabled = s.enabled;
    if (numIn(s.min_confidence_threshold, 0, 1)) out.min_confidence_threshold = s.min_confidence_threshold;
    if (numIn(s.min_sample_size, 1, 100_000, true)) out.min_sample_size = s.min_sample_size;
    if (typeof s.evolution_frequency === 'string' && (FREQUENCIES as readonly string[]).includes(s.evolution_frequency)) {
        out.evolution_frequency = s.evolution_frequency as BackendEvolutionConfig['evolution_frequency'];
    }
    if (Array.isArray(s.allowed_evolutions)) {
        out.allowed_evolutions = [...new Set(s.allowed_evolutions.filter(
            (t): t is string => typeof t === 'string' && (EVOLUTION_TYPES as readonly string[]).includes(t),
        ))];
    }
    if (numIn(s.max_evolutions_per_cycle, 1, 100, true)) out.max_evolutions_per_cycle = s.max_evolutions_per_cycle;
    if (typeof s.rollback_on_degradation === 'boolean') out.rollback_on_degradation = s.rollback_on_degradation;
    if (numIn(s.degradation_threshold, 0, 1)) out.degradation_threshold = s.degradation_threshold;
    return out;
}

/** The config shape the ConfigPanel edits. */
export interface PanelEvolutionConfig {
    enabled: boolean;
    minConfidenceThreshold: number;
    minSampleSize: number;
    evolutionFrequency: (typeof FREQUENCIES)[number];
    allowedEvolutions: string[];
    maxEvolutionsPerCycle: number;
    rollbackOnDegradation: boolean;
    degradationThreshold: number;
}

export const DEFAULT_PANEL_CONFIG: PanelEvolutionConfig = {
    enabled: false,
    minConfidenceThreshold: 0.7,
    minSampleSize: 10,
    evolutionFrequency: 'daily',
    allowedEvolutions: ['prompt_update', 'capability_added'],
    maxEvolutionsPerCycle: 3,
    rollbackOnDegradation: true,
    degradationThreshold: 0.1,
};

/** Panel config -> the backend's snake_case PUT body (validated). */
export function configToBackend(panel: Partial<PanelEvolutionConfig>): BackendEvolutionConfig {
    const p = objectOf(panel);
    return pickConfigBody({
        enabled: p.enabled,
        min_confidence_threshold: p.minConfidenceThreshold,
        min_sample_size: p.minSampleSize,
        evolution_frequency: p.evolutionFrequency,
        allowed_evolutions: p.allowedEvolutions,
        max_evolutions_per_cycle: p.maxEvolutionsPerCycle,
        rollback_on_degradation: p.rollbackOnDegradation,
        degradation_threshold: p.degradationThreshold,
    });
}

/** The status route's snake_case config row (enabled may be 0/1) -> panel config. */
export function configFromStatus(raw: unknown): PanelEvolutionConfig {
    const s = objectOf(raw);
    const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : v === 1 ? true : v === 0 ? false : d);
    const picked = pickConfigBody({
        ...s,
        enabled: bool(s.enabled, DEFAULT_PANEL_CONFIG.enabled),
        rollback_on_degradation: bool(s.rollback_on_degradation, DEFAULT_PANEL_CONFIG.rollbackOnDegradation),
    });
    const d = DEFAULT_PANEL_CONFIG;
    return {
        enabled: picked.enabled ?? d.enabled,
        minConfidenceThreshold: picked.min_confidence_threshold ?? d.minConfidenceThreshold,
        minSampleSize: picked.min_sample_size ?? d.minSampleSize,
        evolutionFrequency: picked.evolution_frequency ?? d.evolutionFrequency,
        allowedEvolutions: picked.allowed_evolutions ?? [...d.allowedEvolutions],
        maxEvolutionsPerCycle: picked.max_evolutions_per_cycle ?? d.maxEvolutionsPerCycle,
        rollbackOnDegradation: picked.rollback_on_degradation ?? d.rollbackOnDegradation,
        degradationThreshold: picked.degradation_threshold ?? d.degradationThreshold,
    };
}

const ROLLBACK_NOTICES: Record<string, string> = {
    stale: 'The content changed after this evolution. It cannot be rolled back safely.',
    rollback_unsupported: 'Only prompt and PERSONALITY.md changes can be rolled back. Edit capabilities in the agent settings.',
    already_rolled_back: 'This evolution was already rolled back.',
};

const FALLBACK: Record<EvolutionAction, string> = {
    status: 'Failed to load evolution status',
    analyze: 'Failed to analyze performance',
    config: 'Failed to save configuration',
    measure: 'Failed to measure impact',
    rollback: 'Failed to rollback',
};

/** Short notice for a failed evolution request, by action, HTTP status and backend code. */
export function evolutionNotice(action: EvolutionAction, status: number, code?: unknown): string {
    if (status === 401) return 'Sign in again.';
    if (status === 403) return 'Owner only';
    if (action === 'rollback' && status === 409 && typeof code === 'string'
        && Object.prototype.hasOwnProperty.call(ROLLBACK_NOTICES, code)) {
        return ROLLBACK_NOTICES[code];
    }
    if (status === 404) {
        return action === 'status' || action === 'config'
            ? 'Evolution is not set up for this agent.'
            : 'Evolution not found for this agent.';
    }
    if (status === 400) return action === 'config' ? 'No valid configuration fields to save.' : 'The request was not valid.';
    if (status === 502) return 'Backend unavailable';
    return FALLBACK[action];
}
