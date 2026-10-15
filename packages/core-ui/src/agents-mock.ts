import { namingKey, validatedDisplayName } from './naming';
import { validVersion } from './agents';
import type { PublicAgent } from './agents';
import type { WireRequest, WireResponse } from './session';
import type { CreateBody } from './hire';

/** Fictional tools for offline practice only. */
const mockTools = [
  { name: 'memory_search', description: 'Search what the agent remembers.', execClass: false, allowedByServer: true, requiresApproval: false },
  { name: 'memory_save', description: 'Save a new memory.', execClass: false, allowedByServer: true, requiresApproval: false },
  { name: 'memory_forget', description: 'Forget a memory.', execClass: false, allowedByServer: true, requiresApproval: true },
  { name: 'storage_search', description: 'Search stored files.', execClass: false, allowedByServer: true, requiresApproval: false },
  { name: 'web_fetch', description: 'Read a public web page.', execClass: false, allowedByServer: true, requiresApproval: false },
  { name: 'telegram_send', description: 'Send a Telegram message.', execClass: false, allowedByServer: true, requiresApproval: true },
  { name: 'exec', description: 'Run a shell command.', execClass: true, allowedByServer: false, requiresApproval: false },
];
const defaultGrants = ['memory_search', 'memory_save', 'memory_forget', 'storage_search'];

/** Fictional in-memory registry with atomic name/version checks and own retired-name reclamation. */
export function createAgentsMock() {
  const rows = new Map<string, Extract<PublicAgent, { name: string }>>([
    ['sample-main', { id: 'sample-main', name: 'Offline main', version: 1 }],
    ['sample-helper', { id: 'sample-helper', name: 'Offline helper', version: 1 }],
  ]);
  const registry = new Map([...rows.values()].map(a => [namingKey(a.name), a.id]));
  const grants = new Map<string, { version: number; tools: string[] }>();
  let hired = 0;
  const grantsView = (id: string, withAvailable: boolean) => {
    const g = grants.get(id) ?? { version: 1, tools: [...defaultGrants] }; grants.set(id, g);
    return { agentId: id, source: 'default', parentAgentId: null, version: g.version, grants: g.tools.map(tool => ({ tool, scopes: null })),
      ...(withAvailable ? { available: mockTools.map(t => ({ ...t, extensionId: null, mcp: null })) } : {}) };
  };
  const create = (b: CreateBody): WireResponse => {
    let name = b.name ? validatedDisplayName(b.name) : `Offline hire ${hired + 1}`;
    if (!name) return { status: 400, body: null };
    if (registry.has(namingKey(name))) { if (b.name) return { status: 409, body: { code: 'name_taken' } }; name = `${name} ${Date.now() % 1000}`; }
    const id = `hired-${++hired}`;
    const agent = { id, name, version: 1 }; rows.set(id, agent); registry.set(namingKey(name), id);
    return { status: 201, body: { agent: { ...agent, role: b.role, department: b.department ?? null } } };
  };
  const update = (id: string, name: string, expectedVersion: unknown): WireResponse => {
    if (!validVersion(expectedVersion)) return { status: 400, body: { code: 'invalid_version' } };
    const a = rows.get(id); if (!a) return { status: 404, body: null };
    if (a.version !== expectedVersion) return { status: 409, body: { code: 'version_conflict', currentVersion: a.version, agent: { ...a } } };
    const normalized = validatedDisplayName(name); if (!normalized) return { status: 400, body: null };
    const key = namingKey(normalized); const owner = registry.get(key);
    if (owner && owner !== id) return { status: 409, body: { code: 'name_taken' } };
    registry.set(key, id);
    const current = { ...a, name: normalized, version: a.version + (normalized !== a.name ? 1 : 0) }; rows.set(id, current);
    return { status: 200, body: { agent: { ...current } } };
  };
  return {
    // Test-only concurrent fictional writer, never a UI transport escape hatch.
    update,
    transport(request: WireRequest): WireResponse {
      if (request.method === 'GET' && request.path === '/api/agents') return { status: 200, body: { agents: [...rows.values()].map(a => ({ ...a })) } };
      if (request.method === 'POST' && request.path === '/api/agents/name-suggestion') {
        const b = request.body as { language: string; exclude: string[] }; let n = 1; let name = 'Offline candidate';
        while (registry.has(namingKey(name)) || b.exclude.some(x => namingKey(x) === namingKey(name))) name = `Offline candidate ${++n}`;
        return { status: 200, body: { name, language: b.language, exhausted: n > 1 } };
      }
      if (request.method === 'POST' && request.path === '/api/agents') return create(request.body as CreateBody);
      const grantsFor = /^\/api\/agents\/([^/]+)\/tool-grants$/.exec(request.path)?.[1];
      if (grantsFor) {
        if (!rows.has(grantsFor)) return { status: 404, body: null };
        if (request.method === 'GET') return { status: 200, body: grantsView(grantsFor, true) };
        const b = request.body as { grants: string[]; expectedVersion: number };
        const current = grantsView(grantsFor, false);
        if (b.expectedVersion !== current.version) return { status: 409, body: { code: 'version_conflict', currentVersion: current.version, ...current } };
        if (b.grants.some(t => !mockTools.some(m => m.name === t))) return { status: 400, body: null };
        grants.set(grantsFor, { version: current.version + 1, tools: [...b.grants] });
        return { status: 200, body: grantsView(grantsFor, false) };
      }
      const id = request.path.slice('/api/agents/'.length);
      if (request.method === 'GET') return rows.has(id) ? { status: 200, body: { agent: { ...rows.get(id) } } } : { status: 404, body: null };
      if (request.method === 'PUT') { const b = request.body as { name: string; expectedVersion: number }; return update(id, b.name, b.expectedVersion); }
      return { status: 400, body: null };
    },
  };
}
