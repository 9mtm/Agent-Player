/**
 * Encryption System Types
 * Secure credential and data encryption
 */

/** Encryption algorithms supported */
export type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';

/** Key derivation functions */
export type KeyDerivation = 'pbkdf2' | 'scrypt' | 'argon2';

/** Encrypted data format */
export interface EncryptedData {
  /** Encryption algorithm used */
  algorithm: EncryptionAlgorithm;
  /** Initialization vector (base64) */
  iv: string;
  /** Encrypted content (base64) */
  ciphertext: string;
  /** Authentication tag for GCM/Poly1305 (base64) */
  authTag?: string;
  /** Key ID used for encryption */
  keyId: string;
  /** Version for future compatibility */
  version: number;
  /** Timestamp of encryption */
  encryptedAt: string;
}

/** Master key configuration */
export interface MasterKeyConfig {
  /** Key derivation function */
  kdf: KeyDerivation;
  /** Salt for key derivation (base64) */
  salt: string;
  /** Number of iterations (PBKDF2) or cost factor */
  iterations: number;
  /** Key length in bytes */
  keyLength: number;
  /** Memory cost (for scrypt/argon2) */
  memoryCost?: number;
  /** Parallelism factor */
  parallelism?: number;
}

/** Key entry in keyring */
export interface KeyEntry {
  /** Unique key ID */
  id: string;
  /** Key type */
  type: 'master' | 'data' | 'api' | 'session';
  /** Algorithm this key is used with */
  algorithm: EncryptionAlgorithm;
  /** Encrypted key material (encrypted with master key) */
  encryptedKey?: string;
  /** Key derivation config (for master keys) */
  kdfConfig?: MasterKeyConfig;
  /** Creation timestamp */
  createdAt: Date;
  /** Expiration timestamp */
  expiresAt?: Date;
  /** Last used timestamp */
  lastUsedAt?: Date;
  /** Is this key active */
  active: boolean;
  /** Key metadata */
  metadata?: Record<string, unknown>;
}

/** Credential entry */
export interface EncryptedCredential {
  /** Unique credential ID */
  id: string;
  /** Credential name/label */
  name: string;
  /** Credential type */
  type: CredentialType;
  /** Encrypted credential data */
  data: EncryptedData;
  /** Associated service/provider */
  service?: string;
  /** Owner (user/agent ID) */
  ownerId: string;
  /** Owner type */
  ownerType: 'user' | 'agent' | 'system';
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Last accessed timestamp */
  lastAccessedAt?: Date;
  /** Access count */
  accessCount: number;
  /** Expiration timestamp */
  expiresAt?: Date;
  /** Tags for organization */
  tags?: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/** Types of credentials */
export type CredentialType =
  | 'api_key'
  | 'oauth_token'
  | 'password'
  | 'ssh_key'
  | 'certificate'
  | 'secret'
  | 'connection_string'
  | 'webhook_secret'
  | 'encryption_key'
  | 'other';

/** Encryption configuration */
export interface EncryptionConfig {
  /** Default algorithm */
  algorithm: EncryptionAlgorithm;
  /** Key derivation settings */
  kdf: KeyDerivation;
  /** PBKDF2 iterations */
  pbkdf2Iterations: number;
  /** Scrypt cost */
  scryptCost: number;
  /** Key rotation interval (days) */
  keyRotationDays: number;
  /** Enable automatic key rotation */
  autoRotate: boolean;
  /** Master key source */
  masterKeySource: 'env' | 'file' | 'vault';
  /** Path to master key file (if file source) */
  masterKeyPath?: string;
  /** Environment variable name (if env source) */
  masterKeyEnv?: string;
}

/** Default encryption configuration */
export const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  kdf: 'pbkdf2',
  pbkdf2Iterations: 100000,
  scryptCost: 16384,
  keyRotationDays: 90,
  autoRotate: false,
  masterKeySource: 'env',
  masterKeyEnv: 'MASTER_ENCRYPTION_KEY',
};

/** Encryption statistics */
export interface EncryptionStats {
  /** Total encryptions performed */
  totalEncryptions: number;
  /** Total decryptions performed */
  totalDecryptions: number;
  /** Active keys count */
  activeKeys: number;
  /** Expired keys count */
  expiredKeys: number;
  /** Credentials stored */
  credentialsCount: number;
  /** Last key rotation */
  lastKeyRotation?: Date;
}
