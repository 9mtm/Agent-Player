/**
 * Credentials Save Tool
 *
 * Allows the AI agent to save API keys and credentials via chat.
 * User can say "Save this Claude API key: sk-xxx" and the agent will save it.
 */

import type { Tool, ToolResult } from '../types.js';
import { getDatabase } from '../../db/index.js';
import { getCredentialManager } from '../../credentials/manager.js';
import { CredentialType } from '../../credentials/types.js';

/**
 * F-06: the tool acts for the real user of the tool execution context only.
 * Returns the id when it belongs to an existing active user, otherwise null
 * (no 'default' or other fallback user).
 */
export function resolveToolUser(userId: unknown): string | null {
  if (typeof userId !== 'string' || userId.trim() === '') return null;
  const row = getDatabase()
    .prepare('SELECT status FROM users WHERE id = ?')
    .get(userId) as { status: string } | undefined;
  return row && row.status === 'active' ? userId : null;
}

export const credentialsSaveTool: Tool = {
  name: 'credentials_save',
  description: `Save API keys and credentials to the encrypted vault.

Use this tool when the user provides an API key or credential and asks you to save it.

Supported services:
  • claude - Claude API key (Anthropic)
  • openai - OpenAI API key
  • google - Google API key (Gemini)
  • github - GitHub Personal Access Token
  • custom - Any custom credential

The credential will be encrypted using AES-256-GCM before storage.`,

  input_schema: {
    type: 'object',
    properties: {
      service: {
        type: 'string',
        enum: ['claude', 'openai', 'google', 'github', 'custom'],
        description: 'The service this credential is for',
      },
      name: {
        type: 'string',
        description: 'A friendly name for this credential (e.g., "My Claude API Key", "Production OpenAI")',
      },
      value: {
        type: 'string',
        description: 'The actual API key or credential value',
      },
      description: {
        type: 'string',
        description: 'Optional description or notes about this credential',
      },
    },
    required: ['service', 'name', 'value'],
    examples: [
      {
        service: 'github',
        name: 'api_token',
        value: 'ghp_xxxxxxxxxxxx',
        description: 'Store GitHub API token securely',
      },
      {
        service: 'database',
        name: 'postgres_password',
        value: 'super_secret_pass',
        description: 'Production database password',
      },
      {
        service: 'openai',
        name: 'api_key',
        value: 'sk-xxxxxxxxxxxx',
        description: 'Store OpenAI API key',
      },
    ],
  },

  async execute(params, context): Promise<ToolResult> {
    const { service, name, value, description } = params;
    const userId = resolveToolUser(context?.userId);
    if (!userId) {
      return {
        content: [{ type: 'text', text: '❌ Cannot save the credential: no signed-in user for this request.' }],
        error: 'No authenticated user in the tool context',
      };
    }

    console.log(`[CredentialsSave] 🔐 Saving ${service} credential for user ${userId}`);

    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      return {
        content: [{ type: 'text', text: '❌ Error: Credential value cannot be empty' }],
        error: 'Invalid credential value',
      };
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return {
        content: [{ type: 'text', text: '❌ Error: Credential name cannot be empty' }],
        error: 'Invalid credential name',
      };
    }

    try {
      // Encrypted and owned by the user through the credential manager.
      const manager = getCredentialManager();
      const existing = await manager.getByName(name, userId);

      if (existing) {
        await manager.update(existing.id, { value, description: description || existing.description });

        console.log(`[CredentialsSave] ✅ Updated existing credential: ${name}`);

        return {
          content: [{
            type: 'text',
            text: `✅ **Credential updated successfully!**

**Service:** ${service}
**Name:** ${name}
${description ? `**Description:** ${description}` : ''}

The credential has been encrypted and saved securely. You can now use it with your agents and integrations.`,
          }],
        };
      } else {
        await manager.create({
          name,
          type: CredentialType.API_KEY,
          value,
          description: description || undefined,
          // The service this credential is for (e.g. 'claude'); lets tools find it.
          skillId: typeof service === 'string' && service ? service : 'custom',
          userId,
        });

        console.log(`[CredentialsSave] ✅ Saved new credential: ${name}`);

        return {
          content: [{
            type: 'text',
            text: `✅ **Credential saved successfully!**

**Service:** ${service}
**Name:** ${name}
${description ? `**Description:** ${description}` : ''}

The credential has been encrypted with AES-256-GCM and stored securely in the vault.

${service === 'claude' ? '\n💡 You can now use Claude models by selecting an agent and setting the provider to "Claude".' : ''}
${service === 'openai' ? '\n💡 You can now use OpenAI models (GPT-4, GPT-3.5) in your agents.' : ''}
${service === 'google' ? '\n💡 You can now use Google Gemini models in your agents.' : ''}`,
          }],
        };
      }
    } catch (error: any) {
      // Never echo the value; error messages from storage do not contain it.
      console.error(`[CredentialsSave] ❌ Error saving credential: ${error?.message}`);

      return {
        content: [{ type: 'text', text: '❌ Failed to save credential' }],
        error: 'Credential save failed',
      };
    }
  },
};
