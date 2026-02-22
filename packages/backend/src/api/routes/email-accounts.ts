/**
 * Email Accounts API Routes
 *
 * Manages email accounts:
 * - Add account (manual IMAP or OAuth)
 * - List accounts
 * - Update account settings
 * - Delete account
 * - Sync account
 * - Test connection
 */

import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import { v4 as uuidv4 } from 'uuid';
import { encryptAccountCredentials } from '../../services/email-encryption.js';
import { oauthService } from '../../services/oauth-service.js';
import { imapService } from '../../services/imap-service.js';
import { emailSyncService } from '../../services/email-sync-service.js';

export default async function emailAccountsRoutes(fastify: FastifyInstance) {
    const db = getDatabase();

    /**
     * List all email accounts for current user
     */
    fastify.get('/api/email/accounts', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);

            const accounts = db.prepare(`
                SELECT
                    id, email, name, provider,
                    imap_host, imap_port, imap_user, imap_tls,
                    smtp_host, smtp_port, smtp_user, smtp_tls,
                    signature, sync_enabled, sync_frequency, last_sync,
                    is_default, enabled, created_at, updated_at
                FROM email_accounts
                WHERE user_id = ?
                ORDER BY is_default DESC, created_at ASC
            `).all(userId);

            return { success: true, accounts };
        } catch (error: any) {
            console.error('❌ [EmailAccounts] List failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Get email account details
     */
    fastify.get<{ Params: { id: string } }>('/api/email/accounts/:id', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { id } = request.params;

            const account = db.prepare(`
                SELECT
                    id, email, name, provider,
                    imap_host, imap_port, imap_user, imap_tls,
                    smtp_host, smtp_port, smtp_user, smtp_tls,
                    signature, sync_enabled, sync_frequency, last_sync,
                    is_default, enabled, created_at, updated_at
                FROM email_accounts
                WHERE id = ? AND user_id = ?
            `).get(id, userId);

            if (!account) {
                return reply.status(404).send({ success: false, message: 'Account not found' });
            }

            return { success: true, account };
        } catch (error: any) {
            console.error('❌ [EmailAccounts] Get failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Add email account (manual IMAP/SMTP)
     */
    fastify.post<{
        Body: {
            email: string;
            name?: string;
            provider: 'imap' | 'gmail' | 'outlook';
            imapHost: string;
            imapPort: number;
            imapUser: string;
            imapPassword: string;
            imapTls?: boolean;
            smtpHost: string;
            smtpPort: number;
            smtpUser: string;
            smtpPassword: string;
            smtpTls?: boolean;
            signature?: string;
            syncEnabled?: boolean;
            syncFrequency?: number;
        };
    }>('/api/email/accounts', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const {
                email,
                name,
                provider,
                imapHost,
                imapPort,
                imapUser,
                imapPassword,
                imapTls = true,
                smtpHost,
                smtpPort,
                smtpUser,
                smtpPassword,
                smtpTls = true,
                signature,
                syncEnabled = true,
                syncFrequency = 5,
            } = request.body;

            // Validate required fields
            if (!email || !imapHost || !imapUser || !imapPassword || !smtpHost || !smtpUser || !smtpPassword) {
                return reply.status(400).send({ success: false, message: 'Missing required fields' });
            }

            // Check if account already exists
            const existing = db.prepare(`
                SELECT id FROM email_accounts WHERE user_id = ? AND email = ?
            `).get(userId, email);

            if (existing) {
                return reply.status(409).send({ success: false, message: 'Account already exists' });
            }

            // Encrypt credentials
            const encrypted = encryptAccountCredentials({
                imapPassword,
                smtpPassword,
            });

            // Check if this is the first account (make it default)
            const accountCount = db.prepare(`
                SELECT COUNT(*) as count FROM email_accounts WHERE user_id = ?
            `).get(userId) as { count: number };

            const isDefault = accountCount.count === 0 ? 1 : 0;

            // Create account
            const accountId = uuidv4();
            db.prepare(`
                INSERT INTO email_accounts (
                    id, user_id, email, name, provider,
                    imap_host, imap_port, imap_user, imap_pass_encrypted, imap_tls,
                    smtp_host, smtp_port, smtp_user, smtp_pass_encrypted, smtp_tls,
                    signature, sync_enabled, sync_frequency,
                    is_default, enabled
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                accountId,
                userId,
                email,
                name || null,
                provider,
                imapHost,
                imapPort,
                imapUser,
                encrypted.imapPassEncrypted,
                imapTls ? 1 : 0,
                smtpHost,
                smtpPort,
                smtpUser,
                encrypted.smtpPassEncrypted,
                smtpTls ? 1 : 0,
                signature || null,
                syncEnabled ? 1 : 0,
                syncFrequency,
                isDefault,
                1
            );

            // Test connection
            const account = db.prepare(`SELECT * FROM email_accounts WHERE id = ?`).get(accountId) as any;
            const connectionTest = await imapService.testConnection(account);

            if (!connectionTest) {
                // Delete account if connection fails
                db.prepare(`DELETE FROM email_accounts WHERE id = ?`).run(accountId);
                return reply.status(400).send({
                    success: false,
                    message: 'IMAP connection failed. Please check your credentials.',
                });
            }

            // Start initial sync in background
            emailSyncService.syncAccount(accountId).catch(err => {
                console.error('❌ [EmailAccounts] Initial sync failed:', err);
            });

            // Start auto-sync if enabled
            if (syncEnabled) {
                emailSyncService.startAutoSync(accountId, syncFrequency);
            }

            console.log(`✅ [EmailAccounts] Account added: ${email}`);

            return {
                success: true,
                message: 'Email account added successfully',
                accountId,
            };
        } catch (error: any) {
            console.error('❌ [EmailAccounts] Add failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Update email account settings
     */
    fastify.put<{
        Params: { id: string };
        Body: {
            name?: string;
            signature?: string;
            syncEnabled?: boolean;
            syncFrequency?: number;
            isDefault?: boolean;
        };
    }>('/api/email/accounts/:id', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { id } = request.params;
            const { name, signature, syncEnabled, syncFrequency, isDefault } = request.body;

            // Check account exists and belongs to user
            const account = db.prepare(`
                SELECT * FROM email_accounts WHERE id = ? AND user_id = ?
            `).get(id, userId);

            if (!account) {
                return reply.status(404).send({ success: false, message: 'Account not found' });
            }

            // Build update query
            const updates: string[] = [];
            const values: any[] = [];

            if (name !== undefined) {
                updates.push('name = ?');
                values.push(name);
            }
            if (signature !== undefined) {
                updates.push('signature = ?');
                values.push(signature);
            }
            if (syncEnabled !== undefined) {
                updates.push('sync_enabled = ?');
                values.push(syncEnabled ? 1 : 0);

                // Update auto-sync
                if (syncEnabled) {
                    emailSyncService.startAutoSync(id, syncFrequency || 5);
                } else {
                    emailSyncService.stopAutoSync(id);
                }
            }
            if (syncFrequency !== undefined) {
                updates.push('sync_frequency = ?');
                values.push(syncFrequency);

                // Restart auto-sync with new frequency
                const acct = account as any;
                if (acct.sync_enabled) {
                    emailSyncService.startAutoSync(id, syncFrequency);
                }
            }
            if (isDefault === true) {
                // Unset all other accounts as default
                db.prepare(`UPDATE email_accounts SET is_default = 0 WHERE user_id = ?`).run(userId);
                updates.push('is_default = ?');
                values.push(1);
            }

            if (updates.length > 0) {
                updates.push('updated_at = CURRENT_TIMESTAMP');
                values.push(id);

                db.prepare(`
                    UPDATE email_accounts
                    SET ${updates.join(', ')}
                    WHERE id = ?
                `).run(...values);
            }

            console.log(`✅ [EmailAccounts] Account updated: ${id}`);

            return { success: true, message: 'Account updated successfully' };
        } catch (error: any) {
            console.error('❌ [EmailAccounts] Update failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Delete email account
     */
    fastify.delete<{ Params: { id: string } }>('/api/email/accounts/:id', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { id } = request.params;

            // Check account exists and belongs to user
            const account = db.prepare(`
                SELECT * FROM email_accounts WHERE id = ? AND user_id = ?
            `).get(id, userId);

            if (!account) {
                return reply.status(404).send({ success: false, message: 'Account not found' });
            }

            // Stop auto-sync
            emailSyncService.stopAutoSync(id);

            // Delete account (CASCADE will delete emails, folders, etc.)
            db.prepare(`DELETE FROM email_accounts WHERE id = ?`).run(id);

            console.log(`✅ [EmailAccounts] Account deleted: ${id}`);

            return { success: true, message: 'Account deleted successfully' };
        } catch (error: any) {
            console.error('❌ [EmailAccounts] Delete failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Manual sync account
     */
    fastify.post<{ Params: { id: string } }>('/api/email/accounts/:id/sync', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { id } = request.params;

            // Check account exists and belongs to user
            const account = db.prepare(`
                SELECT * FROM email_accounts WHERE id = ? AND user_id = ?
            `).get(id, userId);

            if (!account) {
                return reply.status(404).send({ success: false, message: 'Account not found' });
            }

            console.log(`🔄 [EmailAccounts] Manual sync triggered for ${id}`);

            // Trigger sync (don't wait for it to complete)
            emailSyncService.syncAccount(id).catch(err => {
                console.error('❌ [EmailAccounts] Sync failed:', err);
            });

            return { success: true, message: 'Sync started' };
        } catch (error: any) {
            console.error('❌ [EmailAccounts] Sync trigger failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Get account connection status
     */
    fastify.get<{ Params: { id: string } }>('/api/email/accounts/:id/status', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { id } = request.params;

            const account = db.prepare(`
                SELECT * FROM email_accounts WHERE id = ? AND user_id = ?
            `).get(id, userId) as any;

            if (!account) {
                return reply.status(404).send({ success: false, message: 'Account not found' });
            }

            // Test connection
            const connected = await imapService.testConnection(account);

            return {
                success: true,
                status: {
                    connected,
                    lastSync: account.last_sync,
                    syncEnabled: account.sync_enabled === 1,
                    enabled: account.enabled === 1,
                },
            };
        } catch (error: any) {
            console.error('❌ [EmailAccounts] Status check failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Get OAuth authorization URL (Gmail)
     */
    fastify.get('/api/email/accounts/gmail/auth-url', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);

            if (!oauthService.isGmailConfigured()) {
                return reply.status(503).send({
                    success: false,
                    message: 'Gmail OAuth not configured. Please set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env',
                });
            }

            const url = oauthService.getGmailAuthUrl(userId);

            return { success: true, url };
        } catch (error: any) {
            console.error('❌ [EmailAccounts] Gmail auth URL failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Get OAuth authorization URL (Outlook)
     */
    fastify.get('/api/email/accounts/outlook/auth-url', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);

            if (!oauthService.isOutlookConfigured()) {
                return reply.status(503).send({
                    success: false,
                    message: 'Outlook OAuth not configured. Please set OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET in .env',
                });
            }

            const url = oauthService.getOutlookAuthUrl(userId);

            return { success: true, url };
        } catch (error: any) {
            console.error('❌ [EmailAccounts] Outlook auth URL failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Exchange OAuth code for tokens (Gmail)
     */
    fastify.post<{
        Body: {
            code: string;
            name?: string;
        };
    }>('/api/email/accounts/gmail', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { code, name } = request.body;

            if (!code) {
                return reply.status(400).send({ success: false, message: 'Missing authorization code' });
            }

            // Exchange code for tokens
            const tokens = await oauthService.exchangeGmailCode(code);

            if (!tokens.email) {
                return reply.status(400).send({ success: false, message: 'Failed to get email from OAuth' });
            }

            // Check if account already exists
            const existing = db.prepare(`
                SELECT id FROM email_accounts WHERE user_id = ? AND email = ?
            `).get(userId, tokens.email);

            if (existing) {
                return reply.status(409).send({ success: false, message: 'Account already exists' });
            }

            // Encrypt tokens
            const encrypted = encryptAccountCredentials({
                imapPassword: '', // Not used for OAuth
                smtpPassword: '', // Not used for OAuth
                oauthAccessToken: tokens.accessToken,
                oauthRefreshToken: tokens.refreshToken,
            });

            // Check if this is the first account
            const accountCount = db.prepare(`
                SELECT COUNT(*) as count FROM email_accounts WHERE user_id = ?
            `).get(userId) as { count: number };

            const isDefault = accountCount.count === 0 ? 1 : 0;

            // Create account
            const accountId = uuidv4();
            db.prepare(`
                INSERT INTO email_accounts (
                    id, user_id, email, name, provider,
                    imap_host, imap_port, imap_user, imap_pass_encrypted, imap_tls,
                    smtp_host, smtp_port, smtp_user, smtp_pass_encrypted, smtp_tls,
                    oauth_access_token, oauth_refresh_token, oauth_expires_at,
                    sync_enabled, sync_frequency, is_default, enabled
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                accountId,
                userId,
                tokens.email,
                name || tokens.name || null,
                'gmail',
                'imap.gmail.com',
                993,
                tokens.email,
                encrypted.imapPassEncrypted,
                1,
                'smtp.gmail.com',
                587,
                tokens.email,
                encrypted.smtpPassEncrypted,
                1,
                encrypted.oauthAccessToken,
                encrypted.oauthRefreshToken,
                tokens.expiresAt.toISOString(),
                1, // sync_enabled
                5, // sync_frequency
                isDefault,
                1 // enabled
            );

            // Start initial sync
            emailSyncService.syncAccount(accountId).catch(err => {
                console.error('❌ [EmailAccounts] Initial sync failed:', err);
            });

            // Start auto-sync
            emailSyncService.startAutoSync(accountId, 5);

            console.log(`✅ [EmailAccounts] Gmail account added: ${tokens.email}`);

            return {
                success: true,
                message: 'Gmail account added successfully',
                accountId,
            };
        } catch (error: any) {
            console.error('❌ [EmailAccounts] Gmail OAuth failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    /**
     * Exchange OAuth code for tokens (Outlook)
     */
    fastify.post<{
        Body: {
            code: string;
            name?: string;
        };
    }>('/api/email/accounts/outlook', async (request, reply) => {
        try {
            const userId = getUserIdFromRequest(request);
            const { code, name } = request.body;

            if (!code) {
                return reply.status(400).send({ success: false, message: 'Missing authorization code' });
            }

            // Exchange code for tokens
            const tokens = await oauthService.exchangeOutlookCode(code);

            if (!tokens.email) {
                return reply.status(400).send({ success: false, message: 'Failed to get email from OAuth' });
            }

            // Check if account already exists
            const existing = db.prepare(`
                SELECT id FROM email_accounts WHERE user_id = ? AND email = ?
            `).get(userId, tokens.email);

            if (existing) {
                return reply.status(409).send({ success: false, message: 'Account already exists' });
            }

            // Encrypt tokens
            const encrypted = encryptAccountCredentials({
                imapPassword: '',
                smtpPassword: '',
                oauthAccessToken: tokens.accessToken,
                oauthRefreshToken: tokens.refreshToken,
            });

            // Check if this is the first account
            const accountCount = db.prepare(`
                SELECT COUNT(*) as count FROM email_accounts WHERE user_id = ?
            `).get(userId) as { count: number };

            const isDefault = accountCount.count === 0 ? 1 : 0;

            // Create account
            const accountId = uuidv4();
            db.prepare(`
                INSERT INTO email_accounts (
                    id, user_id, email, name, provider,
                    imap_host, imap_port, imap_user, imap_pass_encrypted, imap_tls,
                    smtp_host, smtp_port, smtp_user, smtp_pass_encrypted, smtp_tls,
                    oauth_access_token, oauth_refresh_token, oauth_expires_at,
                    sync_enabled, sync_frequency, is_default, enabled
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                accountId,
                userId,
                tokens.email,
                name || tokens.name || null,
                'outlook',
                'outlook.office365.com',
                993,
                tokens.email,
                encrypted.imapPassEncrypted,
                1,
                'smtp.office365.com',
                587,
                tokens.email,
                encrypted.smtpPassEncrypted,
                1,
                encrypted.oauthAccessToken,
                encrypted.oauthRefreshToken,
                tokens.expiresAt.toISOString(),
                1,
                5,
                isDefault,
                1
            );

            // Start initial sync
            emailSyncService.syncAccount(accountId).catch(err => {
                console.error('❌ [EmailAccounts] Initial sync failed:', err);
            });

            // Start auto-sync
            emailSyncService.startAutoSync(accountId, 5);

            console.log(`✅ [EmailAccounts] Outlook account added: ${tokens.email}`);

            return {
                success: true,
                message: 'Outlook account added successfully',
                accountId,
            };
        } catch (error: any) {
            console.error('❌ [EmailAccounts] Outlook OAuth failed:', error.message);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });
}
