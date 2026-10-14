/**
 * Agent Configurations API
 * CRUD for named agent profiles (name, system prompt, model, capabilities)
 *
 * Names (CORE-02): a new agent without a name gets a random name in the
 * onboarding language; every name used at creation or rename is reserved
 * company-wide for good (used_agent_names), so it never repeats, even after
 * the agent is deleted. POST /api/agents/name-suggestion (owner/admin)
 * returns a suggestion without reserving it.
 */

import type { FastifyInstance, FastifyReply } from 'fastify';
import { randomBytes } from 'node:crypto';
import { getDatabase } from '../../db/index.js';
import { setAgentApiKey, removeAgentApiKey } from '../../credentials/authority.js';
import { SECRET_PLACEHOLDER } from '../../credentials/secret-mask.js';
import {
  AgentNameInputError,
  AgentNameTakenError,
  normalizeAgentName,
  reserveAgentName,
  resolveNamingLanguage,
  suggestAgentName,
  validateAgentName,
  validateExclude,
} from '../../services/agent-names.js';
import { SMALL_AGENT_ID } from '../../services/small-agent.js';
import { VersionInputError, etag, expectedVersionFrom } from '../concurrency.js';
import { isoUtc } from '../timestamps.js';

/**
 * MCP-01b: the small local agent is a reserved, owner-controlled agent.
 * Only the owner may change, delete or promote it (its prompt and model are
 * ignored by the executor anyway; an edited row makes its cards ask for review).
 */
function reservedAgentGuard(id: string, req: { authUser?: { role: string } | null }, reply: FastifyReply): FastifyReply | null {
  if (id !== SMALL_AGENT_ID) return null;
  if (req.authUser?.role !== 'owner') {
    return reply.status(403).send({ error: 'The small local agent is reserved; only the owner can change it', code: 'reserved_agent' });
  }
  return null;
}

/** Map naming errors to 400 / 409; anything else is rethrown. */
function nameErrorReply(err: unknown, reply: FastifyReply): FastifyReply | null {
  if (err instanceof AgentNameTakenError) return reply.status(409).send({ error: err.message, code: 'name_taken' });
  if (err instanceof AgentNameInputError) return reply.status(400).send({ error: err.message });
  return null;
}

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  emoji: string;
  system_prompt: string;
  model: string;
  provider: string;
  is_primary: number;
  temperature: number;
  max_tokens: number;
  capabilities: string;
  api_key: string;
  created_at: string;
  updated_at: string;
}

function parseAgent(row: AgentConfig) {
  // SECURITY (S1.1): the key lives in the encrypted credentials store; the
  // response only says whether one is set. The legacy column is never returned.
  const { api_key: _legacy, api_key_credential_id: _ref, ...rest } = row as AgentConfig & { api_key_credential_id?: string | null };
  const apiKeySet = !!(row as any).api_key_credential_id || !!(row.api_key && row.api_key.trim());
  return {
    ...rest,
    // BE-UI-01: ISO-8601 UTC with Z; `version` is the optimistic-concurrency token.
    created_at: isoUtc(row.created_at),
    updated_at: isoUtc(row.updated_at),
    version: (row as any).version ?? 1,
    isPrimary: row.is_primary === 1,
    capabilities: (() => { try { return JSON.parse(row.capabilities); } catch { return {}; } })(),
    apiKeySet,
    api_key: apiKeySet ? SECRET_PLACEHOLDER : '',
  };
}

