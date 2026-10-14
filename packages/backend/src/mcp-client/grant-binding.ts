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
 *
 * B2.2b-4: the bindings live with the grants (agent_tool_grants, ported in
 * B2.2b-3) on the process driver, as SQL steps: on PostgreSQL they are
 * written in the same transaction as the grant rows, and revoking removes
 * grants and bindings together. The MCP discovery tables (mcp_servers,
 * mcp_server_tools) are still SQLite (B2.2c): currentMcpTool reads the
 * tool's current fingerprint there, and a binding counts only while it
 * equals that fingerprint (the comparison is done here instead of a join).
 */

import { createHash } from 'node:crypto';
import { getDatabase } from '../db/index.js';
import { all, dialect, one, run, sql, sqliteSync, type Step } from '../repositories/sql-steps.js';

export function toolFingerprint(parts: {
  serverId: string; generation: string | null; toolName: string; inputSchema: string; annotations: string | null;
  title: string | null; description: string | null;
}): string {
  return createHash('sha256')
    .update(JSON.stringify([parts.serverId, parts.generation ?? '', parts.toolName, parts.inputSchema, parts.annotations ?? '', parts.title ?? '', parts.description ?? '']))
    .digest('hex');
}

/** Current server + fingerprint of a discovered MCP tool, by registry name (MCP discovery: SQLite until B2.2c). */
export function currentMcpTool(registryName: string): { serverId: string; fingerprint: string } | undefined {
  const row = getDatabase().prepare('SELECT server_id, fingerprint FROM mcp_server_tools WHERE registry_name = ? AND fingerprint IS NOT NULL')
    .get(registryName) as { server_id: string; fingerprint: string } | undefined;
  return row ? { serverId: row.server_id, fingerprint: row.fingerprint } : undefined;
}

/** True when the agent's grant of this MCP tool was given for the tool as it is now (SQL step). */
export function* isMcpGrantBoundStep(agentId: string, registryName: string): Step<boolean> {
  const d = yield* dialect();
  let binding: { server_id: string; fingerprint: string } | undefined;
  if (d === 'sqlite') {
    try {
      binding = yield* one('SELECT server_id, fingerprint FROM mcp_grant_bindings WHERE agent_id = ? AND tool_name = ?', agentId, registryName);
    } catch {
      return false; // tables missing: fail closed
    }
  } else {
    // No try/catch here: a failed statement would abort the caller's PostgreSQL transaction.
    binding = yield* one('SELECT server_id, fingerprint FROM mcp_grant_bindings WHERE agent_id = ? AND tool_name = ?', agentId, registryName);
  }
  if (!binding) return false;
  let cur: { serverId: string; fingerprint: string } | undefined;
  try { cur = currentMcpTool(registryName); } catch { return false; }
  return !!cur && cur.serverId === binding.server_id && cur.fingerprint === binding.fingerprint;
}

/** Replace an agent's bindings with the current fingerprints of `names` (SQL step: joins the grants transaction). */
export function* writeMcpBindingsStep(agentId: string, names: string[], by: string | null): Step<void> {
  yield* run('DELETE FROM mcp_grant_bindings WHERE agent_id = ?', agentId);
  for (const name of names) {
    const cur = currentMcpTool(name);
    if (cur) {
      yield* run('INSERT INTO mcp_grant_bindings (agent_id, tool_name, server_id, fingerprint, granted_by) VALUES (?, ?, ?, ?, ?)',
        agentId, name, cur.serverId, cur.fingerprint, by);
    }
  }
}

export interface RevokedGrant { agentId: string; tool: string }

function* revokeMcpGrantsStep(toolNames: string[]): Step<RevokedGrant[]> {
  const revoked: RevokedGrant[] = [];
  for (const tool of new Set(toolNames)) {
    for (const r of yield* all<{ agent_id: string }>('SELECT agent_id FROM agent_tool_grants WHERE tool_name = ? ORDER BY agent_id', tool)) {
      revoked.push({ agentId: r.agent_id, tool });
    }
    yield* run('DELETE FROM agent_tool_grants WHERE tool_name = ?', tool);
    yield* run('DELETE FROM mcp_grant_bindings WHERE tool_name = ?', tool);
  }
  return revoked;
}

/** Remove grants (and bindings) of these MCP tool names from every agent (one transaction). */
export async function revokeMcpGrants(toolNames: string[]): Promise<RevokedGrant[]> {
  if (toolNames.length === 0) return [];
  return sql().tx(() => revokeMcpGrantsStep(toolNames));
}

/** SQLite only: revokeMcpGrants inside the caller's synchronous SQLite transaction. */
export function revokeMcpGrantsSync(toolNames: string[]): RevokedGrant[] {
  if (toolNames.length === 0) return [];
  return sqliteSync(revokeMcpGrantsStep(toolNames));
}

/** All granted tool names that start with this server's prefix (`mcp__<server>__`). */
export async function grantedNamesWithPrefix(prefix: string): Promise<string[]> {
  const rows = await sql().read(all<{ tool_name: string }>(`
    SELECT tool_name FROM agent_tool_grants WHERE substr(tool_name, 1, ?) = ?
    UNION SELECT tool_name FROM mcp_grant_bindings WHERE substr(tool_name, 1, ?) = ?
    ORDER BY 1
  `, prefix.length, prefix, prefix.length, prefix));
  return rows.map((r) => r.tool_name);
}
