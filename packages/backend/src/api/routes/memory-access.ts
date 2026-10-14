/**
 * Shared route helpers for the memory side routes (S0-Q.17):
 * /api/memory-sharing* and /api/memory-quality*.
 *
 * Same rules as /api/memory* (S0-Q.11): a valid bearer token of an active
 * member account is required, the user always comes from the token (query/body
 * `userId` is ignored), and another user's memory answers 404. There is no
 * owner-wide view: memories are personal, the owner sees only their own plus
 * what others shared.
 *
 * B1.7: the caller is the request's actor (`request.actor` from the auth gate,
 * or `actorOf(request)` = the same rule when the plugin runs without the
 * gate); every data access goes through the memory repository
 * (repositories/memory-shared.ts), which applies the scope rules.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { actorOf } from '../../auth/auth-gate.js';
import type { Actor } from '../../repositories/actor.js';
import { actorOrReply, requireMember, ScopeError } from '../../repositories/scope.js';
import { MemoryShareInputError } from '../../repositories/memory-shared.js';

/**
 * The member account's actor (central rule), else 401/403 sent and null.
 * Runs before input validation so 401/403 come before 400.
 */
export function memoryMember(request: FastifyRequest, reply: FastifyReply): Actor | null {
    return actorOrReply(reply, actorOf(request), requireMember);
}

/**
 * Send a scope denial (404/403/401) or an input error (400) with the route's
 * usual body; `extra` adds fields (e.g. `success: false`). Returns null for
 * any other error (the caller answers 500).
 */
export function sendMemoryError(reply: FastifyReply, err: unknown, extra: Record<string, unknown> = {}): FastifyReply | null {
    if (err instanceof ScopeError) return reply.status(err.status).send({ ...extra, error: err.message });
    if (err instanceof MemoryShareInputError) return reply.status(400).send({ ...extra, error: err.message });
    return null;
}

/** Bounded positive integer from a query/body value. */
export function boundedInt(value: unknown, fallback: number, max: number): number {
    const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return Math.min(Math.floor(n), max);
}
