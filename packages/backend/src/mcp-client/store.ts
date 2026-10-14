/**
 * MCP server registry storage (M1): rows in mcp_servers / mcp_server_tools,
 * secret env/header values in the credential manager (S1.1). Values never
 * leave this module except to the connection code; views carry masked forms.
 */

import { getDatabase } from '../db/index.js';
import { getCredentialManager } from '../credentials/manager.js';
import { CredentialType } from '../credentials/types.js';
import { SECRET_PLACEHOLDER, isMaskedSecret } from '../credentials/secret-mask.js';
import { isExecToolsEnabled } from '../tools/exec-policy.js';
import { qualifiedToolName, type McpTransport } from './config.js';

export interface McpServerRow {
  id: string;
  name: string;
  description: string | null;
  transport: McpTransport;
  command: string | null;
  args: string | null;
  url: string | null;
  allow_remote: number;
  env_names: string | null;
  header_names: string | null;
  secret_credential_id: string | null;
  enabled: number;
  launch_hash: string | null;
  approved_launch_hash: string | null;
  approved_by: string | null;
  approved_at: string | null;
  timeout_ms: number;
  max_result_bytes: number;
  status: string;
  last_error: string | null;
  last_discovered_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface McpToolRow {
  server_id: string;
  tool_name: string;
  registry_name: string;
  title: string | null;
  description: string | null;
  input_schema: string;
  annotations: string | null;
  requires_approval: number | null;
  discovered_at: string;
}

export interface McpSecrets { env: Record<string, string>; headers: Record<string, string> }

export function parseList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function parseObject(raw: string | null): Record<string, any> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

export function getServerRow(id: string): McpServerRow | undefined {
  return getDatabase().prepare('SELECT * FROM mcp_servers WHERE id = ?').get(id) as McpServerRow | undefined;
}

export function getServerRowByName(name: string): McpServerRow | undefined {
  return getDatabase().prepare('SELECT * FROM mcp_servers WHERE name = ?').get(name) as McpServerRow | undefined;
}

export function listServerRows(): McpServerRow[] {
  return getDatabase().prepare('SELECT * FROM mcp_servers ORDER BY name').all() as McpServerRow[];
}

export function listToolRows(serverId: string): McpToolRow[] {
  return getDatabase().prepare('SELECT * FROM mcp_server_tools WHERE server_id = ? ORDER BY tool_name').all(serverId) as McpToolRow[];
}

/** True when a stdio server's exact launch spec was approved by the owner. */
export function isLaunchApproved(row: McpServerRow): boolean {
  return row.transport !== 'stdio' || (!!row.launch_hash && row.approved_launch_hash === row.launch_hash);
}

/**
 * True when the server's tools may be offered right now: enabled, and for
 * stdio the launch is approved and the server env enables exec tools.
 */
export function isServerActive(row: McpServerRow): boolean {
  if (row.enabled !== 1) return false;
  if (row.transport === 'stdio') return isLaunchApproved(row) && isExecToolsEnabled();
  return true;
}

// ---------------------------------------------------------------------------
// Secrets (credential manager)
// ---------------------------------------------------------------------------

function credentialName(serverId: string): string {
  return `mcp:${serverId}:secrets`;
}

export async function readSecrets(row: Pick<McpServerRow, 'secret_credential_id'>): Promise<McpSecrets> {
  if (!row.secret_credential_id) return { env: {}, headers: {} };
  const raw = await getCredentialManager().getValue(row.secret_credential_id);
  const parsed = JSON.parse(raw);
  return {
    env: parsed && typeof parsed.env === 'object' && parsed.env ? parsed.env : {},
    headers: parsed && typeof parsed.headers === 'object' && parsed.headers ? parsed.headers : {},
  };
}

/** Merge new values (a masked value keeps the stored one) and replace the name set. */
function merge(next: Record<string, string> | undefined, current: Record<string, string>): Record<string, string> {
  if (next === undefined) return current;
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(next)) {
    if (isMaskedSecret(value)) {
      if (Object.prototype.hasOwnProperty.call(current, name)) out[name] = current[name];
      continue; // a masked value for an unknown name carries nothing
    }
    out[name] = value;
  }
  return out;
}

/**
 * Store the server's secret values. Returns the credential id (null when
 * there is nothing to store) and the resulting names.
 */
