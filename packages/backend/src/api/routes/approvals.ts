/**
 * Tool approvals API (S1.3). Owner only: the auth gate's tier rule for
 * /api/approvals is 'owner', each route declares access 'owner', and the
 * handlers check the role again.
 *
 *   GET  /api/approvals?status=pending   list (masked parameter previews)
 *   GET  /api/approvals/:id              one record
 *   POST /api/approvals/:id/approve      approve once: runs the call now
 *   POST /api/approvals/:id/deny         deny: it never runs
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  ApprovalStateError,
  approveAndRun,
  denyApproval,
  getApproval,
  listApprovals,
} from '../../tools/approvals.js';
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
    return { approvals: listApprovals({ status, limit: Number(request.query?.limit) || undefined }) };
  });

  fastify.get<{ Params: { id: string } }>('/api/approvals/:id', { config }, async (request, reply) => {
    if (ownerOf(request, reply) === null) return reply;
    if (!ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid id' });
    const record = getApproval(request.params.id);
    if (!record) return reply.code(404).send({ error: 'Approval not found' });
    return { approval: record };
  });

  fastify.post<{ Params: { id: string } }>('/api/approvals/:id/approve', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    if (!ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid id' });
    try {
      const { record, result } = await approveAndRun(request.params.id, ownerId);
      audit(request, ownerId, 'approve', record.id, record.status === 'executed', { tool: record.toolName, agentId: record.agentId, status: record.status });
      return { approval: record, result: { ok: !result.error, preview: record.resultPreview, error: record.error } };
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
      return { approval: record };
    } catch (err: any) {
      if (err instanceof ApprovalStateError) return reply.code(err.status).send({ error: err.message });
      throw err;
    }
  });
}
