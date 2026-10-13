/**
 * Encryption Utilities for API Keys
 *
 * Uses AES-256-GCM for strong encryption
 */

import crypto from 'node:crypto';
import { maskSecret, SECRET_PLACEHOLDER } from '../credentials/secret-mask.js';

// Master encryption key (generated on first run)
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get or create master encryption key
 * Stored in environment or generated
 */
function getMasterKey(): Buffer {
  // Try to get from environment first
  let keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex) {
    // Generate new key
    const key = crypto.randomBytes(KEY_LENGTH);
    keyHex = key.toString('hex');

    // SECURITY (S0-Q.4): never print the generated key to stdout/logs.
    console.warn('⚠️  [Encryption] No ENCRYPTION_KEY set — using a temporary random key for this session.');
    console.warn('⚠️  [Encryption] Values encrypted now cannot be decrypted after a restart. Set ENCRYPTION_KEY in .env (64 hex chars, e.g. from `openssl rand -hex 32`).');

    return key;
  }

  return Buffer.from(keyHex, 'hex');
}

const MASTER_KEY = getMasterKey();

/**
 * Encrypt sensitive data (API keys)
 */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data (API keys)
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Mask API key for display (show first/last 4 chars)
 */
export function maskApiKey(apiKey: string): string {
  // Only the last 4 characters may be shown (S0-Q.4)
  return maskSecret(apiKey) || SECRET_PLACEHOLDER;
}

/**
 * Check if string is encrypted (our format)
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  return parts.length === 3 && /^[0-9a-f]+$/i.test(parts.join(''));
}
