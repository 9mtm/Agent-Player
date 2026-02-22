/**
 * Agents Status API
 *
 * Shows which agents are online/connected
 */

import type { FastifyInstance } from 'fastify';
import { getSettingsManager } from '../../settings/index.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

export async function agentsStatusRoutes(fastify: FastifyInstance) {
  // GET /api/agents/status - Get status of all agents
  fastify.get('/api/agents/status', async (request, reply) => {
    const settingsManager = getSettingsManager();
    const settings = settingsManager.getSettings();

    const agents = [];

    // Check Local (Ollama)
    if (settings.local) {
      const ollamaStatus = await checkOllama(settings.local.url || OLLAMA_URL);
      agents.push({
        id: 'local',
        name: 'Ollama (Local)',
        type: 'local',
        model: settings.local.model,
        status: ollamaStatus.online ? 'online' : 'offline',
        ...ollamaStatus,
      });
    }

    // Check Claude API
    if (settings.claude?.apiKey) {
      const claudeStatus = await checkClaude(settings.claude.apiKey);
      agents.push({
        id: 'claude',
        name: 'Claude API',
        type: 'claude',
        model: settings.claude.model,
        status: claudeStatus.online ? 'online' : 'offline',
        ...claudeStatus,
      });
    }

    // Check OpenAI API
    if (settings.openai?.apiKey) {
      const openaiStatus = await checkOpenAI(settings.openai.apiKey);
      agents.push({
        id: 'openai',
        name: 'OpenAI API',
        type: 'openai',
        model: settings.openai.model,
        status: openaiStatus.online ? 'online' : 'offline',
        ...openaiStatus,
      });
    }

    // Determine active agent
    const activeAgent = agents.find((a) => a.type === settings.provider);

    return {
      success: true,
      agents,
      activeAgent: activeAgent?.id || null,
      provider: settings.provider,
    };
  });
}

/**
 * Check if Ollama is running
 */
async function checkOllama(url: string): Promise<{
  online: boolean;
  error?: string;
  version?: string;
}> {
  try {
    const response = await fetch(`${url}/api/version`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return { online: false, error: 'Ollama not responding' };
    }

    const data = await response.json();
    return { online: true, version: data.version };
  } catch (error: any) {
    return {
      online: false,
      // SECURITY: Sanitize error message to prevent info disclosure (H-09)
      error: error.name === 'TimeoutError' ? 'Connection timeout' : 'Connection failed',
    };
  }
}

/**
 * Check if Claude API is valid
 */
async function checkClaude(apiKey: string): Promise<{
  online: boolean;
  error?: string;
}> {
  try {
    // Test with minimal request
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
      signal: AbortSignal.timeout(5000),
    });

    // Any response (even 400) means API key is valid format
    // 401 means invalid key
    if (response.status === 401) {
      return { online: false, error: 'Invalid API key' };
    }

    return { online: true };
  } catch (error: any) {
    return {
      online: false,
      // SECURITY: Sanitize error message to prevent info disclosure (H-09)
      error: error.name === 'TimeoutError' ? 'Connection timeout' : 'Connection failed',
    };
  }
}

/**
 * Check if OpenAI API is valid
 */
async function checkOpenAI(apiKey: string): Promise<{
  online: boolean;
  error?: string;
}> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 401) {
      return { online: false, error: 'Invalid API key' };
    }

    if (!response.ok) {
      return { online: false, error: 'API error' };
    }

    return { online: true };
  } catch (error: any) {
    return {
      online: false,
      // SECURITY: Sanitize error message to prevent info disclosure (H-09)
      error: error.name === 'TimeoutError' ? 'Connection timeout' : 'Connection failed',
    };
  }
}
