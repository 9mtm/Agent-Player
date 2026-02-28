/**
 * Extension Marketplace API Routes
 * Handles browsing, installing, and managing extensions from the registry
 */

import type { FastifyInstance } from 'fastify';
import {
  searchMarketplace,
  getExtensionDetails,
  getExtensionVersions,
  getExtensionReviews,
  installExtension,
  uninstallExtension,
  checkForUpdates,
  submitReview,
} from '../../services/extension-marketplace.js';
import {
  queueUpdate,
  getPendingUpdates,
  processUpdate,
  cancelUpdate,
  autoQueueUpdates,
} from '../../services/extension-update-manager.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';

export async function marketplaceRoutes(fastify: FastifyInstance) {
  /**
   * Search marketplace extensions
   * GET /api/marketplace/search
   */
  fastify.get(
    '/api/marketplace/search',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Search marketplace extensions',
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query' },
            category: { type: 'string', description: 'Filter by category' },
            type: { type: 'string', enum: ['app', 'channel', 'tool', 'integration'] },
            tags: { type: 'string', description: 'Comma-separated tags' },
            featured: { type: 'boolean' },
            verified: { type: 'boolean' },
            limit: { type: 'integer', default: 50 },
            offset: { type: 'integer', default: 0 },
          },
        },
      },
    },
    async (request) => {
      const { q, category, type, tags, featured, verified, limit, offset } = request.query as any;
      const userId = getUserIdFromRequest(request);

      const result = searchMarketplace({
        query: q,
        category,
        type,
        tags: tags ? tags.split(',').map((t: string) => t.trim()) : undefined,
        featured: featured !== undefined ? Boolean(featured) : undefined,
        verified: verified !== undefined ? Boolean(verified) : undefined,
        userId,
        limit: limit || 50,
        offset: offset || 0,
      });

      return { success: true, ...result };
    }
  );

  /**
   * Get extension details
   * GET /api/marketplace/extensions/:id
   */
  fastify.get(
    '/api/marketplace/extensions/:id',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Get extension details',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as any;
      const userId = getUserIdFromRequest(request);

      const extension = getExtensionDetails(id, userId);

      if (!extension) {
        return { success: false, error: 'Extension not found' };
      }

      return { success: true, extension };
    }
  );

  /**
   * Get extension versions
   * GET /api/marketplace/extensions/:id/versions
   */
  fastify.get(
    '/api/marketplace/extensions/:id/versions',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Get extension version history',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as any;

      const versions = getExtensionVersions(id);

      return { success: true, versions };
    }
  );

  /**
   * Get extension reviews
   * GET /api/marketplace/extensions/:id/reviews
   */
  fastify.get(
    '/api/marketplace/extensions/:id/reviews',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Get extension reviews',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as any;

      const reviews = getExtensionReviews(id);

      return { success: true, reviews };
    }
  );

  /**
   * Install extension
   * POST /api/marketplace/install
   */
  fastify.post(
    '/api/marketplace/install',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Install extension from marketplace',
        body: {
          type: 'object',
          required: ['extension_id'],
          properties: {
            extension_id: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const { extension_id } = request.body as any;
      const userId = getUserIdFromRequest(request) || '1'; // Default to user 1

      const result = await installExtension(extension_id, userId);

      return result;
    }
  );

  /**
   * Uninstall extension
   * POST /api/marketplace/uninstall
   */
  fastify.post(
    '/api/marketplace/uninstall',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Uninstall extension',
        body: {
          type: 'object',
          required: ['extension_id'],
          properties: {
            extension_id: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const { extension_id } = request.body as any;
      const userId = getUserIdFromRequest(request) || '1';

      const result = await uninstallExtension(extension_id, userId);

      return result;
    }
  );

  /**
   * Check for updates
   * GET /api/marketplace/updates
   */
  fastify.get(
    '/api/marketplace/updates',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Check for extension updates',
      },
    },
    async (request) => {
      const userId = getUserIdFromRequest(request) || '1';

      const updates = checkForUpdates(userId);

      return { success: true, updates };
    }
  );

  /**
   * Submit review
   * POST /api/marketplace/reviews
   */
  fastify.post(
    '/api/marketplace/reviews',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Submit extension review',
        body: {
          type: 'object',
          required: ['extension_id', 'rating'],
          properties: {
            extension_id: { type: 'string' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            review_title: { type: 'string' },
            review_text: { type: 'string' },
            version: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const { extension_id, rating, review_title, review_text, version } = request.body as any;
      const userId = getUserIdFromRequest(request) || '1';

      const result = submitReview(extension_id, userId, rating, review_title, review_text, version);

      return result;
    }
  );

  /**
   * Queue an update
   * POST /api/marketplace/queue-update
   */
  fastify.post(
    '/api/marketplace/queue-update',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Queue an extension update',
        body: {
          type: 'object',
          required: ['extension_id', 'current_version', 'target_version'],
          properties: {
            extension_id: { type: 'string' },
            current_version: { type: 'string' },
            target_version: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const { extension_id, current_version, target_version } = request.body as any;
      const userId = getUserIdFromRequest(request) || '1';

      const result = queueUpdate(extension_id, userId, current_version, target_version);

      return result;
    }
  );

  /**
   * Get pending updates
   * GET /api/marketplace/pending-updates
   */
  fastify.get(
    '/api/marketplace/pending-updates',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Get pending extension updates',
      },
    },
    async (request) => {
      const userId = getUserIdFromRequest(request) || '1';

      const updates = getPendingUpdates(userId);

      return { success: true, updates };
    }
  );

  /**
   * Process an update
   * POST /api/marketplace/process-update/:id
   */
  fastify.post(
    '/api/marketplace/process-update/:id',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Process a queued update',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as any;

      const result = await processUpdate(id);

      return result;
    }
  );

  /**
   * Cancel an update
   * DELETE /api/marketplace/cancel-update/:id
   */
  fastify.delete(
    '/api/marketplace/cancel-update/:id',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Cancel a pending update',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as any;
      const userId = getUserIdFromRequest(request) || '1';

      const result = cancelUpdate(id, userId);

      return result;
    }
  );

  /**
   * Auto-queue all available updates
   * POST /api/marketplace/auto-queue-updates
   */
  fastify.post(
    '/api/marketplace/auto-queue-updates',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Automatically queue all available updates',
      },
    },
    async (request) => {
      const userId = getUserIdFromRequest(request) || '1';

      const result = autoQueueUpdates(userId);

      return { success: true, ...result };
    }
  );

  console.log('[Marketplace API] ✅ Routes registered');
}
