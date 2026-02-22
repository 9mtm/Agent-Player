/**
 * Agent Configurations API
 * CRUD for named agent profiles (name, system prompt, model, capabilities)
 */

import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { getCredentialManager } from '../../credentials/manager.js';
import { CredentialType } from '../../credentials/types.js';

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
  return {
    ...row,
    isPrimary: row.is_primary === 1,
    capabilities: (() => { try { return JSON.parse(row.capabilities); } catch { return {}; } })(),
    // Mask api_key — return only whether it's set, not the actual value
    apiKeySet: !!(row.api_key && row.api_key.trim()),
    api_key: row.api_key ? '••••••••' : '',
  };
}

/** Return agent with actual api_key (for internal use by runtime) */
function parseAgentWithKey(row: AgentConfig) {
  return {
    ...parseAgent(row),
    api_key: row.api_key || '',
  };
}

/** Sync agent API key to encrypted credentials store */
async function syncApiKeyToCredentials(agentId: string, agentName: string, provider: string, apiKey: string): Promise<void> {
  if (!apiKey || !apiKey.trim()) return;

  try {
    const credManager = getCredentialManager();
    // Readable name: "max (claude)" or "my-agent (openai)"
    const credName = `${agentName} (${provider})`;

    const existing = await credManager.getByName(credName);

    if (existing) {
      await credManager.update(existing.id, { value: apiKey.trim(), description: `API key for agent: ${agentName}` });
    } else {
      await credManager.create({
        name: credName,
        type: CredentialType.API_KEY,
        value: apiKey.trim(),
        description: `API key for agent: ${agentName}`,
        skillId: agentId,
      });
    }
  } catch (err: any) {
    // Non-fatal: log but don't fail the agent save
    console.error(`[AgentsConfig] Failed to sync API key to credentials for agent ${agentId}:`, err.message);
  }
}

export async function agentsConfigRoutes(fastify: FastifyInstance) {
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
      return reply.send({ agent: parseAgent(row) });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to load agent' });
    }
  });

  // POST /api/agents — create agent
  fastify.post<{ Body: Partial<AgentConfig> & { capabilities?: object } }>('/api/agents', async (req, reply) => {
    try {
      const db = getDatabase();
      const body = req.body || {};
      const id = `agent-${Date.now()}`;

      if (!body.name) return reply.status(400).send({ error: 'name is required' });

      db.prepare(`
        INSERT INTO agents_config (id, name, description, emoji, system_prompt, model, provider, temperature, max_tokens, capabilities, api_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.name,
        body.description || '',
        body.emoji || '🤖',
        body.system_prompt || '',
        body.model || 'claude-sonnet-4-5-20250929',
        body.provider || 'claude',
        body.temperature ?? 0.7,
        body.max_tokens ?? 4096,
        typeof body.capabilities === 'object' ? JSON.stringify(body.capabilities) : (body.capabilities || '{}'),
        body.api_key || '',
      );

      const row = db.prepare('SELECT * FROM agents_config WHERE id = ?').get(id) as AgentConfig;

      // Sync API key to encrypted credentials store
      if (body.api_key && body.api_key.trim()) {
        await syncApiKeyToCredentials(id, body.name!, body.provider || 'claude', body.api_key.trim());
      }

      return reply.status(201).send({ agent: parseAgent(row) });
    } catch (err: any) {
      fastify.log.error('[AgentsConfig] Create error:', err);
      return reply.status(500).send({ error: 'Failed to create agent' });
    }
  });

  // PUT /api/agents/:id — update agent
  fastify.put<{ Params: { id: string }; Body: Partial<AgentConfig> & { capabilities?: object } }>('/api/agents/:id', async (req, reply) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const body = req.body || {};

      const existing = db.prepare('SELECT * FROM agents_config WHERE id = ?').get(id) as AgentConfig | undefined;
      if (!existing) return reply.status(404).send({ error: 'Agent not found' });

      const capStr = typeof body.capabilities === 'object'
        ? JSON.stringify(body.capabilities)
        : (body.capabilities ?? existing.capabilities);

      // Keep existing key if frontend sent empty string or the masked placeholder
      const newApiKey = (body.api_key && body.api_key.trim() && body.api_key !== '••••••••')
        ? body.api_key.trim()
        : existing.api_key;

      db.prepare(`
        UPDATE agents_config
        SET name=?, description=?, emoji=?, system_prompt=?, model=?, provider=?,
            temperature=?, max_tokens=?, capabilities=?, api_key=?, updated_at=datetime('now')
        WHERE id=?
      `).run(
        body.name ?? existing.name,
        body.description ?? existing.description,
        body.emoji ?? existing.emoji,
        body.system_prompt ?? existing.system_prompt,
        body.model ?? existing.model,
        body.provider ?? existing.provider,
        body.temperature ?? existing.temperature,
        body.max_tokens ?? existing.max_tokens,
        capStr,
        newApiKey,
        id,
      );

      const updated = db.prepare('SELECT * FROM agents_config WHERE id = ?').get(id) as AgentConfig;

      // Sync new API key to encrypted credentials store (only if a new key was provided)
      const keyWasUpdated = body.api_key && body.api_key.trim() && body.api_key !== '••••••••';
      if (keyWasUpdated) {
        await syncApiKeyToCredentials(id, updated.name, updated.provider, newApiKey);
      }

      return reply.send({ agent: parseAgent(updated) });
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

      const newId = `agent-${Date.now()}`;
      db.prepare(`
        INSERT INTO agents_config (id, name, description, emoji, system_prompt, model, provider, temperature, max_tokens, capabilities)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newId,
        `${original.name} (copy)`,
        original.description,
        original.emoji,
        original.system_prompt,
        original.model,
        original.provider,
        original.temperature,
        original.max_tokens,
        original.capabilities,
      );

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
      const row = db.prepare('SELECT * FROM agents_config WHERE id = ?').get(id) as AgentConfig | undefined;
      if (!row) return reply.status(404).send({ error: 'Agent not found' });
      const totalCount = (db.prepare('SELECT COUNT(*) as cnt FROM agents_config').get() as { cnt: number }).cnt;
      if (row.is_primary === 1 && totalCount > 1) return reply.status(400).send({ error: 'Cannot delete the primary agent. Set another agent as primary first.' });

      db.prepare('DELETE FROM agents_config WHERE id = ?').run(id);
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to delete agent' });
    }
  });
}
