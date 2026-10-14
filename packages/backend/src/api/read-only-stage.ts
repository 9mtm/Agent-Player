/**
 * Read-only stage 1 (RUN-ISO).
 *
 * With `AGENT_PLAYER_READONLY=1` (forced by scripts/isolated-server.ts) one
 * root `onRequest` hook, registered before every other hook and the auth
 * gate, refuses every method other than GET / HEAD / OPTIONS with
 * 403 `{ error: 'Forbidden', code: 'read_only_stage' }`. That covers chat
 * (including SSE chat, which is POST), memory/personality decisions, agent
 * edits, settings and every other write.
 *
 * Exceptions, matched exactly on the raw request URL (no prefix match, no
 * query string, no trailing slash) AND on the route Fastify dispatched to:
 *  - POST /api/auth/login, POST /api/auth/logout;
 *  - POST /api/setup/admin while no owner exists and setup is not complete;
 *  - POST /api/setup/complete while setup is not complete.
 *
 * Also refused in this stage: websocket / any `Upgrade` request, any request
 * that asks for an event stream (`Accept: text/event-stream`), and
 * GET /api/setup/check (it spawns host commands).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export const READONLY_ENV = 'AGENT_PLAYER_READONLY';

export const READ_ONLY_BODY = Object.freeze({ error: 'Forbidden', code: 'read_only_stage' });

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** POST routes that stay open in stage 1. */
const ALWAYS_ALLOWED = new Set(['/api/auth/login', '/api/auth/logout']);

/** Reads that still have side effects (spawn host commands): refused in stage 1. */
const REFUSED_READS = new Set(['/api/setup/check']);

export interface SetupState {
  ownerExists: boolean;
  setupComplete: boolean;
}

export interface ReadOnlyStageOptions {
  /** Current first-run state; any error counts as "complete" (fail closed). */
  setupState: () => SetupState;
}

export function readOnlyStageEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env[READONLY_ENV] ?? '').trim() === '1';
}

function safeSetupState(get: () => SetupState): SetupState {
  try {
    const s = get();
    return { ownerExists: s.ownerExists === true, setupComplete: s.setupComplete !== false };
  } catch {
    return { ownerExists: true, setupComplete: true };
  }
}

/** True when this request may pass the read-only stage. */
export function readOnlyAllows(request: FastifyRequest, opts: ReadOnlyStageOptions): boolean {
  const method = request.method.toUpperCase();
  const rawUrl = request.raw.url ?? request.url ?? '';
  const route = request.routeOptions?.url;
  const headers = request.headers;
  if (headers.upgrade !== undefined || String(headers.connection ?? '').toLowerCase().includes('upgrade')) return false;
  if (String(headers.accept ?? '').toLowerCase().includes('text/event-stream')) return false;

  if (READ_METHODS.has(method)) {
    const pathOnly = rawUrl.split('?')[0];
    return !REFUSED_READS.has(pathOnly) && !(route && REFUSED_READS.has(route));
  }
  if (method !== 'POST') return false;
  // Exact match on the raw URL and on the dispatched route: no query, no prefix, no encoding tricks.
  if (!route || rawUrl !== route) return false;
  if (ALWAYS_ALLOWED.has(route)) return true;
  if (route === '/api/setup/admin' || route === '/api/setup/complete') {
    const state = safeSetupState(opts.setupState);
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
    if (readOnlyAllows(request, opts)) return;
    return reply.code(403).send(READ_ONLY_BODY);
  });
}
