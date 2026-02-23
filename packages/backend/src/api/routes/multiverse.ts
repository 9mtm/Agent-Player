import type { FastifyInstance } from 'fastify';
import { handleError } from '../error-handler.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import { getDatabase } from '../../db/index.js';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function multiverseRoutes(fastify: FastifyInstance) {
  const db = getDatabase();

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/multiverse/system - List system multiverse worlds (public/multiverse/system/)
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/api/multiverse/system', async (request, reply) => {
    try {
      // Backend runs from packages/backend, so go up 2 levels to project root
      const systemPath = path.join(process.cwd(), '..', '..', 'public', 'multiverse', 'system');

      // Check if directory exists
      try {
        await fs.access(systemPath);
      } catch {
        return reply.send({ worlds: [] });
      }

      // Read all GLB files
      const files = await fs.readdir(systemPath);
      const glbFiles = files.filter(f => f.endsWith('.glb'));

      const worlds = glbFiles.map(filename => ({
        id: `system_${filename.replace('.glb', '')}`,
        name: filename.replace('.glb', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `System world: ${filename}`,
        glb_url: `/multiverse/system/${filename}`,
        thumbnail_url: null,
        is_public: 1,
        is_system: true,
        owner_name: 'System',
        created_at: new Date().toISOString()
      }));

      return reply.send({ worlds });
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Multiverse] Fetch system worlds failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/multiverse - List user's worlds OR public worlds
  // Query params: ?is_public=1 to get all public worlds
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/api/multiverse', async (request, reply) => {
    try {
      const { is_public } = request.query as { is_public?: string };

      // If requesting public worlds, no auth required
      if (is_public === '1') {
        const worlds = db.prepare(`
          SELECT
            w.*,
            u.full_name as owner_name,
            sf.filepath as glb_url,
            st.filepath as thumbnail_url
          FROM user_worlds w
          JOIN users u ON w.user_id = u.id
          LEFT JOIN storage_files sf ON w.glb_file_id = sf.id
          LEFT JOIN storage_files st ON w.thumbnail_file_id = st.id
          WHERE w.is_public = 1
          ORDER BY w.created_at DESC
        `).all();

        return reply.send({ worlds });
      }

      // For user's own worlds, auth required
      let userId: string;
      try {
        userId = getUserIdFromRequest(request);
      } catch (err) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const worlds = db.prepare(`
        SELECT
          w.*,
          u.full_name as owner_name,
          sf.filepath as glb_url,
          st.filepath as thumbnail_url
        FROM user_worlds w
        JOIN users u ON w.user_id = u.id
        LEFT JOIN storage_files sf ON w.glb_file_id = sf.id
        LEFT JOIN storage_files st ON w.thumbnail_file_id = st.id
        WHERE w.user_id = ?
        ORDER BY w.created_at DESC
      `).all(userId);

      return reply.send({ worlds });
    } catch (error: any) {
      return handleError(reply, error, 'internal', '[Multiverse] Fetch worlds failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/multiverse/:id - Get single world
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/api/multiverse/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      let userId: string | null = null;
      try {
        userId = getUserIdFromRequest(request);
      } catch (err) {
        // Allow anonymous access to public worlds
      }

      const world = db.prepare(`
        SELECT
          w.*,
          u.full_name as owner_name,
          sf.filepath as glb_url,
          st.filepath as thumbnail_url
        FROM user_worlds w
        JOIN users u ON w.user_id = u.id
        LEFT JOIN storage_files sf ON w.glb_file_id = sf.id
        LEFT JOIN storage_files st ON w.thumbnail_file_id = st.id
        WHERE w.id = ?
      `).get(id);

      if (!world) {
        return reply.status(404).send({ error: 'World not found' });
      }

      // Check access: owner or public world
      if (world.user_id !== userId && !world.is_public) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      return reply.send({ world });
    } catch (error: any) {
      return handleError(reply, error, 'internal', '[Multiverse] Fetch world failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // POST /api/multiverse - Create new world
  // ───────────────────────────────────────────────────────────────────────────
  fastify.post('/api/multiverse', async (request, reply) => {
    try {
      let userId: string;
      try {
        userId = getUserIdFromRequest(request);
      } catch (err) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { name, description, glb_file_id, thumbnail_file_id, is_public, max_players, spawn_position } = request.body as any;

      if (!name) {
        return reply.status(400).send({ error: 'Name required' });
      }

      const id = crypto.randomUUID();
      const spawn = spawn_position || { x: 0, y: 0, z: 0 };

      db.prepare(`
        INSERT INTO user_worlds
        (id, user_id, name, description, glb_file_id, thumbnail_file_id, is_public, max_players, spawn_position_x, spawn_position_y, spawn_position_z)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        userId,
        name,
        description || null,
        glb_file_id,
        thumbnail_file_id || null,
        is_public ? 1 : 0,
        max_players || 1,
        spawn.x,
        spawn.y,
        spawn.z
      );

      const world = db.prepare('SELECT * FROM user_worlds WHERE id = ?').get(id);
      return reply.send({ world });
    } catch (error: any) {
      return handleError(reply, error, 'internal', '[Multiverse] Create world failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PUT /api/multiverse/:id - Update world
  // ───────────────────────────────────────────────────────────────────────────
  fastify.put('/api/multiverse/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      let userId: string;
      try {
        userId = getUserIdFromRequest(request);
      } catch (err) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const world = db.prepare('SELECT * FROM user_worlds WHERE id = ?').get(id);
      if (!world) {
        return reply.status(404).send({ error: 'World not found' });
      }

      if (world.user_id !== userId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const { name, description, is_public, max_players } = request.body as any;

      db.prepare(`
        UPDATE user_worlds
        SET name = ?, description = ?, is_public = ?, max_players = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(name || world.name, description, is_public ? 1 : 0, max_players || world.max_players, id);

      const updated = db.prepare('SELECT * FROM user_worlds WHERE id = ?').get(id);
      return reply.send({ world: updated });
    } catch (error: any) {
      return handleError(reply, error, 'internal', '[Multiverse] Update world failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // DELETE /api/multiverse/:id - Delete world
  // ───────────────────────────────────────────────────────────────────────────
  fastify.delete('/api/multiverse/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      let userId: string;
      try {
        userId = getUserIdFromRequest(request);
      } catch (err) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const world = db.prepare('SELECT * FROM user_worlds WHERE id = ?').get(id);
      if (!world) {
        return reply.status(404).send({ error: 'World not found' });
      }

      if (world.user_id !== userId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      db.prepare('DELETE FROM user_worlds WHERE id = ?').run(id);
      return reply.send({ success: true });
    } catch (error: any) {
      return handleError(reply, error, 'internal', '[Multiverse] Delete world failed');
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BOT MANAGEMENT ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/multiverse/:worldId/bots - List bots in a world
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/api/multiverse/:worldId/bots', async (request, reply) => {
    try {
      const { worldId } = request.params as { worldId: string };

      const bots = db.prepare(`
        SELECT
          wb.*,
          a.name as agent_name,
          a.emoji as agent_emoji,
          a.avatar_url as agent_avatar_url
        FROM world_bots wb
        JOIN agents_config a ON wb.agent_id = a.id
        WHERE wb.world_id = ? AND wb.is_active = 1
        ORDER BY wb.created_at ASC
      `).all(worldId);

      return reply.send({ bots });
    } catch (error: any) {
      return handleError(reply, error, 'internal', '[Multiverse] Fetch bots failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // POST /api/multiverse/:worldId/bots - Add bot to world
  // ───────────────────────────────────────────────────────────────────────────
  fastify.post('/api/multiverse/:worldId/bots', async (request, reply) => {
    try {
      const { worldId } = request.params as { worldId: string };

      let userId: string;
      try {
        userId = getUserIdFromRequest(request);
      } catch (err) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Verify world ownership
      const world = db.prepare('SELECT * FROM user_worlds WHERE id = ?').get(worldId);
      if (!world) {
        return reply.status(404).send({ error: 'World not found' });
      }
      if (world.user_id !== userId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const {
        agent_id,
        position_x,
        position_y,
        position_z,
        rotation_y,
        behavior_type,
        patrol_path,
        movement_speed,
        animation_state
      } = request.body as any;

      if (!agent_id) {
        return reply.status(400).send({ error: 'Agent ID required' });
      }

      const id = crypto.randomUUID();

      db.prepare(`
        INSERT INTO world_bots
        (id, world_id, agent_id, position_x, position_y, position_z, rotation_y,
         behavior_type, patrol_path, movement_speed, animation_state, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        id,
        worldId,
        agent_id,
        position_x || 0,
        position_y || 0,
        position_z || 0,
        rotation_y || 0,
        behavior_type || 'static',
        patrol_path || null,
        movement_speed || 1.0,
        animation_state || 'idle'
      );

      const bot = db.prepare(`
        SELECT
          wb.*,
          a.name as agent_name,
          a.emoji as agent_emoji,
          a.avatar_url as agent_avatar_url
        FROM world_bots wb
        JOIN agents_config a ON wb.agent_id = a.id
        WHERE wb.id = ?
      `).get(id);

      return reply.send({ bot });
    } catch (error: any) {
      return handleError(reply, error, 'internal', '[Multiverse] Add bot failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PUT /api/multiverse/:worldId/bots/:botId - Update bot
  // ───────────────────────────────────────────────────────────────────────────
  fastify.put('/api/multiverse/:worldId/bots/:botId', async (request, reply) => {
    try {
      const { worldId, botId } = request.params as { worldId: string; botId: string };

      let userId: string;
      try {
        userId = getUserIdFromRequest(request);
      } catch (err) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Verify world ownership
      const world = db.prepare('SELECT * FROM user_worlds WHERE id = ?').get(worldId);
      if (!world || world.user_id !== userId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const bot = db.prepare('SELECT * FROM world_bots WHERE id = ? AND world_id = ?').get(botId, worldId);
      if (!bot) {
        return reply.status(404).send({ error: 'Bot not found' });
      }

      const {
        position_x,
        position_y,
        position_z,
        rotation_y,
        behavior_type,
        patrol_path,
        movement_speed,
        animation_state
      } = request.body as any;

      db.prepare(`
        UPDATE world_bots
        SET position_x = ?, position_y = ?, position_z = ?, rotation_y = ?,
            behavior_type = ?, patrol_path = ?, movement_speed = ?, animation_state = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(
        position_x ?? bot.position_x,
        position_y ?? bot.position_y,
        position_z ?? bot.position_z,
        rotation_y ?? bot.rotation_y,
        behavior_type || bot.behavior_type,
        patrol_path || bot.patrol_path,
        movement_speed ?? bot.movement_speed,
        animation_state || bot.animation_state,
        botId
      );

      const updated = db.prepare(`
        SELECT
          wb.*,
          a.name as agent_name,
          a.emoji as agent_emoji,
          a.avatar_url as agent_avatar_url
        FROM world_bots wb
        JOIN agents_config a ON wb.agent_id = a.id
        WHERE wb.id = ?
      `).get(botId);

      return reply.send({ bot: updated });
    } catch (error: any) {
      return handleError(reply, error, 'internal', '[Multiverse] Update bot failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // DELETE /api/multiverse/:worldId/bots/:botId - Remove bot
  // ───────────────────────────────────────────────────────────────────────────
  fastify.delete('/api/multiverse/:worldId/bots/:botId', async (request, reply) => {
    try {
      const { worldId, botId } = request.params as { worldId: string; botId: string };

      let userId: string;
      try {
        userId = getUserIdFromRequest(request);
      } catch (err) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Verify world ownership
      const world = db.prepare('SELECT * FROM user_worlds WHERE id = ?').get(worldId);
      if (!world || world.user_id !== userId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      db.prepare('DELETE FROM world_bots WHERE id = ? AND world_id = ?').run(botId, worldId);
      return reply.send({ success: true });
    } catch (error: any) {
      return handleError(reply, error, 'internal', '[Multiverse] Delete bot failed');
    }
  });
}
