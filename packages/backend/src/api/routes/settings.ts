/**
 * Settings API Routes
 */

import type { FastifyInstance } from 'fastify';
import { handleError } from '../error-handler.js';
import { getSettingsManager } from '../../settings/index.js';
import type { AgentSettings } from '../../settings/types.js';

export async function settingsRoutes(fastify: FastifyInstance) {
  const settingsManager = getSettingsManager();

  // GET /api/settings - Get current settings
  fastify.get('/api/settings', async (request, reply) => {
    const settings = settingsManager.getSettingsMasked();

    return {
      success: true,
      settings,
    };
  });

  // PUT /api/settings - Update settings
  fastify.put<{ Body: Partial<AgentSettings> }>(
    '/api/settings',
    async (request, reply) => {
      const updates = request.body;

      try {
        settingsManager.updateSettings(updates);

        return {
          success: true,
          message: 'Settings updated successfully',
        };
      } catch (error: any) {
        console.error('[Settings API] ❌ Update failed:', error);
        // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
        return handleError(reply, error, 'internal', '[Settings]');
      }
    }
  );

  // POST /api/settings/test - Test API connection
  fastify.post<{ Body: { provider: 'claude' | 'openai' } }>(
    '/api/settings/test',
    async (request, reply) => {
      const { provider } = request.body;
      const settings = settingsManager.getSettings();

      try {
        if (provider === 'claude') {
          const apiKey = settings.claude?.apiKey;
          if (!apiKey) {
            return reply.status(400).send({
              success: false,
              error: 'Claude API key not configured',
            });
          }

          // Test Claude API
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: settings.claude?.model || 'claude-sonnet-4-5-20250929',
              max_tokens: 10,
              messages: [{ role: 'user', content: 'test' }],
            }),
          });

          if (!response.ok) {
            const error = await response.text();
            return reply.status(400).send({
              success: false,
              error: `Claude API error: ${error}`,
            });
          }

          return {
            success: true,
            message: 'Claude API connection successful',
          };
        } else if (provider === 'openai') {
          const apiKey = settings.openai?.apiKey;
          if (!apiKey) {
            return reply.status(400).send({
              success: false,
              error: 'OpenAI API key not configured',
            });
          }

          // Test OpenAI API
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: settings.openai?.model || 'gpt-4',
              max_tokens: 10,
              messages: [{ role: 'user', content: 'test' }],
            }),
          });

          if (!response.ok) {
            const error = await response.text();
            return reply.status(400).send({
              success: false,
              error: `OpenAI API error: ${error}`,
            });
          }

          return {
            success: true,
            message: 'OpenAI API connection successful',
          };
        }

        return reply.status(400).send({
          success: false,
          error: 'Invalid provider',
        });
      } catch (error: any) {
        console.error('[Settings API] ❌ Test failed:', error);
        // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
        return handleError(reply, error, 'internal', '[Settings]');
      }
    }
  );
}

/**
 * Mask API keys (show only first/last 4 chars)
 */
function maskApiKeys(settings: AgentSettings): AgentSettings {
  const masked = { ...settings };

  if (masked.claude?.apiKey) {
    masked.claude.apiKey = maskKey(masked.claude.apiKey);
  }

  if (masked.openai?.apiKey) {
    masked.openai.apiKey = maskKey(masked.openai.apiKey);
  }

  return masked;
}

function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
