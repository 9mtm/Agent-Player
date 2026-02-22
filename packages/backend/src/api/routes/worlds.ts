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

export async function worldsRoutes(fastify: FastifyInstance) {
  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/multiverse - List all worlds (user's private + public)
  // Query params: ?is_public=1 (filter only public worlds)
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/api/multiverse', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        console.log('[Worlds API] ❌ Unauthorized request - no userId');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      console.log(`[Worlds API] 🔍 Fetching worlds for user: ${userId}`);

      const db = getDatabase();
      const query = request.query as any;
      const isPublicFilter = query.is_public === '1';

      console.log(`[Worlds API] 📋 Filter: ${isPublicFilter ? 'Public only' : 'User + Public'}`);

      let worlds;
      if (isPublicFilter) {
        // Only return public worlds from all users
        worlds = db.prepare(`
          SELECT
            w.*,
            u.username as owner_name,
            sf.filepath as glb_url,
            thumb.filepath as thumbnail_url
          FROM user_worlds w
          LEFT JOIN users u ON w.user_id = u.id
          LEFT JOIN storage_files sf ON w.glb_file_id = sf.id
          LEFT JOIN storage_files thumb ON w.thumbnail_file_id = thumb.id
          WHERE w.is_public = 1
          ORDER BY w.created_at DESC
        `).all();
      } else {
        // Get user's own worlds + public worlds from others
        worlds = db.prepare(`
          SELECT
            w.*,
            u.username as owner_name,
            sf.filepath as glb_url,
            thumb.filepath as thumbnail_url
          FROM user_worlds w
          LEFT JOIN users u ON w.user_id = u.id
          LEFT JOIN storage_files sf ON w.glb_file_id = sf.id
          LEFT JOIN storage_files thumb ON w.thumbnail_file_id = thumb.id
          WHERE w.user_id = ? OR w.is_public = 1
          ORDER BY w.created_at DESC
        `).all(userId);
      }

      console.log(`[Worlds API] ✅ Found ${worlds.length} world(s)`);
      worlds.forEach((w: any) => {
        console.log(`  - ${w.name} (ID: ${w.id}, GLB: ${w.glb_url || 'none'}, Owner: ${w.owner_name})`);
      });

      return reply.send({ worlds });
    } catch (error: any) {
      console.error('[Worlds API] ❌ Error fetching worlds:', error);
      fastify.log.error('Error fetching worlds:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Worlds] List failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/multiverse/:id - Get single world details
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/api/multiverse/:id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const db = getDatabase();
      const { id } = request.params as { id: string };

      const world = db.prepare(`
        SELECT
          w.*,
          u.username as owner_name,
          sf.filepath as glb_url,
          thumb.filepath as thumbnail_url
        FROM user_worlds w
        LEFT JOIN users u ON w.user_id = u.id
        LEFT JOIN storage_files sf ON w.glb_file_id = sf.id
        LEFT JOIN storage_files thumb ON w.thumbnail_file_id = thumb.id
        WHERE w.id = ? AND (w.user_id = ? OR w.is_public = 1)
      `).get(id, userId);

      if (!world) {
        return reply.status(404).send({ error: 'World not found or access denied' });
      }

      return reply.send({ world });
    } catch (error: any) {
      fastify.log.error('Error fetching world:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Worlds] Get failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // POST /api/multiverse - Create new world
  // ───────────────────────────────────────────────────────────────────────────
  fastify.post('/api/multiverse', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const body = request.body as any;
      const {
        name,
        description,
        glb_file_id,
        thumbnail_file_id,
        is_public = 0,
        max_players = 1,
        spawn_position_x = 0,
        spawn_position_y = 0,
        spawn_position_z = 5
      } = body;

      if (!name || !glb_file_id) {
        return reply.status(400).send({ error: 'name and glb_file_id are required' });
      }

      const db = getDatabase();
      const id = randomUUID();

      db.prepare(`
        INSERT INTO user_worlds (
          id, user_id, name, description, glb_file_id, thumbnail_file_id,
          is_public, max_players, spawn_position_x, spawn_position_y, spawn_position_z
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, userId, name, description, glb_file_id, thumbnail_file_id,
        is_public ? 1 : 0, max_players, spawn_position_x, spawn_position_y, spawn_position_z
      );

      const world = db.prepare('SELECT * FROM user_worlds WHERE id = ?').get(id);
      return reply.send({ world });
    } catch (error: any) {
      fastify.log.error('Error creating world:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Worlds] Create failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PUT /api/multiverse/:id - Update world
  // ───────────────────────────────────────────────────────────────────────────
  fastify.put('/api/multiverse/:id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const db = getDatabase();
      const { id } = request.params as { id: string };

      // Check ownership
      const existing = db.prepare('SELECT * FROM user_worlds WHERE id = ? AND user_id = ?').get(id, userId);
      if (!existing) {
        return reply.status(404).send({ error: 'World not found or access denied' });
      }

      const body = request.body as any;
      const {
        name,
        description,
        glb_file_id,
        thumbnail_file_id,
        is_public,
        max_players,
        spawn_position_x,
        spawn_position_y,
        spawn_position_z
      } = body;

      const updates: string[] = [];
      const values: any[] = [];

      if (name !== undefined) { updates.push('name = ?'); values.push(name); }
      if (description !== undefined) { updates.push('description = ?'); values.push(description); }
      if (glb_file_id !== undefined) { updates.push('glb_file_id = ?'); values.push(glb_file_id); }
      if (thumbnail_file_id !== undefined) { updates.push('thumbnail_file_id = ?'); values.push(thumbnail_file_id); }
      if (is_public !== undefined) { updates.push('is_public = ?'); values.push(is_public ? 1 : 0); }
      if (max_players !== undefined) { updates.push('max_players = ?'); values.push(max_players); }
      if (spawn_position_x !== undefined) { updates.push('spawn_position_x = ?'); values.push(spawn_position_x); }
      if (spawn_position_y !== undefined) { updates.push('spawn_position_y = ?'); values.push(spawn_position_y); }
      if (spawn_position_z !== undefined) { updates.push('spawn_position_z = ?'); values.push(spawn_position_z); }

      updates.push('updated_at = datetime("now")');
      values.push(id);

      if (updates.length > 1) {
        db.prepare(`UPDATE user_worlds SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      }

      const world = db.prepare('SELECT * FROM user_worlds WHERE id = ?').get(id);
      return reply.send({ world });
    } catch (error: any) {
      fastify.log.error('Error updating world:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Worlds] Update failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // DELETE /api/multiverse/:id - Delete world
  // ───────────────────────────────────────────────────────────────────────────
  fastify.delete('/api/multiverse/:id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const db = getDatabase();
      const { id } = request.params as { id: string };

      // Check ownership
      const existing = db.prepare('SELECT * FROM user_worlds WHERE id = ? AND user_id = ?').get(id, userId);
      if (!existing) {
        return reply.status(404).send({ error: 'World not found or access denied' });
      }

      db.prepare('DELETE FROM user_worlds WHERE id = ?').run(id);
      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error('Error deleting world:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Worlds] Delete failed');
    }
  });
}
