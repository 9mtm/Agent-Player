/**
 * Read-only stage 1 (RUN-ISO, ISO-RO-1).
 *
 * With `AGENT_PLAYER_READONLY=1` (forced by scripts/isolated-server.ts) one
 * root `onRequest` hook, registered before every other hook and the auth
 * gate, is DEFAULT DENY: a request passes only when it is
 *  - GET or HEAD on a route in READ_ONLY_SAFE_READS, matched on the route
 *    Fastify dispatched to (`request.routeOptions.url`) plus the method,
 *    never on the raw URL; or
 *  - a CORS preflight (OPTIONS) for such a read or for one of the POST
 *    exceptions below; or
 *  - one of the exact POST exceptions, matched on the raw URL AND the
 *    dispatched route (no prefix, no query string, no trailing slash):
 *      POST /api/auth/login, POST /api/auth/logout;
 *      POST /api/setup/admin while no owner exists and setup is not complete;
 *      POST /api/setup/complete while setup is not complete.
 * Everything else, including unknown (404) routes, gets
 * 403 `{ error: 'Forbidden', code: 'read_only_stage' }`.
 *
 * Many GET routes have side effects (provider probes, GitHub fetches, docker
 * exec, SQL writes, file writes), so "GET is safe" is not assumed. Every
 * allowlist entry was checked by reading its handler and by calling it under
 * side-effect spies (test/read-only-stage.test.mjs runs that check for every
 * entry). A new entry needs the same review.
 *
 * Also refused: websocket / any `Upgrade` request, any request that asks for
 * an event stream (`Accept: text/event-stream`), and path tricks on reads
 * (`//`, trailing `/`, backslash, `.` / `..` segments, encoded `/` `\` `.` `%` or NUL).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export const READONLY_ENV = 'AGENT_PLAYER_READONLY';

export const READ_ONLY_BODY = Object.freeze({ error: 'Forbidden', code: 'read_only_stage' });

export interface SafeRead {
  readonly method: 'GET';
  /** Fastify route template, exactly as registered (`request.routeOptions.url`). */
  readonly url: string;
  /** Why the handler is side-effect-free. */
  readonly why: string;
}

/**
 * The only reads open in stage 1. HEAD is allowed for the same routes
 * (Fastify's HEAD route runs the GET handler). Checked for each entry:
 * no SQL write, no network (not even loopback / model endpoints), no child
 * process, no file write, no process exit.
 */
export const READ_ONLY_SAFE_READS: readonly SafeRead[] = Object.freeze(([
  { method: 'GET', url: '/health', why: 'static JSON (status, time, version); touches nothing' },
  { method: 'GET', url: '/', why: 'static JSON (name, version, docs link); touches nothing' },
  { method: 'GET', url: '/api/setup/status', why: 'existsSync(setup flag) + SELECT owner; no write, no spawn (unlike /api/setup/check)' },
  { method: 'GET', url: '/api/auth/me', why: 'verifies the token, then SELECT of the caller (identity.self); no session or last-seen write' },
  { method: 'GET', url: '/api/agents', why: 'SELECT * FROM agents_config (listConfigs); no write' },
  { method: 'GET', url: '/api/agents/:id', why: 'SELECT one agents_config row (getConfig); static siblings such as /api/agents/status are separate routes and stay refused' },
  { method: 'GET', url: '/api/agents/:id/personality/proposals', why: 'owner only; validated id and status, SELECT personality proposals; no write' },
  { method: 'GET', url: '/api/agents/:id/personality/proposals/:pid', why: 'owner only; validated ids, SELECT one personality proposal; no write' },
  { method: 'GET', url: '/api/memory/proposals', why: 'owner only; validated status, SELECT memory_file_proposals (LIMIT 200); no write' },
  { method: 'GET', url: '/api/memory/proposals/:id', why: 'owner only; SELECT one memory_file_proposals row by validated id; no write' },
  { method: 'GET', url: '/api/memory/files/:drawer', why: 'owner only; viewDrawerFile renders the export text from SELECTs in a read transaction; never writes the file (export is a separate POST)' },
] as SafeRead[]).map((e) => Object.freeze(e)));

const SAFE_READ_KEYS: ReadonlySet<string> = new Set(READ_ONLY_SAFE_READS.map((e) => `GET ${e.url}`));

/** POST routes that stay open in stage 1 (exact raw URL = dispatched route). */
const ALWAYS_ALLOWED_POSTS = new Set(['/api/auth/login', '/api/auth/logout']);
/**
 * Isolated stage 2 (chat test with the local model only): exactly this one
 * more POST, streaming allowed for it alone. The chat route itself then
 * forces the local Ollama, no tools (AGENT_PLAYER_LOCAL_MODEL_ONLY).
 */
