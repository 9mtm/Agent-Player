/**
 * World Builder Routes
 * CRUD operations for world builder data
 */

import { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';

export async function worldBuilderRoutes(fastify: FastifyInstance) {
  // ────────────────────────────────────────────────────────────────────
  // GET /api/world-builder/:id
  // Get world builder data by ID
  // ────────────────────────────────────────────────────────────────────
  fastify.get('/api/world-builder/:id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };
      const db = getDatabase();

      // Get world from user_worlds table
      const world = db.prepare(`
        SELECT id, name, description, glb_file_id, created_at, updated_at
        FROM user_worlds
        WHERE id = ? AND user_id = ?
      `).get(id, userId) as any;

      if (!world) {
        return reply.status(404).send({ error: 'World not found' });
      }

      // Try to load objects from file if it exists
      let objects = [];
      if (world.glb_file_id) {
        try {
          const file = db.prepare('SELECT filepath FROM storage_files WHERE id = ?')
            .get(world.glb_file_id) as any;

          if (file && file.filepath) {
            const fs = await import('fs');
            const path = await import('path');
            const fullPath = path.join(process.cwd(), '.data', 'storage', file.filepath);

            if (fs.existsSync(fullPath)) {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const data = JSON.parse(content);
              objects = data.objects || [];
            }
          }
        } catch (err) {
          fastify.log.error('Error loading world objects:', err);
        }
      }

      return reply.send({
        world: {
          id: world.id,
          name: world.name,
          description: world.description,
          objects,
          created_at: world.created_at,
          updated_at: world.updated_at,
        },
      });
    } catch (error: any) {
      fastify.log.error('Error getting world:', error);
      return reply.status(500).send({ error: 'Failed to get world' });
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // POST /api/world-builder
  // Create new world
  // ────────────────────────────────────────────────────────────────────
  fastify.post('/api/world-builder', async (request, reply) => {
    try {
      fastify.log.info('[World Builder API] 🔍 POST /api/world-builder called');
      fastify.log.info('[World Builder API] 🔍 Request body:', JSON.stringify(request.body, null, 2));

      const userId = getUserIdFromRequest(request);
      fastify.log.info('[World Builder API] 🔍 User ID from JWT:', userId);

      if (!userId) {
        fastify.log.error('[World Builder API] ❌ Unauthorized - no user ID');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { name, description, objects } = request.body as {
        name: string;
        description?: string;
        objects: any[];
      };

      fastify.log.info('[World Builder API] 🔍 Parsed data:');
      fastify.log.info('[World Builder API] 🔍 - name:', name);
      fastify.log.info('[World Builder API] 🔍 - description:', description);
      fastify.log.info('[World Builder API] 🔍 - objects:', objects);

      if (!name) {
        fastify.log.error('[World Builder API] ❌ World name is missing!');
        return reply.status(400).send({ error: 'World name is required' });
      }

      const db = getDatabase();
      const timestamp = Date.now();
      const worldId = `world_${timestamp}`;

      fastify.log.info('[World Builder API] 🔍 Generated world ID:', worldId);

      // Save objects to file
      const fs = await import('fs');
      const path = await import('path');

      const storagePath = path.join(process.cwd(), '.data', 'storage', 'cdn', 'worlds');
      fastify.log.info('[World Builder API] 🔍 Storage path:', storagePath);

      if (!fs.existsSync(storagePath)) {
        fastify.log.info('[World Builder API] 📁 Creating storage directory...');
        fs.mkdirSync(storagePath, { recursive: true });
      }

      const filename = `world-builder-${timestamp}.json`;
      const filepath = path.join(storagePath, filename);
      const worldData = {
        name,
        description,
        objects,
        created_at: new Date().toISOString(),
      };

      fastify.log.info('[World Builder API] 💾 Writing file:', filepath);
      fs.writeFileSync(filepath, JSON.stringify(worldData, null, 2));
      fastify.log.info('[World Builder API] ✅ File written successfully');

      // Create storage file record
      const fileId = `file_${timestamp}`;
      fastify.log.info('[World Builder API] 💾 Creating storage_files record...');
      db.prepare(`
        INSERT INTO storage_files (id, zone, category, filename, filepath, mime_type, size_bytes, description, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        fileId,
        'cdn',
        'worlds',
        filename,
        `/cdn/worlds/${filename}`,
        'application/json',
        JSON.stringify(worldData).length,
        `World Builder: ${name}`,
        userId
      );
      fastify.log.info('[World Builder API] ✅ storage_files record created');

      // Create world record
      fastify.log.info('[World Builder API] 💾 Creating user_worlds record...');
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
        name,
        description || '',
        fileId,
        0, // private by default
        1, // single player
        0, 0, 0 // spawn at origin
      );
      fastify.log.info('[World Builder API] ✅ user_worlds record created');

      const response = {
        world: {
          id: worldId,
          name,
          description,
          objects,
        },
      };

      fastify.log.info('[World Builder API] ✅ POST successful!');
      fastify.log.info('[World Builder API] 🔍 Response:', JSON.stringify(response, null, 2));

      return reply.send(response);
    } catch (error: any) {
      fastify.log.error('[World Builder API] ❌ POST Error:', error);
      fastify.log.error('[World Builder API] ❌ Error message:', error.message);
      fastify.log.error('[World Builder API] ❌ Error stack:', error.stack);
      return reply.status(500).send({ error: 'Failed to create world', details: error.message });
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // PUT /api/world-builder/:id
  // Update existing world
  // ────────────────────────────────────────────────────────────────────
  fastify.put('/api/world-builder/:id', async (request, reply) => {
    try {
      fastify.log.info('[World Builder API] 🔍 PUT /api/world-builder/:id called');

      const userId = getUserIdFromRequest(request);
      fastify.log.info('[World Builder API] 🔍 User ID from JWT:', userId);

      if (!userId) {
        fastify.log.error('[World Builder API] ❌ Unauthorized - no user ID');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };
      const { name, description, objects } = request.body as {
        name: string;
        description?: string;
        objects: any[];
      };

      fastify.log.info('[World Builder API] 🔍 World ID:', id);
      fastify.log.info('[World Builder API] 🔍 Update data:', { name, description, objectsCount: objects?.length });

      const db = getDatabase();

      // Check if world exists and belongs to user
      const world = db.prepare('SELECT glb_file_id FROM user_worlds WHERE id = ? AND user_id = ?')
        .get(id, userId) as any;

      fastify.log.info('[World Builder API] 🔍 Existing world:', world);

      if (!world) {
        fastify.log.error('[World Builder API] ❌ World not found or unauthorized');
        return reply.status(404).send({ error: 'World not found' });
      }

      // Update file content
      if (world.glb_file_id) {
        fastify.log.info('[World Builder API] 💾 Updating file content...');

        const file = db.prepare('SELECT filepath FROM storage_files WHERE id = ?')
          .get(world.glb_file_id) as any;

        fastify.log.info('[World Builder API] 🔍 Storage file:', file);

        if (file && file.filepath) {
          const fs = await import('fs');
          const path = await import('path');
          const fullPath = path.join(process.cwd(), '.data', 'storage', file.filepath);

          fastify.log.info('[World Builder API] 🔍 File full path:', fullPath);

          const worldData = {
            name,
            description,
            objects,
            updated_at: new Date().toISOString(),
          };

          fs.writeFileSync(fullPath, JSON.stringify(worldData, null, 2));
          fastify.log.info('[World Builder API] ✅ File updated successfully');
        } else {
          fastify.log.warn('[World Builder API] ⚠️ No file record found for glb_file_id:', world.glb_file_id);
        }
      } else {
        fastify.log.warn('[World Builder API] ⚠️ No glb_file_id in world record');
      }

      // Update world record
      fastify.log.info('[World Builder API] 💾 Updating user_worlds record...');
      db.prepare(`
        UPDATE user_worlds
        SET name = ?, description = ?, updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).run(name, description || '', id, userId);
      fastify.log.info('[World Builder API] ✅ user_worlds record updated');

      const response = {
        world: {
          id,
          name,
          description,
          objects,
        },
      };

      fastify.log.info('[World Builder API] ✅ PUT successful!');
      fastify.log.info('[World Builder API] 🔍 Response:', JSON.stringify(response, null, 2));

      return reply.send(response);
    } catch (error: any) {
      fastify.log.error('[World Builder API] ❌ PUT Error:', error);
      fastify.log.error('[World Builder API] ❌ Error message:', error.message);
      fastify.log.error('[World Builder API] ❌ Error stack:', error.stack);
      return reply.status(500).send({ error: 'Failed to update world', details: error.message });
    }
  });
}
