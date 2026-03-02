/**
 * Memory Sharing API Routes
 *
 * Endpoints for multi-agent memory sharing:
 * - Share/unshare memories
 * - Mark memories as team-critical
 * - Run deduplication
 * - View shared knowledge base
 */

import { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import {
    runDeduplication,
    getDeduplicationStats,
    findSimilarMemories,
} from '../../services/memory-deduplication.js';

export default async function memorySharingRoutes(fastify: FastifyInstance) {
    const db = getDatabase();

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
    }>('/api/memory-sharing/:memoryId/share', async (request, reply) => {
        const { memoryId } = request.params;
        const { visibility, teamId, reason } = request.body;

        try {
            // Get current memory
            const memory = db.prepare(`
                SELECT * FROM memories WHERE id = ?
            `).get(memoryId) as any;

            if (!memory) {
                return reply.status(404).send({ error: 'Memory not found' });
            }

            const oldVisibility = memory.visibility || 'private';

            // Update visibility
            db.prepare(`
                UPDATE memories
                SET visibility = ?, team_id = ?
                WHERE id = ?
            `).run(visibility, teamId || null, memoryId);

            // Log the action
            db.prepare(`
                INSERT INTO memory_sharing_audit (
                    id, memory_id, action, old_visibility, new_visibility, reason
                ) VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                uuidv4(),
                memoryId,
                'visibility_changed',
                oldVisibility,
                visibility,
                reason || null
            );

            return reply.send({
                success: true,
                memoryId,
                visibility,
                teamId,
            });
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Failed to share memory',
                message: error.message,
            });
        }
    });

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
    }>('/api/memory-sharing/:memoryId/mark-critical', async (request, reply) => {
        const { memoryId } = request.params;
        const { critical, reason } = request.body;

        try {
            db.prepare(`
                UPDATE memories
                SET is_team_critical = ?
                WHERE id = ?
            `).run(critical ? 1 : 0, memoryId);

            // Log the action
            db.prepare(`
                INSERT INTO memory_sharing_audit (
                    id, memory_id, action, reason
                ) VALUES (?, ?, ?, ?)
            `).run(
                uuidv4(),
                memoryId,
                critical ? 'marked_critical' : 'unmarked_critical',
                reason || null
            );

            return reply.send({
                success: true,
                memoryId,
                isTeamCritical: critical,
            });
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Failed to mark memory',
                message: error.message,
            });
        }
    });

    /**
     * GET /api/memory-sharing/shared
     * Get all shared memories (team + public)
     */
    fastify.get<{
        Querystring: {
            userId: string;
            visibility?: 'team' | 'public';
            teamCriticalOnly?: string;
            limit?: string;
        };
    }>('/api/memory-sharing/shared', async (request, reply) => {
        const { userId, visibility, teamCriticalOnly, limit } = request.query;

        try {
            // Check if memories table has visibility column
            let hasVisibility = false;
            try {
                const tableInfo = db.prepare("PRAGMA table_info(memories)").all() as any[];
                hasVisibility = tableInfo.some((col: any) => col.name === 'visibility');
            } catch (err) {
                // Table doesn't exist yet or other error
            }

            if (!hasVisibility) {
                // Visibility column doesn't exist yet - return empty array
                return reply.send({
                    success: true,
                    count: 0,
                    memories: [],
                    message: 'Migration 047 not applied yet. Please restart backend to apply memory sharing schema.',
                });
            }

            let query = `
                SELECT m.*, u.full_name as user_name
                FROM memories m
                LEFT JOIN users u ON m.user_id = u.id
                WHERE m.status = 'active'
                AND (m.visibility = 'team' OR m.visibility = 'public')
            `;

            const params: any[] = [];

            if (visibility) {
                query += ` AND m.visibility = ?`;
                params.push(visibility);
            }

            if (teamCriticalOnly === 'true') {
                query += ` AND m.is_team_critical = 1`;
            }

            query += ` ORDER BY m.is_team_critical DESC, m.importance_score DESC, m.created_at DESC`;

            if (limit) {
                query += ` LIMIT ?`;
                params.push(parseInt(limit));
            } else {
                query += ` LIMIT 50`;
            }

            const memories = db.prepare(query).all(...params);

            return reply.send({
                success: true,
                count: memories.length,
                memories,
            });
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Failed to fetch shared memories',
                message: error.message,
            });
        }
    });

    /**
     * GET /api/memory-sharing/by-agent/:agentId
     * Get memories created by a specific agent
     */
    fastify.get<{
        Params: { agentId: string };
        Querystring: { limit?: string };
    }>('/api/memory-sharing/by-agent/:agentId', async (request, reply) => {
        const { agentId } = request.params;
        const { limit } = request.query;

        try {
            const memories = db.prepare(`
                SELECT *
                FROM memories
                WHERE source_agent_id = ?
                AND status = 'active'
                AND (visibility = 'team' OR visibility = 'public')
                ORDER BY created_at DESC
                LIMIT ?
            `).all(agentId, parseInt(limit || '20'));

            return reply.send({
                success: true,
                agentId,
                count: memories.length,
                memories,
            });
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Failed to fetch agent memories',
                message: error.message,
            });
        }
    });

    /**
     * POST /api/memory-sharing/deduplication/run
     * Run memory deduplication for a user
     */
    fastify.post<{
        Body: {
            userId: string;
            similarityThreshold?: number;
        };
    }>('/api/memory-sharing/deduplication/run', async (request, reply) => {
        const { userId, similarityThreshold } = request.body;

        try {
            const result = await runDeduplication(userId, similarityThreshold || 0.85);

            return reply.send({
                success: true,
                ...result,
            });
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Deduplication failed',
                message: error.message,
            });
        }
    });

    /**
     * GET /api/memory-sharing/deduplication/stats
     * Get deduplication statistics
     */
    fastify.get<{
        Querystring: { userId: string };
    }>('/api/memory-sharing/deduplication/stats', async (request, reply) => {
        const { userId } = request.query;

        try {
            const stats = getDeduplicationStats(userId);

            return reply.send({
                success: true,
                ...stats,
            });
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Failed to get stats',
                message: error.message,
            });
        }
    });

    /**
     * GET /api/memory-sharing/deduplication/candidates
     * Find duplicate candidates without merging
     */
    fastify.get<{
        Querystring: {
            userId: string;
            similarityThreshold?: string;
        };
    }>('/api/memory-sharing/deduplication/candidates', async (request, reply) => {
        const { userId, similarityThreshold } = request.query;

        try {
            const groups = findSimilarMemories(
                userId,
                parseFloat(similarityThreshold || '0.85')
            );

            return reply.send({
                success: true,
                groupsCount: groups.length,
                totalCandidates: groups.reduce((sum, g) => sum + g.length, 0),
                groups,
            });
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Failed to find candidates',
                message: error.message,
            });
        }
    });

    /**
     * GET /api/memory-sharing/audit
     * Get sharing audit log
     */
    fastify.get<{
        Querystring: {
            memoryId?: string;
            limit?: string;
        };
    }>('/api/memory-sharing/audit', async (request, reply) => {
        const { memoryId, limit } = request.query;

        try {
            let query = `
                SELECT a.*, m.content as memory_content
                FROM memory_sharing_audit a
                LEFT JOIN memories m ON a.memory_id = m.id
            `;

            const params: any[] = [];

            if (memoryId) {
                query += ` WHERE a.memory_id = ?`;
                params.push(memoryId);
            }

            query += ` ORDER BY a.created_at DESC LIMIT ?`;
            params.push(parseInt(limit || '50'));

            const logs = db.prepare(query).all(...params);

            return reply.send({
                success: true,
                count: logs.length,
                logs,
            });
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Failed to fetch audit log',
                message: error.message,
            });
        }
    });
}
