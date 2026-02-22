/**
 * Email Attachments API Routes
 *
 * Manage email attachments:
 * - Download attachment from email
 * - Upload attachment for compose
 * - Get attachment metadata
 * - Delete attachment
 */

import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import { getStorageManager } from '../../services/storage-manager.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export default async function emailAttachmentsRoutes(fastify: FastifyInstance) {
    const db = getDatabase();
    const storageManager = getStorageManager();

    /**
     * List attachments for an email
     */
    fastify.get<{ Params: { emailId: string } }>(
        '/api/email/emails/:emailId/attachments',
        async (request, reply) => {
            try {
                const userId = getUserIdFromRequest(request);
                const { emailId } = request.params;

                // Verify email belongs to user
                const email = db.prepare(`
                    SELECT e.id, e.attachments
                    FROM emails e
                    INNER JOIN email_accounts a ON e.account_id = a.id
                    WHERE e.id = ? AND a.user_id = ?
                `).get(emailId, userId) as any;

                if (!email) {
                    return reply.status(404).send({ success: false, message: 'Email not found' });
                }

                // Get attachments from database
                const attachments = db.prepare(`
                    SELECT id, filename, content_type, size_bytes, downloaded, created_at
                    FROM email_attachments
                    WHERE email_id = ?
                    ORDER BY created_at ASC
                `).all(emailId);

                return { success: true, attachments };
            } catch (error: any) {
                console.error('❌ [EmailAttachments] List failed:', error.message);
                return reply.status(500).send({ success: false, message: error.message });
            }
        }
    );

    /**
     * Download attachment
     */
    fastify.get<{ Params: { attachmentId: string } }>(
        '/api/email/attachments/:attachmentId/download',
        async (request, reply) => {
            try {
                const userId = getUserIdFromRequest(request);
                const { attachmentId } = request.params;

                // Get attachment
                const attachment = db.prepare(`
                    SELECT a.*, e.account_id
                    FROM email_attachments a
                    INNER JOIN emails e ON a.email_id = e.id
                    INNER JOIN email_accounts acc ON e.account_id = acc.id
                    WHERE a.id = ? AND acc.user_id = ?
                `).get(attachmentId, userId) as any;

                if (!attachment) {
                    return reply.status(404).send({ success: false, message: 'Attachment not found' });
                }

                // Check if file exists in storage
                if (attachment.storage_path && attachment.downloaded) {
                    try {
                        const fileBuffer = await fs.readFile(attachment.storage_path);

                        reply.header('Content-Type', attachment.content_type || 'application/octet-stream');
                        reply.header('Content-Disposition', `attachment; filename="${attachment.filename}"`);
                        reply.header('Content-Length', fileBuffer.length);

                        return reply.send(fileBuffer);
                    } catch (readError) {
                        console.warn('⚠️ [EmailAttachments] File not found in storage, will re-download from IMAP');
                    }
                }

                // TODO: Download from IMAP if not in storage
                // For now, return error
                return reply.status(404).send({
                    success: false,
                    message: 'Attachment not yet downloaded. Download from IMAP is not implemented yet.',
                });
            } catch (error: any) {
                console.error('❌ [EmailAttachments] Download failed:', error.message);
                return reply.status(500).send({ success: false, message: error.message });
            }
        }
    );

    /**
     * Upload attachment for compose
     */
    fastify.post('/api/email/attachments/upload', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);

            // Get uploaded file from multipart
            const data = await request.file();

            if (!data) {
                return reply.status(400).send({ success: false, message: 'No file uploaded' });
            }

            const filename = data.filename;
            const mimeType = data.mimetype;
            const buffer = await data.toBuffer();
            const size = buffer.length;

            // Validate file size (max 25MB)
            if (size > 25 * 1024 * 1024) {
                return reply.status(413).send({ success: false, message: 'File too large (max 25MB)' });
            }

            // Save to storage
            const fileId = uuidv4();
            const ext = path.extname(filename);
            const storagePath = path.join('.data', 'storage', 'cdn', 'email-attachments', `${fileId}${ext}`);

            // Ensure directory exists
            await fs.mkdir(path.dirname(storagePath), { recursive: true });

            // Write file
            await fs.writeFile(storagePath, buffer);

            // Store in storage_files table
            db.prepare(`
                INSERT INTO storage_files (
                    id, user_id, filename, path, size_bytes,
                    mime_type, zone, category
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                fileId,
                userId,
                filename,
                storagePath,
                size,
                mimeType,
                'cdn',
                'email-attachments'
            );

            console.log(`✅ [EmailAttachments] Uploaded: ${filename} (${size} bytes)`);

            return {
                success: true,
                message: 'Attachment uploaded successfully',
                attachment: {
                    id: fileId,
                    filename,
                    content_type: mimeType,
                    size_bytes: size,
                    path: storagePath,
                },
            };
        } catch (error: any) {
            console.error('❌ [EmailAttachments] Upload failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Delete attachment upload (before sending)
     */
    fastify.delete<{ Params: { attachmentId: string } }>(
        '/api/email/attachments/:attachmentId',
        async (request, reply) => {
            try {
                const userId = getUserIdFromRequest(request);
                const { attachmentId } = request.params;

                // Get attachment
                const file = db.prepare(`
                    SELECT * FROM storage_files WHERE id = ? AND user_id = ?
                `).get(attachmentId, userId) as any;

                if (!file) {
                    return reply.status(404).send({ success: false, message: 'Attachment not found' });
                }

                // Delete file from disk
                try {
                    await fs.unlink(file.path);
                } catch (unlinkError) {
                    console.warn('⚠️ [EmailAttachments] File not found on disk:', file.path);
                }

                // Delete from database
                db.prepare(`DELETE FROM storage_files WHERE id = ?`).run(attachmentId);

                console.log(`✅ [EmailAttachments] Deleted: ${file.filename}`);

                return { success: true, message: 'Attachment deleted successfully' };
            } catch (error: any) {
                console.error('❌ [EmailAttachments] Delete failed:', error.message);
                return reply.status(500).send({ success: false, message: error.message });
            }
        }
    );

    /**
     * Get attachment metadata
     */
    fastify.get<{ Params: { attachmentId: string } }>(
        '/api/email/attachments/:attachmentId',
        async (request, reply) => {
            try {
                const userId = getUserIdFromRequest(request);
                const { attachmentId } = request.params;

                // Try email_attachments first
                const emailAttachment = db.prepare(`
                    SELECT a.*, e.account_id
                    FROM email_attachments a
                    INNER JOIN emails e ON a.email_id = e.id
                    INNER JOIN email_accounts acc ON e.account_id = acc.id
                    WHERE a.id = ? AND acc.user_id = ?
                `).get(attachmentId, userId);

                if (emailAttachment) {
                    return { success: true, attachment: emailAttachment };
                }

                // Try storage_files (uploaded for compose)
                const storageFile = db.prepare(`
                    SELECT * FROM storage_files WHERE id = ? AND user_id = ?
                `).get(attachmentId, userId);

                if (storageFile) {
                    return { success: true, attachment: storageFile };
                }

                return reply.status(404).send({ success: false, message: 'Attachment not found' });
            } catch (error: any) {
                console.error('❌ [EmailAttachments] Get metadata failed:', error.message);
                return reply.status(500).send({ success: false, message: error.message });
            }
        }
    );
}
