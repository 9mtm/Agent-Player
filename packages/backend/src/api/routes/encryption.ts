/**
 * Encryption API Routes
 * Endpoints for credential vault and key management
 */

import type { FastifyInstance } from 'fastify';
import {
  getKeyManager,
  getCredentialVault,
  getEncryptionStatus,
  type CredentialInput,
  type CredentialQuery,
} from '../../encryption/index.js';
import { getAuditLogger } from '../../audit/index.js';
import { handleError } from '../error-handler.js';

export async function encryptionRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/encryption/status
   * Get encryption system status
   */
  fastify.get('/api/encryption/status', async (request, reply) => {
    try {
      const status = getEncryptionStatus();
      return status;
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Encryption] Get status failed');
    }
  });

  /**
   * GET /api/encryption/keys
   * List encryption keys
   */
  fastify.get('/api/encryption/keys', async (request, reply) => {
    try {
      const query = request.query as { type?: string };
      const keyManager = getKeyManager();
      const keys = keyManager.listKeys(query.type);

      // Don't return encrypted key material
      const safeKeys = keys.map((k) => ({
        id: k.id,
        type: k.type,
        algorithm: k.algorithm,
        createdAt: k.createdAt,
        expiresAt: k.expiresAt,
        lastUsedAt: k.lastUsedAt,
        active: k.active,
      }));

      return {
        keys: safeKeys,
        count: safeKeys.length,
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Encryption] List keys failed');
    }
  });

  /**
   * POST /api/encryption/keys/rotate
   * Rotate encryption keys
   */
  fastify.post('/api/encryption/keys/rotate', async (request, reply) => {
    try {
      const keyManager = getKeyManager();
      const newKey = await keyManager.rotateKeys();

      // Audit log
      const audit = getAuditLogger();
      audit.logConfigChange(
        { type: 'api', id: 'admin' },
        { type: 'config', id: 'encryption-keys', name: 'Encryption Keys' },
        { after: { action: 'rotate', newKeyId: newKey.id } }
      );

      return {
        success: true,
        newKey: {
          id: newKey.id,
          algorithm: newKey.algorithm,
          createdAt: newKey.createdAt,
          expiresAt: newKey.expiresAt,
        },
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Encryption] Rotate keys failed');
    }
  });

  /**
   * GET /api/encryption/keys/stats
   * Get key management statistics
   */
  fastify.get('/api/encryption/keys/stats', async (request, reply) => {
    try {
      const keyManager = getKeyManager();
      return keyManager.getStats();
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Encryption] Get key stats failed');
    }
  });

  // ============ Credential Vault Routes ============

  /**
   * GET /api/vault/credentials
   * Query credentials (metadata only, not decrypted)
   */
  fastify.get('/api/vault/credentials', async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const vault = getCredentialVault();

      const filters: CredentialQuery = {
        limit: query.limit ? parseInt(query.limit) : 50,
        offset: query.offset ? parseInt(query.offset) : 0,
        includeExpired: query.includeExpired === 'true',
      };

      if (query.ownerId) filters.ownerId = query.ownerId;
      if (query.ownerType) filters.ownerType = query.ownerType as any;
      if (query.type) filters.type = query.type.split(',') as any;
      if (query.service) filters.service = query.service;
      if (query.tags) filters.tags = query.tags.split(',');
      if (query.search) filters.search = query.search;

      const credentials = vault.query(filters);

      // Return metadata only (no encrypted data)
      const safeCredentials = credentials.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        service: c.service,
        ownerId: c.ownerId,
        ownerType: c.ownerType,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        lastAccessedAt: c.lastAccessedAt,
        accessCount: c.accessCount,
        expiresAt: c.expiresAt,
        tags: c.tags,
      }));

      return {
        credentials: safeCredentials,
        count: safeCredentials.length,
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Encryption] Query credentials failed');
    }
  });

  /**
   * POST /api/vault/credentials
   * Store a new credential
   */
  fastify.post('/api/vault/credentials', async (request, reply) => {
    try {
      const body = request.body as CredentialInput;
      const vault = getCredentialVault();

      if (!body.name || !body.type || !body.data || !body.ownerId || !body.ownerType) {
        return reply.status(400).send({
          error: 'Missing required fields: name, type, data, ownerId, ownerType',
        });
      }

      const credential = await vault.store(body);

      // Audit log
      const audit = getAuditLogger();
      audit.logAccess(
        'write',
        { type: body.ownerType, id: body.ownerId },
        { type: 'credential', id: credential.id, name: body.name },
        'success',
        { credentialType: body.type, service: body.service }
      );

      return {
        success: true,
        credential: {
          id: credential.id,
          name: credential.name,
          type: credential.type,
          service: credential.service,
          createdAt: credential.createdAt,
        },
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Encryption] Store credential failed');
    }
  });

  /**
   * GET /api/vault/credentials/:id
   * Get credential metadata (not decrypted)
   */
  fastify.get('/api/vault/credentials/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const vault = getCredentialVault();

      const credential = vault.getById(id);
      if (!credential) {
        return reply.status(404).send({ error: 'Credential not found' });
      }

      return {
        id: credential.id,
        name: credential.name,
        type: credential.type,
        service: credential.service,
        ownerId: credential.ownerId,
        ownerType: credential.ownerType,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt,
        lastAccessedAt: credential.lastAccessedAt,
        accessCount: credential.accessCount,
        expiresAt: credential.expiresAt,
        tags: credential.tags,
        metadata: credential.metadata,
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Encryption] Get credential failed');
    }
  });

  /**
   * POST /api/vault/credentials/:id/retrieve
   * Retrieve and decrypt a credential
   */
  fastify.post('/api/vault/credentials/:id/retrieve', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as { requesterId: string; requesterType: 'user' | 'agent' | 'system' };
      const vault = getCredentialVault();

      if (!body.requesterId || !body.requesterType) {
        return reply.status(400).send({
          error: 'Missing required fields: requesterId, requesterType',
        });
      }

      const result = await vault.retrieve(id);
      if (!result) {
        return reply.status(404).send({ error: 'Credential not found' });
      }

      // Audit log
      const audit = getAuditLogger();
      audit.logAccess(
        'read',
        { type: body.requesterType, id: body.requesterId },
        { type: 'credential', id: result.credential.id, name: result.credential.name },
        'success',
        { credentialType: result.credential.type }
      );

      return {
        credential: {
          id: result.credential.id,
          name: result.credential.name,
          type: result.credential.type,
          service: result.credential.service,
        },
        data: result.data,
      };
    } catch (error: any) {
      // Audit failed access
      const audit = getAuditLogger();
      const body = request.body as any;
      audit.logAccess(
        'read',
        { type: body?.requesterType || 'unknown', id: body?.requesterId || 'unknown' },
        { type: 'credential', id: (request.params as any).id },
        'failure',
        { error: error instanceof Error ? error.message : String(error) }
      );

      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Encryption] Retrieve credential failed');
    }
  });

  /**
   * PUT /api/vault/credentials/:id
   * Update a credential
   */
  fastify.put('/api/vault/credentials/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as Partial<CredentialInput>;
      const vault = getCredentialVault();

      const credential = await vault.update(id, body);

      // Audit log
      const audit = getAuditLogger();
      audit.logAccess(
        'write',
        { type: 'api', id: 'admin' },
        { type: 'credential', id: credential.id, name: credential.name },
        'success',
        { action: 'update' }
      );

      return {
        success: true,
        credential: {
          id: credential.id,
          name: credential.name,
          type: credential.type,
          updatedAt: credential.updatedAt,
        },
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Encryption] Update credential failed');
    }
  });

  /**
   * DELETE /api/vault/credentials/:id
   * Delete a credential
   */
  fastify.delete('/api/vault/credentials/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const vault = getCredentialVault();

      // Get credential info before deletion for audit
      const credential = vault.getById(id);

      const deleted = vault.delete(id);
      if (!deleted) {
        return reply.status(404).send({ error: 'Credential not found' });
      }

      // Audit log
      const audit = getAuditLogger();
      audit.logAccess(
        'delete',
        { type: 'api', id: 'admin' },
        { type: 'credential', id, name: credential?.name },
        'success'
      );

      return { success: true, id };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Encryption] Delete credential failed');
    }
  });

  /**
   * POST /api/vault/reencrypt
   * Re-encrypt all credentials with current key
   */
  fastify.post('/api/vault/reencrypt', async (request, reply) => {
    try {
      const vault = getCredentialVault();
      const count = await vault.reEncryptAll();

      // Audit log
      const audit = getAuditLogger();
      audit.logConfigChange(
        { type: 'api', id: 'admin' },
        { type: 'config', id: 'vault', name: 'Credential Vault' },
        { after: { action: 'reencrypt', credentialsUpdated: count } }
      );

      return {
        success: true,
        credentialsReEncrypted: count,
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Encryption] Re-encrypt credentials failed');
    }
  });

  /**
   * GET /api/vault/stats
   * Get vault statistics
   */
  fastify.get('/api/vault/stats', async (request, reply) => {
    try {
      const vault = getCredentialVault();
      return vault.getStats();
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Encryption] Get vault stats failed');
    }
  });
}
