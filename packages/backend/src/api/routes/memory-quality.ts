/**
 * Memory Quality API Routes
 *
 * Endpoints for memory quality scoring, enrichment, and insights
 */

import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { MemoryQualityScorer } from '../../services/memory-quality-scorer.js';
import { MemoryEnrichmentService } from '../../services/memory-enrichment.js';

export default async function memoryQualityRoutes(fastify: FastifyInstance) {
    // Get quality statistics for a user
    fastify.get('/api/memory-quality/stats', async (request, reply) => {
        try {
            const { userId } = request.query as { userId: string };

            if (!userId) {
                return reply.status(400).send({
                    success: false,
                    error: 'userId is required'
                });
            }

            const stats = await MemoryQualityScorer.getQualityStats(userId);

            return reply.send({
                success: true,
                stats
            });
        } catch (err: any) {
            console.error('Failed to get quality stats:', err);
            return reply.status(500).send({
                success: false,
                error: err.message || 'Failed to get quality stats'
            });
        }
    });

    // Get low quality memories that need improvement
    fastify.get('/api/memory-quality/low-quality', async (request, reply) => {
        try {
            const { userId, limit } = request.query as { userId: string; limit?: string };

            if (!userId) {
                return reply.status(400).send({
                    success: false,
                    error: 'userId is required'
                });
            }

            const memories = await MemoryQualityScorer.getLowQualityMemories(
                userId,
                limit ? parseInt(limit) : 10
            );

            return reply.send({
                success: true,
                count: memories.length,
                memories
            });
        } catch (err: any) {
            console.error('Failed to get low quality memories:', err);
            return reply.status(500).send({
                success: false,
                error: err.message || 'Failed to get low quality memories'
            });
        }
    });

    // Analyze quality of a specific memory
    fastify.get('/api/memory-quality/:memoryId/analyze', async (request, reply) => {
        try {
            const { memoryId } = request.params as { memoryId: string };
            const db = getDatabase();

            const memory = db.prepare('SELECT content, metadata FROM memories WHERE id = ?').get(memoryId) as any;

            if (!memory) {
                return reply.status(404).send({
                    success: false,
                    error: 'Memory not found'
                });
            }

            const metadata = memory.metadata ? JSON.parse(memory.metadata) : {};
            const analysis = await MemoryQualityScorer.analyzeQuality(memoryId, memory.content, metadata);

            return reply.send({
                success: true,
                analysis
            });
        } catch (err: any) {
            console.error('Failed to analyze memory quality:', err);
            return reply.status(500).send({
                success: false,
                error: err.message || 'Failed to analyze memory quality'
            });
        }
    });

    // Enrich a specific memory
    fastify.post('/api/memory-quality/:memoryId/enrich', async (request, reply) => {
        try {
            const { memoryId } = request.params as { memoryId: string };
            const db = getDatabase();

            const memory = db.prepare('SELECT content, metadata FROM memories WHERE id = ?').get(memoryId) as any;

            if (!memory) {
                return reply.status(404).send({
                    success: false,
                    error: 'Memory not found'
                });
            }

            const metadata = memory.metadata ? JSON.parse(memory.metadata) : {};
            const result = await MemoryEnrichmentService.enrichMemory(memoryId, memory.content, metadata);

            return reply.send({
                success: true,
                result
            });
        } catch (err: any) {
            console.error('Failed to enrich memory:', err);
            return reply.status(500).send({
                success: false,
                error: err.message || 'Failed to enrich memory'
            });
        }
    });

    // Batch enrich multiple memories
    fastify.post('/api/memory-quality/batch-enrich', async (request, reply) => {
        try {
            const { userId, limit } = request.body as { userId: string; limit?: number };

            if (!userId) {
                return reply.status(400).send({
                    success: false,
                    error: 'userId is required'
                });
            }

            const results = await MemoryEnrichmentService.batchEnrich(userId, limit || 10);

            return reply.send({
                success: true,
                count: results.length,
                results
            });
        } catch (err: any) {
            console.error('Failed to batch enrich memories:', err);
            return reply.status(500).send({
                success: false,
                error: err.message || 'Failed to batch enrich memories'
            });
        }
    });

    // Get quality history for a memory
    fastify.get('/api/memory-quality/:memoryId/history', async (request, reply) => {
        try {
            const { memoryId } = request.params as { memoryId: string };
            const db = getDatabase();

            const history = db.prepare(`
                SELECT * FROM memory_quality_history
                WHERE memory_id = ?
                ORDER BY created_at DESC
                LIMIT 20
            `).all(memoryId);

            return reply.send({
                success: true,
                history
            });
        } catch (err: any) {
            console.error('Failed to get quality history:', err);
            return reply.status(500).send({
                success: false,
                error: err.message || 'Failed to get quality history'
            });
        }
    });

    // Get memory relationships
    fastify.get('/api/memory-quality/:memoryId/relationships', async (request, reply) => {
        try {
            const { memoryId } = request.params as { memoryId: string };
            const db = getDatabase();

            const relationships = db.prepare(`
                SELECT
                    mr.*,
                    m.type as target_type,
                    m.content as target_content
                FROM memory_relationships mr
                LEFT JOIN memories m ON mr.target_memory_id = m.id
                WHERE mr.source_memory_id = ?
                ORDER BY mr.strength DESC, mr.created_at DESC
                LIMIT 10
            `).all(memoryId);

            return reply.send({
                success: true,
                relationships
            });
        } catch (err: any) {
            console.error('Failed to get memory relationships:', err);
            return reply.status(500).send({
                success: false,
                error: err.message || 'Failed to get memory relationships'
            });
        }
    });

    // Get enrichment log for a memory
    fastify.get('/api/memory-quality/:memoryId/enrichment-log', async (request, reply) => {
        try {
            const { memoryId } = request.params as { memoryId: string };
            const db = getDatabase();

            const log = db.prepare(`
                SELECT * FROM memory_enrichment_log
                WHERE memory_id = ?
                ORDER BY created_at DESC
                LIMIT 20
            `).all(memoryId);

            return reply.send({
                success: true,
                log
            });
        } catch (err: any) {
            console.error('Failed to get enrichment log:', err);
            return reply.status(500).send({
                success: false,
                error: err.message || 'Failed to get enrichment log'
            });
        }
    });

    // Get quality distribution (for charts)
    fastify.get('/api/memory-quality/distribution', async (request, reply) => {
        try {
            const { userId } = request.query as { userId: string };

            if (!userId) {
                return reply.status(400).send({
                    success: false,
                    error: 'userId is required'
                });
            }

            const db = getDatabase();

            // Get distribution by score ranges
            const distribution = db.prepare(`
                SELECT
                    CASE
                        WHEN quality_score >= 90 THEN '90-100'
                        WHEN quality_score >= 80 THEN '80-89'
                        WHEN quality_score >= 70 THEN '70-79'
                        WHEN quality_score >= 60 THEN '60-69'
                        WHEN quality_score >= 50 THEN '50-59'
                        ELSE '0-49'
                    END as range,
                    COUNT(*) as count
                FROM memories
                WHERE user_id = ? AND status = 'active'
                GROUP BY range
                ORDER BY range DESC
            `).all(userId);

            // Get distribution by memory layer
            const layerDistribution = db.prepare(`
                SELECT
                    memory_layer,
                    AVG(quality_score) as avg_quality,
                    COUNT(*) as count
                FROM memories
                WHERE user_id = ? AND status = 'active'
                GROUP BY memory_layer
            `).all(userId);

            return reply.send({
                success: true,
                distribution,
                layerDistribution
            });
        } catch (err: any) {
            console.error('Failed to get quality distribution:', err);
            return reply.status(500).send({
                success: false,
                error: err.message || 'Failed to get quality distribution'
            });
        }
    });
}
