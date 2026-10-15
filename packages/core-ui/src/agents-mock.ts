import { namingKey, validatedDisplayName } from './naming';
import { validVersion } from './agents';
import type { PublicAgent } from './agents';
import type { WireRequest, WireResponse } from './session';

/** Fictional in-memory registry with atomic name/version checks and own retired-name reclamation. */
export function createAgentsMock() {
  const rows = new Map<string, Extract<PublicAgent, { name: string }>>([
    ['sample-main', { id: 'sample-main', name: 'Offline main', version: 1 }],
    ['sample-helper', { id: 'sample-helper', name: 'Offline helper', version: 1 }],
  ]);
  const registry = new Map([...rows.values()].map(a => [namingKey(a.name), a.id]));
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
      const id = request.path.slice('/api/agents/'.length);
      if (request.method === 'GET') return rows.has(id) ? { status: 200, body: { agent: { ...rows.get(id) } } } : { status: 404, body: null };
      if (request.method === 'PUT') { const b = request.body as { name: string; expectedVersion: number }; return update(id, b.name, b.expectedVersion); }
      return { status: 400, body: null };
    },
  };
}
