import type { FastifyInstance } from 'fastify';
import { handleError } from '../error-handler.js';
import { promises as fs } from 'fs';
import path from 'path';

export async function multiverseRoutes(fastify: FastifyInstance) {
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
}
