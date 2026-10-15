/**
 * Per-agent memory scope and permission modes API (CORE-PERMS-01,
 * D-AGENT-PERMS). Owner only (auth gate owner tier, route access 'owner',
 * handler role check). Every change is written to the audit log.
 *
 *   GET /api/agents/:id/permissions
 *       -> { agentId, memoryRead, memoryWrite, sharedMemory, modes, version, stored, categories, drawerKinds }
 *          version 0 / stored false = never saved (the defaults are shown).
 *   PUT /api/agents/:id/permissions
 *       { memoryRead, memoryWrite, sharedMemory, modes: {browser, network, message, delete, install, money, settings},
 *         expectedVersion, confirmRisky? }   (full replacement; expectedVersion is required, 0 for never saved)
 *       -> the new view; 409 { code: 'version_conflict', currentVersion, ...view };
 *          400 { code: 'invalid_permissions' | 'risky_not_confirmed' | 'invalid_version' }
 *
 * "allow" on money, install or delete runs those tools without approval, so
 * it is refused unless the owner confirms it (confirmRisky: true).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { actorOf } from '../../auth/auth-gate.js';
import { actorOrReply, requireOwner } from '../../repositories/scope.js';
import {
  PERMISSION_CATEGORIES, PermissionsConflictError, PermissionsInputError, PermissionsNotFoundError, getAgentPermissionsView, setAgentPermissions,
  type AgentPermissions,
} from '../../tools/agent-permissions.js';
import { DRAWER_KINDS } from '../../memory/drawers.js';
import { etag } from '../concurrency.js';
import { logAudit } from '../../services/audit-logger.js';

const AGENT_ID = /^[A-Za-z0-9_.:-]{1,128}$/;
const BODY_KEYS = ['memoryRead', 'memoryWrite', 'sharedMemory', 'modes', 'expectedVersion', 'confirmRisky'];

function ownerOf(request: FastifyRequest, reply: FastifyReply): string | null {
  const actor = actorOrReply(reply, actorOf(request), requireOwner);
  return actor ? actor.userId ?? null : null;
}

const view = (p: AgentPermissions) => ({
  agentId: p.agentId, memoryRead: p.memoryRead, memoryWrite: p.memoryWrite, sharedMemory: p.sharedMemory, modes: p.modes,
  version: p.version, stored: p.version > 0, categories: [...PERMISSION_CATEGORIES], drawerKinds: [...DRAWER_KINDS],
});

export async function agentPermissionsRoutes(fastify: FastifyInstance) {
  const config = { access: 'owner' as const };

  fastify.get<{ Params: { id: string } }>('/api/agents/:id/permissions', { config }, async (request, reply) => {
    if (ownerOf(request, reply) === null) return reply;
    if (!AGENT_ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid agent id' });
    const p = await getAgentPermissionsView(request.params.id);
    if (!p) return reply.code(404).send({ error: 'Agent not found' });
    return reply.header('ETag', etag(p.version)).send(view(p));
  });

  fastify.put<{ Params: { id: string }; Body: unknown }>('/api/agents/:id/permissions', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    const agentId = request.params.id;
    if (!AGENT_ID.test(agentId)) return reply.code(400).send({ error: 'Invalid agent id' });
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply.code(400).send({ error: 'Invalid body', code: 'invalid_permissions' });
    const b = body as Record<string, unknown>;
    const unknown = Object.keys(b).find((k) => !BODY_KEYS.includes(k));
    if (unknown) return reply.code(400).send({ error: `Unknown field "${unknown.slice(0, 40)}"`, code: 'invalid_permissions' });
    const expected = b.expectedVersion;
    if (typeof expected !== 'number' || !Number.isInteger(expected) || expected < 0) {
      return reply.code(400).send({ error: 'expectedVersion is required (0 when never saved)', code: 'invalid_version' });
    }
    const audit = (success: boolean, extra: Record<string, unknown>) => logAudit({
      event_type: 'authz.permission.change', event_category: 'authorization', severity: success ? 'info' : 'warning',
      user_id: ownerId, ip_address: request.ip, user_agent: request.headers['user-agent'],
      request_method: request.method, request_path: request.routeOptions?.url ?? undefined,
      resource_type: 'agent', resource_id: agentId, action: 'agent_permissions.update', success, ...extra,
    });
    try {
      const { before, after } = await setAgentPermissions(agentId, b, expected, ownerId);
      audit(true, { metadata: { before: { ...view(before), categories: undefined, drawerKinds: undefined }, after: { ...view(after), categories: undefined, drawerKinds: undefined } } });
      return reply.header('ETag', etag(after.version)).send(view(after));
    } catch (err) {
      if (err instanceof PermissionsInputError) { audit(false, { error_message: err.message }); return reply.code(400).send({ error: err.message, code: err.code }); }
      if (err instanceof PermissionsNotFoundError) return reply.code(404).send({ error: 'Agent not found' });
      if (err instanceof PermissionsConflictError) {
        return reply.code(409).header('ETag', etag(err.current.version)).send({ error: err.message, code: 'version_conflict', currentVersion: err.current.version, ...view(err.current) });
      }
      throw err;
    }
  });
}
