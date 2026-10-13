/**
 * One-time approvals for risky agent tool calls (S1.3).
 *
 * Tools that send messages, delete data, spend money, install skills or
 * change credentials/settings do not run when the model calls them. The
 * registry stores a pending approval record (parameters encrypted) and the
 * agent gets a "waiting for approval" result. The owner approves (the call
 * runs exactly once, with the agent's grants re-checked at that moment) or
 * denies (it never runs). There is no blanket or automatic approval.
 *
 * Exception: in a channel turn, a send tool that the channel policy already
 * confined to the inbound conversation (or the operator's allowed_channels)
 * is the reply itself and runs without a separate approval.
 */

import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { getDatabase } from '../db/index.js';
import { getEncryptionService } from '../credentials/encryption.js';
import { isSecretKey, maskSecret } from '../credentials/secret-mask.js';
import type { Tool, ToolResult, ToolExecutionContext } from './types.js';
import { CHANNEL_SEND_TOOLS, createChannelToolPolicy, type ChannelToolPolicy } from './channel-policy.js';

export type ApprovalCategory = 'message' | 'delete' | 'money' | 'install' | 'settings' | 'other';
export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'executed' | 'failed' | 'expired';

/** Built-in and known tools that always need approval. */
export const APPROVAL_REQUIRED_TOOLS: Readonly<Record<string, ApprovalCategory>> = {
  // sending messages on the owner's behalf
  telegram_send: 'message',
  discord_send: 'message',
  slack_send: 'message',
  whatsapp_send: 'message',
  // deleting data
  storage_delete: 'delete',
  // spending money
  make_call: 'money',
  trading_execute: 'money',
  // installing code
  skill_install: 'install',
  // changing stored secrets / settings
  credentials_save: 'settings',
};

/** Pending approvals per agent before new requests are refused. */
export const MAX_PENDING_PER_AGENT = 50;
/** A pending approval older than this can no longer be approved. */
export const APPROVAL_TTL_HOURS = 24;

/** Category when the tool needs approval, else null. A tool cannot opt out. */
export function approvalCategory(tool: Pick<Tool, 'name'> & { requiresApproval?: boolean }): ApprovalCategory | null {
  const known = APPROVAL_REQUIRED_TOOLS[tool.name];
  if (known) return known;
  if (/_send$/.test(tool.name)) return 'message';
  if (tool.requiresApproval === true) return 'other';
  return null;
}

/** True when this call is a channel reply already confined by the channel policy. */
export function isConfinedChannelReply(policy: ChannelToolPolicy | undefined, name: string): boolean {
  return !!policy && Object.prototype.hasOwnProperty.call(CHANNEL_SEND_TOOLS, name)
    && CHANNEL_SEND_TOOLS[name].channel === policy.channel;
}

// ---------------------------------------------------------------------------
// Single-use execution tickets (only approveAndRun creates them)
// ---------------------------------------------------------------------------

export interface ApprovalTicket { readonly approvalId: string; readonly toolName: string }
const liveTickets = new WeakSet<ApprovalTicket>();

