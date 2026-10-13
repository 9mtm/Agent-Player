/**
 * Credentials API Routes
 *
 * RESTful endpoints for credential management
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { authorizeActiveRole, OWNER_OR_ADMIN } from '../../auth/route-guards.js';
import { getDatabase } from '../../db/index.js';
import { handleError, handleValidationError } from '../error-handler.js';
import { getCredentialManager } from '../../credentials/manager.js';
import { getCredentialStorage } from '../../credentials/storage.js';
import { CredentialType } from '../../credentials/types.js';
import { maskSecret } from '../../credentials/secret-mask.js';
import { logAudit, type AuditEventType } from '../../services/audit-logger.js';
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
 */
interface Caller { id: string; role: string }

function callerOf(request: FastifyRequest): Caller {
  return (request as any).credentialsCaller as Caller;
}

function inScope(caller: Caller, ownerId: string | null | undefined): boolean {
  if (caller.role === 'owner') return true;
  return !!ownerId && ownerId === caller.id;
}

/**
 * Fields a backup (export/import) may carry. Built from this allowlist only,
 * never by spreading a stored record.
 */
const BACKUP_FIELDS = [
  'id', 'name', 'type', 'encryptedValue', 'iv', 'authTag', 'description', 'skillId',
  'userId', 'refreshToken', 'expiresAt', 'scopes', 'createdAt', 'updatedAt', 'lastUsed',
] as const;

function pickBackupFields(source: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of BACKUP_FIELDS) if (source[key] !== undefined) out[key] = source[key];
  return out;
}

/**
 * Credentials whose ciphertext the caller may export or overwrite: their own,
 * plus unowned system credentials for the owner. Other users' credentials are
 * visible to the owner as masked metadata only (S0-Q.16).
 */
function isBackupScope(caller: Caller, ownerId: string | null | undefined): boolean {
  if (ownerId) return ownerId === caller.id;
  return caller.role === 'owner';
}

/** True when the credential belongs to a user other than the caller. */
function isOtherUsers(caller: Caller, ownerId: string | null | undefined): boolean {
  return !!ownerId && ownerId !== caller.id;
}

/**
 * Audit the owner's access to other users' credentials (S0-Q.16).
 * Only ids and owner user ids are logged, never names or values.
 */
function auditCrossUser(
  request: FastifyRequest,
  event: Extract<AuditEventType, `data.${string}`>,
  action: string,
  credentials: Array<{ id: string; userId?: string | null }>
): void {
  const caller = callerOf(request);
  const others = credentials.filter(c => isOtherUsers(caller, c.userId));
  if (others.length === 0) return;
  logAudit({
    event_type: event,
    event_category: event === 'data.read' || event === 'data.export' ? 'data_access' : 'data_modification',
    severity: event === 'data.delete' ? 'warning' : 'info',
    user_id: caller.id,
    ip_address: request.ip,
    user_agent: request.headers['user-agent'],
    request_method: request.method,
    request_path: request.routeOptions?.url ?? undefined,
    resource_type: 'credential',
    resource_id: others.length === 1 ? others[0].id : undefined,
    action: `credentials.${action}.other_user`,
    success: true,
    metadata: {
      count: others.length,
      credentialIds: others.map(c => c.id),
      ownerUserIds: [...new Set(others.map(c => c.userId))],
    },
  });
}

