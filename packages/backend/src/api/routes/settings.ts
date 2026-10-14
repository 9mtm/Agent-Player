/**
 * Settings API Routes
 */

import type { FastifyInstance } from 'fastify';
import { handleError, sendInternalError } from '../error-handler.js';
import { getSettingsManager } from '../../settings/index.js';
import type { AgentSettings } from '../../settings/types.js';
import { authorizeActiveRole, OWNER_OR_ADMIN } from '../../auth/route-guards.js';
import { getGlobalProviderApiKey } from '../../credentials/authority.js';
import { safeErrorFields } from '../../services/safe-error-log.js';
import { IsolatedModeError, ISOLATED_MODE_BODY } from '../../config/isolation.js';
import {
  providerRejectedBody,
  providerUnreachableBody,
} from '../../services/provider-test-result.js';

type TestProvider = 'claude' | 'openai';

/**
 * Send one test request to the provider (FU-04). The upstream body is never
 * read: it can echo the key or account details. Returns null on success, or
 * the client-safe failure body.
 */
async function runProviderTest(provider: TestProvider, url: string, init: RequestInit) {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    console.warn('[Settings] connection test unreachable', { provider, ...safeErrorFields(error) });
    return providerUnreachableBody();
  }
  await response.body?.cancel().catch(() => {});
  if (response.ok) return null;
  const body = providerRejectedBody(response.status);
  console.warn('[Settings] connection test failed', { provider, status: body.status, code: body.code });
  return body;
}

export async function settingsRoutes(fastify: FastifyInstance) {
  const settingsManager = getSettingsManager();

  // SECURITY (S0-Q.15): reading the (masked) provider settings needs an active
  // owner/admin; changing them (provider, URLs, API keys) and /test, which makes
  // outbound calls with the stored keys, need the active owner.

  // GET /api/settings - Get current settings
  fastify.get('/api/settings', async (request, reply) => {
    if (authorizeActiveRole(request, reply, OWNER_OR_ADMIN) === null) return reply;
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
      if (authorizeActiveRole(request, reply, ['owner']) === null) return reply;
      const updates = request.body;

      try {
        settingsManager.updateSettings(updates);

        return {
          success: true,
          message: 'Settings updated successfully',
        };
      } catch (error: any) {
        if (error instanceof IsolatedModeError) return reply.status(403).send(ISOLATED_MODE_BODY);
        // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
        return handleError(reply, error, 'internal', '[Settings]');
      }
    }
  );

  // POST /api/settings/test - Test API connection
  fastify.post<{ Body: { provider: 'claude' | 'openai' } }>(
    '/api/settings/test',
    async (request, reply) => {
      if (authorizeActiveRole(request, reply, ['owner']) === null) return reply;
      const { provider } = request.body || ({} as { provider?: string });
      const settings = settingsManager.getSettings();

      try {
        if (provider === 'claude') {
          const apiKey = getGlobalProviderApiKey('claude');
          if (!apiKey) {
            return reply.status(400).send({
              success: false,
              error: 'Claude API key not configured',
              code: 'key_not_configured',
            });
          }

          // Test Claude API
          const failure = await runProviderTest('claude', 'https://api.anthropic.com/v1/messages', {
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
          if (failure) return reply.status(400).send(failure);

          return {
            success: true,
            message: 'Claude API connection successful',
          };
        } else if (provider === 'openai') {
          const apiKey = getGlobalProviderApiKey('openai');
          if (!apiKey) {
            return reply.status(400).send({
              success: false,
              error: 'OpenAI API key not configured',
              code: 'key_not_configured',
            });
          }

          // Test OpenAI API
          const failure = await runProviderTest('openai', 'https://api.openai.com/v1/chat/completions', {
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
          if (failure) return reply.status(400).send(failure);

          return {
            success: true,
            message: 'OpenAI API connection successful',
          };
        }

        return reply.status(400).send({
          success: false,
          error: 'Invalid provider',
          code: 'invalid_provider',
        });
      } catch (error: any) {
        // SECURITY (H-ERR-01): fixed body, safe log fields only.
        return sendInternalError(reply, '[Settings] POST /api/settings/test', error);
      }
    }
  );
}
