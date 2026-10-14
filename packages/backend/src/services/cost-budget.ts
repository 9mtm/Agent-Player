/**
 * Cost budget gate for autonomous model calls (R2, D-BUDGET).
 *
 *  - Price table: cents per 1,000 input / output tokens per provider, with
 *    model-name patterns. Local providers (Ollama) cost 0. Built-in values
 *    are conservative ESTIMATES (they may over-count); the owner sets real
 *    prices with MODEL_PRICES_JSON. A provider not in the table counts as
 *    paid at the highest known price (fail closed).
 *  - Daily cap: DAILY_PAID_CAP_CENTS (default 0 = no autonomous paid model
 *    calls at all, until the owner sets an amount). Day = UTC date.
 *  - Per-run limit: the run's contract budget (`maxCostCents`); none = only
 *    the daily cap applies.
 *
 * Before a paid autonomous call, its worst case (estimated input tokens +
 * max output tokens) is RESERVED in `paid_usage` inside one immediate
 * transaction (SQLite BEGIN IMMEDIATE; PostgreSQL a transaction-scoped
 * advisory lock), so two workers cannot both pass the cap. After the call the
 * reservation is replaced by the provider-reported usage (or the estimate
 * when the provider reports none); a call that failed releases it. A
 * reservation left by a crash keeps counting (we cannot know whether the
 * provider billed it).
 *
 * Interactive chat with the owner (/api/chat and friends) does NOT go
 * through this gate; autonomous and background calls do, through the
 * choke point `src/llm/model-call.ts` (R2.2). Interactive paid usage is
 * recorded separately (`interactive_usage`) and shown by budgetView().
 */

import { all, dialect, one, run, sql, type Step } from '../repositories/sql-steps.js';
import { nowText, returningId } from '../db/pg/dialect.js';

/**
 * pg_advisory_xact_lock key of the paid-call reservation (PostgreSQL): the
 * check of the cap and the insert of the reservation run one at a time, as
 * BEGIN IMMEDIATE does on SQLite. ('AP' 'B$' in hex; db/pg/migrate.ts uses 'AP_M'.)
 */
export const BUDGET_LOCK_KEY = 0x41504224;

export interface Price { input: number; output: number }
interface ProviderPrices { default: Price; models?: Array<{ match: string; price: Price }> }
export type PriceTable = Record<string, ProviderPrices>;

/** Conservative built-in estimates (cents per 1k tokens); override with MODEL_PRICES_JSON. */
const BUILTIN_PRICES: PriceTable = {
  ollama: { default: { input: 0, output: 0 } },
  local: { default: { input: 0, output: 0 } },
  claude: {
    default: { input: 0.3, output: 1.5 },
    models: [
      { match: 'opus', price: { input: 1.5, output: 7.5 } },
      { match: 'sonnet', price: { input: 0.3, output: 1.5 } },
      { match: 'haiku', price: { input: 0.1, output: 0.5 } },
    ],
  },
  openai: { default: { input: 1.0, output: 3.0 } },
};

const PROVIDER_ALIASES: Record<string, string> = { anthropic: 'claude' };

function validPrice(p: any): p is Price {
  return p && typeof p === 'object' && Number.isFinite(p.input) && Number.isFinite(p.output) && p.input >= 0 && p.output >= 0 && p.input <= 1e4 && p.output <= 1e4;
}

/** Built-in table merged with MODEL_PRICES_JSON (invalid entries ignored, warned once). */
export function priceTable(): PriceTable {
  const table: PriceTable = JSON.parse(JSON.stringify(BUILTIN_PRICES));
  const raw = process.env.MODEL_PRICES_JSON;
  if (!raw) return table;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    for (const [prov, val] of Object.entries(parsed as Record<string, any>)) {
      const name = normalizeProvider(prov);
      if (!/^[a-z0-9_-]{1,40}$/.test(name) || !val || typeof val !== 'object') continue;
      const entry: ProviderPrices = { default: validPrice(val.default) ? { input: val.default.input, output: val.default.output } : (table[name]?.default ?? highestPrice(table)) };
      const models: Array<{ match: string; price: Price }> = [];
      if (val.models && typeof val.models === 'object') {
        for (const [match, price] of Object.entries(val.models as Record<string, any>)) {
          if (typeof match === 'string' && match.length > 0 && match.length <= 100 && validPrice(price)) models.push({ match: match.toLowerCase(), price: { input: price.input, output: price.output } });
        }
      }
      // An owner entry replaces the provider's built-in estimates (with a
      // default given) or adds model prices in front of them (without one).
      entry.models = validPrice(val.default) ? models : [...models, ...(table[name]?.models ?? [])];
      table[name] = entry;
    }
  } catch {
    warnOnce('MODEL_PRICES_JSON is not valid JSON; the built-in price estimates are used');
  }
  return table;
}

