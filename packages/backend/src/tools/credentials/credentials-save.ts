/**
 * Credentials Save Tool
 *
 * Allows the AI agent to save API keys and credentials via chat.
 * User can say "Save this Claude API key: sk-xxx" and the agent will save it.
 */

import type { Tool, ToolResult } from '../types.js';
import { getDatabase } from '../../db/index.js';
import { getEncryptionService } from '../../credentials/encryption.js';

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
    const userId = context?.userId || 'default';

    console.log(`[CredentialsSave] 🔐 Saving ${service} credential for user ${userId}`);

    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      return {
        content: [{ type: 'text', text: '❌ Error: Credential value cannot be empty' }],
        error: 'Invalid credential value',
      };
    }

    try {
      const db = getDatabase();
      const encryptionService = getEncryptionService();

      // Encrypt the credential
      const { encrypted, iv, authTag } = await encryptionService.encrypt(value);

      // Store as JSON with all encryption parts
      const encryptedValue = JSON.stringify({ encrypted, iv, authTag });

      // Check if credential with same name already exists for this user
      const existing = db.prepare(`
        SELECT id FROM credentials
        WHERE user_id = ? AND name = ?
      `).get(userId, name);

      if (existing) {
        // Update existing credential
        db.prepare(`
          UPDATE credentials
          SET service = ?, encrypted_value = ?, description = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND name = ?
        `).run(service, encryptedValue, description || null, userId, name);

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
        // Insert new credential
        db.prepare(`
          INSERT INTO credentials (user_id, service, name, encrypted_value, description)
          VALUES (?, ?, ?, ?, ?)
        `).run(userId, service, name, encryptedValue, description || null);

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
      console.error(`[CredentialsSave] ❌ Error saving credential:`, error);

      return {
        content: [{ type: 'text', text: `❌ Failed to save credential: ${error.message}` }],
        error: error.message,
      };
    }
  },
};
