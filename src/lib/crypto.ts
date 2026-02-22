import crypto from 'crypto';

// Use a secure key in production! Default for dev only.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'agent-player-dev-secret-key-32chars';
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-gcm';

// Ensure key is 32 bytes
const getKey = () => {
    return crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
};

export function encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return {
        encrypted,
        iv: iv.toString('hex'),
        authTag,
    };
}

export function decrypt(encrypted: string, ivHex: string, authTagHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