export async function writeSecrets(
  serverId: string,
  currentCredentialId: string | null,
  input: { env?: Record<string, string>; headers?: Record<string, string> },
): Promise<{ credentialId: string | null; envNames: string[]; headerNames: string[] }> {
  const current = currentCredentialId ? await readSecrets({ secret_credential_id: currentCredentialId }) : { env: {}, headers: {} };
  const env = merge(input.env, current.env);
  const headers = merge(input.headers, current.headers);
  const manager = getCredentialManager();
  const empty = Object.keys(env).length === 0 && Object.keys(headers).length === 0;
  let credentialId = currentCredentialId;
  if (empty) {
    if (credentialId && await manager.get(credentialId)) await manager.delete(credentialId);
    credentialId = null;
  } else {
    const value = JSON.stringify({ env, headers });
    const existing = credentialId ? await manager.get(credentialId) : null;
    if (existing) {
      await manager.update(existing.id, { value });
    } else {
      const created = await manager.create({
        name: credentialName(serverId),
        type: CredentialType.SECRET,
        value,
        description: 'MCP server env/header values',
        skillId: `mcp:${serverId}`,
      });
      credentialId = created.id;
    }
  }
  return { credentialId, envNames: Object.keys(env).sort(), headerNames: Object.keys(headers).sort() };
}

export async function deleteSecrets(credentialId: string | null): Promise<void> {
  if (!credentialId) return;
  const manager = getCredentialManager();
  if (await manager.get(credentialId)) await manager.delete(credentialId);
}

// ---------------------------------------------------------------------------
// Views (what the owner API returns; secret values are masked)
// ---------------------------------------------------------------------------

export interface McpToolView {
  name: string;
  qualifiedName: string;
  registryName: string;
  title: string | null;
  description: string | null;
  inputSchema: Record<string, any> | null;
  annotations: Record<string, any> | null;
  requiresApproval: boolean;
  requiresApprovalOverride: boolean | null;
}

export interface McpServerView {
  id: string;
  name: string;
  description: string | null;
  transport: McpTransport;
  command: string | null;
  args: string[];
  url: string | null;
  allowRemote: boolean;
  env: Record<string, string>;
  headers: Record<string, string>;
  enabled: boolean;
  active: boolean;
  launchHash: string | null;
  launchApproved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  timeoutMs: number;
  maxResultBytes: number;
  status: string;
  lastError: string | null;
  lastDiscoveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  tools: McpToolView[];
}

/** Owner override, else derived: tools the server marks read-only (and not destructive) skip approval. */
export function toolRequiresApproval(row: Pick<McpToolRow, 'requires_approval' | 'annotations'>): boolean {
  if (row.requires_approval === 0) return false;
  if (row.requires_approval === 1) return true;
  const a = parseObject(row.annotations);
  return !(a?.readOnlyHint === true && a?.destructiveHint !== true);
}

export function toolView(server: Pick<McpServerRow, 'name'>, row: McpToolRow): McpToolView {
  return {
    name: row.tool_name,
    qualifiedName: qualifiedToolName(server.name, row.tool_name),
    registryName: row.registry_name,
    title: row.title,
    description: row.description,
    inputSchema: parseObject(row.input_schema),
    annotations: parseObject(row.annotations),
    requiresApproval: toolRequiresApproval(row),
    requiresApprovalOverride: row.requires_approval === null ? null : row.requires_approval === 1,
  };
}

const masked = (names: string[]) => Object.fromEntries(names.map((n) => [n, SECRET_PLACEHOLDER]));

export function serverView(row: McpServerRow): McpServerView {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    transport: row.transport,
    command: row.command,
    args: parseList(row.args),
    url: row.url,
    allowRemote: row.allow_remote === 1,
    env: masked(parseList(row.env_names)),
    headers: masked(parseList(row.header_names)),
    enabled: row.enabled === 1,
    active: isServerActive(row),
    launchHash: row.launch_hash,
    launchApproved: row.transport === 'stdio' ? isLaunchApproved(row) : true,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    timeoutMs: row.timeout_ms,
    maxResultBytes: row.max_result_bytes,
    status: row.status,
    lastError: row.last_error,
    lastDiscoveredAt: row.last_discovered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tools: listToolRows(row.id).map((t) => toolView(row, t)),
  };
}
