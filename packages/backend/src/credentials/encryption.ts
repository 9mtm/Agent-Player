/**
 * Encryption Service
 *
 * Handles encryption/decryption of sensitive credentials
 * Uses AES-256-GCM for authenticated encryption
 */

import crypto from 'crypto';
import type { IEncryptionService } from './types.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

export class EncryptionService implements IEncryptionService {
  private masterKey: Buffer;

  constructor(masterKeyHex?: string) {
    if (masterKeyHex) {
      this.masterKey = Buffer.from(masterKeyHex, 'hex');
    } else {
      // Generate a new key if none provided
      this.masterKey = crypto.randomBytes(KEY_LENGTH);
      console.warn('⚠️  [Encryption] No ENCRYPTION_KEY found!');
      console.warn('⚠️  [Encryption] Generated new key. Add this to your .env:');
      console.warn(`ENCRYPTION_KEY=${this.masterKey.toString('hex')}`);
      console.warn('⚠️  [Encryption] Using temporary key for this session.\n');
    }

    // Validate key length
    if (this.masterKey.length !== KEY_LENGTH) {
      throw new Error('Invalid encryption key length. Must be 32 bytes (64 hex chars)');
    }
  }

  /**
   * Encrypt plaintext using AES-256-GCM
   */
  async encrypt(plaintext: string): Promise<{
    encrypted: string;
    iv: string;
    authTag: string;
  }> {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);

      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (err) {
      console.error('[Encryption] Failed to encrypt:', err);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt ciphertext using AES-256-GCM
   */
  async decrypt(encrypted: string, iv: string, authTag: string): Promise<string> {
    try {
      // Create decipher
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        this.masterKey,
        Buffer.from(iv, 'hex')
      );

      // Set authentication tag
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (err) {
      console.error('[Encryption] Failed to decrypt:', err);
      throw new Error('Decryption failed - data may be corrupted or tampered with');
    }
  }

  /**
   * Hash a value using SHA-256
   */
  hash(value: string): string {
    return crypto
      .createHash('sha256')
      .update(value)
      .digest('hex');
  }

  /**
   * Generate a secure random token
   */
  generateToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Get the master key (for backup purposes)
   */
  getMasterKeyHex(): string {
    return this.masterKey.toString('hex');
  }
}

// Singleton instance
let encryptionService: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!encryptionService) {
    const key = process.env.ENCRYPTION_KEY;
    encryptionService = new EncryptionService(key);
  }
  return encryptionService;
}
