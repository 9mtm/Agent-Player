/**
 * Email Drafts API Routes
 *
 * Manage email drafts:
 * - List drafts
 * - Create draft
 * - Update draft (auto-save)
 * - Delete draft
 * - Get draft details
 */

import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import { v4 as uuidv4 } from 'uuid';

export default async function emailDraftsRoutes(fastify: FastifyInstance) {
    const db = getDatabase();

    /**
     * List drafts for account
     */
    fastify.get<{ Params: { accountId: string } }>(
        '/api/email/accounts/:accountId/drafts',
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

                // Get drafts
                const drafts = db.prepare(`
                    SELECT
                        id, to_addresses, cc_addresses, bcc_addresses,
                        subject, body_html, body_text, attachments,
                        is_reply_to, is_forward_of,
                        created_at, updated_at
                    FROM email_drafts
                    WHERE account_id = ?
                    ORDER BY updated_at DESC
                `).all(accountId);

                return { success: true, drafts };
            } catch (error: any) {
                console.error('❌ [EmailDrafts] List failed:', error.message);
                return reply.status(500).send({ success: false, message: error.message });
            }
        }
    );

    /**
     * Get draft details
     */
    fastify.get<{ Params: { draftId: string } }>(
        '/api/email/drafts/:draftId',
        async (request, reply) => {
            try {
                const userId = getUserIdFromRequest(request);
                const { draftId } = request.params;

                // Get draft
                const draft = db.prepare(`
                    SELECT d.*
                    FROM email_drafts d
                    INNER JOIN email_accounts a ON d.account_id = a.id
                    WHERE d.id = ? AND a.user_id = ?
                `).get(draftId, userId);

                if (!draft) {
                    return reply.status(404).send({ success: false, message: 'Draft not found' });
                }

                return { success: true, draft };
            } catch (error: any) {
                console.error('❌ [EmailDrafts] Get failed:', error.message);
                return reply.status(500).send({ success: false, message: error.message });
            }
        }
    );

    /**
     * Create draft
     */
    fastify.post<{
        Params: { accountId: string };
        Body: {
            to_addresses?: string[];
            cc_addresses?: string[];
            bcc_addresses?: string[];
            subject?: string;
            body_html?: string;
            body_text?: string;
            attachments?: string[];
            is_reply_to?: string;
            is_forward_of?: string;
        };
    }>('/api/email/accounts/:accountId/drafts', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { accountId } = request.params;
            const {
                to_addresses,
                cc_addresses,
                bcc_addresses,
                subject,
                body_html,
                body_text,
                attachments,
                is_reply_to,
                is_forward_of,
            } = request.body;

            // Verify account belongs to user
            const account = db.prepare(`
                SELECT id FROM email_accounts WHERE id = ? AND user_id = ?
            `).get(accountId, userId);

            if (!account) {
                return reply.status(404).send({ success: false, message: 'Account not found' });
            }

            // Create draft
            const draftId = uuidv4();

            db.prepare(`
                INSERT INTO email_drafts (
                    id, account_id,
                    to_addresses, cc_addresses, bcc_addresses,
                    subject, body_html, body_text, attachments,
                    is_reply_to, is_forward_of
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                draftId,
                accountId,
                to_addresses ? JSON.stringify(to_addresses) : null,
                cc_addresses ? JSON.stringify(cc_addresses) : null,
                bcc_addresses ? JSON.stringify(bcc_addresses) : null,
                subject || null,
                body_html || null,
                body_text || null,
                attachments ? JSON.stringify(attachments) : null,
                is_reply_to || null,
                is_forward_of || null
            );

            console.log(`✅ [EmailDrafts] Draft created: ${draftId}`);

            return {
                success: true,
                message: 'Draft created successfully',
                draftId,
            };
        } catch (error: any) {
            console.error('❌ [EmailDrafts] Create failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Update draft (auto-save)
     */
    fastify.put<{
        Params: { draftId: string };
        Body: {
            to_addresses?: string[];
            cc_addresses?: string[];
            bcc_addresses?: string[];
            subject?: string;
            body_html?: string;
            body_text?: string;
            attachments?: string[];
        };
    }>('/api/email/drafts/:draftId', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { draftId } = request.params;
            const {
                to_addresses,
                cc_addresses,
                bcc_addresses,
                subject,
                body_html,
                body_text,
                attachments,
            } = request.body;

            // Verify draft belongs to user
            const draft = db.prepare(`
                SELECT d.id
                FROM email_drafts d
                INNER JOIN email_accounts a ON d.account_id = a.id
                WHERE d.id = ? AND a.user_id = ?
            `).get(draftId, userId);

            if (!draft) {
                return reply.status(404).send({ success: false, message: 'Draft not found' });
            }

            // Build update query
            const updates: string[] = [];
            const values: any[] = [];

            if (to_addresses !== undefined) {
                updates.push('to_addresses = ?');
                values.push(to_addresses ? JSON.stringify(to_addresses) : null);
            }

            if (cc_addresses !== undefined) {
                updates.push('cc_addresses = ?');
                values.push(cc_addresses ? JSON.stringify(cc_addresses) : null);
            }

            if (bcc_addresses !== undefined) {
                updates.push('bcc_addresses = ?');
                values.push(bcc_addresses ? JSON.stringify(bcc_addresses) : null);
            }

            if (subject !== undefined) {
                updates.push('subject = ?');
                values.push(subject);
            }

            if (body_html !== undefined) {
                updates.push('body_html = ?');
                values.push(body_html);
            }

            if (body_text !== undefined) {
                updates.push('body_text = ?');
                values.push(body_text);
            }

            if (attachments !== undefined) {
                updates.push('attachments = ?');
                values.push(attachments ? JSON.stringify(attachments) : null);
            }

            if (updates.length > 0) {
                updates.push('updated_at = CURRENT_TIMESTAMP');
                values.push(draftId);

                db.prepare(`
                    UPDATE email_drafts
                    SET ${updates.join(', ')}
                    WHERE id = ?
                `).run(...values);
            }

            console.log(`✅ [EmailDrafts] Draft updated (auto-save): ${draftId}`);

            return { success: true, message: 'Draft saved successfully' };
        } catch (error: any) {
            console.error('❌ [EmailDrafts] Update failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Delete draft
     */
    fastify.delete<{ Params: { draftId: string } }>(
        '/api/email/drafts/:draftId',
        async (request, reply) => {
            try {
                const userId = getUserIdFromRequest(request);
                const { draftId } = request.params;

                // Verify draft belongs to user
                const draft = db.prepare(`
                    SELECT d.id
                    FROM email_drafts d
                    INNER JOIN email_accounts a ON d.account_id = a.id
                    WHERE d.id = ? AND a.user_id = ?
                `).get(draftId, userId);

                if (!draft) {
                    return reply.status(404).send({ success: false, message: 'Draft not found' });
                }

                // Delete draft
                db.prepare(`DELETE FROM email_drafts WHERE id = ?`).run(draftId);

                console.log(`✅ [EmailDrafts] Draft deleted: ${draftId}`);

                return { success: true, message: 'Draft deleted successfully' };
            } catch (error: any) {
                console.error('❌ [EmailDrafts] Delete failed:', error.message);
                return reply.status(500).send({ success: false, message: error.message });
            }
        }
    );

    /**
     * Delete all drafts for account
     */
    fastify.delete<{ Params: { accountId: string } }>(
        '/api/email/accounts/:accountId/drafts',
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

                // Delete all drafts
                const result = db.prepare(`DELETE FROM email_drafts WHERE account_id = ?`).run(accountId);

                console.log(`✅ [EmailDrafts] Deleted ${result.changes} drafts for account ${accountId}`);

                return {
                    success: true,
                    message: `Deleted ${result.changes} draft(s)`,
                    count: result.changes,
                };
            } catch (error: any) {
                console.error('❌ [EmailDrafts] Delete all failed:', error.message);
                return reply.status(500).send({ success: false, message: error.message });
            }
        }
    );
}