export async function agentsConfigRoutes(fastify: FastifyInstance) {
  // POST /api/agents/name-suggestion — random unused name in the onboarding language (not reserved)
  fastify.post<{ Body: { language?: unknown; exclude?: unknown } }>(
    '/api/agents/name-suggestion', { config: { access: 'admin' } }, async (req, reply) => {
      const user = req.authUser;
      if (!user) return reply.status(401).send({ error: 'Authentication required' });
      if (user.role !== 'owner' && user.role !== 'admin') {
        return reply.status(403).send({ error: 'This action requires an owner or admin account' });
      }
      try {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const language = resolveNamingLanguage(user.id, body.language);
        return reply.send(suggestAgentName(language, validateExclude(body.exclude)));
      } catch (err) {
        const handled = nameErrorReply(err, reply);
        if (handled) return handled;
        fastify.log.error({ err }, '[AgentsConfig] Name suggestion error');
        return reply.status(500).send({ error: 'Failed to suggest a name' });
      }
    });

  // GET /api/agents — list all agents
  fastify.get('/api/agents', async (_req, reply) => {
    try {
      const db = getDatabase();
      const rows = db.prepare('SELECT * FROM agents_config ORDER BY is_primary DESC, created_at ASC').all() as AgentConfig[];
      return reply.send({ agents: rows.map(parseAgent) });
    } catch (err: any) {
      fastify.log.error('[AgentsConfig] List error:', err);
      return reply.status(500).send({ error: 'Failed to load agents' });
    }
  });

  // GET /api/agents/:id — get single agent
  fastify.get<{ Params: { id: string } }>('/api/agents/:id', async (req, reply) => {
    try {
      const db = getDatabase();
      const row = db.prepare('SELECT * FROM agents_config WHERE id = ?').get(req.params.id) as AgentConfig | undefined;
      if (!row) return reply.status(404).send({ error: 'Agent not found' });
      return reply.header('ETag', etag((row as any).version ?? 1)).send({ agent: parseAgent(row) });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to load agent' });
    }
  });

  // POST /api/agents — create agent
  fastify.post<{ Body: Partial<AgentConfig> & { capabilities?: object; language?: unknown } }>('/api/agents', async (req, reply) => {
    try {
      const db = getDatabase();
      const body = req.body || {};
      const id = `agent-${Date.now()}-${randomBytes(3).toString('hex')}`;

      // CORE-02: no name -> random name in the onboarding language. The name
      // is reserved in the same transaction as the insert.
      let name: string;
      let language: string | null = null;
      try {
        if (body.name === undefined || body.name === null || body.name === '') {
          const suggestion = suggestAgentName(resolveNamingLanguage(req.authUser?.id, body.language));
          name = suggestion.name;
          language = suggestion.language;
        } else {
          name = validateAgentName(body.name);
          if (body.language !== undefined) language = resolveNamingLanguage(req.authUser?.id, body.language);
        }
      } catch (err) {
        const handled = nameErrorReply(err, reply);
        if (handled) return handled;
        throw err;
      }

      try {
        db.transaction(() => {
          reserveAgentName(name, id, { reason: 'create', language, reservedBy: req.authUser?.id });
          db.prepare(`
        INSERT INTO agents_config (id, name, description, emoji, system_prompt, model, provider, temperature, max_tokens, capabilities, api_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')
      `).run(
        id,
        name,
        body.description || '',
        body.emoji || '🤖',
        body.system_prompt || '',
        body.model || 'claude-sonnet-4-5-20250929',
        body.provider || 'claude',
        body.temperature ?? 0.7,
        body.max_tokens ?? 4096,
        typeof body.capabilities === 'object' ? JSON.stringify(body.capabilities) : (body.capabilities || '{}'),
      );
        });
      } catch (err) {
        const handled = nameErrorReply(err, reply);
        if (handled) return handled;
        throw err;
      }

      // SECURITY (S1.1): the key goes to the encrypted credentials store only.
      if (typeof body.api_key === 'string' && body.api_key.trim()) {
        await setAgentApiKey(id, body.api_key);
      }

      const row = db.prepare('SELECT * FROM agents_config WHERE id = ?').get(id) as AgentConfig;

      return reply.status(201).send({ agent: parseAgent(row) });
    } catch (err: any) {
      fastify.log.error('[AgentsConfig] Create error:', err);
      return reply.status(500).send({ error: 'Failed to create agent' });
    }
  });

  // PUT /api/agents/:id — update agent (partial body; optimistic concurrency, BE-UI-01)
  //   body: any subset of { name, description, emoji, system_prompt, model, provider,
  //         temperature, max_tokens, capabilities, api_key } + optional expectedVersion
  //   or header If-Match: "<version>". Only the fields sent are written.
  //   409 { code: 'version_conflict', currentVersion, agent } when the version moved on.
  fastify.put<{ Params: { id: string }; Body: Partial<AgentConfig> & { capabilities?: object; expectedVersion?: number } }>('/api/agents/:id', async (req, reply) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const reserved = reservedAgentGuard(id, req, reply);
      if (reserved) return reserved;
      const raw = req.body;
      if (raw !== undefined && raw !== null && (typeof raw !== 'object' || Array.isArray(raw))) {
        return reply.status(400).send({ error: 'Body must be a JSON object' });
      }
      const body = (raw || {}) as Partial<AgentConfig> & { capabilities?: object | string; expectedVersion?: number };

      let expected: number | null;
      try {
        expected = expectedVersionFrom(body, req.headers['if-match']);
      } catch (err) {
        if (err instanceof VersionInputError) return reply.status(400).send({ error: err.message, code: 'invalid_version' });
        throw err;
      }

      const existing = db.prepare('SELECT * FROM agents_config WHERE id = ?').get(id) as (AgentConfig & { version: number }) | undefined;
      if (!existing) return reply.status(404).send({ error: 'Agent not found' });
      const conflict = (current: AgentConfig & { version: number }) => reply.status(409).header('ETag', etag(current.version)).send({
        error: 'The agent was changed by someone else; reload it and try again',
        code: 'version_conflict',
        currentVersion: current.version,
        agent: parseAgent(current),
      });
      if (expected !== null && expected !== existing.version) return conflict(existing);

      // Only the fields that were sent (partial update; no stale rewrite of the others).
      const sets: string[] = [];
      const args: unknown[] = [];
      const text = (k: 'description' | 'emoji' | 'system_prompt' | 'model' | 'provider') => {
        if (body[k] === undefined) return null;
        if (typeof body[k] !== 'string') return `${k} must be a string`;
        sets.push(`${k} = ?`); args.push(body[k]);
        return null;
      };
      const num = (k: 'temperature' | 'max_tokens') => {
        if (body[k] === undefined) return null;
        if (typeof body[k] !== 'number' || !Number.isFinite(body[k] as number)) return `${k} must be a number`;
        sets.push(`${k} = ?`); args.push(body[k]);
        return null;
      };
      for (const problem of [text('description'), text('emoji'), text('system_prompt'), text('model'), text('provider'), num('temperature'), num('max_tokens')]) {
        if (problem) return reply.status(400).send({ error: problem });
      }
      if (body.capabilities !== undefined) {
        sets.push('capabilities = ?');
        args.push(typeof body.capabilities === 'object' && body.capabilities !== null ? JSON.stringify(body.capabilities) : String(body.capabilities));
      }

      // CORE-02 / D-AGENT-RENAME: a new name must be free company-wide and is
      // reserved for good (same transaction as the update).
      let name = existing.name;
      try {
        if (body.name !== undefined) name = validateAgentName(body.name);
      } catch (err) {
        const handled = nameErrorReply(err, reply);
        if (handled) return handled;
        throw err;
      }
      const renamed = normalizeAgentName(name) !== normalizeAgentName(existing.name ?? '');
      if (body.name !== undefined && name !== existing.name) { sets.push('name = ?'); args.push(name); }

      let lost = false;
      const LOST = Symbol('version_conflict');
      try {
        db.transaction(() => {
          if (renamed) reserveAgentName(name, id, { reason: 'rename', reservedBy: req.authUser?.id });
          if (sets.length) {
            const r = db.prepare(`UPDATE agents_config SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?${expected !== null ? ' AND version = ?' : ''}`)
              .run(...args, id, ...(expected !== null ? [expected] : []));
            if (r.changes === 0) throw LOST; // rolls back the name reservation too
          }
        });
      } catch (err) {
        if (err === LOST) lost = true;
        else {
        const handled = nameErrorReply(err, reply);
        if (handled) return handled;
        throw err;
        }
      }
      if (lost) {
        const current = db.prepare('SELECT * FROM agents_config WHERE id = ?').get(id) as (AgentConfig & { version: number }) | undefined;
        if (!current) return reply.status(404).send({ error: 'Agent not found' });
        return conflict(current);
      }

      // SECURITY (S1.1): a new key goes to the encrypted credentials store; an
      // empty or masked value keeps the stored key.
      if (typeof body.api_key === 'string' && body.api_key.trim()) {
        await setAgentApiKey(id, body.api_key);
      }

      const updated = db.prepare('SELECT * FROM agents_config WHERE id = ?').get(id) as AgentConfig & { version: number };

      return reply.header('ETag', etag(updated.version)).send({ agent: parseAgent(updated) });
    } catch (err: any) {
      fastify.log.error('[AgentsConfig] Update error:', err);
      return reply.status(500).send({ error: 'Failed to update agent' });
    }
  });

  // POST /api/agents/:id/set-primary — make this agent the primary one
  fastify.post<{ Params: { id: string } }>('/api/agents/:id/set-primary', async (req, reply) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const reserved = reservedAgentGuard(id, req, reply);
      if (reserved) return reserved;

      if (!db.prepare('SELECT id FROM agents_config WHERE id = ?').get(id)) {
        return reply.status(404).send({ error: 'Agent not found' });
      }

      db.prepare('UPDATE agents_config SET is_primary = 0, updated_at = datetime(\'now\')').run();
      db.prepare('UPDATE agents_config SET is_primary = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id);

      return reply.send({ success: true });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to set primary agent' });
    }
  });

  // POST /api/agents/:id/duplicate — clone an agent
  fastify.post<{ Params: { id: string } }>('/api/agents/:id/duplicate', async (req, reply) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const original = db.prepare('SELECT * FROM agents_config WHERE id = ?').get(id) as AgentConfig | undefined;
      if (!original) return reply.status(404).send({ error: 'Agent not found' });

      const newId = `agent-${Date.now()}-${randomBytes(3).toString('hex')}`;
      // CORE-02: a copy is a new agent, so it gets its own new unique name.
      const suggestion = suggestAgentName(resolveNamingLanguage(req.authUser?.id));
      db.transaction(() => {
        reserveAgentName(suggestion.name, newId, { reason: 'duplicate', language: suggestion.language, reservedBy: req.authUser?.id });
        db.prepare(`
        INSERT INTO agents_config (id, name, description, emoji, system_prompt, model, provider, temperature, max_tokens, capabilities)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newId,
        suggestion.name,
        original.description,
        original.emoji,
        original.system_prompt,
        original.model,
        original.provider,
        original.temperature,
        original.max_tokens,
        original.capabilities,
      );
      });

      const row = db.prepare('SELECT * FROM agents_config WHERE id = ?').get(newId) as AgentConfig;
      return reply.status(201).send({ agent: parseAgent(row) });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to duplicate agent' });
    }
  });

  // DELETE /api/agents/:id — delete agent (cannot delete primary if others exist)
  fastify.delete<{ Params: { id: string } }>('/api/agents/:id', async (req, reply) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const reserved = reservedAgentGuard(id, req, reply);
      if (reserved) return reserved;
      const row = db.prepare('SELECT * FROM agents_config WHERE id = ?').get(id) as AgentConfig | undefined;
      if (!row) return reply.status(404).send({ error: 'Agent not found' });
      const totalCount = (db.prepare('SELECT COUNT(*) as cnt FROM agents_config').get() as { cnt: number }).cnt;
      if (row.is_primary === 1 && totalCount > 1) return reply.status(400).send({ error: 'Cannot delete the primary agent. Set another agent as primary first.' });

      await removeAgentApiKey(id);
      db.prepare('DELETE FROM agents_config WHERE id = ?').run(id);
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to delete agent' });
    }
  });
}
