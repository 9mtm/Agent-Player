/**
 * Memory Sharing API Routes
 *
 * Endpoints for multi-agent memory sharing:
 * - Share/unshare memories
 * - Mark memories as team-critical
 * - Run deduplication
 * - View shared knowledge base
 *
 * SECURITY (S0-Q.17): every route needs a valid token of an active user; the
 * user comes from the token (query/body userId ignored). Only the memory's
 * owner may share/unshare or mark it; another user's memory answers 404.
 * Shared lists show the caller's own shared memories, public ones, and team
 * ones of teams the caller owns or belongs to. Deduplication and the audit
 * log are limited to the caller's own memories (no owner-wide view).
 */

const VISIBILITIES = ['private', 'team', 'public'] as const;

/** SQL fragment + params: shared memories (alias m) the caller may see. */
function visibleSharedClause(userId: string): { sql: string; params: string[] } {
    const teams = teamIdsOf(userId);
    const teamSql = teams.length ? ` OR (m.visibility = 'team' AND m.team_id IN (${teams.map(() => '?').join(',')}))` : '';
    return {
        sql: `(m.visibility IN ('team', 'public') AND (m.user_id = ? OR m.visibility = 'public'${teamSql}))`,
        params: [userId, ...teams],
    };
}

import { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import {
    requireMemoryCaller,
    memoryCaller,
    callerOwnsMemory,
    teamIdsOf,
    boundedInt,
} from './memory-access.js';
import {
    runDeduplication,
    getDeduplicationStats,
    findSimilarMemories,
} from '../../services/memory-deduplication.js';

export default async function memorySharingRoutes(fastify: FastifyInstance) {
    const db = getDatabase();
    requireMemoryCaller(fastify);

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
        const { visibility, teamId, reason } = (request.body || {}) as any;

        if (!callerOwnsMemory(request, memoryId)) {
            return reply.status(404).send({ error: 'Memory not found' });
        }
        if (!VISIBILITIES.includes(visibility)) {
            return reply.status(400).send({ error: 'visibility must be private, team or public' });
        }
        if (reason !== undefined && reason !== null && (typeof reason !== 'string' || reason.length > 1000)) {
            return reply.status(400).send({ error: 'Invalid reason' });
        }
        // A team memory must name a team the caller owns or belongs to.
        if (visibility === 'team') {
            if (typeof teamId !== 'string' || !teamIdsOf(memoryCaller(request).id).includes(teamId)) {
                return reply.status(400).send({ error: 'teamId must be a team you belong to' });
            }
        }

        try {
            const memory = db.prepare(`
                SELECT * FROM memories WHERE id = ?
            `).get(memoryId) as any;

            const oldVisibility = memory.visibility || 'private';

            // Update visibility
            db.prepare(`
                UPDATE memories
                SET visibility = ?, team_id = ?
                WHERE id = ?
            `).run(visibility, visibility === 'team' ? teamId : null, memoryId);

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
                teamId: visibility === 'team' ? teamId : null,
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
        const { critical, reason } = (request.body || {}) as any;

        if (!callerOwnsMemory(request, memoryId)) {
            return reply.status(404).send({ error: 'Memory not found' });
        }
        if (typeof critical !== 'boolean') {
            return reply.status(400).send({ error: 'critical must be true or false' });
        }
        if (reason !== undefined && reason !== null && (typeof reason !== 'string' || reason.length > 1000)) {
            return reply.status(400).send({ error: 'Invalid reason' });
        }

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
            userId?: string; // ignored: user comes from the token (S0-Q.17)
            visibility?: 'team' | 'public';
            teamCriticalOnly?: string;
            limit?: string;
        };
    }>('/api/memory-sharing/shared', async (request, reply) => {
        const userId = memoryCaller(request).id;
        const { visibility, teamCriticalOnly, limit } = request.query;
        if (visibility !== undefined && visibility !== 'team' && visibility !== 'public') {
            return reply.status(400).send({ error: 'visibility must be team or public' });
        }

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

            const visible = visibleSharedClause(userId);
            let query = `
                SELECT m.*, u.full_name as user_name
                FROM memories m
                LEFT JOIN users u ON m.user_id = u.id
                WHERE m.status = 'active'
                AND ${visible.sql}
            `;

            const params: any[] = [...visible.params];

            if (visibility) {
                query += ` AND m.visibility = ?`;
                params.push(visibility);
            }

            if (teamCriticalOnly === 'true') {
                query += ` AND m.is_team_critical = 1`;
            }

            query += ` ORDER BY m.is_team_critical DESC, m.importance_score DESC, m.created_at DESC`;

            query += ` LIMIT ?`;
            params.push(boundedInt(limit, 50, 200));

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
            const visible = visibleSharedClause(memoryCaller(request).id);
            const memories = db.prepare(`
                SELECT m.*
                FROM memories m
                WHERE m.source_agent_id = ?
                AND m.status = 'active'
                AND ${visible.sql}
                ORDER BY m.created_at DESC
                LIMIT ?
            `).all(agentId, ...visible.params, boundedInt(limit, 20, 200));

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
            userId?: string; // ignored: user comes from the token (S0-Q.17)
            similarityThreshold?: number;
        };
    }>('/api/memory-sharing/deduplication/run', async (request, reply) => {
        const userId = memoryCaller(request).id;
        const threshold = Number((request.body as any)?.similarityThreshold ?? 0.85);
        if (!Number.isFinite(threshold) || threshold < 0.5 || threshold > 1) {
            return reply.status(400).send({ error: 'similarityThreshold must be between 0.5 and 1' });
        }

        try {
            const result = await runDeduplication(userId, threshold);

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
        Querystring: { userId?: string }; // userId ignored (S0-Q.17)
    }>('/api/memory-sharing/deduplication/stats', async (request, reply) => {
        const userId = memoryCaller(request).id;

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
            userId?: string; // ignored: user comes from the token (S0-Q.17)
            similarityThreshold?: string;
        };
    }>('/api/memory-sharing/deduplication/candidates', async (request, reply) => {
        const userId = memoryCaller(request).id;
        const threshold = parseFloat(request.query.similarityThreshold || '0.85');
        if (!Number.isFinite(threshold) || threshold < 0.5 || threshold > 1) {
            return reply.status(400).send({ error: 'similarityThreshold must be between 0.5 and 1' });
        }

        try {
            const groups = findSimilarMemories(userId, threshold);

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
            // Only audit rows of the caller's own memories.
            let query = `
                SELECT a.*, m.content as memory_content
                FROM memory_sharing_audit a
                JOIN memories m ON a.memory_id = m.id
                WHERE m.user_id = ?
            `;

            const params: any[] = [memoryCaller(request).id];

            if (memoryId) {
                query += ` AND a.memory_id = ?`;
                params.push(memoryId);
            }

            query += ` ORDER BY a.created_at DESC LIMIT ?`;
            params.push(boundedInt(limit, 50, 200));

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
