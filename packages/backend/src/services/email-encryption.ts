/**
 * Email Account Encryption Service
 *
 * Encrypts and decrypts IMAP/SMTP credentials and OAuth tokens
 * Uses AES-256-GCM encryption (same as existing credentials system)
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Get encryption key from environment variable
const getEncryptionKey = (): Buffer => {
    const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-encryption-key-change-in-production';
    return crypto.pbkdf2Sync(secret, 'email-salt', 100000, KEY_LENGTH, 'sha256');
};

export interface EncryptedData {
    encrypted: string;
    iv: string;
    tag: string;
}

/**
 * Encrypt sensitive data (passwords, tokens)
 */
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Return format: iv:tag:encrypted
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data (passwords, tokens)
 */
export function decrypt(ciphertext: string): string {
    try {
        const key = getEncryptionKey();
        const parts = ciphertext.split(':');

        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const tag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('❌ [EmailEncryption] Decryption failed:', error);
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Encrypt account credentials for storage
 */
export interface AccountCredentials {
    imapPassword: string;
    smtpPassword: string;
    oauthAccessToken?: string;
    oauthRefreshToken?: string;
}

export function encryptAccountCredentials(credentials: AccountCredentials): {
    imapPassEncrypted: string;
    smtpPassEncrypted: string;
    oauthAccessToken?: string;
    oauthRefreshToken?: string;
} {
    return {
        imapPassEncrypted: encrypt(credentials.imapPassword),
        smtpPassEncrypted: encrypt(credentials.smtpPassword),
        oauthAccessToken: credentials.oauthAccessToken ? encrypt(credentials.oauthAccessToken) : undefined,
        oauthRefreshToken: credentials.oauthRefreshToken ? encrypt(credentials.oauthRefreshToken) : undefined,
    };
}

/**
 * Decrypt account credentials from storage
 */
export function decryptAccountCredentials(encrypted: {
    imap_pass_encrypted: string;
    smtp_pass_encrypted: string;
    oauth_access_token?: string | null;
    oauth_refresh_token?: string | null;
}): AccountCredentials {
    return {
        imapPassword: decrypt(encrypted.imap_pass_encrypted),
        smtpPassword: decrypt(encrypted.smtp_pass_encrypted),
        oauthAccessToken: encrypted.oauth_access_token ? decrypt(encrypted.oauth_access_token) : undefined,
        oauthRefreshToken: encrypted.oauth_refresh_token ? decrypt(encrypted.oauth_refresh_token) : undefined,
    };
}
