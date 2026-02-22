import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { handleError } from '../error-handler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

function getUserIdFromRequest(request: any): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
    return decoded.userId || null;
  } catch {
    return null;
  }
}

export async function worldBotsRoutes(fastify: FastifyInstance) {
  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/multiverse/:worldId/bots - List all bots in a world
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/api/multiverse/:worldId/bots', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const db = getDatabase();
      const { worldId } = request.params as { worldId: string };

      // Check if world exists and user has access (owner or public)
      const world = db.prepare(`
        SELECT * FROM user_worlds
        WHERE id = ? AND (user_id = ? OR is_public = 1)
      `).get(worldId, userId);

      if (!world) {
        return reply.status(404).send({ error: 'World not found or access denied' });
      }

      // Get all bots in the world with agent details
      const bots = db.prepare(`
        SELECT
          wb.*,
          a.name as agent_name,
          a.emoji as agent_emoji,
          a.avatar_url as agent_avatar_url
        FROM world_bots wb
        LEFT JOIN agents_config a ON wb.agent_id = a.id
        WHERE wb.world_id = ?
        ORDER BY wb.created_at DESC
      `).all(worldId);

      return reply.send({ bots });
    } catch (error: any) {
      fastify.log.error('Error fetching world bots:', error);
      return handleError(reply, error, 'internal', '[WorldBots] List failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // POST /api/multiverse/:worldId/bots - Add bot to world
  // ───────────────────────────────────────────────────────────────────────────
  fastify.post('/api/multiverse/:worldId/bots', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const db = getDatabase();
      const { worldId } = request.params as { worldId: string };

      // Check ownership
      const world = db.prepare('SELECT * FROM user_worlds WHERE id = ? AND user_id = ?').get(worldId, userId);
      if (!world) {
        return reply.status(404).send({ error: 'World not found or access denied' });
      }

      const body = request.body as any;
      const {
        agent_id,
        position_x = 0,
        position_y = 0,
        position_z = 0,
        rotation_y = 0,
        animation_url,
        is_active = 1
      } = body;

      if (!agent_id) {
        return reply.status(400).send({ error: 'agent_id is required' });
      }

      // Check if agent exists
      const agent = db.prepare('SELECT * FROM agents_config WHERE id = ?').get(agent_id);
      if (!agent) {
        return reply.status(404).send({ error: 'Agent not found' });
      }

      const id = randomUUID();

      db.prepare(`
        INSERT INTO world_bots (
          id, world_id, agent_id, position_x, position_y, position_z,
          rotation_y, animation_url, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, worldId, agent_id, position_x, position_y, position_z,
        rotation_y, animation_url, is_active ? 1 : 0
      );

      const bot = db.prepare(`
        SELECT
          wb.*,
          a.name as agent_name,
          a.emoji as agent_emoji,
          a.avatar_url as agent_avatar_url
        FROM world_bots wb
        LEFT JOIN agents_config a ON wb.agent_id = a.id
        WHERE wb.id = ?
      `).get(id);

      return reply.send({ bot });
    } catch (error: any) {
      fastify.log.error('Error creating world bot:', error);
      return handleError(reply, error, 'internal', '[WorldBots] Create failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PUT /api/multiverse/:worldId/bots/:botId - Update bot
  // ───────────────────────────────────────────────────────────────────────────
  fastify.put('/api/multiverse/:worldId/bots/:botId', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const db = getDatabase();
      const { worldId, botId } = request.params as { worldId: string; botId: string };

      // Check ownership of world
      const world = db.prepare('SELECT * FROM user_worlds WHERE id = ? AND user_id = ?').get(worldId, userId);
      if (!world) {
        return reply.status(404).send({ error: 'World not found or access denied' });
      }

      // Check if bot exists in this world
      const existing = db.prepare('SELECT * FROM world_bots WHERE id = ? AND world_id = ?').get(botId, worldId);
      if (!existing) {
        return reply.status(404).send({ error: 'Bot not found in this world' });
      }

      const body = request.body as any;
      const {
        position_x,
        position_y,
        position_z,
        rotation_y,
        animation_url,
        is_active
      } = body;

      const updates: string[] = [];
      const values: any[] = [];

      if (position_x !== undefined) { updates.push('position_x = ?'); values.push(position_x); }
      if (position_y !== undefined) { updates.push('position_y = ?'); values.push(position_y); }
      if (position_z !== undefined) { updates.push('position_z = ?'); values.push(position_z); }
      if (rotation_y !== undefined) { updates.push('rotation_y = ?'); values.push(rotation_y); }
      if (animation_url !== undefined) { updates.push('animation_url = ?'); values.push(animation_url); }
      if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }

      updates.push('updated_at = datetime("now")');
      values.push(botId);

      if (updates.length > 1) {
        db.prepare(`UPDATE world_bots SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      }

      const bot = db.prepare(`
        SELECT
          wb.*,
          a.name as agent_name,
          a.emoji as agent_emoji,
          a.avatar_url as agent_avatar_url
        FROM world_bots wb
        LEFT JOIN agents_config a ON wb.agent_id = a.id
        WHERE wb.id = ?
      `).get(botId);

      return reply.send({ bot });
    } catch (error: any) {
      fastify.log.error('Error updating world bot:', error);
      return handleError(reply, error, 'internal', '[WorldBots] Update failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // DELETE /api/multiverse/:worldId/bots/:botId - Remove bot from world
  // ───────────────────────────────────────────────────────────────────────────
  fastify.delete('/api/multiverse/:worldId/bots/:botId', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const db = getDatabase();
      const { worldId, botId } = request.params as { worldId: string; botId: string };

      // Check ownership of world
      const world = db.prepare('SELECT * FROM user_worlds WHERE id = ? AND user_id = ?').get(worldId, userId);
      if (!world) {
        return reply.status(404).send({ error: 'World not found or access denied' });
      }

      // Check if bot exists in this world
      const existing = db.prepare('SELECT * FROM world_bots WHERE id = ? AND world_id = ?').get(botId, worldId);
      if (!existing) {
        return reply.status(404).send({ error: 'Bot not found in this world' });
      }

      db.prepare('DELETE FROM world_bots WHERE id = ?').run(botId);
      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error('Error deleting world bot:', error);
      return handleError(reply, error, 'internal', '[WorldBots] Delete failed');
    }
  });
}
