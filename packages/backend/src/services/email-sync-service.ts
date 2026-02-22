/**
 * Email Sync Service
 *
 * Background sync service that:
 * - Syncs emails from IMAP servers
 * - Updates folder counts
 * - Stores emails in local database
 * - Handles incremental sync (only new emails)
 * - Supports auto-sync on interval
 */

import { getDatabase } from '../db/index.js';
import { imapService, type IMAPAccount, type EmailMessage } from './imap-service.js';
import { v4 as uuidv4 } from 'uuid';

export interface SyncResult {
    accountId: string;
    success: boolean;
    foldersScanned: number;
    emailsFetched: number;
    emailsNew: number;
    emailsUpdated: number;
    errors: string[];
    duration: number;
}

export class EmailSyncService {
    private syncIntervals: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Sync a single email account
     */
    async syncAccount(accountId: string): Promise<SyncResult> {
        const startTime = Date.now();
        const result: SyncResult = {
            accountId,
            success: false,
            foldersScanned: 0,
            emailsFetched: 0,
            emailsNew: 0,
            emailsUpdated: 0,
            errors: [],
            duration: 0,
        };

        let connection;
        try {
            const db = getDatabase();

            // Get account from database
            const account = db.prepare(`
                SELECT * FROM email_accounts WHERE id = ? AND enabled = 1
            `).get(accountId) as IMAPAccount | undefined;

            if (!account) {
                throw new Error('Account not found or disabled');
            }

            console.log(`🔄 [EmailSync] Starting sync for ${account.email}`);

            // Connect to IMAP
            connection = await imapService.connect(account);

            // Get folders
            const folders = await imapService.listFolders(connection);
            result.foldersScanned = folders.length;

            // Sync each folder
            for (const folder of folders) {
                try {
                    await this.syncFolder(accountId, folder.path, connection);
                } catch (error: any) {
                    result.errors.push(`Folder ${folder.path}: ${error.message}`);
                    console.error(`❌ [EmailSync] Failed to sync folder ${folder.path}:`, error.message);
                }
            }

            // Update last sync time
            db.prepare(`
                UPDATE email_accounts
                SET last_sync = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(accountId);

            result.success = true;
            result.duration = Date.now() - startTime;

            console.log(`✅ [EmailSync] Completed sync for ${account.email} in ${result.duration}ms`);
            console.log(`   📊 Folders: ${result.foldersScanned}, Fetched: ${result.emailsFetched}, New: ${result.emailsNew}, Updated: ${result.emailsUpdated}`);

            return result;
        } catch (error: any) {
            result.errors.push(error.message);
            result.duration = Date.now() - startTime;
            console.error(`❌ [EmailSync] Account sync failed:`, error.message);
            return result;
        } finally {
            if (connection) {
                await imapService.disconnect(connection);
            }
        }
    }

    /**
     * Sync a single folder
     */
    private async syncFolder(accountId: string, folderPath: string, connection: any): Promise<void> {
        const db = getDatabase();

        // Get or create folder in database
        let folder = db.prepare(`
            SELECT * FROM email_folders WHERE account_id = ? AND imap_path = ?
        `).get(accountId, folderPath) as any;

        if (!folder) {
            // Create new folder
            const folderId = uuidv4();
            db.prepare(`
                INSERT INTO email_folders (id, account_id, name, display_name, type, imap_path)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(folderId, accountId, folderPath, folderPath, 'system', folderPath);

            folder = { id: folderId };
        }

        // Fetch emails (limit to last 100 for initial sync)
        const emails = await imapService.fetchEmails(connection, folderPath, { limit: 100 });

        // Store emails in database
        for (const email of emails) {
            try {
                this.storeEmail(accountId, folder.id, email);
            } catch (error: any) {
                console.error(`❌ [EmailSync] Failed to store email ${email.uid}:`, error.message);
            }
        }

        // Update folder counts
        const unreadCount = db.prepare(`
            SELECT COUNT(*) as count FROM emails
            WHERE folder_id = ? AND is_read = 0
        `).get(folder.id) as { count: number };

        const totalCount = db.prepare(`
            SELECT COUNT(*) as count FROM emails
            WHERE folder_id = ?
        `).get(folder.id) as { count: number };

        db.prepare(`
            UPDATE email_folders
            SET unread_count = ?, total_count = ?
            WHERE id = ?
        `).run(unreadCount.count, totalCount.count, folder.id);
    }

    /**
     * Store email in database
     */
    private storeEmail(accountId: string, folderId: string, email: EmailMessage): void {
        const db = getDatabase();

        // Check if email already exists
        const existing = db.prepare(`
            SELECT id FROM emails WHERE account_id = ? AND imap_uid = ? AND folder_id = ?
        `).get(accountId, email.uid.toString(), folderId) as { id: string } | undefined;

        const emailId = existing?.id || uuidv4();
        const isRead = email.flags.includes('\\Seen') ? 1 : 0;

        // Extract snippet from plain text (first 200 chars)
        const snippet = email.textPlain
            ? email.textPlain.substring(0, 200).replace(/\s+/g, ' ').trim()
            : '';

        if (existing) {
            // Update existing email
            db.prepare(`
                UPDATE emails SET
                    is_read = ?,
                    is_starred = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(
                isRead,
                email.flags.includes('\\Flagged') ? 1 : 0,
                emailId
            );
        } else {
            // Insert new email
            db.prepare(`
                INSERT INTO emails (
                    id, account_id, folder_id, imap_uid, message_id,
                    from_address, from_name, to_addresses, cc_addresses, bcc_addresses,
                    subject, date, body_text, body_html, body_snippet,
                    is_read, is_starred, has_attachments, attachments, size_bytes,
                    synced_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).run(
                emailId,
                accountId,
                folderId,
                email.uid.toString(),
                email.messageId,
                email.from[0]?.address || '',
                email.from[0]?.name || null,
                JSON.stringify(email.to.map(t => t.address)),
                email.cc ? JSON.stringify(email.cc.map(c => c.address)) : null,
                email.bcc ? JSON.stringify(email.bcc.map(b => b.address)) : null,
                email.subject || '(No Subject)',
                email.date.toISOString(),
                email.textPlain || null,
                email.textHtml || null,
                snippet,
                isRead,
                email.flags.includes('\\Flagged') ? 1 : 0,
                email.hasAttachments ? 1 : 0,
                email.attachments.length > 0 ? JSON.stringify(email.attachments) : null,
                email.size
            );

            // Add to FTS index
            if (email.textPlain || email.subject) {
                db.prepare(`
                    INSERT INTO emails_fts (email_id, subject, from_name, body_text)
                    VALUES (?, ?, ?, ?)
                `).run(
                    emailId,
                    email.subject || '',
                    email.from[0]?.name || '',
                    email.textPlain || ''
                );
            }
        }
    }

    /**
     * Start auto-sync for an account
     */
    startAutoSync(accountId: string, intervalMinutes: number = 5): void {
        // Stop existing interval if any
        this.stopAutoSync(accountId);

        const intervalMs = intervalMinutes * 60 * 1000;

        const interval = setInterval(async () => {
            console.log(`⏰ [EmailSync] Auto-sync triggered for account ${accountId}`);
            await this.syncAccount(accountId);
        }, intervalMs);

        this.syncIntervals.set(accountId, interval);
        console.log(`✅ [EmailSync] Auto-sync started for account ${accountId} (every ${intervalMinutes} min)`);
    }

    /**
     * Stop auto-sync for an account
     */
    stopAutoSync(accountId: string): void {
        const interval = this.syncIntervals.get(accountId);
        if (interval) {
            clearInterval(interval);
            this.syncIntervals.delete(accountId);
            console.log(`✅ [EmailSync] Auto-sync stopped for account ${accountId}`);
        }
    }

    /**
     * Start auto-sync for all enabled accounts
     */
    async startAllAutoSync(): Promise<void> {
        const db = getDatabase();

        const accounts = db.prepare(`
            SELECT id, sync_frequency FROM email_accounts
            WHERE enabled = 1 AND sync_enabled = 1
        `).all() as { id: string; sync_frequency: number }[];

        for (const account of accounts) {
            this.startAutoSync(account.id, account.sync_frequency || 5);
        }

        console.log(`✅ [EmailSync] Auto-sync started for ${accounts.length} accounts`);
    }

    /**
     * Stop all auto-sync
     */
    stopAllAutoSync(): void {
        for (const accountId of this.syncIntervals.keys()) {
            this.stopAutoSync(accountId);
        }
        console.log('✅ [EmailSync] All auto-sync stopped');
    }
}

// Export singleton instance
export const emailSyncService = new EmailSyncService();
