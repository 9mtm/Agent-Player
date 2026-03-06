import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns: "enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export function encrypt(plaintext, key) {
  if (!plaintext || !key) return plaintext;
  const keyBuf = Buffer.from(key, 'hex');
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGO, keyBuf, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 */
export function decrypt(encrypted, key) {
  if (!encrypted || !key || !isEncrypted(encrypted)) return encrypted;
  const parts = encrypted.slice(PREFIX.length).split(':');
  if (parts.length !== 3) return encrypted;
  const [ivHex, authTagHex, cipherHex] = parts;
  const keyBuf = Buffer.from(key, 'hex');
  const decipher = createDecipheriv(ALGO, keyBuf, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Check if a value is already encrypted.
 */
export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}
