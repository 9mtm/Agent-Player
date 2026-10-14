/**
 * Credentials API Routes
 *
 * RESTful endpoints for credential management
 */

import { actorOf } from '../../auth/auth-gate.js';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { authorizeActiveRole, OWNER_OR_ADMIN } from '../../auth/route-guards.js';
import { handleError } from '../error-handler.js';
import { getCredentialStorage } from '../../credentials/storage.js';
import { CredentialType } from '../../credentials/types.js';
import { repositories } from '../../repositories/index.js';
import { requestMeta, type RequestMeta } from '../../repositories/audit.js';
import { ScopeError, sendScopeError } from '../../repositories/scope.js';
import type {
  CreateCredentialRequest,
  UpdateCredentialRequest
} from '../../credentials/types.js';

/**
 * SECURITY (S0-Q.14): every /api/credentials* route needs an active owner or
 * admin (bearer token). The user always comes from the token, never from the
 * query or body. Scope: an admin sees and manages only the credentials they
 * own. The owner (S0-Q.16, Mohamed's Q-8 answer) sees and manages every
 * credential: their own, unowned system-wide ones (user_id NULL, e.g. agent API
 * keys) and other users'. Values are always masked, and every access by the
 * owner to another user's credential is written to the audit log. Out-of-scope
 * credentials answer 404.
 *
 * B1-core: these rules (and the cross-user audit) live in the credentials
 * repository (repositories/credentials.ts); routes pass the request's actor.
 */
