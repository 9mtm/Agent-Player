/**
 * Models API Routes
 * Lists available AI models from all providers
 */

import type { FastifyInstance } from 'fastify';
import { getSettingsManager } from '../../settings/index.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

export async function modelsRoutes(fastify: FastifyInstance) {
  // GET /api/models - List ALL available models from ALL providers
  fastify.get('/api/models', async (request, reply) => {
    try {
      const settingsManager = getSettingsManager();
      const settings = settingsManager.getSettings();

      const allModels: any[] = [];

      // 1. Add Ollama models (if available)
      try {
        const response = await fetch(`${OLLAMA_URL}/api/tags`, {
          signal: AbortSignal.timeout(2000),
        });

        if (response.ok) {
          const data = await response.json() as { models: OllamaModel[] };
          const ollamaModels = data.models.map((m) => ({
            id: m.name,
            name: `🏠 ${m.name}`,
            provider: 'local',
            size: formatSize(m.size),
            modifiedAt: m.modified_at,
            details: m.details,
            available: true,
          }));
          allModels.push(...ollamaModels);
        }
      } catch (error) {
        console.log('[Models] Ollama not available');
      }

      // 2. Add Claude models (if API key configured)
      if (settings.claude?.apiKey) {
        const claudeModels = [
          {
            id: 'claude-opus-4-6',
            name: '🧠 Claude Opus 4.6',
            provider: 'claude',
            description: 'Most powerful, best for complex tasks',
            size: 'API',
            available: true,
          },
          {
            id: 'claude-sonnet-4-5-20250929',
            name: '🧠 Claude Sonnet 4.5',
            provider: 'claude',
            description: 'Balanced performance and speed',
            size: 'API',
            available: true,
          },
          {
            id: 'claude-haiku-4-5-20251001',
            name: '🧠 Claude Haiku 4.5',
            provider: 'claude',
            description: 'Fastest, great for simple tasks',
            size: 'API',
            available: true,
          },
        ];
        allModels.push(...claudeModels);
      }

      // 3. Add OpenAI models (if API key configured)
      if (settings.openai?.apiKey) {
        const openaiModels = [
          {
            id: 'gpt-4-turbo',
            name: '🤖 GPT-4 Turbo',
            provider: 'openai',
            description: 'Most capable OpenAI model',
            size: 'API',
            available: true,
          },
          {
            id: 'gpt-4',
            name: '🤖 GPT-4',
            provider: 'openai',
            description: 'Standard GPT-4 model',
            size: 'API',
            available: true,
          },
          {
            id: 'gpt-3.5-turbo',
            name: '🤖 GPT-3.5 Turbo',
            provider: 'openai',
            description: 'Fast and efficient',
            size: 'API',
            available: true,
          },
        ];
        allModels.push(...openaiModels);
      }

      // Return all models with active provider info
      return {
        models: allModels,
        activeProvider: settings.provider,
        defaultModel: settings[settings.provider]?.model || allModels[0]?.id,
      };
    } catch (error) {
      console.error('[Models] Error loading models:', error);
      return reply.status(500).send({
        error: 'Failed to load models',
        message: 'Check your configuration'
      });
    }
  });

  // GET /api/models/providers - List available providers
  fastify.get('/api/models/providers', async () => {
    const providers = [
      { name: 'ollama', available: await checkOllama() },
      { name: 'openai', available: !!process.env.OPENAI_API_KEY },
      { name: 'anthropic', available: !!process.env.ANTHROPIC_API_KEY },
    ];
    return { providers };
  });
}

// Helper: Format file size
function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)}GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)}MB`;
}

// Helper: Check if Ollama is running
async function checkOllama(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000)
    });
    return res.ok;
  } catch {
    return false;
  }
}
