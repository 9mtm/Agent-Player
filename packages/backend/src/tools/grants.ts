/**
 * Per-agent tool grants (S1.2).
 *
 * The tools a model is offered, and the tools the registry runs, are the
 * intersection of:
 *   server exec gate (exec-policy.ts) ∩ channel policy (channel-policy.ts)
 *   ∩ the agent's grants (this module).
 *
 * Rules:
 *  - Grants are per agent (agents_config.id), stored in agent_tool_grants.
 *  - Agents that existed before grants (profile 'legacy-pending') get, on
 *    first use, the tools registered at that time that are not exec-class,
 *    so nothing breaks for the owner. Exec-class tools always need an
 *    explicit owner grant (and the server exec gate).
 *  - Agents without a profile (created later, by any code path) get the
 *    minimal safe set DEFAULT_AGENT_TOOLS.
 *  - A registry without an agent gets DEFAULT_AGENT_TOOLS too (fail closed).
 *  - A sub-agent (profile.parent_agent_id) and a delegated run (task spawned
 *    by another agent) only get the intersection with the parent's grants:
 *    delegation never expands permissions.
 *  - Personality, prompts and model output never change grants. Only the
 *    owner grants API (S1.4) writes them.
 *  - A grant may carry scopes, e.g. {"destinations": ["123"]} for a send tool:
 *    the call's destination must be in the list.
 */

import { getDatabase } from '../db/index.js';
import type { Tool, ToolResult } from './types.js';
import { isToolExecClass } from './exec-policy.js';

export interface GrantScopes {
  /** Allowed destinations for a send/call tool (chat ids, channels, numbers). */
  destinations?: string[];
}

export interface AgentToolGrants {
  /** Agent the grants belong to; undefined = no agent (default set). */
  agentId?: string;
  /** Granted tool name -> scopes (null = no extra scope limit). */
  tools: ReadonlyMap<string, GrantScopes | null>;
}

/** Minimal safe set for new agents and for registries without an agent. */
export const DEFAULT_AGENT_TOOLS: readonly string[] = [
  'memory_search',
  'memory_save',
  'memory_reflect',
  'memory_stats',
  'memory_edit',   // CORE-05: versioned; important memories via owner-approved proposals
  'memory_delete', // CORE-05: versioned (reversible); important memories via proposals
  'storage_search',
];

/** Destination parameter of known send/call tools (for destination scopes). */
export const DESTINATION_PARAMS: Readonly<Record<string, string>> = {
  telegram_send: 'chatId',
  discord_send: 'channelId',
  slack_send: 'channel',
  whatsapp_send: 'to',
  make_call: 'toNumber',
};

/** Delegation from a principal without grants of its own: at most the default set. */
export const UNKNOWN_PRINCIPAL = '(unknown-principal)';

export const TOOL_NAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_PARENT_DEPTH = 8;

export function staticGrants(names: Iterable<string>, agentId?: string): AgentToolGrants {
  const tools = new Map<string, GrantScopes | null>();
  for (const name of names) tools.set(name, null);
  return { agentId, tools };
}

export function defaultGrants(): AgentToolGrants {
  return staticGrants(DEFAULT_AGENT_TOOLS);
}

/** Sanitize a scopes object from storage or the API. Throws on bad input. */
export function normalizeScopes(raw: unknown): GrantScopes | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('scopes must be an object');
  const out: GrantScopes = {};
  for (const key of Object.keys(raw as object)) {
    if (key !== 'destinations') throw new Error(`unknown scope "${key}"`);
  }
  const dest = (raw as any).destinations;
  if (dest !== undefined) {
    if (!Array.isArray(dest) || dest.length > 100) throw new Error('destinations must be an array (max 100)');
    out.destinations = dest.map((d: unknown) => {
      if (typeof d !== 'string' || d.length === 0 || d.length > 200) throw new Error('invalid destination');
      return d;
    });
  }
  return Object.keys(out).length ? out : null;
}

function intersectScopes(a: GrantScopes | null, b: GrantScopes | null): GrantScopes | null {
  if (!a) return b;
  if (!b) return a;
  const out: GrantScopes = {};
  if (a.destinations || b.destinations) {
    if (!a.destinations) out.destinations = [...b.destinations!];
    else if (!b.destinations) out.destinations = [...a.destinations];
    else out.destinations = a.destinations.filter((d) => b.destinations!.includes(d));
  }
  return out;
}

/** Grants of `child` limited to what `parent` has (delegation subset). */
export function intersectGrants(child: AgentToolGrants, parent: AgentToolGrants): AgentToolGrants {
  const tools = new Map<string, GrantScopes | null>();
  for (const [name, scopes] of child.tools) {
    if (!parent.tools.has(name)) continue;
    tools.set(name, intersectScopes(scopes, parent.tools.get(name) ?? null));
  }
  return { agentId: child.agentId, tools };
}

export function isToolGranted(grants: AgentToolGrants, name: string): boolean {
  return grants.tools.has(name);
}

