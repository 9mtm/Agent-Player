/**
 * Agent personality API (CORE-01). Owner only (auth gate owner tier for
 * /api/agents/:id/personality/*, route access 'owner', handler role check).
 * Every change is a new version and is written to the audit log.
 *
 *   GET  /api/agents/:id/personality/current    current version + behaviour + presets
 *   GET  /api/agents/:id/personality/versions   all versions, newest first
 *   POST /api/agents/:id/personality/versions   { traits?, preset?, dialect?, lockedTraits?, note? }
 *   POST /api/agents/:id/personality/lock       lock (no saves or rollbacks until unlocked)
 *   POST /api/agents/:id/personality/unlock
 *   POST /api/agents/:id/personality/rollback   { version }
 *
 * Personality shapes prompting and confirmation behaviour only; it never
 * grants tools or permissions (those are /api/agents/:id/tool-grants).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { logAudit } from '../../services/audit-logger.js';
import { DIALECTS, PRESETS, PersonalityInputError, TRAIT_NAMES, traitsToBehavior } from '../../services/personality.js';
import {
  PersonalityLockedError,
  PersonalityNotFoundError,
  exportPersonalityFile,
  getCurrentPersonality,
  listPersonalityVersions,
  rollbackPersonality,
  savePersonalityVersion,
  setPersonalityLocked,
  type PersonalityVersion,
} from '../../services/personality-store.js';

const AGENT_ID = /^[A-Za-z0-9_.:-]{1,128}$/;

function ownerOf(request: FastifyRequest, reply: FastifyReply): string | null {
  const user = request.authUser;
  if (!user) { reply.code(401).send({ error: 'Authentication required' }); return null; }
  if (user.role !== 'owner') { reply.code(403).send({ error: 'This action requires the owner account' }); return null; }
  return user.id;
}

function view(p: PersonalityVersion) {
  return { ...p, behavior: traitsToBehavior(p.traits, p.dialect) };
}

type Params = { Params: { id: string } };

export async function agentPersonalityRoutes(fastify: FastifyInstance) {
  const config = { access: 'owner' as const };

  async function change(
    request: FastifyRequest<Params>, reply: FastifyReply, action: string,
    run: (agentId: string, ownerId: string) => PersonalityVersion,
  ) {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    const agentId = request.params.id;
    if (!AGENT_ID.test(agentId)) return reply.code(400).send({ error: 'Invalid agent id' });
    const audit = (success: boolean, extra: { error_message?: string; metadata?: Record<string, unknown> }) => logAudit({
      event_type: 'data.update', event_category: 'data_modification', severity: 'info',
      user_id: ownerId, ip_address: request.ip, user_agent: request.headers['user-agent'],
      request_method: request.method, request_path: request.routeOptions?.url ?? undefined,
      resource_type: 'agent', resource_id: agentId, action, success, ...extra,
    });
    let result: PersonalityVersion;
    try {
      result = run(agentId, ownerId);
    } catch (err) {
      if (err instanceof PersonalityInputError) { audit(false, { error_message: err.message }); return reply.code(400).send({ error: err.message }); }
      if (err instanceof PersonalityLockedError) { audit(false, { error_message: err.message }); return reply.code(409).send({ error: err.message }); }
      if (err instanceof PersonalityNotFoundError) return reply.code(404).send({ error: err.message });
      throw err;
    }
    audit(true, { metadata: { version: result.version, source: result.source, traits: result.traits, dialect: result.dialect, locked: result.locked } });
    try {
      await exportPersonalityFile(result);
    } catch (err) {
      // The database is canonical; a failed readable export does not undo the version.
      request.log.warn({ err }, '[Personality] PERSONALITY.md export failed');
    }
    return view(result);
  }

  fastify.get<Params>('/api/agents/:id/personality/current', { config }, async (request, reply) => {
    if (ownerOf(request, reply) === null) return reply;
    if (!AGENT_ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid agent id' });
    const current = getCurrentPersonality(request.params.id);
    if (!current) return reply.code(404).send({ error: 'Agent not found' });
    return {
      ...view(current),
      traitNames: TRAIT_NAMES,
      dialects: DIALECTS,
      presets: Object.entries(PRESETS).map(([id, p]) => ({ id, label: p.label, traits: p.traits })),
    };
  });

  fastify.get<Params>('/api/agents/:id/personality/versions', { config }, async (request, reply) => {
    if (ownerOf(request, reply) === null) return reply;
    if (!AGENT_ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid agent id' });
    const versions = listPersonalityVersions(request.params.id);
    if (!versions) return reply.code(404).send({ error: 'Agent not found' });
    return { agentId: request.params.id, versions };
  });

  fastify.post<Params & { Body: Record<string, unknown> }>('/api/agents/:id/personality/versions', { config }, async (request, reply) => {
    const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : null;
    if (!body) {
      if (ownerOf(request, reply) === null) return reply;
      return reply.code(400).send({ error: 'Body must be an object' });
    }
    return change(request, reply, 'agent_personality.save', (agentId, ownerId) => savePersonalityVersion(agentId, body, ownerId));
  });

  fastify.post<Params>('/api/agents/:id/personality/lock', { config }, async (request, reply) =>
    change(request, reply, 'agent_personality.lock', (agentId, ownerId) => setPersonalityLocked(agentId, true, ownerId)));

  fastify.post<Params>('/api/agents/:id/personality/unlock', { config }, async (request, reply) =>
    change(request, reply, 'agent_personality.unlock', (agentId, ownerId) => setPersonalityLocked(agentId, false, ownerId)));

  fastify.post<Params & { Body: { version?: unknown } }>('/api/agents/:id/personality/rollback', { config }, async (request, reply) =>
    change(request, reply, 'agent_personality.rollback', (agentId, ownerId) => rollbackPersonality(agentId, request.body?.version, ownerId)));
}