export async function credentialsRoutes(fastify: FastifyInstance) {
  const storage = getCredentialStorage();
  const credentialsRepo = repositories.credentials;

  // Initialize storage
  await storage.initialize();

  // Encapsulated to this plugin: applies to the credential routes only.
  // Defence in depth in front of the repository's own owner/admin rule.
  fastify.addHook('preHandler', async (request, reply) => {
    const userId = authorizeActiveRole(request, reply, OWNER_OR_ADMIN);
    if (userId === null) return reply;
  });

  /** A credential in the actor's scope, or null (404 for the caller). */
  const getScoped = async (request: FastifyRequest, id: string, meta: RequestMeta, auditAs?: string | null) => {
    try {
      return await credentialsRepo.get(actorOf(request), id, meta, auditAs);
    } catch (err) {
      if (err instanceof ScopeError && err.status === 404) return null;
      throw err;
    }
  };

  /**
   * GET /api/credentials - List all credentials
   * Pass ?decrypt=true to include a masked hint of each value ("••••abcd").
   * SECURITY (S0-Q.4): full secret values are never returned by the API.
   */
  fastify.get('/api/credentials', async (request, reply) => {
    // `userId` in the query is ignored (S0-Q.14): the scope comes from the token.
    const { skillId, decrypt } = request.query as {
      skillId?: string;
      decrypt?: string;
    };

    const wantDecrypt = decrypt === 'true';

    let credentials;
    try {
      credentials = await credentialsRepo.list(actorOf(request), { skillId }, requestMeta(request));
    } catch (err) { return sendScopeError(reply, err); }

    // Remove sensitive data from response (unless decrypt=true)
    const safe = await Promise.all(credentials.map(async c => {
      const base: Record<string, any> = {
        id: c.id,
        name: c.name,
        type: c.type,
        description: c.description,
        skillId: c.skillId,
        userId: c.userId,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        lastUsed: c.lastUsed
      };

      // Include a masked hint of the value if requested (never the full secret)
      if (wantDecrypt) {
        try {
          base.value = await credentialsRepo.maskedValue(actorOf(request), c.id);
          base.masked = true;
        } catch {
          base.value = null;
        }
      }

      return base;
    }));

    return {
      success: true,
      count: safe.length,
      credentials: safe
    };
  });

  /**
   * GET /api/credentials/:id - Get a specific credential
   * Pass ?decrypt=true to include a masked hint of the value ("••••abcd")
   */
  fastify.get<{ Params: { id: string }; Querystring: { decrypt?: string } }>(
    '/api/credentials/:id',
    async (request, reply) => {
      const { id } = request.params;
      const wantDecrypt = request.query.decrypt === 'true';

      const credential = await getScoped(request, id, requestMeta(request));

      if (!credential) {
        return reply.code(404).send({ error: 'Credential not found' });
      }

      const safe: Record<string, any> = {
        id: credential.id,
        name: credential.name,
        type: credential.type,
        description: credential.description,
        skillId: credential.skillId,
        userId: credential.userId,
        expiresAt: credential.expiresAt,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt,
        lastUsed: credential.lastUsed
      };

      // Include a masked hint only when requested (never the full secret)
      if (wantDecrypt) {
        try {
          safe.value = await credentialsRepo.maskedValue(actorOf(request), id);
          safe.masked = true;
        } catch {
          safe.value = null;
        }
      }

      return { success: true, credential: safe };
    }
  );

  /**
   * POST /api/credentials - Create a new credential
   */
  fastify.post('/api/credentials', async (request, reply) => {
    const body = request.body as CreateCredentialRequest;

    if (!body.name || !body.type || !body.value) {
      return reply.code(400).send({
        error: 'name, type, and value are required'
      });
    }

    try {
      // The owner is always the caller; a body `userId` is ignored (S0-Q.14).
      const credential = await credentialsRepo.create(actorOf(request), body);

      return {
        success: true,
        credential: {
          id: credential.id,
          name: credential.name,
          type: credential.type,
          description: credential.description
        }
      };
    } catch (err: any) {
      if (err instanceof ScopeError) return sendScopeError(reply, err);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, err, 'validation', '[Credentials] Create failed');
    }
  });

  /**
   * PUT /api/credentials/:id - Update a credential
   */
  fastify.put<{ Params: { id: string } }>(
    '/api/credentials/:id',
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body as UpdateCredentialRequest;

      const existing = await getScoped(request, id, requestMeta(request), null);
      if (!existing) {
        return reply.code(404).send({ error: 'Credential not found' });
      }

      try {
        const updated = await credentialsRepo.update(actorOf(request), id, updates, requestMeta(request));

        return {
          success: true,
          credential: {
            id: updated!.id,
            name: updated!.name,
            type: updated!.type,
            description: updated!.description
          }
        };
      } catch (err: any) {
        // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
        return handleError(reply, err, 'not_found', '[Credentials] Update failed');
      }
    }
  );

  /**
   * DELETE /api/credentials/:id - Delete a credential
   */
  fastify.delete<{ Params: { id: string } }>(
    '/api/credentials/:id',
    async (request, reply) => {
      const { id } = request.params;

      const existing = await getScoped(request, id, requestMeta(request), null);
      if (!existing) {
        return reply.code(404).send({ error: 'Credential not found' });
      }

      try {
        await credentialsRepo.delete(actorOf(request), id, requestMeta(request));

        return {
          success: true,
          message: 'Credential deleted'
        };
      } catch (err: any) {
        // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
        return handleError(reply, err, 'not_found', '[Credentials] Delete failed');
      }
    }
  );

  /**
   * GET /api/credentials/:id/value - Get a masked hint of the value
   * SECURITY (S0-Q.4): the decrypted secret stays inside the backend; callers
   * that need it (skills, tools, channels) use the credential manager directly.
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/credentials/:id/value',
    async (request, reply) => {
      const { id } = request.params;

      const existing = await getScoped(request, id, requestMeta(request), 'value_masked');
      if (!existing) {
        return reply.code(404).send({ error: 'Credential not found' });
      }

      try {
        const value = await credentialsRepo.maskedValue(actorOf(request), id);

        return {
          success: true,
          value,
          masked: true
        };
      } catch (err: any) {
        // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
        return handleError(reply, err, 'not_found', '[Credentials] Get value failed');
      }
    }
  );

  /**
   * POST /api/credentials/:id/test - Test if credential is valid
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/credentials/:id/test',
    async (request, reply) => {
      const { id } = request.params;

      let valid: boolean;
      try {
        valid = await credentialsRepo.test(actorOf(request), id, requestMeta(request));
      } catch (err) { return sendScopeError(reply, err); }

      return {
        success: true,
        valid
      };
    }
  );

  /**
   * GET /api/credentials/types - Get all credential types
   */
  fastify.get('/api/credentials/types', async (request, reply) => {
    return {
      success: true,
      types: Object.values(CredentialType)
    };
  });

  /**
   * POST /api/credentials/export - Export credentials for backup
   * Accepts { password?: string, userId?: string }
   * Returns { success, data } where data is a base64 JSON string
   */
  fastify.post('/api/credentials/export', async (request, reply) => {
    // A body `userId` is ignored (S0-Q.14). Only the caller's own credentials
    // (plus system ones for the owner) are exported, from an explicit field
    // allowlist; other users' ciphertext / refresh tokens never leave the server.
    let credentials: Record<string, any>[];
    try {
      credentials = await credentialsRepo.exportBackup(actorOf(request));
    } catch (err) { return sendScopeError(reply, err); }

    // Encode as base64 JSON (frontend expects { data: string })
    const data = Buffer.from(JSON.stringify(credentials)).toString('base64');

    return {
      success: true,
      count: credentials.length,
      data
    };
  });

  /**
   * POST /api/credentials/import - Import credentials from backup
   * Accepts { data: string, password?: string } where data is base64 JSON
   */
  fastify.post('/api/credentials/import', async (request, reply) => {
    const { data, credentials: rawCredentials } = request.body as { data?: string; credentials?: any[]; password?: string };

    let credentials: any[];

    if (data) {
      // Decode base64 JSON
      try {
        credentials = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
      } catch {
        return reply.code(400).send({ error: 'Invalid export data format' });
      }
    } else if (rawCredentials && Array.isArray(rawCredentials)) {
      credentials = rawCredentials;
    } else {
      return reply.code(400).send({ error: 'data or credentials array is required' });
    }

    if (!Array.isArray(credentials)) {
      return reply.code(400).send({ error: 'credentials must be an array' });
    }

    // S0-Q.14/16: imported credentials land in the caller's backup scope
    // (repositories/credentials.ts importBackup); another user's id is never
    // accepted or overwritten.
    let imported: number;
    try {
      imported = await credentialsRepo.importBackup(actorOf(request), credentials);
    } catch (err) { return sendScopeError(reply, err); }

    return {
      success: true,
      imported,
      total: credentials.length
    };
  });

  console.log('[Credentials API] ✅ Routes registered');
}
