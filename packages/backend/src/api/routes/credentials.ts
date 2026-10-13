/**
 * Credentials API Routes
 *
 * RESTful endpoints for credential management
 */

import type { FastifyInstance } from 'fastify';
import { handleError, handleValidationError } from '../error-handler.js';
import { getCredentialManager } from '../../credentials/manager.js';
import { getCredentialStorage } from '../../credentials/storage.js';
import { CredentialType } from '../../credentials/types.js';
import { maskSecret } from '../../credentials/secret-mask.js';
import type {
  CreateCredentialRequest,
  UpdateCredentialRequest
} from '../../credentials/types.js';

export async function credentialsRoutes(fastify: FastifyInstance) {
  const manager = getCredentialManager();
  const storage = getCredentialStorage();

  // Initialize storage
  await storage.initialize();

  /**
   * GET /api/credentials - List all credentials
   * Pass ?decrypt=true to include a masked hint of each value ("••••abcd").
   * SECURITY (S0-Q.4): full secret values are never returned by the API.
   */
  fastify.get('/api/credentials', async (request, reply) => {
    const { userId, skillId, decrypt } = request.query as {
      userId?: string;
      skillId?: string;
      decrypt?: string;
    };

    const wantDecrypt = decrypt === 'true';

    let credentials;

    if (skillId) {
      credentials = await manager.listBySkill(skillId);
    } else {
      credentials = await manager.list(userId);
    }

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
          base.value = maskSecret(await manager.getValue(c.id));
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

      const credential = await manager.get(id);

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
          safe.value = maskSecret(await manager.getValue(id));
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
      const credential = await manager.create(body);

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

      try {
        await manager.update(id, updates);
        const updated = await manager.get(id);

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

      try {
        await manager.delete(id);

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

      try {
        const value = await manager.getValue(id);

        return {
          success: true,
          value: maskSecret(value),
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

      const valid = await manager.test(id);

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
    const { userId } = request.body as { password?: string; userId?: string };

    const credentials = await manager.export(userId);

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

    const imported = await manager.import(credentials);

    return {
      success: true,
      imported,
      total: credentials.length
    };
  });

  console.log('[Credentials API] ✅ Routes registered');
}
