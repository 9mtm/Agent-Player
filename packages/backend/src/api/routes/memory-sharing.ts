/**
 * Memory Sharing API Routes
 *
 * Endpoints for multi-agent memory sharing:
 * - Share/unshare memories
 * - Mark memories as team-critical
 * - Run deduplication
 * - View shared knowledge base
 *
 * SECURITY (S0-Q.17): every route needs a valid token of an active member
 * account; the user comes from the token (query/body userId ignored). Only
 * the memory's owner may share/unshare or mark it; another user's memory
 * answers 404. Shared lists show the caller's own shared memories, public
 * ones, and team ones of teams the caller owns or belongs to. Deduplication
 * and the audit log are limited to the caller's own memories (no owner-wide
 * view). B1.7: scope rules live in the memory repository
 * (repositories/memory-shared.ts).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { repositories } from '../../repositories/index.js';
import type { Actor } from '../../repositories/actor.js';
import { memoryMember, sendMemoryError, boundedInt } from './memory-access.js';

export default async function memorySharingRoutes(fastify: FastifyInstance) {
    const memory = () => repositories.memory;

    /** Run `fn` for the member actor; scope/input errors keep their status, others are 500. */
    async function handle(
        request: FastifyRequest,
        reply: FastifyReply,
        failure: string,
        fn: (actor: Actor) => Promise<object>,
    ) {
        const actor = memoryMember(request, reply);
        if (actor === null) return reply;
        try {
            return reply.send({ success: true, ...(await fn(actor)) });
        } catch (error: any) {
            const sent = sendMemoryError(reply, error);
            if (sent) return sent;
            return reply.status(500).send({ error: failure, message: error?.message });
        }
    }

    /**
     * POST /api/memory-sharing/:memoryId/share
     * Share a memory with team or make it public
     */
    fastify.post<{
        Params: { memoryId: string };
        Body: {
            visibility: 'private' | 'team' | 'public';
            teamId?: string;
            reason?: string;
        };
    }>('/api/memory-sharing/:memoryId/share', (request, reply) =>
        handle(request, reply, 'Failed to share memory', async (actor) => {
            const { visibility, teamId, reason } = (request.body || {}) as any;
            return memory().share(actor, request.params.memoryId, { visibility, teamId, reason });
        }));

    /**
     * POST /api/memory-sharing/:memoryId/mark-critical
     * Mark or unmark memory as team-critical
     */
    fastify.post<{
        Params: { memoryId: string };
        Body: {
            critical: boolean;
            reason?: string;
        };
    }>('/api/memory-sharing/:memoryId/mark-critical', (request, reply) =>
        handle(request, reply, 'Failed to mark memory', async (actor) => {
            const { critical, reason } = (request.body || {}) as any;
            return memory().markCritical(actor, request.params.memoryId, { critical, reason });
        }));

    /**
     * GET /api/memory-sharing/shared
     * Get all shared memories (team + public)
     */
    fastify.get<{
        Querystring: {
            userId?: string; // ignored: user comes from the token (S0-Q.17)
            visibility?: 'team' | 'public';
            teamCriticalOnly?: string;
            limit?: string;
        };
    }>('/api/memory-sharing/shared', (request, reply) =>
        handle(request, reply, 'Failed to fetch shared memories', async (actor) => {
            const { visibility, teamCriticalOnly, limit } = request.query;
            const memories = await memory().shared(actor, {
                visibility,
                teamCriticalOnly: teamCriticalOnly === 'true',
                limit: boundedInt(limit, 50, 200),
            });
            if (memories === null) {
                // Visibility column doesn't exist yet - return empty array
                return {
                    count: 0,
                    memories: [],
                    message: 'Migration 047 not applied yet. Please restart backend to apply memory sharing schema.',
                };
            }
            return { count: memories.length, memories };
        }));

    /**
     * GET /api/memory-sharing/by-agent/:agentId
     * Get memories created by a specific agent
     */
    fastify.get<{
        Params: { agentId: string };
        Querystring: { limit?: string };
    }>('/api/memory-sharing/by-agent/:agentId', (request, reply) =>
        handle(request, reply, 'Failed to fetch agent memories', async (actor) => {
            const { agentId } = request.params;
            const memories = await memory().sharedByAgent(actor, agentId, boundedInt(request.query.limit, 20, 200));
            return { agentId, count: memories.length, memories };
        }));

    /**
     * POST /api/memory-sharing/deduplication/run
     * Run memory deduplication for the caller
     */
    fastify.post<{
        Body: {
            userId?: string; // ignored: user comes from the token (S0-Q.17)
            similarityThreshold?: number;
        };
    }>('/api/memory-sharing/deduplication/run', (request, reply) =>
        handle(request, reply, 'Deduplication failed', async (actor) =>
            memory().runDeduplication(actor, Number((request.body as any)?.similarityThreshold ?? 0.85))));

    /**
     * GET /api/memory-sharing/deduplication/stats
     * Get deduplication statistics
     */
    fastify.get<{
        Querystring: { userId?: string }; // userId ignored (S0-Q.17)
    }>('/api/memory-sharing/deduplication/stats', (request, reply) =>
        handle(request, reply, 'Failed to get stats', async (actor) =>
            memory().deduplicationStats(actor)));

    /**
     * GET /api/memory-sharing/deduplication/candidates
     * Find duplicate candidates without merging
     */
    fastify.get<{
        Querystring: {
            userId?: string; // ignored: user comes from the token (S0-Q.17)
            similarityThreshold?: string;
        };
    }>('/api/memory-sharing/deduplication/candidates', (request, reply) =>
        handle(request, reply, 'Failed to find candidates', async (actor) => {
            const threshold = parseFloat(request.query.similarityThreshold || '0.85');
            const groups = await memory().deduplicationCandidates(actor, threshold);
            return {
                groupsCount: groups.length,
                totalCandidates: groups.reduce((sum, g) => sum + g.length, 0),
                groups,
            };
        }));

    /**
     * GET /api/memory-sharing/audit
     * Get sharing audit log
     */
    fastify.get<{
        Querystring: {
            memoryId?: string;
            limit?: string;
        };
    }>('/api/memory-sharing/audit', (request, reply) =>
        handle(request, reply, 'Failed to fetch audit log', async (actor) => {
            const { memoryId, limit } = request.query;
            const logs = await memory().sharingAudit(actor, { memoryId, limit: boundedInt(limit, 50, 200) });
            return { count: logs.length, logs };
        }));
}