const warned = new Set<string>();
function warnOnce(msg: string) {
  if (warned.has(msg)) return;
  warned.add(msg);
  console.warn(`[CostBudget] ${msg}`);
}

function normalizeProvider(p: string): string {
  const n = String(p || '').trim().toLowerCase();
  return PROVIDER_ALIASES[n] ?? n;
}

function highestPrice(table: PriceTable): Price {
  let best: Price = { input: 0, output: 0 };
  for (const p of Object.values(table)) {
    for (const price of [p.default, ...(p.models ?? []).map((m) => m.price)]) {
      if (price.input + price.output > best.input + best.output) best = price;
    }
  }
  return best;
}

/** Price of one model (cents per 1k tokens). Unknown provider -> the highest known price. */
export function priceFor(provider: string, model?: string | null): Price & { known: boolean } {
  const table = priceTable();
  const entry = table[normalizeProvider(provider)];
  if (!entry) return { ...highestPrice(table), known: false };
  const m = String(model ?? '').toLowerCase();
  // Longest match wins (an exact model id before a family pattern).
  const hit = (entry.models ?? []).filter((x) => m.includes(x.match)).sort((a, b) => b.match.length - a.match.length)[0];
  return { ...(hit ? hit.price : entry.default), known: true };
}

export function isPaidProvider(provider: string, model?: string | null): boolean {
  const p = priceFor(provider, model);
  return p.input > 0 || p.output > 0;
}

export function costCents(price: Price, inputTokens: number, outputTokens: number): number {
  const c = (Math.max(0, inputTokens) / 1000) * price.input + (Math.max(0, outputTokens) / 1000) * price.output;
  return Math.round(c * 10_000) / 10_000;
}

/** Rough upper estimate of input tokens from the request size (3 characters per token). */
export function estimateTokens(payload: unknown): number {
  let s: string;
  try { s = typeof payload === 'string' ? payload : JSON.stringify(payload ?? ''); } catch { s = String(payload); }
  return Math.ceil(s.length / 3);
}

/** DAILY_PAID_CAP_CENTS (integer cents, default 0 = no autonomous paid calls). */
export function dailyCapCents(): number {
  const raw = process.env.DAILY_PAID_CAP_CENTS;
  if (raw === undefined || raw.trim() === '') return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    warnOnce('DAILY_PAID_CAP_CENTS is invalid; 0 (no autonomous paid calls) is used');
    return 0;
  }
  return Math.floor(n);
}

