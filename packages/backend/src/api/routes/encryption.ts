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
import { actorOf } from '../../auth/auth-gate.js';
import { requestAuditActor, requestMeta } from '../../repositories/audit.js';
import type { Actor } from '../../repositories/actor.js';
import { actorOrReply, isOwner, isSystem, requireOwnUser } from '../../repositories/scope.js';
import { handleError } from '../error-handler.js';
import { maskSecret, isMaskedSecret } from '../../credentials/secret-mask.js';

type VaultPrincipal = { type: 'user' | 'agent' | 'system'; id: string };

/**
 * B1.8: the vault owner/requester of a request is its actor, never body ids.
 * A user account owns as itself, an agent run as its agent, system as system.
 */
function vaultPrincipalOf(actor: Actor): VaultPrincipal {
  if (actor.kind === 'agent') return { type: 'agent', id: actor.agentId ?? 'unknown' };
  if (actor.kind === 'system') return { type: 'system', id: 'system' };
  return { type: 'user', id: actor.userId ?? 'unknown' };
}

/** The owner (and system) reach every vault entry; anyone else only their own. */
function canUseVaultEntry(actor: Actor, entry: { ownerId: string; ownerType: string }): boolean {
  if (isSystem(actor) || isOwner(actor)) return true;
  const me = vaultPrincipalOf(actor);
  return entry.ownerType === me.type && entry.ownerId === me.id;
}

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
        requestAuditActor(actorOf(request), requestMeta(request)),
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
      // B1.8: owner = the request's actor; body ownerId/ownerType are
      // accepted for API compatibility but never trusted.
      const actor = actorOrReply(reply, actorOf(request), requireOwnUser);
      if (!actor) return reply;
      const body = (request.body ?? {}) as Partial<CredentialInput>;
      const vault = getCredentialVault();

      if (!body.name || !body.type || !body.data) {
        return reply.status(400).send({
          error: 'Missing required fields: name, type, data',
        });
      }

      const owner = vaultPrincipalOf(actor);
      const credential = await vault.store({
        ...(body as CredentialInput),
        ownerId: owner.id,
        ownerType: owner.type,
      });

      // Audit log
      const audit = getAuditLogger();
      audit.logAccess(
        'write',
        requestAuditActor(actor, requestMeta(request)),
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
   * Retrieve a credential. SECURITY (S0-Q.4): every data field is returned
   * masked ("••••abcd"); the decrypted secret stays inside the backend.
   */
  fastify.post('/api/vault/credentials/:id/retrieve', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      // B1.8: requester = the request's actor; body requesterId/requesterType
      // are accepted for API compatibility but never trusted.
      const actor = actorOrReply(reply, actorOf(request), requireOwnUser);
      if (!actor) return reply;
      const vault = getCredentialVault();

      // An entry outside the actor's scope looks like a missing one.
      const entry = vault.getById(id);
      if (!entry || !canUseVaultEntry(actor, entry)) {
        return reply.status(404).send({ error: 'Credential not found' });
      }

      const result = await vault.retrieve(id);
      if (!result) {
        return reply.status(404).send({ error: 'Credential not found' });
      }

      // Audit log
      const audit = getAuditLogger();
      audit.logAccess(
        'read',
        requestAuditActor(actor, requestMeta(request)),
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
        data: Object.fromEntries(
          Object.entries(result.data || {}).map(([k, v]) => [k, maskSecret(v)])
        ),
        masked: true,
      };
    } catch (error: any) {
      // Audit failed access
      const audit = getAuditLogger();
      audit.logAccess(
        'read',
        requestAuditActor(actorOf(request), requestMeta(request)),
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

      // A masked field echoed back by a client keeps the stored value
      if (body.data && typeof body.data === 'object') {
        const maskedKeys = Object.keys(body.data).filter((k) => isMaskedSecret((body.data as any)[k]));
        if (maskedKeys.length > 0) {
          const current = await vault.retrieve(id);
          const data: Record<string, unknown> = { ...(body.data as Record<string, unknown>) };
          for (const k of maskedKeys) {
            if (current && current.data[k] !== undefined) data[k] = current.data[k];
            else delete data[k];
          }
          body.data = data as any;
        }
      }

      const credential = await vault.update(id, body);

      // Audit log
      const audit = getAuditLogger();
      audit.logAccess(
        'write',
        requestAuditActor(actorOf(request), requestMeta(request)),
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
        requestAuditActor(actorOf(request), requestMeta(request)),
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
        requestAuditActor(actorOf(request), requestMeta(request)),
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
