/**
 * Email Messages API Routes
 *
 * Manages email messages:
 * - List emails in folder (with pagination, filters)
 * - Get email details
 * - Mark as read/unread
 * - Star/unstar
 * - Delete email
 * - Move email to folder
 * - Bulk actions
 */

import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';

export default async function emailMessagesRoutes(fastify: FastifyInstance) {
    const db = getDatabase();

    /**
     * List emails in folder
     */
    fastify.get<{
        Params: { accountId: string };
        Querystring: {
            folder_id?: string;
            page?: string;
            limit?: string;
            is_read?: string;
            is_starred?: string;
            has_attachments?: string;
            search?: string;
            sort?: 'date' | 'from' | 'subject';
            order?: 'asc' | 'desc';
        };
    }>('/api/email/accounts/:accountId/emails', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { accountId } = request.params;
            const {
                folder_id,
                page = '1',
                limit = '50',
                is_read,
                is_starred,
                has_attachments,
                search,
                sort = 'date',
                order = 'desc',
            } = request.query;

            // Verify account belongs to user
            const account = db.prepare(`
                SELECT id FROM email_accounts WHERE id = ? AND user_id = ?
            `).get(accountId, userId);

            if (!account) {
                return reply.status(404).send({ success: false, message: 'Account not found' });
            }

            // Build query
            const conditions: string[] = ['account_id = ?'];
            const params: any[] = [accountId];

            if (folder_id) {
                conditions.push('folder_id = ?');
                params.push(folder_id);
            }

            if (is_read !== undefined) {
                conditions.push('is_read = ?');
                params.push(is_read === 'true' ? 1 : 0);
            }

            if (is_starred !== undefined) {
                conditions.push('is_starred = ?');
                params.push(is_starred === 'true' ? 1 : 0);
            }

            if (has_attachments !== undefined) {
                conditions.push('has_attachments = ?');
                params.push(has_attachments === 'true' ? 1 : 0);
            }

            if (search) {
                conditions.push('(subject LIKE ? OR from_name LIKE ? OR body_snippet LIKE ?)');
                const searchPattern = `%${search}%`;
                params.push(searchPattern, searchPattern, searchPattern);
            }

            const whereClause = conditions.join(' AND ');

            // Count total
            const totalResult = db.prepare(`
                SELECT COUNT(*) as count FROM emails WHERE ${whereClause}
            `).get(...params) as { count: number };

            const total = totalResult.count;

            // Get emails
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const offset = (pageNum - 1) * limitNum;

            const sortColumn = sort === 'from' ? 'from_name' : sort === 'subject' ? 'subject' : 'date';
            const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

            const emails = db.prepare(`
                SELECT
                    id, folder_id, message_id,
                    from_address, from_name, to_addresses, cc_addresses,
                    subject, date, body_snippet,
                    is_read, is_starred, has_attachments,
                    size_bytes, synced_at, created_at
                FROM emails
                WHERE ${whereClause}
                ORDER BY ${sortColumn} ${sortOrder}
                LIMIT ? OFFSET ?
            `).all(...params, limitNum, offset);

            return {
                success: true,
                emails,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            };
        } catch (error: any) {
            console.error('❌ [EmailMessages] List failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Get email details
     */
    fastify.get<{ Params: { accountId: string; emailId: string } }>(
        '/api/email/accounts/:accountId/emails/:emailId',
        async (request, reply) => {
            try {
                const userId = getUserIdFromRequest(request);
                const { accountId, emailId } = request.params;

                // Verify account belongs to user
                const account = db.prepare(`
                    SELECT id FROM email_accounts WHERE id = ? AND user_id = ?
                `).get(accountId, userId);

                if (!account) {
                    return reply.status(404).send({ success: false, message: 'Account not found' });
                }

                // Get email
                const email = db.prepare(`
                    SELECT * FROM emails WHERE id = ? AND account_id = ?
                `).get(emailId, accountId);

                if (!email) {
                    return reply.status(404).send({ success: false, message: 'Email not found' });
                }

                return { success: true, email };
            } catch (error: any) {
                console.error('❌ [EmailMessages] Get failed:', error.message);
                return reply.status(500).send({ success: false, message: error.message });
            }
        }
    );

    /**
     * Mark email as read/unread
     */
    fastify.put<{
        Params: { emailId: string };
        Body: { is_read: boolean };
    }>('/api/email/emails/:emailId/read', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { emailId } = request.params;
            const { is_read } = request.body;

            // Verify email belongs to user's account
            const email = db.prepare(`
                SELECT e.id, e.folder_id
                FROM emails e
                INNER JOIN email_accounts a ON e.account_id = a.id
                WHERE e.id = ? AND a.user_id = ?
            `).get(emailId, userId) as any;

            if (!email) {
                return reply.status(404).send({ success: false, message: 'Email not found' });
            }

            // Update email
            db.prepare(`
                UPDATE emails SET is_read = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(is_read ? 1 : 0, emailId);

            // Update folder unread count
            const unreadCount = db.prepare(`
                SELECT COUNT(*) as count FROM emails WHERE folder_id = ? AND is_read = 0
            `).get(email.folder_id) as { count: number };

            db.prepare(`
                UPDATE email_folders SET unread_count = ? WHERE id = ?
            `).run(unreadCount.count, email.folder_id);

            console.log(`✅ [EmailMessages] Email marked as ${is_read ? 'read' : 'unread'}: ${emailId}`);

            return { success: true, message: `Email marked as ${is_read ? 'read' : 'unread'}` };
        } catch (error: any) {
            console.error('❌ [EmailMessages] Mark read failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Star/unstar email
     */
    fastify.put<{
        Params: { emailId: string };
        Body: { is_starred: boolean };
    }>('/api/email/emails/:emailId/star', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { emailId } = request.params;
            const { is_starred } = request.body;

            // Verify email belongs to user's account
            const email = db.prepare(`
                SELECT e.id
                FROM emails e
                INNER JOIN email_accounts a ON e.account_id = a.id
                WHERE e.id = ? AND a.user_id = ?
            `).get(emailId, userId);

            if (!email) {
                return reply.status(404).send({ success: false, message: 'Email not found' });
            }

            // Update email
            db.prepare(`
                UPDATE emails SET is_starred = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(is_starred ? 1 : 0, emailId);

            console.log(`✅ [EmailMessages] Email ${is_starred ? 'starred' : 'unstarred'}: ${emailId}`);

            return { success: true, message: `Email ${is_starred ? 'starred' : 'unstarred'}` };
        } catch (error: any) {
            console.error('❌ [EmailMessages] Star failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Delete email (soft delete - move to Trash)
     */
    fastify.delete<{ Params: { emailId: string } }>(
        '/api/email/emails/:emailId',
        async (request, reply) => {
            try {
                const userId = getUserIdFromRequest(request);
                const { emailId } = request.params;

                // Verify email belongs to user's account
                const email = db.prepare(`
                    SELECT e.id, e.account_id, e.folder_id
                    FROM emails e
                    INNER JOIN email_accounts a ON e.account_id = a.id
                    WHERE e.id = ? AND a.user_id = ?
                `).get(emailId, userId) as any;

                if (!email) {
                    return reply.status(404).send({ success: false, message: 'Email not found' });
                }

                // Find Trash folder
                const trashFolder = db.prepare(`
                    SELECT id FROM email_folders
                    WHERE account_id = ? AND (name = 'Trash' OR name = 'Deleted Items' OR name = '[Gmail]/Trash')
                `).get(email.account_id) as { id: string } | undefined;

                if (trashFolder) {
                    // Move to Trash
                    db.prepare(`
                        UPDATE emails SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
                    `).run(trashFolder.id, emailId);

                    console.log(`✅ [EmailMessages] Email moved to Trash: ${emailId}`);
                    return { success: true, message: 'Email moved to Trash' };
                } else {
                    // No trash folder - permanently delete
                    db.prepare(`DELETE FROM emails WHERE id = ?`).run(emailId);

                    console.log(`✅ [EmailMessages] Email permanently deleted: ${emailId}`);
                    return { success: true, message: 'Email permanently deleted' };
                }
            } catch (error: any) {
                console.error('❌ [EmailMessages] Delete failed:', error.message);
                return reply.status(500).send({ success: false, message: error.message });
            }
        }
    );

    /**
     * Move email to folder
     */
    fastify.post<{
        Params: { emailId: string };
        Body: { folder_id: string };
    }>('/api/email/emails/:emailId/move', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { emailId } = request.params;
            const { folder_id } = request.body;

            if (!folder_id) {
                return reply.status(400).send({ success: false, message: 'Folder ID is required' });
            }

            // Verify email belongs to user's account
            const email = db.prepare(`
                SELECT e.id, e.account_id, e.folder_id as old_folder_id
                FROM emails e
                INNER JOIN email_accounts a ON e.account_id = a.id
                WHERE e.id = ? AND a.user_id = ?
            `).get(emailId, userId) as any;

            if (!email) {
                return reply.status(404).send({ success: false, message: 'Email not found' });
            }

            // Verify target folder exists and belongs to same account
            const targetFolder = db.prepare(`
                SELECT id FROM email_folders WHERE id = ? AND account_id = ?
            `).get(folder_id, email.account_id);

            if (!targetFolder) {
                return reply.status(404).send({ success: false, message: 'Target folder not found' });
            }

            // Move email
            db.prepare(`
                UPDATE emails SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(folder_id, emailId);

            // Update folder counts
            for (const fid of [email.old_folder_id, folder_id]) {
                const unreadCount = db.prepare(`
                    SELECT COUNT(*) as count FROM emails WHERE folder_id = ? AND is_read = 0
                `).get(fid) as { count: number };

                const totalCount = db.prepare(`
                    SELECT COUNT(*) as count FROM emails WHERE folder_id = ?
                `).get(fid) as { count: number };

                db.prepare(`
                    UPDATE email_folders SET unread_count = ?, total_count = ? WHERE id = ?
                `).run(unreadCount.count, totalCount.count, fid);
            }

            console.log(`✅ [EmailMessages] Email moved to folder: ${emailId} -> ${folder_id}`);

            return { success: true, message: 'Email moved successfully' };
        } catch (error: any) {
            console.error('❌ [EmailMessages] Move failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Bulk mark as read
     */
    fastify.post<{
        Body: { email_ids: string[]; is_read: boolean };
    }>('/api/email/bulk/read', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { email_ids, is_read } = request.body;

            if (!email_ids || email_ids.length === 0) {
                return reply.status(400).send({ success: false, message: 'Email IDs are required' });
            }

            // Verify all emails belong to user
            const placeholders = email_ids.map(() => '?').join(',');
            const emails = db.prepare(`
                SELECT e.id, e.folder_id
                FROM emails e
                INNER JOIN email_accounts a ON e.account_id = a.id
                WHERE e.id IN (${placeholders}) AND a.user_id = ?
            `).all(...email_ids, userId) as any[];

            if (emails.length !== email_ids.length) {
                return reply.status(404).send({ success: false, message: 'Some emails not found' });
            }

            // Update emails
            db.prepare(`
                UPDATE emails SET is_read = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})
            `).run(is_read ? 1 : 0, ...email_ids);

            // Update folder counts
            const folderIds = [...new Set(emails.map((e: any) => e.folder_id))];
            for (const folderId of folderIds) {
                const unreadCount = db.prepare(`
                    SELECT COUNT(*) as count FROM emails WHERE folder_id = ? AND is_read = 0
                `).get(folderId) as { count: number };

                db.prepare(`
                    UPDATE email_folders SET unread_count = ? WHERE id = ?
                `).run(unreadCount.count, folderId);
            }

            console.log(`✅ [EmailMessages] Bulk marked as ${is_read ? 'read' : 'unread'}: ${email_ids.length} emails`);

            return { success: true, message: `${email_ids.length} emails marked as ${is_read ? 'read' : 'unread'}` };
        } catch (error: any) {
            console.error('❌ [EmailMessages] Bulk read failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Bulk star
     */
    fastify.post<{
        Body: { email_ids: string[]; is_starred: boolean };
    }>('/api/email/bulk/star', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { email_ids, is_starred } = request.body;

            if (!email_ids || email_ids.length === 0) {
                return reply.status(400).send({ success: false, message: 'Email IDs are required' });
            }

            // Verify all emails belong to user
            const placeholders = email_ids.map(() => '?').join(',');
            const count = db.prepare(`
                SELECT COUNT(*) as count
                FROM emails e
                INNER JOIN email_accounts a ON e.account_id = a.id
                WHERE e.id IN (${placeholders}) AND a.user_id = ?
            `).get(...email_ids, userId) as { count: number };

            if (count.count !== email_ids.length) {
                return reply.status(404).send({ success: false, message: 'Some emails not found' });
            }

            // Update emails
            db.prepare(`
                UPDATE emails SET is_starred = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})
            `).run(is_starred ? 1 : 0, ...email_ids);

            console.log(`✅ [EmailMessages] Bulk ${is_starred ? 'starred' : 'unstarred'}: ${email_ids.length} emails`);

            return { success: true, message: `${email_ids.length} emails ${is_starred ? 'starred' : 'unstarred'}` };
        } catch (error: any) {
            console.error('❌ [EmailMessages] Bulk star failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Bulk delete
     */
    fastify.post<{
        Body: { email_ids: string[] };
    }>('/api/email/bulk/delete', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { email_ids } = request.body;

            if (!email_ids || email_ids.length === 0) {
                return reply.status(400).send({ success: false, message: 'Email IDs are required' });
            }

            // Get emails
            const placeholders = email_ids.map(() => '?').join(',');
            const emails = db.prepare(`
                SELECT e.id, e.account_id, e.folder_id
                FROM emails e
                INNER JOIN email_accounts a ON e.account_id = a.id
                WHERE e.id IN (${placeholders}) AND a.user_id = ?
            `).all(...email_ids, userId) as any[];

            if (emails.length === 0) {
                return reply.status(404).send({ success: false, message: 'No emails found' });
            }

            // Group by account to find trash folders
            const accountIds = [...new Set(emails.map((e: any) => e.account_id))];
            for (const accountId of accountIds) {
                const trashFolder = db.prepare(`
                    SELECT id FROM email_folders
                    WHERE account_id = ? AND (name = 'Trash' OR name = 'Deleted Items' OR name = '[Gmail]/Trash')
                `).get(accountId) as { id: string } | undefined;

                const accountEmails = emails.filter((e: any) => e.account_id === accountId);
                const accountEmailIds = accountEmails.map((e: any) => e.id);
                const accountPlaceholders = accountEmailIds.map(() => '?').join(',');

                if (trashFolder) {
                    // Move to Trash
                    db.prepare(`
                        UPDATE emails SET folder_id = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id IN (${accountPlaceholders})
                    `).run(trashFolder.id, ...accountEmailIds);
                } else {
                    // Permanently delete
                    db.prepare(`DELETE FROM emails WHERE id IN (${accountPlaceholders})`).run(...accountEmailIds);
                }
            }

            console.log(`✅ [EmailMessages] Bulk deleted: ${emails.length} emails`);

            return { success: true, message: `${emails.length} emails deleted` };
        } catch (error: any) {
            console.error('❌ [EmailMessages] Bulk delete failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Bulk move
     */
    fastify.post<{
        Body: { email_ids: string[]; folder_id: string };
    }>('/api/email/bulk/move', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { email_ids, folder_id } = request.body;

            if (!email_ids || email_ids.length === 0 || !folder_id) {
                return reply.status(400).send({ success: false, message: 'Email IDs and folder ID are required' });
            }

            // Verify emails belong to user
            const placeholders = email_ids.map(() => '?').join(',');
            const emails = db.prepare(`
                SELECT e.id, e.account_id
                FROM emails e
                INNER JOIN email_accounts a ON e.account_id = a.id
                WHERE e.id IN (${placeholders}) AND a.user_id = ?
            `).all(...email_ids, userId) as any[];

            if (emails.length === 0) {
                return reply.status(404).send({ success: false, message: 'No emails found' });
            }

            // Verify target folder exists and belongs to same account (use first email's account)
            const accountId = emails[0].account_id;
            const targetFolder = db.prepare(`
                SELECT id FROM email_folders WHERE id = ? AND account_id = ?
            `).get(folder_id, accountId);

            if (!targetFolder) {
                return reply.status(404).send({ success: false, message: 'Target folder not found' });
            }

            // Move emails
            db.prepare(`
                UPDATE emails SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})
            `).run(folder_id, ...email_ids);

            console.log(`✅ [EmailMessages] Bulk moved: ${emails.length} emails to ${folder_id}`);

            return { success: true, message: `${emails.length} emails moved` };
        } catch (error: any) {
            console.error('❌ [EmailMessages] Bulk move failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });
}