const STAGE2_CHAT_ROUTE = '/api/chat';
function chatStageEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const stage = (env.AGENT_PLAYER_ISOLATED_STAGE ?? '').trim();
  return (stage === '2' || stage === '3') && (env.AGENT_PLAYER_LOCAL_MODEL_ONLY ?? '').trim() === '1';
}
/**
 * Isolated stage 3 (hire test on fresh fake data, owner-approved 2026-10-15):
 * stage 2 plus exactly these routes, each still behind the auth gate (owner
 * tier for grants, admin for create; personality at create is owner-only).
 * Matched on the dispatched route template and a clean raw path (no query).
 *   POST /api/agents                    create (role, persona)
 *   GET  /api/agents/:id/tool-grants    read grants + available tools (SELECTs; MCP tools from the DB, no spawn)
 *   PUT  /api/agents/:id/tool-grants    replace grants (versioned, audited)
 *   GET  /api/agents/:id/permissions    memory scope + off/ask/allow (CORE-PERMS-01)
 *   PUT  /api/agents/:id/permissions    replace them (versioned, audited)
 *   GET  /api/onboarding/team-catalogue company sizes + departments (static)
 *   POST /api/onboarding/team-plan      proposed team with unused names (reads; reserves nothing)
 *   POST /api/onboarding/team-distribution  total headcount split (reads nothing)
 *   POST /api/onboarding/team-batches        store a reviewed plan (owner only)
 *   GET  /api/onboarding/team-batches(/:id)  batch progress
 *   POST /api/onboarding/team-batches/:id/run  create the next agents of the batch (same writes as POST /api/agents)
 */
export const STAGE3_ROUTES: ReadonlySet<string> = new Set([
  'POST /api/agents', 'GET /api/agents/:id/tool-grants', 'PUT /api/agents/:id/tool-grants',
  'GET /api/agents/:id/permissions', 'PUT /api/agents/:id/permissions',
  // BOARD-01: the company task board (owner only)
  'GET /api/boards', 'POST /api/boards', 'GET /api/boards/:id', 'PUT /api/boards/:id', 'POST /api/boards/:id/columns', 'PUT /api/boards/:id/columns/:columnId',
  'POST /api/boards/:id/cards', 'PUT /api/boards/:id/cards/:cardId',
  'GET /api/boards/:id/cards/:cardId/comments', 'POST /api/boards/:id/cards/:cardId/comments',
  'POST /api/boards/:id/labels', 'PUT /api/boards/:id/labels/:labelId',
  'GET /api/boards/:id/cards/:cardId/checklist', 'POST /api/boards/:id/cards/:cardId/checklist', 'PUT /api/boards/:id/cards/:cardId/checklist/:itemId',
  // ONBOARD-TEAM-01: the company catalogue and the proposed team (both only read; names are not reserved)
  'GET /api/onboarding/team-catalogue', 'POST /api/onboarding/team-plan',
  // ONBOARD-TEAM-02: total headcount + batch hire (creates agents like POST /api/agents)
  'POST /api/onboarding/team-distribution', 'POST /api/onboarding/team-batches', 'GET /api/onboarding/team-batches',
  'GET /api/onboarding/team-batches/:id', 'POST /api/onboarding/team-batches/:id/run',
]);
function hireStageEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.AGENT_PLAYER_ISOLATED_STAGE ?? '').trim() === '3' && (env.AGENT_PLAYER_LOCAL_MODEL_ONLY ?? '').trim() === '1';
}
function hireStageRoute(method: string, rawUrl: string, route: string | undefined): boolean {
  if (!hireStageEnabled() || !route || !STAGE3_ROUTES.has(`${method} ${route}`)) return false;
  const path = cleanPath(rawUrl);
  return path !== null && path === rawUrl;
}
const SETUP_POSTS = new Set(['/api/setup/admin', '/api/setup/complete']);

export interface SetupState {
  ownerExists: boolean;
  setupComplete: boolean;
}

export interface ReadOnlyStageOptions {
  /**
   * Current first-run state; any error or rejection counts as "complete"
   * (fail closed). B2.2c: may be async (the owner check reads the database
   * on the process driver).
   */
  setupState: () => SetupState | Promise<SetupState>;
}

export function readOnlyStageEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env[READONLY_ENV] ?? '').trim() === '1';
}

/** True when the route template + method is an allowlisted safe read. */
export function isSafeRead(method: string, routeUrl: string | undefined): boolean {
  const m = method.toUpperCase();
  if (m !== 'GET' && m !== 'HEAD') return false;
  return typeof routeUrl === 'string' && SAFE_READ_KEYS.has(`GET ${routeUrl}`);
}

async function safeSetupState(get: () => SetupState | Promise<SetupState>): Promise<SetupState> {
  try {
    const s = await get();
    return { ownerExists: s.ownerExists === true, setupComplete: s.setupComplete !== false };
  } catch {
    return { ownerExists: true, setupComplete: true };
  }
}

/**
 * Path part of the raw URL, or null when it carries a path trick: double
 * slash, trailing slash, backslash, `.`/`..` segment, or an encoded `/` `\` `.` `%` or NUL.
 */
