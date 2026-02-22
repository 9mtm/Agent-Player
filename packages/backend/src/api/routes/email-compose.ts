/**
 * Email Compose/Send API Routes
 *
 * Send emails via SMTP:
 * - Send new email
 * - Reply to email
 * - Reply all
 * - Forward email
 * - With attachments support
 */

import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import nodemailer from 'nodemailer';
import { decryptAccountCredentials } from '../../services/email-encryption.js';
import { v4 as uuidv4 } from 'uuid';

export default async function emailComposeRoutes(fastify: FastifyInstance) {
    const db = getDatabase();

    /**
     * Create SMTP transporter for account
     */
    async function createTransporter(accountId: string, userId: string) {
        const account = db.prepare(`
            SELECT * FROM email_accounts WHERE id = ? AND user_id = ?
        `).get(accountId, userId) as any;

        if (!account) {
            throw new Error('Account not found');
        }

        const credentials = decryptAccountCredentials({
            imap_pass_encrypted: account.imap_pass_encrypted,
            smtp_pass_encrypted: account.smtp_pass_encrypted,
            oauth_access_token: account.oauth_access_token,
            oauth_refresh_token: account.oauth_refresh_token,
        });

        const config: any = {
            host: account.smtp_host,
            port: account.smtp_port,
            secure: account.smtp_port === 465,
            auth: {
                user: account.smtp_user,
                pass: credentials.smtpPassword,
            },
        };

        // Use OAuth if available
        if (credentials.oauthAccessToken) {
            config.auth = {
                type: 'OAuth2',
                user: account.smtp_user,
                accessToken: credentials.oauthAccessToken,
            };
        }

        return nodemailer.createTransport(config);
    }

    /**
     * Send email
     */
    fastify.post<{
        Params: { accountId: string };
        Body: {
            to: string[];
            cc?: string[];
            bcc?: string[];
            subject: string;
            body_html?: string;
            body_text?: string;
            attachments?: string[]; // file IDs from storage
            in_reply_to?: string; // message-id for reply
            references?: string; // message-ids for thread
        };
    }>('/api/email/accounts/:accountId/send', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { accountId } = request.params;
            const {
                to,
                cc,
                bcc,
                subject,
                body_html,
                body_text,
                attachments,
                in_reply_to,
                references,
            } = request.body;

            if (!to || to.length === 0) {
                return reply.status(400).send({ success: false, message: 'Recipients are required' });
            }

            if (!subject && !body_html && !body_text) {
                return reply.status(400).send({ success: false, message: 'Email content is required' });
            }

            // Get account
            const account = db.prepare(`
                SELECT * FROM email_accounts WHERE id = ? AND user_id = ?
            `).get(accountId, userId) as any;

            if (!account) {
                return reply.status(404).send({ success: false, message: 'Account not found' });
            }

            // Create transporter
            const transporter = await createTransporter(accountId, userId);

            // Prepare email
            const mailOptions: any = {
                from: `${account.name || account.email} <${account.email}>`,
                to: to.join(', '),
                subject: subject || '(No Subject)',
                text: body_text,
                html: body_html,
            };

            if (cc && cc.length > 0) {
                mailOptions.cc = cc.join(', ');
            }

            if (bcc && bcc.length > 0) {
                mailOptions.bcc = bcc.join(', ');
            }

            if (in_reply_to) {
                mailOptions.inReplyTo = in_reply_to;
            }

            if (references) {
                mailOptions.references = references;
            }

            // Add signature if exists
            if (account.signature && body_html) {
                mailOptions.html = `${body_html}<br><br>--<br>${account.signature}`;
            }

            // TODO: Add attachments from storage (implement in attachments API)
            // if (attachments && attachments.length > 0) {
            //     mailOptions.attachments = await loadAttachments(attachments);
            // }

            // Send email
            const info = await transporter.sendMail(mailOptions);

            console.log(`✅ [EmailCompose] Email sent: ${info.messageId}`);

            // Store sent email in Sent folder
            try {
                const sentFolder = db.prepare(`
                    SELECT id FROM email_folders
                    WHERE account_id = ? AND (name = 'Sent' OR name = 'Sent Items' OR name = '[Gmail]/Sent Mail')
                `).get(accountId) as { id: string } | undefined;

                if (sentFolder) {
                    const emailId = uuidv4();
                    const now = new Date().toISOString();

                    db.prepare(`
                        INSERT INTO emails (
                            id, account_id, folder_id, imap_uid, message_id,
                            from_address, from_name, to_addresses, cc_addresses, bcc_addresses,
                            subject, date, body_text, body_html, body_snippet,
                            is_read, is_draft, size_bytes, synced_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        emailId,
                        accountId,
                        sentFolder.id,
                        info.messageId,
                        info.messageId,
                        account.email,
                        account.name || null,
                        JSON.stringify(to),
                        cc ? JSON.stringify(cc) : null,
                        bcc ? JSON.stringify(bcc) : null,
                        subject || '(No Subject)',
                        now,
                        body_text || null,
                        body_html || null,
                        body_text ? body_text.substring(0, 200) : '',
                        1, // is_read
                        0, // is_draft
                        (body_html || body_text || '').length,
                        now
                    );
                }
            } catch (storeError) {
                console.error('⚠️ [EmailCompose] Failed to store sent email:', storeError);
            }

            return {
                success: true,
                message: 'Email sent successfully',
                messageId: info.messageId,
            };
        } catch (error: any) {
            console.error('❌ [EmailCompose] Send failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Reply to email
     */
    fastify.post<{
        Params: { accountId: string; emailId: string };
        Body: {
            body_html?: string;
            body_text?: string;
            attachments?: string[];
        };
    }>('/api/email/accounts/:accountId/reply/:emailId', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { accountId, emailId } = request.params;
            const { body_html, body_text, attachments } = request.body;

            // Get original email
            const original = db.prepare(`
                SELECT e.* FROM emails e
                INNER JOIN email_accounts a ON e.account_id = a.id
                WHERE e.id = ? AND e.account_id = ? AND a.user_id = ?
            `).get(emailId, accountId, userId) as any;

            if (!original) {
                return reply.status(404).send({ success: false, message: 'Email not found' });
            }

            // Prepare reply
            const to = [original.from_address];
            const subject = original.subject?.startsWith('Re:')
                ? original.subject
                : `Re: ${original.subject || '(No Subject)'}`;

            // Create reply body with quoted original
            const quotedHtml = body_html
                ? `${body_html}<br><br>On ${new Date(original.date).toLocaleString()}, ${original.from_name || original.from_address} wrote:<br><blockquote>${original.body_html || original.body_text || ''}</blockquote>`
                : undefined;

            const quotedText = body_text
                ? `${body_text}\n\nOn ${new Date(original.date).toLocaleString()}, ${original.from_name || original.from_address} wrote:\n> ${(original.body_text || '').replace(/\n/g, '\n> ')}`
                : undefined;

            // Send reply
            return await request.server.inject({
                method: 'POST',
                url: `/api/email/accounts/${accountId}/send`,
                headers: request.headers,
                payload: {
                    to,
                    subject,
                    body_html: quotedHtml,
                    body_text: quotedText,
                    attachments,
                    in_reply_to: original.message_id,
                    references: original.message_id,
                },
            });
        } catch (error: any) {
            console.error('❌ [EmailCompose] Reply failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Reply all to email
     */
    fastify.post<{
        Params: { accountId: string; emailId: string };
        Body: {
            body_html?: string;
            body_text?: string;
            attachments?: string[];
        };
    }>('/api/email/accounts/:accountId/reply-all/:emailId', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { accountId, emailId } = request.params;
            const { body_html, body_text, attachments } = request.body;

            // Get original email
            const original = db.prepare(`
                SELECT e.* FROM emails e
                INNER JOIN email_accounts a ON e.account_id = a.id
                WHERE e.id = ? AND e.account_id = ? AND a.user_id = ?
            `).get(emailId, accountId, userId) as any;

            if (!original) {
                return reply.status(404).send({ success: false, message: 'Email not found' });
            }

            // Get account email to exclude from reply-all
            const account = db.prepare(`
                SELECT email FROM email_accounts WHERE id = ?
            `).get(accountId) as { email: string };

            // Prepare reply-all recipients
            const to = [original.from_address];
            const toAddresses = JSON.parse(original.to_addresses || '[]') as string[];
            const ccAddresses = JSON.parse(original.cc_addresses || '[]') as string[];

            // Add original To recipients (except current user)
            toAddresses.forEach(addr => {
                if (addr !== account.email && !to.includes(addr)) {
                    to.push(addr);
                }
            });

            // Add original CC recipients (except current user)
            const cc = ccAddresses.filter(addr => addr !== account.email);

            const subject = original.subject?.startsWith('Re:')
                ? original.subject
                : `Re: ${original.subject || '(No Subject)'}`;

            // Create reply body with quoted original
            const quotedHtml = body_html
                ? `${body_html}<br><br>On ${new Date(original.date).toLocaleString()}, ${original.from_name || original.from_address} wrote:<br><blockquote>${original.body_html || original.body_text || ''}</blockquote>`
                : undefined;

            const quotedText = body_text
                ? `${body_text}\n\nOn ${new Date(original.date).toLocaleString()}, ${original.from_name || original.from_address} wrote:\n> ${(original.body_text || '').replace(/\n/g, '\n> ')}`
                : undefined;

            // Send reply-all
            return await request.server.inject({
                method: 'POST',
                url: `/api/email/accounts/${accountId}/send`,
                headers: request.headers,
                payload: {
                    to,
                    cc: cc.length > 0 ? cc : undefined,
                    subject,
                    body_html: quotedHtml,
                    body_text: quotedText,
                    attachments,
                    in_reply_to: original.message_id,
                    references: original.message_id,
                },
            });
        } catch (error: any) {
            console.error('❌ [EmailCompose] Reply-all failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Forward email
     */
    fastify.post<{
        Params: { accountId: string; emailId: string };
        Body: {
            to: string[];
            cc?: string[];
            body_html?: string;
            body_text?: string;
            attachments?: string[];
        };
    }>('/api/email/accounts/:accountId/forward/:emailId', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { accountId, emailId } = request.params;
            const { to, cc, body_html, body_text, attachments } = request.body;

            if (!to || to.length === 0) {
                return reply.status(400).send({ success: false, message: 'Recipients are required' });
            }

            // Get original email
            const original = db.prepare(`
                SELECT e.* FROM emails e
                INNER JOIN email_accounts a ON e.account_id = a.id
                WHERE e.id = ? AND e.account_id = ? AND a.user_id = ?
            `).get(emailId, accountId, userId) as any;

            if (!original) {
                return reply.status(404).send({ success: false, message: 'Email not found' });
            }

            const subject = original.subject?.startsWith('Fwd:')
                ? original.subject
                : `Fwd: ${original.subject || '(No Subject)'}`;

            // Create forward body with original message
            const forwardedHtml = body_html
                ? `${body_html}<br><br>---------- Forwarded message ----------<br>From: ${original.from_name || original.from_address}<br>Date: ${new Date(original.date).toLocaleString()}<br>Subject: ${original.subject}<br><br>${original.body_html || original.body_text || ''}`
                : undefined;

            const forwardedText = body_text
                ? `${body_text}\n\n---------- Forwarded message ----------\nFrom: ${original.from_name || original.from_address}\nDate: ${new Date(original.date).toLocaleString()}\nSubject: ${original.subject}\n\n${original.body_text || ''}`
                : undefined;

            // Send forward
            return await request.server.inject({
                method: 'POST',
                url: `/api/email/accounts/${accountId}/send`,
                headers: request.headers,
                payload: {
                    to,
                    cc,
                    subject,
                    body_html: forwardedHtml,
                    body_text: forwardedText,
                    attachments,
                },
            });
        } catch (error: any) {
            console.error('❌ [EmailCompose] Forward failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });
}
