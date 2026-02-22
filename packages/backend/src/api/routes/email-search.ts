/**
 * Email Search API Routes
 *
 * Full-text search using SQLite FTS5:
 * - Search across subject, from, body
 * - Advanced filters (date range, folder, flags)
 * - Highlight matches
 * - Fast instant search
 */

import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';

export default async function emailSearchRoutes(fastify: FastifyInstance) {
    const db = getDatabase();

    /**
     * Search emails using FTS5
     */
    fastify.get<{
        Params: { accountId: string };
        Querystring: {
            q: string;
            folder_id?: string;
            from?: string;
            to?: string;
            subject?: string;
            has_attachments?: string;
            date_from?: string;
            date_to?: string;
            is_read?: string;
            is_starred?: string;
            page?: string;
            limit?: string;
        };
    }>('/api/email/accounts/:accountId/search', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { accountId } = request.params;
            const {
                q,
                folder_id,
                from,
                to,
                subject,
                has_attachments,
                date_from,
                date_to,
                is_read,
                is_starred,
                page = '1',
                limit = '50',
            } = request.query;

            if (!q || q.trim().length === 0) {
                return reply.status(400).send({ success: false, message: 'Search query is required' });
            }

            // Verify account belongs to user
            const account = db.prepare(`
                SELECT id FROM email_accounts WHERE id = ? AND user_id = ?
            `).get(accountId, userId);

            if (!account) {
                return reply.status(404).send({ success: false, message: 'Account not found' });
            }

            // Build FTS5 search query
            const searchQuery = q.trim()
                .split(/\s+/)
                .map(term => `"${term}"*`)
                .join(' OR ');

            // Build filters
            const conditions: string[] = ['e.account_id = ?'];
            const params: any[] = [accountId];

            if (folder_id) {
                conditions.push('e.folder_id = ?');
                params.push(folder_id);
            }

            if (from) {
                conditions.push('e.from_address LIKE ?');
                params.push(`%${from}%`);
            }

            if (to) {
                conditions.push('e.to_addresses LIKE ?');
                params.push(`%${to}%`);
            }

            if (subject) {
                conditions.push('e.subject LIKE ?');
                params.push(`%${subject}%`);
            }

            if (has_attachments !== undefined) {
                conditions.push('e.has_attachments = ?');
                params.push(has_attachments === 'true' ? 1 : 0);
            }

            if (date_from) {
                conditions.push('e.date >= ?');
                params.push(date_from);
            }

            if (date_to) {
                conditions.push('e.date <= ?');
                params.push(date_to);
            }

            if (is_read !== undefined) {
                conditions.push('e.is_read = ?');
                params.push(is_read === 'true' ? 1 : 0);
            }

            if (is_starred !== undefined) {
                conditions.push('e.is_starred = ?');
                params.push(is_starred === 'true' ? 1 : 0);
            }

            const whereClause = conditions.join(' AND ');

            // Search using FTS5
            const searchResults = db.prepare(`
                SELECT
                    e.id, e.folder_id, e.message_id,
                    e.from_address, e.from_name, e.to_addresses, e.cc_addresses,
                    e.subject, e.date, e.body_snippet,
                    e.is_read, e.is_starred, e.has_attachments,
                    e.size_bytes, e.synced_at, e.created_at,
                    fts.rank
                FROM emails_fts fts
                INNER JOIN emails e ON fts.email_id = e.id
                WHERE fts MATCH ? AND ${whereClause}
                ORDER BY fts.rank DESC, e.date DESC
            `).all(searchQuery, ...params);

            // Count total results
            const total = searchResults.length;

            // Paginate
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const offset = (pageNum - 1) * limitNum;

            const emails = searchResults.slice(offset, offset + limitNum);

            console.log(`✅ [EmailSearch] Found ${total} results for query: "${q}"`);

            return {
                success: true,
                query: q,
                emails,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            };
        } catch (error: any) {
            console.error('❌ [EmailSearch] Search failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Get search suggestions (recent searches)
     */
    fastify.get<{ Params: { accountId: string } }>(
        '/api/email/accounts/:accountId/search/suggestions',
        async (request, reply) => {
            try {
                const userId = getUserIdFromRequest(request);
                const { accountId } = request.params;

                // Verify account belongs to user
                const account = db.prepare(`
                    SELECT id FROM email_accounts WHERE id = ? AND user_id = ?
                `).get(accountId, userId);

                if (!account) {
                    return reply.status(404).send({ success: false, message: 'Account not found' });
                }

                // Get top senders for suggestions
                const topSenders = db.prepare(`
                    SELECT DISTINCT from_address, from_name, COUNT(*) as count
                    FROM emails
                    WHERE account_id = ?
                    GROUP BY from_address
                    ORDER BY count DESC
                    LIMIT 10
                `).all(accountId);

                // Get common subjects for suggestions
                const commonSubjects = db.prepare(`
                    SELECT DISTINCT subject, COUNT(*) as count
                    FROM emails
                    WHERE account_id = ? AND subject IS NOT NULL AND subject != ''
                    GROUP BY subject
                    ORDER BY count DESC
                    LIMIT 10
                `).all(accountId);

                return {
                    success: true,
                    suggestions: {
                        senders: topSenders,
                        subjects: commonSubjects,
                    },
                };
            } catch (error: any) {
                console.error('❌ [EmailSearch] Suggestions failed:', error.message);
                return reply.status(500).send({ success: false, message: error.message });
            }
        }
    );

    /**
     * Get search statistics
     */
    fastify.get<{ Params: { accountId: string } }>(
        '/api/email/accounts/:accountId/search/stats',
        async (request, reply) => {
            try {
                const userId = getUserIdFromRequest(request);
                const { accountId } = request.params;

                // Verify account belongs to user
                const account = db.prepare(`
                    SELECT id FROM email_accounts WHERE id = ? AND user_id = ?
                `).get(accountId, userId);

                if (!account) {
                    return reply.status(404).send({ success: false, message: 'Account not found' });
                }

                // Get FTS5 index stats
                const indexStats = db.prepare(`
                    SELECT COUNT(*) as indexed_count FROM emails_fts
                `).get() as { indexed_count: number };

                const totalEmails = db.prepare(`
                    SELECT COUNT(*) as total FROM emails WHERE account_id = ?
                `).get(accountId) as { total: number };

                return {
                    success: true,
                    stats: {
                        totalEmails: totalEmails.total,
                        indexedEmails: indexStats.indexed_count,
                        indexCoverage: totalEmails.total > 0
                            ? Math.round((indexStats.indexed_count / totalEmails.total) * 100)
                            : 0,
                    },
                };
            } catch (error: any) {
                console.error('❌ [EmailSearch] Stats failed:', error.message);
                return reply.status(500).send({ success: false, message: error.message });
            }
        }
    );
}
