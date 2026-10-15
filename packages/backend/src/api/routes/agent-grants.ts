/**
 * Agent tool grants API (S1.4). Owner only (auth gate owner tier for
 * /api/agents/:id/tool-grants, route access 'owner', handler role check).
 * Every change is written to the audit log.
 *
 *   GET /api/agents/:id/tool-grants   stored grants + available tools
 *   PUT /api/agents/:id/tool-grants   { grants: [name | {tool, scopes}], parentAgentId?, expectedVersion?, keepScopes? }
 *                                     (or If-Match: "<version>"); 409 { code: 'version_conflict', currentVersion, ...view }
 *                                     when the grants changed since they were read (BE-UI-01). Both
 *                                     responses carry `version` and an ETag.
 *
 * Grants are permissions; personality, prompts and model output never change
 * them. A sub-agent's grants must be a subset of its parent's.
 */

import { actorOf } from '../../auth/auth-gate.js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { repositories } from '../../repositories/index.js';
import { actorOrReply, requireOwner } from '../../repositories/scope.js';
import { createAgentToolsRegistry } from '../../tools/index.js';
import { GrantConflictError, GrantValidationError } from '../../tools/grants.js';
import { VersionInputError, etag, expectedVersionFrom } from '../concurrency.js';
import { approvalCategory } from '../../tools/approvals.js';
import { isToolExecClass, isToolObjectAllowedByExecPolicy } from '../../tools/exec-policy.js';
import { logAudit } from '../../services/audit-logger.js';

const AGENT_ID = /^[A-Za-z0-9_.:-]{1,128}$/;

/** Owner account id (central rule, repositories/scope.ts), else 401/403 sent and null. */
function ownerOf(request: FastifyRequest, reply: FastifyReply): string | null {
  const actor = actorOrReply(reply, actorOf(request), requireOwner);
  return actor ? actor.userId ?? null : null;
}

async function registeredTools() {
  // B2.2c: the async registry, so MCP tools are listed on both drivers.
  // Self-only tools (plan_steps) need no grant, so they are not listed for granting.
  return (await createAgentToolsRegistry({ workspaceDir: process.cwd() })).listRegistered().filter((t) => !t.selfOnly);
}

export async function agentGrantsRoutes(fastify: FastifyInstance) {
  const config = { access: 'owner' as const };

  fastify.get<{ Params: { id: string } }>('/api/agents/:id/tool-grants', { config }, async (request, reply) => {
    if (ownerOf(request, reply) === null) return reply;
    if (!AGENT_ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid agent id' });
    const available = await registeredTools();
    const view = await repositories.agents.grantView(actorOf(request), request.params.id, available);
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

  fastify.put<{ Params: { id: string }; Body: { grants?: unknown; parentAgentId?: unknown; expectedVersion?: unknown; keepScopes?: unknown } }>(
    '/api/agents/:id/tool-grants', { config }, async (request, reply) => {
      const ownerId = ownerOf(request, reply);
      if (ownerId === null) return reply;
      const agentId = request.params.id;
      if (!AGENT_ID.test(agentId)) return reply.code(400).send({ error: 'Invalid agent id' });
      const body = request.body || {};
      const available = await registeredTools();
      let expectedVersion: number | null;
      try {
        expectedVersion = expectedVersionFrom(body, request.headers['if-match']);
      } catch (err) {
        if (err instanceof VersionInputError) return reply.code(400).send({ error: err.message, code: 'invalid_version' });
        throw err;
      }
      // keepScopes: a page that edits names only (no scope editor) keeps each still-granted
      // tool's current limits instead of silently widening them. The version check below
      // still refuses a save made against an older list.
      let grants = body.grants;
      if (body.keepScopes === true && Array.isArray(grants) && grants.every((g) => typeof g === 'string')) {
        const current = await repositories.agents.grantView(actorOf(request), agentId, available).catch(() => null) as { grants?: { tool: string; scopes?: unknown }[] } | null;
        const scoped = new Map((current?.grants ?? []).filter((g) => g.scopes !== null && g.scopes !== undefined).map((g) => [g.tool, g.scopes]));
        grants = (grants as string[]).map((tool) => (scoped.has(tool) ? { tool, scopes: scoped.get(tool) } : tool));
      }
      let change;
      try {
        change = await repositories.agents.setGrants(actorOf(request), agentId, { grants, parentAgentId: body.parentAgentId, expectedVersion }, available);
      } catch (err: any) {
        if (err instanceof GrantConflictError) {
          const current = await repositories.agents.grantView(actorOf(request), agentId, available);
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
      const view = await repositories.agents.grantView(actorOf(request), agentId, available);
      if (view) reply.header('ETag', etag(view.version));
      return view;
    });
}