/** Consume a ticket for this tool. True once per ticket. */
export function consumeApprovalTicket(ticket: unknown, toolName: string): boolean {
  if (!ticket || typeof ticket !== 'object' || !liveTickets.has(ticket as ApprovalTicket)) return false;
  const t = ticket as ApprovalTicket;
  liveTickets.delete(t);
  return t.toolName === toolName;
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

const PREVIEW_MAX = 300;

function isSecretParam(key: string): boolean {
  return isSecretKey(key) || key === 'value';
}

/** Short list preview. `truncated` = lossy: the owner must open the full view. */
function previewParams(params: Record<string, any>): { preview: string; truncated: boolean } {
  const out: Record<string, unknown> = {};
  let truncated = false;
  for (const [key, value] of Object.entries(params || {})) {
    if (isSecretParam(key)) { out[key] = maskSecret(value); continue; }
    if (typeof value === 'string') {
      if (value.length > PREVIEW_MAX) { truncated = true; out[key] = `${value.slice(0, PREVIEW_MAX)}…`; }
      else out[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) out[key] = value;
    else { truncated = true; out[key] = '[object]'; }
  }
  return { preview: JSON.stringify(out), truncated };
}

/** Exact parameters for the owner's full view; only real secret fields masked (recursively). */
function maskSecretsDeep(value: unknown, depth = 0): unknown {
  if (depth > 20 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => maskSecretsDeep(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = isSecretParam(k) && v !== null && v !== undefined && v !== '' ? maskSecret(v) : maskSecretsDeep(v, depth + 1);
  }
  return out;
}

/** Deterministic JSON (sorted keys) so the hash does not depend on key order. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  const keys = Object.keys(value as object).filter((k) => (value as any)[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson((value as any)[k])}`).join(',')}}`;
}

function paramsHash(salt: string, params: unknown): string {
  return createHmac('sha256', salt).update(canonicalJson(params)).digest('hex');
}

function sameHash(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || !/^[0-9a-f]{64}$/.test(a) || !/^[0-9a-f]{64}$/.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

export interface ApprovalRecord {
  id: string;
  status: ApprovalStatus;
  agentId: string | null;
  userId: string | null;
  sessionId: string | null;
  toolName: string;
  category: string | null;
  paramsPreview: Record<string, unknown> | null;
  /** True when the preview is lossy: open the full view before approving. */
  truncated: boolean;
  channel: string | null;
  requestedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  executedAt: string | null;
  resultPreview: string | null;
  error: string | null;
}

function toRecord(row: any): ApprovalRecord {
  let preview: Record<string, unknown> | null = null;
  try { preview = row.params_preview ? JSON.parse(row.params_preview) : null; } catch { preview = null; }
  let channel: string | null = null;
  try { channel = row.origin ? JSON.parse(row.origin).channel ?? null : null; } catch { channel = null; }
  return {
    id: row.id,
    status: row.status,
    agentId: row.agent_id,
    userId: row.user_id,
    sessionId: row.session_id,
    toolName: row.tool_name,
    category: row.category,
    paramsPreview: preview,
    truncated: row.preview_truncated === 1,
    channel,
    requestedAt: row.requested_at,
    decidedAt: row.decided_at,
    decidedBy: row.decided_by,
    executedAt: row.executed_at,
    resultPreview: row.result_preview,
    error: row.error,
  };
}

function expireOld(): void {
  getDatabase().prepare(
    `UPDATE tool_approvals SET status = 'expired' WHERE status = 'pending' AND requested_at < datetime('now', ?)`
  ).run(`-${APPROVAL_TTL_HOURS} hours`);
}

/**
 * Store a pending approval for a tool call and return the result the agent
 * sees. Nothing is executed here.
 */
export async function requestApproval(
  tool: Tool,
  params: Record<string, any>,
  context: ToolExecutionContext,
  category: ApprovalCategory
): Promise<ToolResult> {
  const db = getDatabase();
  const agentId = context.agentId ?? null;
  const pending = (db.prepare(
    `SELECT COUNT(*) AS n FROM tool_approvals WHERE status = 'pending' AND agent_id IS ?`
  ).get(agentId) as { n: number }).n;
  if (pending >= MAX_PENDING_PER_AGENT) {
    return {
      content: [{ type: 'text', text: `Tool "${tool.name}" was not run: too many approval requests are already waiting for the owner. Do not retry; tell the user.` }],
      error: 'Too many pending approvals',
    };
  }

  const { encrypted, iv, authTag } = await getEncryptionService().encrypt(JSON.stringify(params ?? {}));
  const id = randomUUID();
  const salt = randomBytes(16).toString('hex');
  const hash = paramsHash(salt, params ?? {});
  const { preview, truncated } = previewParams(params);
  const policy = context.toolPolicy;
  const origin = policy
    ? JSON.stringify({ channel: policy.channel, conversationId: policy.conversationId, allowedDestinations: policy.allowedDestinations })
    : null;
  db.prepare(`
    INSERT INTO tool_approvals (id, status, agent_id, user_id, session_id, tool_name, category,
      params_encrypted, params_iv, params_tag, params_preview, origin, delegated_from,
      params_hash, params_salt, preview_truncated)
    VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, agentId, context.userId ?? null, context.sessionId ?? null, tool.name, category,
    encrypted, iv, authTag, preview, origin,
    context.delegatedFrom?.length ? JSON.stringify(context.delegatedFrom) : null,
    hash, salt, truncated ? 1 : 0,
  );
  console.log(`[Approvals] ⏸️  Pending approval ${id} for ${tool.name} (agent ${agentId ?? '(none)'})`);

  return {
    content: [{
      type: 'text',
      text: `Waiting for owner approval: "${tool.name}" was NOT run. Approval request ${id} is pending; ` +
        `the owner must approve it once before it runs. Do not call this tool again for the same action; ` +
        `tell the user it is waiting for approval.`,
    }],
    details: { status: 'pending_approval', approvalId: id, tool: tool.name, category },
  };
}

export function listApprovals(filter: { status?: string; limit?: number } = {}): ApprovalRecord[] {
  expireOld();
  const limit = Math.min(Math.max(Number(filter.limit) || 100, 1), 500);
  const rows = filter.status
    ? getDatabase().prepare(`SELECT * FROM tool_approvals WHERE status = ? ORDER BY requested_at DESC LIMIT ?`).all(filter.status, limit)
    : getDatabase().prepare(`SELECT * FROM tool_approvals ORDER BY requested_at DESC LIMIT ?`).all(limit);
  return (rows as any[]).map(toRecord);
}

export function getApproval(id: string): ApprovalRecord | null {
  expireOld();
  const row = getDatabase().prepare('SELECT * FROM tool_approvals WHERE id = ?').get(id);
  return row ? toRecord(row) : null;
}

export interface ApprovalDetail extends ApprovalRecord {
  /** Exact parameters that will run; only real secret fields are masked. */
  params: unknown;
  /** Send this back with the approve call; binds the approval to these parameters. */
  paramsHash: string | null;
}

/** Full view for the owner (decrypts the stored parameters). */
export async function getApprovalDetail(id: string): Promise<ApprovalDetail | null> {
  expireOld();
  const row = getDatabase().prepare('SELECT * FROM tool_approvals WHERE id = ?').get(id) as any;
  if (!row) return null;
  let params: unknown = null;
  try {
    params = maskSecretsDeep(JSON.parse(await getEncryptionService().decrypt(row.params_encrypted, row.params_iv, row.params_tag)));
  } catch {
    params = null;
  }
  return { ...toRecord(row), params, paramsHash: row.params_hash ?? null };
}

export class ApprovalStateError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

/** Deny a pending approval. It will never run. */
export function denyApproval(id: string, ownerId: string): ApprovalRecord {
  expireOld();
  const res = getDatabase().prepare(
    `UPDATE tool_approvals SET status = 'denied', decided_at = datetime('now'), decided_by = ? WHERE id = ? AND status = 'pending'`
  ).run(ownerId, id);
  const record = getApproval(id);
  if (!record) throw new ApprovalStateError('Approval not found', 404);
  if (res.changes !== 1) throw new ApprovalStateError(`Approval is ${record.status}, not pending`, 409);
  return record;
}

/**
 * Approve once and run the stored call. The pending -> approved transition
 * is atomic, so concurrent approvals run it at most once. The agent's grants,
 * the exec gate and (for channel turns) the channel policy are checked again.
 */
export async function approveAndRun(id: string, ownerId: string, expectedHash: unknown): Promise<{ record: ApprovalRecord; result: ToolResult }> {
  expireOld();
  const db = getDatabase();
  const current = db.prepare('SELECT status, params_hash FROM tool_approvals WHERE id = ?').get(id) as { status: string; params_hash: string | null } | undefined;
  if (!current) throw new ApprovalStateError('Approval not found', 404);
  if (current.status === 'pending' && !sameHash(current.params_hash, expectedHash)) {
    // The owner must approve exactly what they saw in the full view.
    throw new ApprovalStateError('paramsHash does not match the stored parameters; open the full view and approve again', 409);
  }
  const claimed = db.prepare(
    `UPDATE tool_approvals SET status = 'approved', decided_at = datetime('now'), decided_by = ? WHERE id = ? AND status = 'pending' AND params_hash = ?`
  ).run(ownerId, id, typeof expectedHash === 'string' ? expectedHash : '');
  const row = db.prepare('SELECT * FROM tool_approvals WHERE id = ?').get(id) as any;
  if (!row) throw new ApprovalStateError('Approval not found', 404);
  if (claimed.changes !== 1) throw new ApprovalStateError(`Approval is ${row.status}, not pending`, 409);

  const finish = (status: 'executed' | 'failed', resultPreview: string | null, error: string | null) => {
    db.prepare(`UPDATE tool_approvals SET status = ?, executed_at = datetime('now'), result_preview = ?, error = ? WHERE id = ?`)
      .run(status, resultPreview, error, id);
  };

  let params: Record<string, any>;
  try {
    const plain = await getEncryptionService().decrypt(row.params_encrypted, row.params_iv, row.params_tag);
    params = JSON.parse(plain);
    if (!row.params_salt || !sameHash(paramsHash(row.params_salt, params), row.params_hash)) {
      finish('failed', null, 'Stored parameters changed after the request');
      const result: ToolResult = { content: [{ type: 'text', text: 'Approval failed: the parameters changed after the request; nothing was run.' }], error: 'params mismatch' };
      return { record: getApproval(id)!, result };
    }
  } catch {
    finish('failed', null, 'Stored parameters could not be decrypted');
    const result: ToolResult = { content: [{ type: 'text', text: 'Approval failed: stored parameters could not be read.' }], error: 'decrypt failed' };
    return { record: getApproval(id)!, result };
  }

  let toolPolicy: ChannelToolPolicy | undefined;
  try {
    toolPolicy = row.origin ? createChannelToolPolicy(JSON.parse(row.origin)) : undefined;
  } catch {
    toolPolicy = createChannelToolPolicy({});
  }
  let delegatedFrom: string[] = [];
  try { delegatedFrom = row.delegated_from ? JSON.parse(row.delegated_from) : []; } catch { delegatedFrom = ['(invalid)']; }

  const { createToolsRegistry } = await import('./index.js');
  const registry = createToolsRegistry({
    workspaceDir: process.cwd(),
    userId: row.user_id ?? undefined,
    sessionId: row.session_id ?? undefined,
    agentId: row.agent_id ?? undefined,
    delegatedFrom,
    toolPolicy,
  });
  const ticket: ApprovalTicket = Object.freeze({ approvalId: id, toolName: row.tool_name });
  liveTickets.add(ticket);
  let result: ToolResult;
  try {
    result = await registry.execute(row.tool_name, params, { approvalTicket: ticket });
  } finally {
    liveTickets.delete(ticket);
  }
  const text = (result.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('\n');
  finish(result.error ? 'failed' : 'executed', text.slice(0, 500) || null, result.error ? String(result.error).slice(0, 300) : null);
  return { record: getApproval(id)!, result };
}
