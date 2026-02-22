/**
 * AI World Generator Routes
 * POST /api/world-generator/ai - Generate world from text prompt
 */

import { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import { ClaudeClient } from '../../llm/claude-client.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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

      const { prompt, agent_id } = request.body as {
        prompt: string;
        agent_id: string;
      };

      if (!prompt || !agent_id) {
        return reply.status(400).send({ error: 'Missing prompt or agent_id' });
      }

      const db = getDatabase();

      // Get agent details
      const agent = db.prepare('SELECT * FROM agents WHERE id = ? AND user_id = ?')
        .get(agent_id, userId) as any;

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

      // Get API key
      const apiKey = process.env.ANTHROPIC_API_KEY || '';
      if (!apiKey) {
        return reply.status(500).send({ error: 'Anthropic API key not configured' });
      }

      // Create Claude client
      const claude = new ClaudeClient(apiKey, agent.model || 'claude-sonnet-4-5-20250929');

      // Call Claude
      const claudeResponse = await claude.sendMessage(
        [
          {
            role: 'user',
            content: `User prompt: ${prompt}

Generate the 3D world JSON description:`,
          },
        ],
        {
          systemPrompt,
          maxTokens: 4096,
          temperature: 0.7,
        }
      );

      // Parse Claude's response
      let worldData;
      try {
        // Extract JSON from response (Claude might wrap it in markdown)
        const jsonMatch = claudeResponse.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : claudeResponse.content;
        worldData = JSON.parse(jsonStr);
      } catch (parseErr) {
        fastify.log.error('Failed to parse Claude response:', parseErr);
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
      const storagePath = path.join(process.cwd(), '.data', 'storage', 'cdn', 'worlds');
      if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
      }

      const filepath = path.join(storagePath, filename);
      fs.writeFileSync(filepath, glbContent);

      // Create storage file record
      const fileId = `file_${timestamp}`;
      db.prepare(`
        INSERT INTO storage_files (id, user_id, filename, filepath, mimetype, size, zone, category, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        fileId,
        userId,
        filename,
        `/cdn/worlds/${filename}`,
        'application/json',
        glbContent.length,
        'cdn',
        'worlds',
        `AI Generated: ${worldData.name}`
      );

      // Create world record
      const worldId = `world_${timestamp}`;
      db.prepare(`
        INSERT INTO user_worlds (
          id, user_id, name, description, glb_file_id,
          is_public, max_players,
          spawn_position_x, spawn_position_y, spawn_position_z,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        worldId,
        userId,
        worldData.name,
        worldData.description || `AI-generated world from prompt: ${prompt.substring(0, 100)}`,
        fileId,
        0, // private by default
        1, // single player by default
        0, 0, 0 // spawn at origin
      );

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
      fastify.log.error('Error generating world:', error);
      return reply.status(500).send({
        error: 'Failed to generate world',
        message: error.message,
      });
    }
  });
}