function refusal(name: string, reason: string): ToolResult {
  return {
    content: [{ type: 'text', text: `Tool "${name}" is not permitted for this agent: ${reason}` }],
    error: 'Tool refused by agent grants',
  };
}

/**
 * Check a concrete call against the agent's grants. Returns a refusal or
 * null when the call may proceed.
 */
export function grantCallRefusal(
  grants: AgentToolGrants,
  name: string,
  tool: Pick<Tool, 'name'> & { destinationParam?: string } | undefined,
  params: Record<string, any> | undefined
): ToolResult | null {
  if (!grants.tools.has(name)) {
    return refusal(name, 'the owner has not granted it to this agent.');
  }
  const scopes = grants.tools.get(name);
  if (scopes?.destinations) {
    const param = tool?.destinationParam || DESTINATION_PARAMS[name];
    const destination = param ? params?.[param] : undefined;
    if (!param) return refusal(name, 'its destination cannot be checked against the granted destinations.');
    if (typeof destination !== 'string' || !scopes.destinations.includes(destination)) {
      return refusal(name, 'this destination is not in the granted destinations.');
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

interface ProfileRow { agent_id: string; source: string; parent_agent_id: string | null }

function agentExists(agentId: string): boolean {
  return !!getDatabase().prepare('SELECT 1 FROM agents_config WHERE id = ?').get(agentId);
}

function readProfile(agentId: string): ProfileRow | undefined {
  return getDatabase().prepare('SELECT agent_id, source, parent_agent_id FROM agent_grant_profiles WHERE agent_id = ?')
    .get(agentId) as ProfileRow | undefined;
}

function readGrantRows(agentId: string): Map<string, GrantScopes | null> {
  const rows = getDatabase().prepare('SELECT tool_name, scopes FROM agent_tool_grants WHERE agent_id = ?')
    .all(agentId) as Array<{ tool_name: string; scopes: string | null }>;
  const tools = new Map<string, GrantScopes | null>();
  for (const row of rows) {
    let scopes: GrantScopes | null = null;
    try {
      scopes = row.scopes ? normalizeScopes(JSON.parse(row.scopes)) : null;
    } catch {
      continue; // unreadable scopes: fail closed (tool not granted)
    }
    tools.set(row.tool_name, scopes);
  }
  return tools;
}

function writeGrantRows(agentId: string, entries: Array<{ tool: string; scopes: GrantScopes | null }>, by: string | null): void {
  const db = getDatabase().getDb();
  const del = db.prepare('DELETE FROM agent_tool_grants WHERE agent_id = ?');
  const ins = db.prepare('INSERT INTO agent_tool_grants (agent_id, tool_name, scopes, granted_by) VALUES (?, ?, ?, ?)');
  del.run(agentId);
  for (const e of entries) ins.run(agentId, e.tool, e.scopes ? JSON.stringify(e.scopes) : null, by);
}

/**
 * Make sure an existing agent has a grant profile; seeds legacy or default
 * grants once. `available` = tools registered right now.
 */
export function ensureGrantProfile(agentId: string, available: ReadonlyArray<Pick<Tool, 'name' | 'execClass'>>): ProfileRow | undefined {
  if (!agentExists(agentId)) return undefined;
  const db = getDatabase().getDb();
  const seed = db.transaction(() => {
    const profile = readProfile(agentId);
    if (profile && profile.source !== 'legacy-pending') return profile;
    if (profile) {
      const names = available.filter((t) => !isToolExecClass(t)).map((t) => t.name);
      writeGrantRows(agentId, names.map((tool) => ({ tool, scopes: null })), 'system:legacy');
      db.prepare(`UPDATE agent_grant_profiles SET source = 'legacy', updated_at = datetime('now') WHERE agent_id = ?`).run(agentId);
    } else {
      writeGrantRows(agentId, DEFAULT_AGENT_TOOLS.map((tool) => ({ tool, scopes: null })), 'system:default');
      db.prepare(`INSERT INTO agent_grant_profiles (agent_id, source) VALUES (?, 'default')`).run(agentId);
    }
    return readProfile(agentId);
  });
  return seed();
}

/**
 * Effective grants for an agent: its own grants, intersected with every
 * parent up the chain and with `delegatedFrom` agents (task spawners).
 * Unknown agent -> nothing granted. DB errors -> default set (fail closed).
 */
export function loadAgentGrants(
  agentId: string,
  available: ReadonlyArray<Pick<Tool, 'name' | 'execClass'>>,
  delegatedFrom: string[] = []
): AgentToolGrants {
  try {
    const own = loadOwn(agentId, available, new Set());
    let grants = own;
    for (const parent of delegatedFrom) {
      if (parent === UNKNOWN_PRINCIPAL || !parent) { grants = intersectGrants(grants, defaultGrants()); continue; }
      if (parent === agentId) continue;
      grants = intersectGrants(grants, loadOwn(parent, available, new Set()));
    }
    return grants;
  } catch (err: any) {
    console.warn(`[Grants] Could not load grants for ${agentId}: ${err?.message || 'error'}`);
    return { agentId, tools: defaultGrants().tools };
  }
}

function loadOwn(agentId: string, available: ReadonlyArray<Pick<Tool, 'name' | 'execClass'>>, seen: Set<string>): AgentToolGrants {
  const profile = ensureGrantProfile(agentId, available);
  if (!profile) return { agentId, tools: new Map() }; // unknown agent: nothing
  let grants: AgentToolGrants = { agentId, tools: readGrantRows(agentId) };
  seen.add(agentId);
  const parent = profile.parent_agent_id;
  if (parent) {
    if (seen.has(parent) || seen.size >= MAX_PARENT_DEPTH) return { agentId, tools: new Map() }; // cycle: fail closed
    grants = intersectGrants(grants, loadOwn(parent, available, seen));
  }
  return grants;
}

export interface GrantView {
  agentId: string;
  source: string;
  parentAgentId: string | null;
  grants: Array<{ tool: string; scopes: GrantScopes | null }>;
}

/** Stored grants of an agent (own, not intersected), seeding if needed. */
export function getAgentGrantView(agentId: string, available: ReadonlyArray<Pick<Tool, 'name' | 'execClass'>>): GrantView | null {
  const profile = ensureGrantProfile(agentId, available);
  if (!profile) return null;
  const tools = readGrantRows(agentId);
  return {
    agentId,
    source: profile.source,
    parentAgentId: profile.parent_agent_id,
    grants: [...tools.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([tool, scopes]) => ({ tool, scopes })),
  };
}

export class GrantValidationError extends Error {}

/**
 * Replace an agent's grants (owner API). A sub-agent may only receive a
 * subset of its parent's effective grants. Returns before/after tool names.
 */
export function setAgentGrants(
  agentId: string,
  input: { grants: unknown; parentAgentId?: unknown },
  by: string,
  available: ReadonlyArray<Pick<Tool, 'name' | 'execClass'>>
): { before: string[]; after: string[]; parentAgentId: string | null } {
  const profile = ensureGrantProfile(agentId, available);
  if (!profile) throw new GrantValidationError('Agent not found');
  if (!Array.isArray(input.grants) || input.grants.length > 500) throw new GrantValidationError('grants must be an array (max 500)');

  const entries: Array<{ tool: string; scopes: GrantScopes | null }> = [];
  const seenNames = new Set<string>();
  for (const item of input.grants) {
    const tool = typeof item === 'string' ? item : (item as any)?.tool;
    if (typeof tool !== 'string' || !TOOL_NAME_PATTERN.test(tool)) throw new GrantValidationError('invalid tool name');
    if (seenNames.has(tool)) throw new GrantValidationError(`duplicate tool "${tool}"`);
    seenNames.add(tool);
    let scopes: GrantScopes | null;
    try {
      scopes = typeof item === 'string' ? null : normalizeScopes((item as any).scopes);
    } catch (err: any) {
      throw new GrantValidationError(`${tool}: ${err.message}`);
    }
    entries.push({ tool, scopes });
  }

  let parentAgentId: string | null = profile.parent_agent_id;
  if (input.parentAgentId !== undefined) {
    if (input.parentAgentId === null || input.parentAgentId === '') parentAgentId = null;
    else if (typeof input.parentAgentId !== 'string' || !agentExists(input.parentAgentId)) throw new GrantValidationError('parent agent not found');
    else if (input.parentAgentId === agentId) throw new GrantValidationError('an agent cannot be its own parent');
    else parentAgentId = input.parentAgentId;
  }
  if (parentAgentId) {
    // No cycles: the parent's chain must not contain this agent.
    let cursor: string | null = parentAgentId;
    for (let i = 0; cursor && i < MAX_PARENT_DEPTH + 1; i++) {
      if (cursor === agentId) throw new GrantValidationError('parent chain would form a cycle');
      cursor = readProfile(cursor)?.parent_agent_id ?? null;
    }
    const parent = loadOwn(parentAgentId, available, new Set());
    for (const e of entries) {
      if (!parent.tools.has(e.tool)) throw new GrantValidationError(`"${e.tool}" is not granted to the parent agent; a sub-agent only gets a subset of its parent's grants`);
      const p = parent.tools.get(e.tool);
      if (p?.destinations) {
        const want = e.scopes?.destinations;
        if (!want || want.some((d) => !p.destinations!.includes(d))) {
          throw new GrantValidationError(`"${e.tool}" destinations must be a subset of the parent's destinations`);
        }
      }
    }
  }

  const before = [...readGrantRows(agentId).keys()].sort();
  const db = getDatabase().getDb();
  db.transaction(() => {
    writeGrantRows(agentId, entries, by);
    db.prepare(`UPDATE agent_grant_profiles SET source = 'owner', parent_agent_id = ?, updated_by = ?, updated_at = datetime('now') WHERE agent_id = ?`)
      .run(parentAgentId, by, agentId);
  })();
  return { before, after: entries.map((e) => e.tool).sort(), parentAgentId };
}
