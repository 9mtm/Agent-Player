/**
 * Agent tool grants API (S1.4). Owner only (auth gate owner tier for
 * /api/agents/:id/tool-grants, route access 'owner', handler role check).
 * Every change is written to the audit log.
 *
 *   GET /api/agents/:id/tool-grants   stored grants + available tools
 *   PUT /api/agents/:id/tool-grants   { grants: [name | {tool, scopes}], parentAgentId?, expectedVersion? }
 *                                     (or If-Match: "<version>"); 409 { code: 'version_conflict', currentVersion, ...view }
 *                                     when the grants changed since they were read (BE-UI-01). Both
 *                                     responses carry `version` and an ETag.
 *
 * Grants are permissions; personality, prompts and model output never change
 * them. A sub-agent's grants must be a subset of its parent's.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createToolsRegistry } from '../../tools/index.js';
import { GrantConflictError, GrantValidationError, getAgentGrantView, setAgentGrants } from '../../tools/grants.js';
import { VersionInputError, etag, expectedVersionFrom } from '../concurrency.js';
import { approvalCategory } from '../../tools/approvals.js';
import { isToolExecClass, isToolObjectAllowedByExecPolicy } from '../../tools/exec-policy.js';
import { logAudit } from '../../services/audit-logger.js';

const AGENT_ID = /^[A-Za-z0-9_.:-]{1,128}$/;

function ownerOf(request: FastifyRequest, reply: FastifyReply): string | null {
  const user = request.authUser;
  if (!user) { reply.code(401).send({ error: 'Authentication required' }); return null; }
  if (user.role !== 'owner') { reply.code(403).send({ error: 'This action requires the owner account' }); return null; }
  return user.id;
}

function registeredTools() {
  return createToolsRegistry({ workspaceDir: process.cwd() }).listRegistered();
}

export async function agentGrantsRoutes(fastify: FastifyInstance) {
  const config = { access: 'owner' as const };

  fastify.get<{ Params: { id: string } }>('/api/agents/:id/tool-grants', { config }, async (request, reply) => {
    if (ownerOf(request, reply) === null) return reply;
    if (!AGENT_ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid agent id' });
    const available = registeredTools();
    const view = getAgentGrantView(request.params.id, available);
    if (!view) return reply.code(404).send({ error: 'Agent not found' });
    reply.header('ETag', etag(view.version));
    return {
      ...view,
      available: available
        .map((t) => ({
          name: t.name,
          description: t.description,
          extensionId: t.extensionId ?? null,
          execClass: isToolExecClass(t),
          allowedByServer: isToolObjectAllowedByExecPolicy(t),
          requiresApproval: approvalCategory(t) !== null,
          // M1: MCP tools carry their qualified name (mcp:<server>:<tool>)
          mcp: t.mcp ? { qualifiedName: t.mcp.qualifiedName, server: t.mcp.serverName, tool: t.mcp.toolName } : null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  });

  fastify.put<{ Params: { id: string }; Body: { grants?: unknown; parentAgentId?: unknown; expectedVersion?: unknown } }>(
    '/api/agents/:id/tool-grants', { config }, async (request, reply) => {
      const ownerId = ownerOf(request, reply);
      if (ownerId === null) return reply;
      const agentId = request.params.id;
      if (!AGENT_ID.test(agentId)) return reply.code(400).send({ error: 'Invalid agent id' });
      const body = request.body || {};
      const available = registeredTools();
      let expectedVersion: number | null;
      try {
        expectedVersion = expectedVersionFrom(body, request.headers['if-match']);
      } catch (err) {
        if (err instanceof VersionInputError) return reply.code(400).send({ error: err.message, code: 'invalid_version' });
        throw err;
      }
      let change;
      try {
        change = setAgentGrants(agentId, { grants: body.grants, parentAgentId: body.parentAgentId, expectedVersion }, ownerId, available);
      } catch (err: any) {
        if (err instanceof GrantConflictError) {
          const current = getAgentGrantView(agentId, available);
          return reply.code(409).header('ETag', etag(err.currentVersion)).send({ error: err.message, code: 'version_conflict', currentVersion: err.currentVersion, ...current });
        }
        if (err instanceof GrantValidationError) {
          const status = err.message === 'Agent not found' ? 404 : 400;
          logAudit({
            event_type: 'authz.permission.change', event_category: 'authorization', severity: 'warning',
            user_id: ownerId, ip_address: request.ip, user_agent: request.headers['user-agent'],
            request_method: request.method, request_path: request.routeOptions?.url ?? undefined,
            resource_type: 'agent', resource_id: agentId, action: 'agent_tool_grants.update',
            success: false, error_message: err.message,
          });
          return reply.code(status).send({ error: err.message });
        }
        throw err;
      }
      const added = change.after.filter((t) => !change.before.includes(t));
      const removed = change.before.filter((t) => !change.after.includes(t));
      logAudit({
        event_type: 'authz.permission.change', event_category: 'authorization',
        severity: added.length ? 'warning' : 'info',
        user_id: ownerId, ip_address: request.ip, user_agent: request.headers['user-agent'],
        request_method: request.method, request_path: request.routeOptions?.url ?? undefined,
        resource_type: 'agent', resource_id: agentId, action: 'agent_tool_grants.update',
        success: true,
        metadata: { added, removed, parentAgentId: change.parentAgentId },
      });
      const view = getAgentGrantView(agentId, available);
      if (view) reply.header('ETag', etag(view.version));
      return view;
    });
}
