/**
 * Shared auth + scope helpers for the memory side routes (S0-Q.17):
 * /api/memory-sharing* and /api/memory-quality*.
 *
 * Same rules as /api/memory* (S0-Q.11): a valid bearer token of an active user
 * is required, the user always comes from the token (query/body `userId` is
 * ignored), and another user's memory answers 404. There is no owner-wide
 * view: memories are personal, the owner sees only their own plus what others
 * shared.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { authenticateActiveUser, type UserRole } from '../../auth/route-guards.js';
import { getDatabase } from '../../db/index.js';

export interface MemoryCaller { id: string; role: UserRole }

/** Adds the auth preHandler to this (encapsulated) plugin. */
export function requireMemoryCaller(fastify: FastifyInstance): void {
    fastify.addHook('preHandler', async (request, reply) => {
        const user = authenticateActiveUser(request);
        if (!user) return reply.code(401).send({ error: 'Authentication required' });
        (request as any).memoryCaller = user satisfies MemoryCaller;
    });
}

export function memoryCaller(request: FastifyRequest): MemoryCaller {
    return (request as any).memoryCaller as MemoryCaller;
}

/** True when `memoryId` exists and belongs to the caller. */
export function callerOwnsMemory(request: FastifyRequest, memoryId: unknown): boolean {
    if (typeof memoryId !== 'string' || !memoryId) return false;
    const row = getDatabase().prepare('SELECT user_id FROM memories WHERE id = ?').get(memoryId) as
        | { user_id: string }
        | undefined;
    return !!row && row.user_id === memoryCaller(request).id;
}

/** Teams the user owns or belongs to (empty when the team tables are missing). */
export function teamIdsOf(userId: string): string[] {
    const db = getDatabase();
    try {
        const rows = db.prepare(`
            SELECT id AS team_id FROM teams WHERE owner_id = ?
            UNION
            SELECT team_id FROM team_members WHERE user_id = ?
        `).all(userId, userId) as { team_id: string }[];
        return rows.map(r => r.team_id);
    } catch {
        return [];
    }
}

/** Bounded positive integer from a query/body value. */
export function boundedInt(value: unknown, fallback: number, max: number): number {
    const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return Math.min(Math.floor(n), max);
}
