/**
 * AI World Generator Routes
 * POST /api/world-generator/ai - Generate world from text prompt
 */

import { FastifyInstance } from 'fastify';
import { q } from '../../repositories/sql-steps.js';
import { createWorldWithFile, worldsDir } from '../../repositories/user-worlds.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import { modelCall } from '../../llm/model-call.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getEnvProviderApiKey } from '../../credentials/authority.js';
import { sendInternalError } from '../error-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function worldGeneratorRoutes(fastify: FastifyInstance) {
  // ────────────────────────────────────────────────────────────────────
  // POST /api/world-generator/ai
  // Generate a 3D world from a text prompt using AI
  // ────────────────────────────────────────────────────────────────────
  fastify.post('/api/world-generator/ai', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { prompt, agent_id, is_public, max_players } = request.body as {
        prompt: string;
        agent_id: string;
        is_public?: number;
        max_players?: number;
      };

      if (!prompt || !agent_id) {
        return reply.status(400).send({ error: 'Missing prompt or agent_id' });
      }

      // Get agent details (B2.2d-10: agents live in agents_config, which is
      // instance-wide; the former `agents` table never existed, so this
      // route always failed here with a 500).
      const agent = await q.one<{ model: string | null }>('SELECT model FROM agents_config WHERE id = ?', agent_id);

      if (!agent) {
        return reply.status(404).send({ error: 'Agent not found' });
      }

      // Use Claude to analyze the prompt and generate world description
      const systemPrompt = `You are a 3D world designer. Analyze the user's prompt and create a detailed JSON description of the 3D world.

Output ONLY valid JSON in this exact format:
{
  "name": "World Name",
  "description": "Brief description",
  "objects": [
    {
      "type": "box|sphere|cylinder|plane",
      "position": [x, y, z],
      "scale": [x, y, z],
      "color": "#hexcolor",
      "label": "object name"
    }
  ],
  "lighting": {
    "ambient": "#hexcolor",
    "directional": {
      "color": "#hexcolor",
      "intensity": 0.0-2.0,
      "position": [x, y, z]
    }
  },
  "ground": {
    "size": number,
    "color": "#hexcolor"
  }
}

Create a simple but functional 3D world based on the prompt. Use basic geometric shapes.`;

      // R2.3 (Q-32d): worlds ship later as an app (D-WORLDS-LATER); until
      // then generation takes the budget-gated path, purpose
      // `world_generator`: the free local model by default; the paid model
      // provider only when the owner listed `world_generator` in
      // BACKGROUND_PAID_PURPOSES and the daily paid cap allows it.
      const apiKey = getEnvProviderApiKey('claude'); // S1.1: via the credential authority
      const result = await modelCall({ actor: userId }, {
        purpose: 'world_generator',
        prompt: `User prompt: ${prompt}

Generate the 3D world JSON description:`,
        system: systemPrompt,
        maxOutputTokens: 4096,
        temperature: 0.7,
        paid: apiKey ? { provider: 'claude', model: agent.model || 'claude-sonnet-4-5-20250929', apiKey } : null,
      });
      if (!result.ok) {
        return reply.status(503).send({
          error: result.paid
            ? 'World generation failed: the model provider did not answer'
            : 'World generation is not available: the local model did not answer (a paid model is used only when world_generator is in BACKGROUND_PAID_PURPOSES and the daily paid cap allows it)',
        });
      }
      const claudeResponse = { content: result.text };

      // Parse Claude's response
      let worldData;
      try {
        // Extract JSON from response (Claude might wrap it in markdown)
        const jsonMatch = claudeResponse.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : claudeResponse.content;
        worldData = JSON.parse(jsonStr);
      } catch (parseErr) {
        fastify.log.error({ err: parseErr }, 'Failed to parse Claude response');
        return reply.status(500).send({
          error: 'Failed to parse AI response',
          details: claudeResponse.content.substring(0, 200),
        });
      }

      // Generate a simple GLB file (placeholder for now)
      // In a real implementation, this would use Three.js + GLTFExporter
      const glbContent = JSON.stringify(worldData, null, 2);
      const timestamp = Date.now();
      const filename = `ai-world-${timestamp}.json`;

      // Save to storage
      const storagePath = worldsDir();
      if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
      }

      const filepath = path.join(storagePath, filename);
      fs.writeFileSync(filepath, glbContent);

      // Create the storage file record and the world row (one transaction;
      // the file record used columns storage_files does not have).
      const fileId = `file_${timestamp}`;
      const worldId = `world_${timestamp}`;
      await createWorldWithFile({
        worldId,
        userId,
        name: worldData.name,
        description: worldData.description || `AI-generated world from prompt: ${prompt.substring(0, 100)}`,
        isPublic: is_public ? 1 : 0, // use provided value or default to private
        maxPlayers: Number.isInteger(max_players) && (max_players as number) > 0 ? (max_players as number) : 10,
        file: { id: fileId, filename, sizeBytes: glbContent.length, description: `AI Generated: ${worldData.name}` },
      });

      return reply.send({
        success: true,
        world: {
          id: worldId,
          name: worldData.name,
          description: worldData.description,
          generated_data: worldData,
        },
      });
    } catch (error: any) {
      return sendInternalError(reply, '[WorldGenerator] POST /api/world-generator/ai', error);
    }
  });
}