export function utcDay(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** Spend of a day in cents: recorded usage plus open reservations (worst case). */
function* spentStep(day: string): Step<number> {
  const row = yield* one<{ c: number }>(`
    SELECT COALESCE(SUM(CASE WHEN status = 'reserved' THEN estimated_cents WHEN status = 'recorded' THEN cost_cents ELSE 0 END), 0) AS c
    FROM paid_usage WHERE day = ?
  `, day);
  return Math.round(Number(row!.c) * 10_000) / 10_000;
}

export function spentCents(day = utcDay()): Promise<number> {
  return sql().read(spentStep(day));
}

function* runSpentStep(runId: string): Step<number> {
  const row = yield* one<{ c: number }>(`
    SELECT COALESCE(SUM(CASE WHEN status = 'reserved' THEN estimated_cents WHEN status = 'recorded' THEN cost_cents ELSE 0 END), 0) AS c
    FROM paid_usage WHERE run_id = ?
  `, runId);
  return Number(row!.c);
}

export class CostBudgetError extends Error {
  constructor(readonly which: 'daily_cap' | 'run_limit', message: string) { super(message); }
}

export interface PaidCallRequest {
  provider: string;
  model?: string | null;
  /** Request payload used for the input estimate (messages, system prompt, tools). */
  payload: unknown;
  maxOutputTokens: number;
  purpose: 'task_run' | 'heartbeat' | string;
  runId?: string | null;
  stepIndex?: number | null;
  /** Per-run cost limit (cents); null/undefined = only the daily cap. */
  runLimitCents?: number | null;
}

export interface PaidCallTicket {
  id: number | null;
  provider: string;
  model: string | null;
  price: Price;
  estimatedInputTokens: number;
  estimatedCents: number;
  paid: boolean;
}

/**
 * Check the budget before an autonomous model call and reserve its worst
 * case. Free providers pass without a reservation. Throws CostBudgetError.
 */
export async function reservePaidCall(req: PaidCallRequest, now = Date.now()): Promise<PaidCallTicket> {
  const price = priceFor(req.provider, req.model);
  const estimatedInputTokens = estimateTokens(req.payload);
  const estimatedCents = costCents(price, estimatedInputTokens, Math.max(1, req.maxOutputTokens || 0));
  const base = { provider: normalizeProvider(req.provider), model: req.model ?? null, price, estimatedInputTokens, estimatedCents };
  if (price.input <= 0 && price.output <= 0) return { id: null, ...base, paid: false };

  const day = utcDay(now);
  const cap = dailyCapCents();
  const id = await sql().tx(function* () {
    const d = yield* dialect();
    if (d === 'postgres') yield* one('SELECT pg_advisory_xact_lock(?)', BUDGET_LOCK_KEY);
    const spent = yield* spentStep(day);
    if (spent + estimatedCents > cap) {
      throw new CostBudgetError('daily_cap', cap === 0
        ? 'daily paid cap is 0: autonomous paid model calls are off until the owner sets DAILY_PAID_CAP_CENTS'
        : `daily paid cap ${cap} cents would be exceeded (spent ${spent.toFixed(2)}, this call up to ${estimatedCents.toFixed(2)})`);
    }
    if (req.runId && req.runLimitCents !== null && req.runLimitCents !== undefined) {
      const used = yield* runSpentStep(req.runId);
      if (used + estimatedCents > req.runLimitCents) {
        throw new CostBudgetError('run_limit', `max cost ${req.runLimitCents} cents would be exceeded (used ${used.toFixed(2)}, this call up to ${estimatedCents.toFixed(2)})`);
      }
    }
    // RETURNING id instead of lastInsertRowid (paid_usage.id is the INTEGER
    // PRIMARY KEY on SQLite, an identity column on PostgreSQL).
    const row = yield* one<{ id: number }>(returningId(d, `
      INSERT INTO paid_usage (day, provider, model, run_id, step_index, purpose, status, estimated_cents)
      VALUES (?, ?, ?, ?, ?, ?, 'reserved', ?)
    `), day, base.provider, base.model, req.runId ?? null, req.stepIndex ?? null, req.purpose, estimatedCents);
    return Number(row!.id);
  }, { immediate: true });
  return { id, ...base, paid: true };
}

export interface Usage { inputTokens?: number | null; outputTokens?: number | null }

export interface RecordedUsage {
  inputTokens: number; outputTokens: number; costCents: number; source: 'provider' | 'estimate';
}

/** Replace a reservation by the real usage (provider-reported, else the estimate). */
export async function recordPaidCall(ticket: PaidCallTicket, usage: Usage | null | undefined, outputText = ''): Promise<RecordedUsage> {
  const fromProvider = !!usage && Number.isFinite(usage.inputTokens) && Number.isFinite(usage.outputTokens);
  const inputTokens = fromProvider ? Number(usage!.inputTokens) : ticket.estimatedInputTokens;
  const outputTokens = fromProvider ? Number(usage!.outputTokens) : estimateTokens(outputText);
  const cost = costCents(ticket.price, inputTokens, outputTokens);
  const out: RecordedUsage = { inputTokens, outputTokens, costCents: cost, source: fromProvider ? 'provider' : 'estimate' };
  if (ticket.id !== null) {
    const id = ticket.id;
    await sql().read((function* () {
      const d = yield* dialect();
      yield* run(`
        UPDATE paid_usage SET status = 'recorded', cost_cents = ?, input_tokens = ?, output_tokens = ?, usage_source = ?, updated_at = ${nowText(d)}
        WHERE id = ? AND status = 'reserved'
      `, cost, inputTokens, outputTokens, out.source, id);
    })());
  }
  return out;
}

/** The call failed before the provider answered: drop its reservation. */
export async function releasePaidCall(ticket: PaidCallTicket): Promise<void> {
  if (ticket.id === null) return;
  const id = ticket.id;
  await sql().read((function* () {
    const d = yield* dialect();
    yield* run(`UPDATE paid_usage SET status = 'released', updated_at = ${nowText(d)} WHERE id = ? AND status = 'reserved'`, id);
  })());
}

export interface BudgetView {
  day: string;
  dailyCapCents: number;
  spentTodayCents: number;
  reservedTodayCents: number;
  remainingTodayCents: number;
  autonomousPaidCallsAllowed: boolean;
  callsToday: number;
  byProvider: Array<{ provider: string; cents: number; calls: number }>;
  /** R2.2: interactive (owner present) paid usage today, not part of the cap. */
  interactive: { cents: number; calls: number; byProvider: Array<{ provider: string; cents: number; calls: number }> };
  prices: PriceTable;
  pricesAreEstimates: boolean;
  scope: string;
}

export async function budgetView(now = Date.now()): Promise<BudgetView> {
  const day = utcDay(now);
  const cap = dailyCapCents();
  const spent = await spentCents(day);
  const reserved = Number((await sql().read(one<{ c: number }>(`SELECT COALESCE(SUM(estimated_cents), 0) AS c FROM paid_usage WHERE day = ? AND status = 'reserved'`, day)))!.c);
  const byProvider = await sql().read(all<{ provider: string; calls: number; cents: number }>(`
    SELECT provider, COUNT(*) AS calls,
      COALESCE(SUM(CASE WHEN status = 'reserved' THEN estimated_cents WHEN status = 'recorded' THEN cost_cents ELSE 0 END), 0) AS cents
    FROM paid_usage WHERE day = ? AND status != 'released' GROUP BY provider ORDER BY provider
  `, day));
  let interactiveBy: Array<{ provider: string; calls: number; cents: number }> = [];
  try {
    interactiveBy = await sql().read(all<{ provider: string; calls: number; cents: number }>(`
      SELECT provider, COUNT(*) AS calls, COALESCE(SUM(cost_cents), 0) AS cents
      FROM interactive_usage WHERE day = ? GROUP BY provider ORDER BY provider
    `, day));
  } catch { /* table missing on an old DB: nothing recorded yet */ }
  return {
    day,
    dailyCapCents: cap,
    spentTodayCents: spent,
    reservedTodayCents: Math.round(reserved * 10_000) / 10_000,
    remainingTodayCents: Math.max(0, Math.round((cap - spent) * 10_000) / 10_000),
    autonomousPaidCallsAllowed: cap > 0 && spent < cap,
    callsToday: byProvider.reduce((n, p) => n + p.calls, 0),
    byProvider,
    interactive: {
      cents: Math.round(interactiveBy.reduce((n, p) => n + p.cents, 0) * 10_000) / 10_000,
      calls: interactiveBy.reduce((n, p) => n + p.calls, 0),
      byProvider: interactiveBy,
    },
    prices: priceTable(),
    pricesAreEstimates: !process.env.MODEL_PRICES_JSON,
    scope: 'The daily cap covers autonomous model calls (task runs, cron heartbeat, memory extraction, weekly summary; background work uses the free local model unless BACKGROUND_PAID_PURPOSES opts a purpose in). Interactive chat with the owner is not blocked by this cap; its paid usage is shown under interactive.',
  };
}
