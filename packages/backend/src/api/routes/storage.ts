/**
 * Storage API Routes — Cache + CDN file management
 *
 * GET    /api/storage              list/search files
 * POST   /api/storage/upload       upload a file (multipart)
 * POST   /api/storage/cleanup      trigger cleanup of expired files
 * GET    /api/storage/stats        storage statistics
 * GET    /api/storage/:id          serve file content
 * GET    /api/storage/:id/info     file metadata (JSON)
 * DELETE /api/storage/:id          delete file + manifest entry
 */

import type { FastifyInstance } from 'fastify';
import { getStorageManager, StorageZone, StorageTTL } from '../../services/storage-manager.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import { handleError } from '../error-handler.js';

export async function storageRoutes(fastify: FastifyInstance): Promise<void> {

  // GET /api/storage — list/search
  fastify.get('/api/storage', async (request, reply) => {
    // SECURITY: Require authentication
    getUserIdFromRequest(request);
    const { zone, category, q, tags, limit, offset } = request.query as {
      zone?: string;
      category?: string;
      q?: string;
      tags?: string;
      limit?: string;
      offset?: string;
    };

    const mgr = getStorageManager();
    const files = mgr.search({
      zone: zone as StorageZone | undefined,
      category,
      q,
      tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return reply.send({ files, total: files.length });
  });

  // POST /api/storage/cleanup — delete expired files
  fastify.post('/api/storage/cleanup', async (request, reply) => {
    // SECURITY: Require authentication
    getUserIdFromRequest(request);

    const mgr = getStorageManager();
    const result = mgr.cleanup();
    return reply.send({ success: true, ...result });
  });

  // GET /api/storage/stats
  fastify.get('/api/storage/stats', async (request, reply) => {
    // SECURITY: Require authentication
    getUserIdFromRequest(request);

    const mgr = getStorageManager();
    return reply.send(mgr.stats());
  });

  // POST /api/storage/upload — multipart file upload
  fastify.post('/api/storage/upload', async (request, reply) => {
    try {
      // SECURITY: Require authentication - prevents unrestricted upload
      getUserIdFromRequest(request);

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file provided' });
      }

      // SECURITY: Validate Content-Type (L-03)
      const ALLOWED_MIME_TYPES = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg',
        'video/mp4', 'video/webm', 'video/ogg',
        'application/pdf', 'application/json', 'text/plain', 'text/csv',
        'application/zip', 'application/x-zip-compressed',
        'model/gltf-binary', 'model/gltf+json', // GLB/GLTF files
        'application/octet-stream', // Generic binary (for GLB uploads)
      ];

      if (data.mimetype && !ALLOWED_MIME_TYPES.includes(data.mimetype)) {
        return reply.status(400).send({
          error: 'Invalid file type',
          message: `File type ${data.mimetype} is not allowed`
        });
      }

      const { zone = 'cdn', category = 'files', description, tags, ttl = 'persistent', source_url } = request.body as Record<string, string> ?? {};
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      const mgr = getStorageManager();
      const file = await mgr.save({
        zone: zone as StorageZone,
        category,
        data: buffer,
        filename: data.filename,
        mimeType: data.mimetype,
        description,
        tags: tags ? JSON.parse(tags) : [],
        ttl: ttl as StorageTTL,
        sourceUrl: source_url,
        createdBy: 'user',
      });

      return reply.send({ success: true, file, url: mgr.getPublicUrl(file.id) });
    } catch (error: any) {
      fastify.log.error('Storage upload error:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Storage] Upload failed');
    }
  });

  // GET /api/storage/:id/info — metadata only
  fastify.get<{ Params: { id: string } }>('/api/storage/:id/info', async (request, reply) => {
    const mgr = getStorageManager();
    const file = mgr.getById(request.params.id);
    if (!file) return reply.status(404).send({ error: 'Not found' });
    return reply.send({ file, url: mgr.getPublicUrl(file.id) });
  });

  // GET /api/storage/:id — serve file content
  fastify.get<{ Params: { id: string } }>('/api/storage/:id', async (request, reply) => {
    const mgr = getStorageManager();
    const result = mgr.getStream(request.params.id);
    if (!result) return reply.status(404).send({ error: 'Not found' });

    const { stream, file } = result;
    const contentType = file.mimeType ?? 'application/octet-stream';

    return reply
      .type(contentType)
      .header('Content-Disposition', `inline; filename="${file.filename}"`)
      .header('Cache-Control', file.ttl === 'persistent' ? 'public, max-age=86400' : 'no-cache')
      .send(stream);
  });

  // DELETE /api/storage/:id
  fastify.delete<{ Params: { id: string } }>('/api/storage/:id', async (request, reply) => {
    // SECURITY: Require authentication
    getUserIdFromRequest(request);

    const mgr = getStorageManager();
    const deleted = mgr.delete(request.params.id);
    if (!deleted) return reply.status(404).send({ error: 'Not found' });
    return reply.send({ success: true });
  });
}
