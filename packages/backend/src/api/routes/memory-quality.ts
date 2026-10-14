/**
 * Memory Quality API Routes
 *
 * Endpoints for memory quality scoring, enrichment, and insights
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { repositories } from '../../repositories/index.js';
import type { Actor } from '../../repositories/actor.js';
import { memoryMember, sendMemoryError, boundedInt } from './memory-access.js';

/**
 * SECURITY (S0-Q.17): every route needs a valid token of an active member
 * account; the user comes from the token (query/body userId ignored);
 * per-memory routes answer 404 for another user's memory. No owner-wide view.
 * B1.7: scope rules live in the memory repository (repositories/memory-shared.ts).
 */
export default async function memoryQualityRoutes(fastify: FastifyInstance) {
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
        } catch (err: any) {
            const sent = sendMemoryError(reply, err, { success: false });
            if (sent) return sent;
            console.error(`${failure}:`, err);
            return reply.status(500).send({ success: false, error: err?.message || failure });
        }
    }

    const memoryIdOf = (request: FastifyRequest) => (request.params as { memoryId: string }).memoryId;

    // Get quality statistics for the caller
    fastify.get('/api/memory-quality/stats', (request, reply) =>
        handle(request, reply, 'Failed to get quality stats', async (actor) => ({
            stats: await memory().qualityStats(actor),
        })));

    // Get low quality memories that need improvement
    fastify.get('/api/memory-quality/low-quality', (request, reply) =>
        handle(request, reply, 'Failed to get low quality memories', async (actor) => {
            const { limit } = (request.query || {}) as { limit?: string };
            const memories = await memory().lowQuality(actor, boundedInt(limit, 10, 100));
            return { count: memories.length, memories };
        }));

    // Analyze quality of a specific memory
    fastify.get('/api/memory-quality/:memoryId/analyze', (request, reply) =>
        handle(request, reply, 'Failed to analyze memory quality', async (actor) => ({
            analysis: await memory().analyzeQuality(actor, memoryIdOf(request)),
        })));

    // Enrich a specific memory
    fastify.post('/api/memory-quality/:memoryId/enrich', (request, reply) =>
        handle(request, reply, 'Failed to enrich memory', async (actor) => ({
            result: await memory().enrich(actor, memoryIdOf(request)),
        })));

    // Batch enrich multiple memories
    fastify.post('/api/memory-quality/batch-enrich', (request, reply) =>
        handle(request, reply, 'Failed to batch enrich memories', async (actor) => {
            const { limit } = (request.body || {}) as { limit?: number };
            const results = await memory().batchEnrich(actor, boundedInt(limit, 10, 50));
            return { count: results.length, results };
        }));

    // Get quality history for a memory
    fastify.get('/api/memory-quality/:memoryId/history', (request, reply) =>
        handle(request, reply, 'Failed to get quality history', async (actor) => ({
            history: await memory().qualityHistory(actor, memoryIdOf(request)),
        })));

    // Get memory relationships
    fastify.get('/api/memory-quality/:memoryId/relationships', (request, reply) =>
        handle(request, reply, 'Failed to get memory relationships', async (actor) => ({
            relationships: await memory().relationships(actor, memoryIdOf(request)),
        })));

    // Get enrichment log for a memory
    fastify.get('/api/memory-quality/:memoryId/enrichment-log', (request, reply) =>
        handle(request, reply, 'Failed to get enrichment log', async (actor) => ({
            log: await memory().enrichmentLog(actor, memoryIdOf(request)),
        })));

    // Get quality distribution (for charts)
    fastify.get('/api/memory-quality/distribution', (request, reply) =>
        handle(request, reply, 'Failed to get quality distribution', async (actor) =>
            memory().qualityDistribution(actor)));
}
