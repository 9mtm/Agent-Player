/**
 * Memory files API (CORE-04). Owner only (auth gate owner tier for
 * /api/memory/files* and /api/memory/proposals*, route access 'owner',
 * handler role check). The user always comes from the token and every
 * drawer/proposal is the caller's own (another user's -> 404).
 *
 *   GET  /api/memory/files                       drawers with revision + export path
 *   GET  /api/memory/files/:drawer               export text (no write)
 *   GET  /api/memory/files/:drawer/versions      version history of the drawer
 *   POST /api/memory/files/:drawer/export        write the readable file (DB -> file)
 *   POST /api/memory/files/:drawer/proposal      { content? , note? } edited text, or
 *                                                the exported file as saved on disk
 *   GET  /api/memory/proposals?status=           proposals, newest first
 *   GET  /api/memory/proposals/:id               one proposal with its diff
 *   POST /api/memory/proposals/:id/approve       apply as a new version (audited)
 *   POST /api/memory/proposals/:id/reject        { note? } nothing changes (audited)
 *
 * `:drawer` is `owner`, `experience`, `project:<slug>`, `task:<id>` or
 * `people:<id>`. `agentId` (query or body) picks the agent folder; default
 * the primary agent. The database stays canonical: a file never reaches it
 * except through an approved proposal.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { logAudit } from '../../services/audit-logger.js';
import { getMemoryStorage } from '../../memory/storage.js';
import { DrawerInputError, drawerId, parseDrawerId, type DrawerRef } from '../../memory/drawers.js';
import {
  MemoryFileError,
  approveProposal,
  createProposal,
  drawerFilePath,
  drawerRevision,
  displayPath,
  drawerVersions,
  exportDrawerFile,
  getProposal,
  listProposals,
  readDrawerFile,
  rejectProposal,
  resolveFileAgent,
  viewDrawerFile,
  type MemoryProposal,
} from '../../memory/memory-files.js';

const STATUSES = new Set(['pending', 'approved', 'rejected', 'stale', 'cancelled']);

function ownerOf(request: FastifyRequest, reply: FastifyReply): string | null {
  const user = request.authUser;
  if (!user) { reply.code(401).send({ error: 'Authentication required' }); return null; }
  if (user.role !== 'owner') { reply.code(403).send({ error: 'This action requires the owner account' }); return null; }
  return user.id;
}

function body(request: FastifyRequest): Record<string, unknown> {
  const b = request.body;
  return b && typeof b === 'object' && !Array.isArray(b) ? b as Record<string, unknown> : {};
}

function fail(reply: FastifyReply, err: unknown) {
  if (err instanceof MemoryFileError) return reply.code(err.status).send({ error: err.message });
  if (err instanceof DrawerInputError) return reply.code(400).send({ error: err.message });
  throw err;
}

function summary(p: MemoryProposal) {
  const count = (op: string) => p.changes.filter((c) => c.op === op).length;
  const { changes: _changes, ...rest } = p;
  return { ...rest, counts: { add: count('add'), update: count('update'), delete: count('delete') } };
}

type DrawerParams = { Params: { drawer: string } };
type IdParams = { Params: { id: string } };

export async function memoryFilesRoutes(fastify: FastifyInstance) {
  const config = { access: 'owner' as const };
  // Columns/backfill for drawers (idempotent; normally done by the memory routes).
  await getMemoryStorage().initialize();

  const agentFrom = (request: FastifyRequest) =>
    resolveFileAgent((request.query as any)?.agentId ?? body(request).agentId);

  const audit = (request: FastifyRequest, ownerId: string, action: string, success: boolean, resourceId: string, metadata: Record<string, unknown>, error?: string) =>
    logAudit({
      event_type: 'data.update', event_category: 'data_modification', severity: 'info',
      user_id: ownerId, ip_address: request.ip, user_agent: request.headers['user-agent'],
      request_method: request.method, request_path: request.routeOptions?.url ?? undefined,
      resource_type: 'memory_proposal', resource_id: resourceId, action, success,
      ...(error ? { error_message: error } : {}), metadata,
    });

  fastify.get('/api/memory/files', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    try {
      const agentId = agentFrom(request);
      const drawers = getMemoryStorage().listDrawers(ownerId).map((d) => {
        const ref: DrawerRef = d.key ? { kind: d.kind, key: d.key } : { kind: d.kind };
        return { ...d, drawerId: drawerId(ref), revision: drawerRevision(ownerId, ref), path: displayPath(drawerFilePath(agentId, ownerId, ref)) };
      });
      return { agentId, drawers };
    } catch (err) { return fail(reply, err); }
  });

  fastify.get<DrawerParams>('/api/memory/files/:drawer', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    try {
      return viewDrawerFile(ownerId, agentFrom(request), parseDrawerId(request.params.drawer));
    } catch (err) { return fail(reply, err); }
  });

  fastify.get<DrawerParams>('/api/memory/files/:drawer/versions', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    try {
      const drawer = parseDrawerId(request.params.drawer);
      return { drawerId: drawerId(drawer), revision: drawerRevision(ownerId, drawer), versions: drawerVersions(ownerId, drawer) };
    } catch (err) { return fail(reply, err); }
  });

  fastify.post<DrawerParams>('/api/memory/files/:drawer/export', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    try {
      const view = await exportDrawerFile(ownerId, agentFrom(request), parseDrawerId(request.params.drawer));
      return { ...view, exported: true };
    } catch (err) { return fail(reply, err); }
  });

  fastify.post<DrawerParams>('/api/memory/files/:drawer/proposal', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    try {
      const drawer = parseDrawerId(request.params.drawer);
      const agentId = agentFrom(request);
      const b = body(request);
      if (b.content !== undefined && typeof b.content !== 'string') return reply.code(400).send({ error: 'content must be text' });
      // Uploaded text, or the exported file as the owner saved it (read only on this request).
      const source = typeof b.content === 'string' ? 'upload' : 'file';
      const text = typeof b.content === 'string' ? b.content : await readDrawerFile(ownerId, agentId, drawer);
      const proposal = createProposal({ userId: ownerId, agentId, drawer, text, source, note: typeof b.note === 'string' ? b.note : null });
      audit(request, ownerId, 'memory_proposal.create', true, proposal.id, { drawer: proposal.drawerId, source, counts: summary(proposal).counts });
      return reply.code(201).send(proposal);
    } catch (err) { return fail(reply, err); }
  });

  fastify.get('/api/memory/proposals', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    const status = (request.query as any)?.status;
    if (status !== undefined && !STATUSES.has(status)) return reply.code(400).send({ error: 'Invalid status' });
    return { proposals: listProposals(ownerId, status).map(summary) };
  });

  fastify.get<IdParams>('/api/memory/proposals/:id', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    const proposal = getProposal(ownerId, request.params.id);
    if (!proposal) return reply.code(404).send({ error: 'Proposal not found' });
    return proposal;
  });

  fastify.post<IdParams>('/api/memory/proposals/:id/approve', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    try {
      const result = await approveProposal(ownerId, request.params.id, ownerId);
      audit(request, ownerId, 'memory_proposal.approve', true, request.params.id, {
        drawer: result.proposal.drawerId, revision: result.revision,
        added: result.applied.added.length, updated: result.applied.updated.length, deleted: result.applied.deleted.length,
      });
      return result;
    } catch (err) {
      if (err instanceof MemoryFileError && err.status !== 404) {
        audit(request, ownerId, 'memory_proposal.approve', false, request.params.id, {}, err.message);
      }
      return fail(reply, err);
    }
  });

  fastify.post<IdParams>('/api/memory/proposals/:id/reject', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    try {
      const proposal = rejectProposal(ownerId, request.params.id, ownerId, body(request).note);
      audit(request, ownerId, 'memory_proposal.reject', true, proposal.id, { drawer: proposal.drawerId });
      return proposal;
    } catch (err) {
      if (err instanceof MemoryFileError && err.status !== 404) {
        audit(request, ownerId, 'memory_proposal.reject', false, request.params.id, {}, err.message);
      }
      return fail(reply, err);
    }
  });
}