export async function credentialsRoutes(fastify: FastifyInstance) {
  const manager = getCredentialManager();
  const storage = getCredentialStorage();

  // Initialize storage
  await storage.initialize();

  // Encapsulated to this plugin: applies to the credential routes only.
  fastify.addHook('preHandler', async (request, reply) => {
    const userId = authorizeActiveRole(request, reply, OWNER_OR_ADMIN);
    if (userId === null) return reply;
    const row = getDatabase().prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string } | undefined;
    (request as any).credentialsCaller = { id: userId, role: row?.role ?? '' } satisfies Caller;
  });

  /** Load a credential only if the caller may see it. */
  const getScoped = async (request: FastifyRequest, id: string) => {
    const credential = await manager.get(id);
    return credential && inScope(callerOf(request), credential.userId) ? credential : null;
  };

  /** Credentials visible to the caller: their own; every credential for the owner. */
  const listScoped = async (caller: Caller) => {
    if (caller.role !== 'owner') return manager.list(caller.id);
    return storage.getAll();
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
    const caller = callerOf(request);

    let credentials;

    if (skillId) {
      credentials = (await manager.listBySkill(skillId)).filter(c => inScope(caller, c.userId));
    } else {
      credentials = await listScoped(caller);
    }
    auditCrossUser(request, 'data.read', 'list', credentials);

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

      const credential = await getScoped(request, id);

      if (!credential) {
        return reply.code(404).send({ error: 'Credential not found' });
      }
      auditCrossUser(request, 'data.read', 'get', [credential]);

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
      // The owner is always the caller; a body `userId` is ignored (S0-Q.14).
      const credential = await manager.create({ ...body, userId: callerOf(request).id });

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

      const existing = await getScoped(request, id);
      if (!existing) {
        return reply.code(404).send({ error: 'Credential not found' });
      }

      try {
        await manager.update(id, updates);
        auditCrossUser(request, 'data.update', 'update', [existing]);
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

      const existing = await getScoped(request, id);
      if (!existing) {
        return reply.code(404).send({ error: 'Credential not found' });
      }

      try {
        await manager.delete(id);
        auditCrossUser(request, 'data.delete', 'delete', [existing]);

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

      const existing = await getScoped(request, id);
      if (!existing) {
        return reply.code(404).send({ error: 'Credential not found' });
      }
      auditCrossUser(request, 'data.read', 'value_masked', [existing]);

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

      const existing = await getScoped(request, id);
      if (!existing) {
        return reply.code(404).send({ error: 'Credential not found' });
      }
      auditCrossUser(request, 'data.read', 'test', [existing]);

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
    // A body `userId` is ignored (S0-Q.14). Only the caller's own credentials
    // (plus system ones for the owner) are exported, from an explicit field
    // allowlist; other users' ciphertext / refresh tokens never leave the server.
    const caller = callerOf(request);
    const credentials = (await listScoped(caller))
      .filter(c => isBackupScope(caller, c.userId))
      .map(c => pickBackupFields(c as any));

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

    // S0-Q.14/16: imported credentials land in the caller's backup scope: the
    // caller's own, or (owner only) unowned system ones. A supplied userId of
    // another user is never accepted. Storage uses INSERT OR REPLACE by id, so
    // an id outside that scope gets a new id instead of overwriting someone
    // else's credential.
    const caller = callerOf(request);
    const prepared: any[] = [];
    for (const raw of credentials) {
      if (!raw || typeof raw !== 'object') continue;
      const c: any = pickBackupFields(raw);
      c.userId = caller.role === 'owner' && !c.userId ? undefined : caller.id;
      const existing = typeof c.id === 'string' && c.id ? await manager.get(c.id) : null;
      if (!c.id || typeof c.id !== 'string' || (existing && !isBackupScope(caller, existing.userId))
        || (existing && (existing.userId || undefined) !== c.userId)) c.id = randomUUID();
      for (const key of ['createdAt', 'updatedAt', 'expiresAt', 'lastUsed']) {
        if (typeof c[key] === 'string') c[key] = new Date(c[key]);
      }
      if (!(c.createdAt instanceof Date)) c.createdAt = new Date();
      if (!(c.updatedAt instanceof Date)) c.updatedAt = new Date();
      prepared.push(c);
    }

    const imported = await manager.import(prepared);

    return {
      success: true,
      imported,
      total: credentials.length
    };
  });

  console.log('[Credentials API] ✅ Routes registered');
}