function cleanPath(rawUrl: string): string | null {
  const q = rawUrl.search(/[?#]/);
  const p = q === -1 ? rawUrl : rawUrl.slice(0, q);
  if (!p.startsWith('/') || p.includes('//') || p.includes('\\')) return null;
  if (p.length > 1 && p.endsWith('/')) return null; // empty last segment (would be an empty param)
  if (/%(2f|5c|2e|25|00)/i.test(p)) return null;
  if (p.split('/').some((s) => s === '.' || s === '..')) return null;
  return p;
}

function decode(s: string): string | null {
  try { return decodeURIComponent(s); } catch { return null; }
}

/**
 * CORS preflight for a safe read: the path must fill an allowlisted template
 * AND Fastify must route that path (for GET) with exactly the same params, so
 * a static sibling (e.g. /api/agents/status vs /api/agents/:id) never rides
 * on a parameter template.
 */
function preflightTargetsSafeRead(fastify: FastifyInstance, path: string): boolean {
  let found: { params?: Record<string, string> } | null = null;
  try { found = fastify.findRoute({ method: 'GET', url: path }) as { params?: Record<string, string> } | null; } catch { return false; }
  if (!found) return false;
  const routed = found.params ?? {};
  const segs = path.split('/');
  return READ_ONLY_SAFE_READS.some((e) => {
    const tpl = e.url.split('/');
    if (tpl.length !== segs.length) return false;
    const params: Record<string, string> = {};
    for (let i = 0; i < tpl.length; i++) {
      if (tpl[i].startsWith(':')) {
        const v = decode(segs[i]);
        if (v === null || v === '') return false;
        params[tpl[i].slice(1)] = v;
      } else if (tpl[i] !== segs[i]) return false;
    }
    const a = Object.keys(params).sort();
    const b = Object.keys(routed).sort();
    return a.length === b.length && a.every((k, i) => k === b[i] && params[k] === routed[k]);
  });
}

/** True when this request may pass the read-only stage (async: the setup state may read the database). */
export async function readOnlyAllows(request: FastifyRequest, opts: ReadOnlyStageOptions): Promise<boolean> {
  const method = request.method.toUpperCase();
  const rawUrl = request.raw.url ?? request.url ?? '';
  const route = request.routeOptions?.url;
  const headers = request.headers;
  if (headers.upgrade !== undefined || String(headers.connection ?? '').toLowerCase().includes('upgrade')) return false;
  const stageChat = chatStageEnabled() && method === 'POST' && !!route && rawUrl === route && route === STAGE2_CHAT_ROUTE;
  if (stageChat) return true;
  if (String(headers.accept ?? '').toLowerCase().includes('text/event-stream')) return false;

  if (method === 'GET' || method === 'HEAD') {
    if (method === 'GET' && hireStageRoute(method, rawUrl, route)) return true;
    return cleanPath(rawUrl) !== null && isSafeRead(method, route);
  }
  if (method === 'PUT') return hireStageRoute(method, rawUrl, route);

  if (method === 'OPTIONS') {
    // Only @fastify/cors' preflight route ('*'), never a custom OPTIONS handler.
    if (route !== '*' || headers.origin === undefined) return false;
    const wanted = String(headers['access-control-request-method'] ?? '').trim().toUpperCase();
    const path = cleanPath(rawUrl);
    if (path === null) return false;
    if (wanted === 'GET' || wanted === 'HEAD') return preflightTargetsSafeRead(request.server, path);
    if (wanted === 'POST') return rawUrl === path && (ALWAYS_ALLOWED_POSTS.has(path) || SETUP_POSTS.has(path) || (chatStageEnabled() && path === STAGE2_CHAT_ROUTE));
    return false;
  }

  if (method !== 'POST') return false;
  if (!route) return false;
  // Stage 3 POSTs may have a path parameter (batch run): the template must be listed and the raw path clean, with no query.
  if (hireStageRoute(method, rawUrl, route)) return true;
  // Exact match on the raw URL and on the dispatched route: no query, no prefix, no encoding tricks.
  if (rawUrl !== route) return false;
  if (ALWAYS_ALLOWED_POSTS.has(route)) return true;
  if (SETUP_POSTS.has(route)) {
    const state = await safeSetupState(opts.setupState);
    if (state.setupComplete) return false;
    return route === '/api/setup/complete' || !state.ownerExists;
  }
  return false;
}

/**
 * Register the stage-1 hook. Call it right after creating the Fastify
 * instance, before every other hook, so nothing else runs for a refused
 * request. Does nothing unless AGENT_PLAYER_READONLY=1.
 */
export function registerReadOnlyStage(fastify: FastifyInstance, opts: ReadOnlyStageOptions): void {
  if (!readOnlyStageEnabled()) return;
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (await readOnlyAllows(request, opts)) return;
    return reply.code(403).send(READ_ONLY_BODY);
  });
}
