/**
 * MCP grant bindings (M1 follow-up, stale-authorization fix).
 *
 * A grant of an MCP tool (agent_tool_grants row `mcp__<server>__<tool>`) is
 * only effective while it is bound to the tool's current fingerprint:
 *   sha256(server id, server generation, tool name, input schema, annotations,
 *          title, description).
 * Title and description are the text the model sees, so a server that rewrites
 * them (e.g. to inject instructions) also loses the grant.
 * The server id is new for every added server, and the generation is renewed
 * when its launch spec or URL changes, so a re-created server with the same
 * name, a changed target, or a changed tool schema needs a fresh owner grant.
 * Grants are also removed outright on server delete, on target change and
 * for tools that vanish or change on refresh (callers audit that).
 *
 * Only depends on the database, so grants.ts can use it without cycles.
 */

import { createHash } from 'node:crypto';
import { getDatabase } from '../db/index.js';

export function toolFingerprint(parts: {
  serverId: string; generation: string | null; toolName: string; inputSchema: string; annotations: string | null;
  title: string | null; description: string | null;
}): string {
  return createHash('sha256')
    .update(JSON.stringify([parts.serverId, parts.generation ?? '', parts.toolName, parts.inputSchema, parts.annotations ?? '', parts.title ?? '', parts.description ?? '']))
    .digest('hex');
}

/** Current server + fingerprint of a discovered MCP tool, by registry name. */
export function currentMcpTool(registryName: string): { serverId: string; fingerprint: string } | undefined {
  const row = getDatabase().prepare('SELECT server_id, fingerprint FROM mcp_server_tools WHERE registry_name = ? AND fingerprint IS NOT NULL')
    .get(registryName) as { server_id: string; fingerprint: string } | undefined;
  return row ? { serverId: row.server_id, fingerprint: row.fingerprint } : undefined;
}

/** True when the agent's grant of this MCP tool was given for the tool as it is now. */
export function isMcpGrantBound(agentId: string, registryName: string): boolean {
  try {
    return !!getDatabase().prepare(`
      SELECT 1 FROM mcp_grant_bindings b
      JOIN mcp_server_tools t ON t.registry_name = b.tool_name AND t.server_id = b.server_id AND t.fingerprint = b.fingerprint
      WHERE b.agent_id = ? AND b.tool_name = ?
    `).get(agentId, registryName);
  } catch {
    return false; // tables missing: fail closed
  }
}

/** Replace an agent's bindings with the current fingerprints of `names` (all must be discovered). */
export function writeMcpBindings(agentId: string, names: string[], by: string | null): void {
  const db = getDatabase();
  db.prepare('DELETE FROM mcp_grant_bindings WHERE agent_id = ?').run(agentId);
  const ins = db.prepare('INSERT INTO mcp_grant_bindings (agent_id, tool_name, server_id, fingerprint, granted_by) VALUES (?, ?, ?, ?, ?)');
  for (const name of names) {
    const cur = currentMcpTool(name);
    if (cur) ins.run(agentId, name, cur.serverId, cur.fingerprint, by);
  }
}

export interface RevokedGrant { agentId: string; tool: string }

/** Remove grants (and bindings) of these MCP tool names from every agent. */
export function revokeMcpGrants(toolNames: string[]): RevokedGrant[] {
  if (toolNames.length === 0) return [];
  const db = getDatabase();
  const revoked: RevokedGrant[] = [];
  const find = db.prepare('SELECT agent_id FROM agent_tool_grants WHERE tool_name = ?');
  const delGrant = db.prepare('DELETE FROM agent_tool_grants WHERE tool_name = ?');
  const delBinding = db.prepare('DELETE FROM mcp_grant_bindings WHERE tool_name = ?');
  for (const tool of new Set(toolNames)) {
    for (const r of find.all(tool) as Array<{ agent_id: string }>) revoked.push({ agentId: r.agent_id, tool });
    delGrant.run(tool);
    delBinding.run(tool);
  }
  return revoked;
}

/** All granted tool names that start with this server's prefix (`mcp__<server>__`). */
export function grantedNamesWithPrefix(prefix: string): string[] {
  const rows = getDatabase().prepare(`
    SELECT tool_name FROM agent_tool_grants WHERE substr(tool_name, 1, ?) = ?
    UNION SELECT tool_name FROM mcp_grant_bindings WHERE substr(tool_name, 1, ?) = ?
  `).all(prefix.length, prefix, prefix.length, prefix) as Array<{ tool_name: string }>;
  return rows.map((r) => r.tool_name);
}
