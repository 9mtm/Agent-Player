/**
 * Tool approvals API (S1.3). Owner only: the auth gate's tier rule for
 * /api/approvals is 'owner', each route declares access 'owner', and the
 * handlers check the role again.
 *
 *   GET  /api/approvals?status=pending   list (masked parameter previews)
 *   GET  /api/approvals/:id              full view: exact parameters (secrets masked) + paramsHash
 *   POST /api/approvals/:id/approve      { paramsHash } approve once: runs exactly those parameters
 *   POST /api/approvals/:id/deny         deny: it never runs
 *
 * BE-UI-01: every approval carries `expiresAt` (requestedAt + 24 h, after
 * which the server marks it expired) and all timestamps (requestedAt,
 * decidedAt, executedAt, expiresAt) are ISO-8601 UTC with `Z`. Use the HTTP
 * `Date` response header for clock drift.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  ApprovalStateError,
  approveAndRun,
  denyApproval,
  getApprovalDetail,
  listApprovals,
  APPROVAL_TTL_HOURS,
} from '../../tools/approvals.js';
import { isoPlusHours, isoUtc } from '../timestamps.js';

/** API view of an approval record: ISO UTC timestamps + absolute expiresAt. */
function view<T extends { requestedAt: string; decidedAt: string | null; executedAt: string | null }>(r: T): T & { expiresAt: string | null } {
  return {
    ...r,
    requestedAt: isoUtc(r.requestedAt) as string,
    decidedAt: isoUtc(r.decidedAt),
    executedAt: isoUtc(r.executedAt),
    expiresAt: isoPlusHours(r.requestedAt, APPROVAL_TTL_HOURS),
  };
}
import { logAudit } from '../../services/audit-logger.js';

const STATUSES = new Set(['pending', 'approved', 'denied', 'executed', 'failed', 'expired']);
const ID = /^[0-9a-f-]{36}$/i;

function ownerOf(request: FastifyRequest, reply: FastifyReply): string | null {
  const user = request.authUser;
  if (!user) { reply.code(401).send({ error: 'Authentication required' }); return null; }
  if (user.role !== 'owner') { reply.code(403).send({ error: 'This action requires the owner account' }); return null; }
  return user.id;
}

function audit(request: FastifyRequest, ownerId: string, action: string, approvalId: string, success: boolean, metadata: Record<string, unknown>) {
  logAudit({
    event_type: 'data.update',
    event_category: 'data_modification',
    severity: action === 'approve' ? 'warning' : 'info',
    user_id: ownerId,
    ip_address: request.ip,
    user_agent: request.headers['user-agent'],
    request_method: request.method,
    request_path: request.routeOptions?.url ?? undefined,
    resource_type: 'tool_approval',
    resource_id: approvalId,
    action: `tool_approval.${action}`,
    success,
    metadata,
  });
}

export async function approvalsRoutes(fastify: FastifyInstance) {
  const config = { access: 'owner' as const }; // read by the auth gate (route may only raise its level)

  fastify.get<{ Querystring: { status?: string; limit?: string } }>('/api/approvals', { config }, async (request, reply) => {
    if (ownerOf(request, reply) === null) return reply;
    const status = request.query?.status;
    if (status !== undefined && !STATUSES.has(status)) return reply.code(400).send({ error: 'Invalid status' });
    return { approvals: listApprovals({ status, limit: Number(request.query?.limit) || undefined }).map(view) };
  });

  fastify.get<{ Params: { id: string } }>('/api/approvals/:id', { config }, async (request, reply) => {
    if (ownerOf(request, reply) === null) return reply;
    if (!ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid id' });
    const record = await getApprovalDetail(request.params.id);
    if (!record) return reply.code(404).send({ error: 'Approval not found' });
    return { approval: view(record) };
  });

  fastify.post<{ Params: { id: string }; Body: { paramsHash?: string } }>('/api/approvals/:id/approve', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    if (!ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid id' });
    const paramsHash = request.body?.paramsHash;
    if (typeof paramsHash !== 'string' || !/^[0-9a-f]{64}$/.test(paramsHash)) {
      return reply.code(400).send({ error: 'paramsHash from GET /api/approvals/:id is required' });
    }
    try {
      const { record, result } = await approveAndRun(request.params.id, ownerId, paramsHash);
      audit(request, ownerId, 'approve', record.id, record.status === 'executed', { tool: record.toolName, agentId: record.agentId, status: record.status });
      return { approval: view(record), result: { ok: !result.error, preview: record.resultPreview, error: record.error } };
    } catch (err: any) {
      if (err instanceof ApprovalStateError) return reply.code(err.status).send({ error: err.message });
      throw err;
    }
  });

  fastify.post<{ Params: { id: string } }>('/api/approvals/:id/deny', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    if (!ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid id' });
    try {
      const record = denyApproval(request.params.id, ownerId);
      audit(request, ownerId, 'deny', record.id, true, { tool: record.toolName, agentId: record.agentId });
      return { approval: view(record) };
    } catch (err: any) {
      if (err instanceof ApprovalStateError) return reply.code(err.status).send({ error: err.message });
      throw err;
    }
  });
}
