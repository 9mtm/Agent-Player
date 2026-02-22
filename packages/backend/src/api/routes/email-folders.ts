/**
 * Email Folders API Routes
 *
 * Manages email folders:
 * - List folders for account
 * - Get folder details
 * - Create custom folder
 * - Update folder (rename, color)
 * - Delete custom folder
 */

import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import { v4 as uuidv4 } from 'uuid';

export default async function emailFoldersRoutes(fastify: FastifyInstance) {
    const db = getDatabase();

    /**
     * List folders for an account
     */
    fastify.get<{ Params: { accountId: string } }>(
        '/api/email/accounts/:accountId/folders',
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

                // Get folders
                const folders = db.prepare(`
                    SELECT
                        id, name, display_name, type, imap_path,
                        parent_id, icon, color, sort_order,
                        unread_count, total_count
                    FROM email_folders
                    WHERE account_id = ?
                    ORDER BY sort_order ASC, name ASC
                `).all(accountId);

                return { success: true, folders };
            } catch (error: any) {
                console.error('❌ [EmailFolders] List failed:', error.message);
                return reply.status(500).send({ success: false, message: error.message });
            }
        }
    );

    /**
     * Get folder details
     */
    fastify.get<{ Params: { accountId: string; folderId: string } }>(
        '/api/email/accounts/:accountId/folders/:folderId',
        async (request, reply) => {
            try {
                const userId = getUserIdFromRequest(request);
                const { accountId, folderId } = request.params;

                // Verify account belongs to user
                const account = db.prepare(`
                    SELECT id FROM email_accounts WHERE id = ? AND user_id = ?
                `).get(accountId, userId);

                if (!account) {
                    return reply.status(404).send({ success: false, message: 'Account not found' });
                }

                // Get folder
                const folder = db.prepare(`
                    SELECT * FROM email_folders WHERE id = ? AND account_id = ?
                `).get(folderId, accountId);

                if (!folder) {
                    return reply.status(404).send({ success: false, message: 'Folder not found' });
                }

                return { success: true, folder };
            } catch (error: any) {
                console.error('❌ [EmailFolders] Get failed:', error.message);
                return reply.status(500).send({ success: false, message: error.message });
            }
        }
    );

    /**
     * Create custom folder
     */
    fastify.post<{
        Params: { accountId: string };
        Body: {
            name: string;
            displayName?: string;
            parentId?: string;
            icon?: string;
            color?: string;
        };
    }>('/api/email/accounts/:accountId/folders', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { accountId } = request.params;
            const { name, displayName, parentId, icon, color } = request.body;

            if (!name) {
                return reply.status(400).send({ success: false, message: 'Folder name is required' });
            }

            // Verify account belongs to user
            const account = db.prepare(`
                SELECT id FROM email_accounts WHERE id = ? AND user_id = ?
            `).get(accountId, userId);

            if (!account) {
                return reply.status(404).send({ success: false, message: 'Account not found' });
            }

            // Check if folder name already exists
            const existing = db.prepare(`
                SELECT id FROM email_folders WHERE account_id = ? AND name = ?
            `).get(accountId, name);

            if (existing) {
                return reply.status(409).send({ success: false, message: 'Folder name already exists' });
            }

            // Create folder
            const folderId = uuidv4();
            db.prepare(`
                INSERT INTO email_folders (
                    id, account_id, name, display_name, type,
                    parent_id, icon, color
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                folderId,
                accountId,
                name,
                displayName || name,
                'custom',
                parentId || null,
                icon || null,
                color || null
            );

            console.log(`✅ [EmailFolders] Custom folder created: ${name}`);

            return {
                success: true,
                message: 'Folder created successfully',
                folderId,
            };
        } catch (error: any) {
            console.error('❌ [EmailFolders] Create failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Update folder (rename, color, etc.)
     */
    fastify.put<{
        Params: { accountId: string; folderId: string };
        Body: {
            displayName?: string;
            icon?: string;
            color?: string;
            sortOrder?: number;
        };
    }>('/api/email/accounts/:accountId/folders/:folderId', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { accountId, folderId } = request.params;
            const { displayName, icon, color, sortOrder } = request.body;

            // Verify account belongs to user
            const account = db.prepare(`
                SELECT id FROM email_accounts WHERE id = ? AND user_id = ?
            `).get(accountId, userId);

            if (!account) {
                return reply.status(404).send({ success: false, message: 'Account not found' });
            }

            // Verify folder exists and is custom (can't edit system folders)
            const folder = db.prepare(`
                SELECT * FROM email_folders WHERE id = ? AND account_id = ?
            `).get(folderId, accountId) as any;

            if (!folder) {
                return reply.status(404).send({ success: false, message: 'Folder not found' });
            }

            if (folder.type === 'system') {
                return reply.status(403).send({ success: false, message: 'Cannot modify system folders' });
            }

            // Build update query
            const updates: string[] = [];
            const values: any[] = [];

            if (displayName !== undefined) {
                updates.push('display_name = ?');
                values.push(displayName);
            }
            if (icon !== undefined) {
                updates.push('icon = ?');
                values.push(icon);
            }
            if (color !== undefined) {
                updates.push('color = ?');
                values.push(color);
            }
            if (sortOrder !== undefined) {
                updates.push('sort_order = ?');
                values.push(sortOrder);
            }

            if (updates.length > 0) {
                values.push(folderId);

                db.prepare(`
                    UPDATE email_folders
                    SET ${updates.join(', ')}
                    WHERE id = ?
                `).run(...values);
            }

            console.log(`✅ [EmailFolders] Folder updated: ${folderId}`);

            return { success: true, message: 'Folder updated successfully' };
        } catch (error: any) {
            console.error('❌ [EmailFolders] Update failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Delete custom folder
     */
    fastify.delete<{ Params: { accountId: string; folderId: string } }>(
        '/api/email/accounts/:accountId/folders/:folderId',
        async (request, reply) => {
            try {
                const userId = getUserIdFromRequest(request);
                const { accountId, folderId } = request.params;

                // Verify account belongs to user
                const account = db.prepare(`
                    SELECT id FROM email_accounts WHERE id = ? AND user_id = ?
                `).get(accountId, userId);

                if (!account) {
                    return reply.status(404).send({ success: false, message: 'Account not found' });
                }

                // Verify folder exists and is custom
                const folder = db.prepare(`
                    SELECT * FROM email_folders WHERE id = ? AND account_id = ?
                `).get(folderId, accountId) as any;

                if (!folder) {
                    return reply.status(404).send({ success: false, message: 'Folder not found' });
                }

                if (folder.type === 'system') {
                    return reply.status(403).send({ success: false, message: 'Cannot delete system folders' });
                }

                // Delete folder (CASCADE will delete emails in it)
                db.prepare(`DELETE FROM email_folders WHERE id = ?`).run(folderId);

                console.log(`✅ [EmailFolders] Folder deleted: ${folderId}`);

                return { success: true, message: 'Folder deleted successfully' };
            } catch (error: any) {
                console.error('❌ [EmailFolders] Delete failed:', error.message);
                return reply.status(500).send({ success: false, message: error.message });
            }
        }
    );
}
