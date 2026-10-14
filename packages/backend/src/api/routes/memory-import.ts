/**
 * Safe import API (CLI-02). Owner only (auth gate owner tier for
 * /api/memory/import*, route access 'owner', handler role check). The web UI
 * and `agent-player import` use exactly these routes (one pipeline).
 *
 *   GET  /api/memory/import/settings      { redactEmails, redactPhones }
 *   PUT  /api/memory/import/settings      change them
 *   POST /api/memory/import/preview       stages 1-3: { files: [{ name, contentBase64 | content }],
 *                                         source?, drawer?, redactEmails?, redactPhones? }
 *                                         -> immutable preview version 1 (sanitized only)
 *   GET  /api/memory/import               own imports (no content)
 *   GET  /api/memory/import/:id           a preview version (?version=n, default latest)
 *   POST /api/memory/import/:id/revise    stage 4: { version, contentHash, includeAll?, items: [{ id, include?, drawer?, type? }] }
 *                                         -> new version (the old one is never changed)
 *   POST /api/memory/import/:id/commit    stage 5: { version, contentHash, operationKey, confirm: true }
 *                                         -> pending memory proposals (quarantine); idempotent per operationKey
 *   POST /api/memory/import/:id/cancel    discard a preview, or roll back a committed import
 *                                         (removes its not-approved proposals)
 *
 * Audit entries carry counts, ids and hashes only: never file content,
 * file names or redacted values. Nothing here logs request bodies.
 *
 * B1.6: data access goes through the memory repository (owner-only rule in
 * repositories/memory-owner.ts); the owner pre-check stays as defence in depth.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { actorOf } from '../../auth/auth-gate.js';
import { repositories } from '../../repositories/index.js';
import type { Actor } from '../../repositories/actor.js';
import { requestMeta } from '../../repositories/audit.js';
import { ScopeError, actorOrReply, requireOwner } from '../../repositories/scope.js';
import { ImportError, MAX_TOTAL_BYTES } from '../../memory/import/pipeline.js';
import { MemoryFileError } from '../../memory/memory-files.js';

/** base64 of the total limit plus JSON overhead. */
const PREVIEW_BODY_LIMIT = Math.ceil(MAX_TOTAL_BYTES * 4 / 3) + 1024 * 1024;

function body(request: FastifyRequest): Record<string, unknown> {
  const b = request.body;
  return b && typeof b === 'object' && !Array.isArray(b) ? b as Record<string, unknown> : {};
}

/** The owner account's actor (central rule), else 401/403 sent and null. */
function ownerOf(request: FastifyRequest, reply: FastifyReply): Actor | null {
  return actorOrReply(reply, actorOf(request), requireOwner);
}

const memory = () => repositories.memory;

function fail(reply: FastifyReply, err: unknown) {
  if (err instanceof ScopeError) return reply.code(err.status).send({ error: err.message });
  if (err instanceof ImportError) return reply.code(err.status).send({ error: err.message, code: err.code });
  if (err instanceof MemoryFileError) return reply.code(err.status).send({ error: err.message });
  // Never echo an unexpected error (it could quote input text).
  return reply.code(500).send({ error: 'Import failed' });
}

export async function memoryImportRoutes(fastify: FastifyInstance) {
  const config = { access: 'owner' as const };

  const audit = (request: FastifyRequest, owner: Actor, action: string, resourceId: string, metadata: Record<string, unknown>, success = true) =>
    void repositories.audit.record(owner, {
      event_type: action.endsWith('settings') ? 'data.update' : action.endsWith('cancel') || action.endsWith('rollback') ? 'data.delete' : 'data.create',
      event_category: 'data_modification', severity: 'info',
      resource_type: 'memory_import', resource_id: resourceId, action, success, metadata,
    }, requestMeta(request));

  fastify.get('/api/memory/import/settings', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply);
    if (owner === null) return reply;
    return memory().importSettings(owner);
  });

  fastify.put('/api/memory/import/settings', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply);
    if (owner === null) return reply;
    try {
      const s = await memory().setImportSettings(owner, body(request));
      audit(request, owner, 'memory_import.settings', owner.userId!, { ...s });
      return s;
    } catch (err) { return fail(reply, err); }
  });

  fastify.post('/api/memory/import/preview', { config, bodyLimit: PREVIEW_BODY_LIMIT }, async (request, reply) => {
    const owner = ownerOf(request, reply);
    if (owner === null) return reply;
    const b = body(request);
    try {
      const view = await memory().importPreview(owner, {
        files: b.files, source: b.source, drawer: b.drawer, redactEmails: b.redactEmails, redactPhones: b.redactPhones,
      });
      audit(request, owner, 'memory_import.preview', view.batchId, {
        version: view.version, contentHash: view.contentHash, source: view.sourceKind,
        files: view.summary.files, items: view.summary.items, redactions: view.summary.redactions, byDrawer: view.summary.byDrawer,
      });
      return reply.code(201).send(view);
    } catch (err) {
      audit(request, owner, 'memory_import.preview', '-', { code: err instanceof ImportError ? err.code : 'error' }, false);
      return fail(reply, err);
    }
  });

  fastify.get('/api/memory/import', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply);
    if (owner === null) return reply;
    return { imports: await memory().imports(owner) };
  });

  fastify.get<{ Params: { id: string }; Querystring: { version?: string } }>('/api/memory/import/:id', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply);
    if (owner === null) return reply;
    const v = request.query?.version;
    const version = v === undefined ? undefined : Number(v);
    if (version !== undefined && (!Number.isInteger(version) || version < 1)) return reply.code(400).send({ error: 'Invalid version' });
    try { return await memory().importView(owner, request.params.id, version); } catch (err) { return fail(reply, err); }
  });

  fastify.post<{ Params: { id: string } }>('/api/memory/import/:id/revise', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply);
    if (owner === null) return reply;
    try {
      const view = await memory().reviseImport(owner, request.params.id, body(request));
      audit(request, owner, 'memory_import.revise', view.batchId, {
        version: view.version, contentHash: view.contentHash, items: view.summary.items, byDrawer: view.summary.byDrawer,
      });
      return reply.code(201).send(view);
    } catch (err) { return fail(reply, err); }
  });

  fastify.post<{ Params: { id: string } }>('/api/memory/import/:id/commit', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply);
    if (owner === null) return reply;
    try {
      const receipt = await memory().commitImport(owner, request.params.id, body(request));
      if (!receipt.replay) {
        audit(request, owner, 'memory_import.commit', receipt.batchId, {
          version: receipt.version, contentHash: receipt.contentHash, proposals: receipt.proposals.length, skipped: receipt.skipped,
        });
      }
      return reply.code(receipt.replay ? 200 : 201).send(receipt);
    } catch (err) { return fail(reply, err); }
  });

  fastify.post<{ Params: { id: string } }>('/api/memory/import/:id/cancel', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply);
    if (owner === null) return reply;
    try {
      const result = await memory().cancelImport(owner, request.params.id);
      audit(request, owner, result.status === 'cancelled' ? 'memory_import.cancel' : 'memory_import.rollback', result.batchId, {
        removedProposals: result.removedProposals, approvedKept: result.approvedKept.length,
      });
      return result;
    } catch (err) { return fail(reply, err); }
  });
}
