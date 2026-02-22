/**
 * Encryption System
 * Secure credential encryption and key management
 */

export * from './types.js';
export * from './crypto-utils.js';
export * from './key-manager.js';
export * from './credential-vault.js';

import { getKeyManager, KeyManager } from './key-manager.js';
import { getCredentialVault, CredentialVault } from './credential-vault.js';
import type { EncryptionConfig, EncryptionStats } from './types.js';

let initialized = false;

/**
 * Initialize the encryption system
 */
export async function initializeEncryption(config?: Partial<EncryptionConfig>): Promise<{
  keyManager: KeyManager;
  vault: CredentialVault;
}> {
  const keyManager = getKeyManager(config);
  await keyManager.initialize();

  const vault = getCredentialVault();
  await vault.initialize();

  initialized = true;
  console.log('[Encryption] System initialized');

  return { keyManager, vault };
}

/**
 * Get encryption system status
 */
export function getEncryptionStatus(): {
  initialized: boolean;
  keyStats: EncryptionStats;
  vaultStats: ReturnType<CredentialVault['getStats']> | null;
} {
  const keyManager = getKeyManager();
  const vault = getCredentialVault();

  return {
    initialized,
    keyStats: keyManager.getStats(),
    vaultStats: initialized ? vault.getStats() : null,
  };
}

/**
 * Shutdown encryption system
 */
export function shutdownEncryption(): void {
  const vault = getCredentialVault();
  vault.close();

  const keyManager = getKeyManager();
  keyManager.close();

  initialized = false;
  console.log('[Encryption] System shutdown');
}
