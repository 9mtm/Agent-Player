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

import { actorOf } from '../../auth/auth-gate.js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { repositories } from '../../repositories/index.js';
import { actorOrReply, requireOwner } from '../../repositories/scope.js';
import { logAudit } from '../../services/audit-logger.js';
import { DIALECTS, PRESETS, PersonalityInputError, TRAIT_NAMES, traitsToBehavior } from '../../services/personality.js';
import {
  PersonalityLockedError,
  PersonalityNotFoundError,
  exportPersonalityFile,
  type PersonalityVersion,
} from '../../services/personality-store.js';

const AGENT_ID = /^[A-Za-z0-9_.:-]{1,128}$/;

/** Owner account id (central rule, repositories/scope.ts), else 401/403 sent and null. */
function ownerOf(request: FastifyRequest, reply: FastifyReply): string | null {
  const actor = actorOrReply(reply, actorOf(request), requireOwner);
  return actor ? actor.userId ?? null : null;
}

function view(p: PersonalityVersion) {
  return { ...p, behavior: traitsToBehavior(p.traits, p.dialect) };
}

type Params = { Params: { id: string } };

export async function agentPersonalityRoutes(fastify: FastifyInstance) {
  const config = { access: 'owner' as const };

  async function change(
    request: FastifyRequest<Params>, reply: FastifyReply, action: string,
    run: (agentId: string) => Promise<PersonalityVersion>,
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
      result = await run(agentId);
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
    const current = await repositories.agents.currentPersonality(actorOf(request), request.params.id);
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
    const versions = await repositories.agents.personalityVersions(actorOf(request), request.params.id);
    if (!versions) return reply.code(404).send({ error: 'Agent not found' });
    return { agentId: request.params.id, versions };
  });

  fastify.post<Params & { Body: Record<string, unknown> }>('/api/agents/:id/personality/versions', { config }, async (request, reply) => {
    const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : null;
    if (!body) {
      if (ownerOf(request, reply) === null) return reply;
      return reply.code(400).send({ error: 'Body must be an object' });
    }
    return change(request, reply, 'agent_personality.save', (agentId) => repositories.agents.savePersonality(actorOf(request), agentId, body));
  });

  fastify.post<Params>('/api/agents/:id/personality/lock', { config }, async (request, reply) =>
    change(request, reply, 'agent_personality.lock', (agentId) => repositories.agents.setPersonalityLocked(actorOf(request), agentId, true)));

  fastify.post<Params>('/api/agents/:id/personality/unlock', { config }, async (request, reply) =>
    change(request, reply, 'agent_personality.unlock', (agentId) => repositories.agents.setPersonalityLocked(actorOf(request), agentId, false)));

  fastify.post<Params & { Body: { version?: unknown } }>('/api/agents/:id/personality/rollback', { config }, async (request, reply) =>
    change(request, reply, 'agent_personality.rollback', (agentId) => repositories.agents.rollbackPersonality(actorOf(request), agentId, request.body?.version)));
}
