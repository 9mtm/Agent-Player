/**
 * Memory API Routes
 *
 * RESTful endpoints for memory management
 */

import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { getMemoryStorage } from '../../memory/storage.js';
import { getMemoryRetrieval } from '../../memory/retrieval.js';
import { MemoryTiersService } from '../../services/memory-tiers.js';
import { getConsolidationService } from '../../services/memory-consolidation.js';
import type { Memory, MemoryType, ImportanceLevel, MultiTierLayer } from '../../memory/types.js';

// Memory type values for API responses
const MEMORY_TYPES: MemoryType[] = [
  'fact', 'event', 'context', 'insight', 'preference', 'skill', 'relationship', 'task'
];

export async function memoryRoutes(fastify: FastifyInstance) {
  const storage = getMemoryStorage();
  const retrieval = getMemoryRetrieval();

  // Initialize storage
  await storage.initialize();

  /**
   * GET /api/memory - Get all memories for a user
   */
  fastify.get('/api/memory', async (request, reply) => {
    const { userId } = request.query as { userId: string };

    if (!userId) {
      return reply.code(400).send({ error: 'userId is required' });
    }

    const memories = await storage.getByUser(userId);

    return {
      success: true,
      count: memories.length,
      memories
    };
  });

  /**
   * GET /api/memory/:id - Get a specific memory
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/memory/:id',
    async (request, reply) => {
      const { id } = request.params;

      const memory = await storage.get(id);

      if (!memory) {
        return reply.code(404).send({ error: 'Memory not found' });
      }

      return {
        success: true,
        memory
      };
    }
  );

  /**
   * POST /api/memory - Create a new memory
   */
  fastify.post('/api/memory', async (request, reply) => {
    const body = request.body as {
      userId: string;
      type: MemoryType;
      content: string;
      importance?: number;
      metadata?: Record<string, any>;
    };

    if (!body.userId || !body.type || !body.content) {
      return reply.code(400).send({
        error: 'userId, type, and content are required'
      });
    }

    // Determine memory layer based on importance (same logic as memory_save tool)
    const importance = body.importance || 5;
    let memoryLayer: MultiTierLayer = 'working';
    let expiryTimestamp: number | null = Date.now() + (24 * 60 * 60 * 1000); // 24h default

    if (importance >= 8) {
      // High importance → Factual (permanent)
      memoryLayer = 'factual';
      expiryTimestamp = null; // Never expires
    } else if (importance >= 6) {
      // Medium importance → Experiential (90 days)
      memoryLayer = 'experiential';
      expiryTimestamp = Date.now() + (90 * 24 * 60 * 60 * 1000);
    }
    // Low importance stays in working memory (24h expiry)

    const memory: Memory = {
      id: uuidv4(),
      userId: body.userId,
      type: body.type,
      content: body.content,
      importance: importance as ImportanceLevel,
      memoryLayer,
      importanceScore: importance / 10,
      consolidationStatus: 'pending',
      expiryTimestamp,
      status: 'active',
      metadata: body.metadata || {},
      createdAt: new Date(),
      lastAccessedAt: Date.now(),
      accessCount: 0
    };

    await storage.save(memory);

    return {
      success: true,
      memory
    };
  });

  /**
   * PUT /api/memory/:id - Update a memory
   */
  fastify.put<{ Params: { id: string } }>(
    '/api/memory/:id',
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body as Partial<Memory>;

      try {
        await storage.update(id, updates);
        const updated = await storage.get(id);

        return {
          success: true,
          memory: updated
        };
      } catch (err: any) {
        return reply.code(404).send({ error: err.message });
      }
    }
  );

  /**
   * DELETE /api/memory/:id - Delete a memory
   */
  fastify.delete<{ Params: { id: string } }>(
    '/api/memory/:id',
    async (request, reply) => {
      const { id } = request.params;

      await storage.delete(id);

      return {
        success: true,
        message: 'Memory deleted'
      };
    }
  );

  /**
   * POST /api/memory/search - Search memories by semantic similarity (with Multi-Tier Memory support)
   */
  fastify.post('/api/memory/search', async (request, reply) => {
    const body = request.body as {
      query: string;
      userId: string;
      type?: MemoryType;
      layer?: MultiTierLayer;
      limit?: number;
      minImportance?: number;
      minImportanceScore?: number;
    };

    if (!body.query || !body.userId) {
      return reply.code(400).send({
        error: 'query and userId are required'
      });
    }

    const results = await storage.search({
      query: body.query,
      userId: body.userId,
      type: body.type,
      layer: body.layer,
      limit: body.limit,
      minImportance: body.minImportance as ImportanceLevel | undefined,
      minImportanceScore: body.minImportanceScore,
    });

    return {
      success: true,
      count: results.length,
      results
    };
  });

  /**
   * POST /api/memory/extract - Extract memories from text
   */
  fastify.post('/api/memory/extract', async (request, reply) => {
    const body = request.body as {
      text: string;
      userId: string;
    };

    if (!body.text || !body.userId) {
      return reply.code(400).send({
        error: 'text and userId are required'
      });
    }

    const memories = await retrieval.extractMemories(body.text, body.userId);

    return {
      success: true,
      count: memories.length,
      memories
    };
  });

  /**
   * GET /api/memory/relevant - Find relevant memories for a query
   */
  fastify.get('/api/memory/relevant', async (request, reply) => {
    const { query, userId, limit } = request.query as {
      query: string;
      userId: string;
      limit?: string;
    };

    if (!query || !userId) {
      return reply.code(400).send({
        error: 'query and userId are required'
      });
    }

    const memories = await retrieval.findRelevant(
      query,
      userId,
      limit ? parseInt(limit) : 5
    );

    return {
      success: true,
      count: memories.length,
      memories
    };
  });

  /**
   * GET /api/memory/summary - Get memory summary for a user
   */
  fastify.get('/api/memory/summary', async (request, reply) => {
    const { userId } = request.query as { userId: string };

    if (!userId) {
      return reply.code(400).send({ error: 'userId is required' });
    }

    const summary = await retrieval.getSummary(userId);

    return {
      success: true,
      summary
    };
  });

  /**
   * POST /api/memory/consolidate - Consolidate similar memories
   */
  fastify.post('/api/memory/consolidate', async (request, reply) => {
    const { userId } = request.body as { userId: string };

    if (!userId) {
      return reply.code(400).send({ error: 'userId is required' });
    }

    const consolidated = await retrieval.consolidate(userId);

    return {
      success: true,
      consolidated,
      message: `Consolidated ${consolidated} duplicate memories`
    };
  });

  /**
   * GET /api/memory/types - Get all memory types
   */
  fastify.get('/api/memory/types', async (request, reply) => {
    return {
      success: true,
      types: MEMORY_TYPES
    };
  });

  // ============ Multi-Tier Memory System Endpoints ============

  /**
   * GET /api/memory/layers/stats - Get statistics for all memory layers
   */
  fastify.get('/api/memory/layers/stats', async (request, reply) => {
    const { userId } = request.query as { userId: string };

    if (!userId) {
      return reply.code(400).send({ error: 'userId is required' });
    }

    const stats = await MemoryTiersService.getLayerStats(userId);

    return {
      success: true,
      stats
    };
  });

  /**
   * POST /api/memory/layers/promote - Promote a memory to the next layer
   */
  fastify.post('/api/memory/layers/promote', async (request, reply) => {
    const body = request.body as {
      userId: string;
      memoryId: string;
      targetLayer: 'experiential' | 'factual';
    };

    if (!body.userId || !body.memoryId || !body.targetLayer) {
      return reply.code(400).send({
        error: 'userId, memoryId, and targetLayer are required'
      });
    }

    let success = false;

    if (body.targetLayer === 'experiential') {
      success = await MemoryTiersService.promoteToExperiential(body.userId, body.memoryId);
    } else if (body.targetLayer === 'factual') {
      success = await MemoryTiersService.promoteToFactual(body.userId, body.memoryId);
    }

    if (!success) {
      return reply.code(400).send({
        error: `Failed to promote memory to ${body.targetLayer} layer`
      });
    }

    return {
      success: true,
      message: `Memory promoted to ${body.targetLayer} layer`
    };
  });

  /**
   * POST /api/memory/layers/consolidate - Manually trigger memory consolidation
   */
  fastify.post('/api/memory/layers/consolidate', async (request, reply) => {
    const consolidationService = getConsolidationService();

    const result = await consolidationService.runManual();

    return {
      success: true,
      result,
      message: `Consolidated ${result.consolidated} memories, promoted ${result.promoted}, expired ${result.expired}`
    };
  });

  /**
   * GET /api/memory/layers/consolidate/log - Get consolidation log
   */
  fastify.get('/api/memory/layers/consolidate/log', async (request, reply) => {
    const { limit } = request.query as { limit?: string };

    const log = await MemoryTiersService.getConsolidationLog(
      limit ? parseInt(limit) : 10
    );

    return {
      success: true,
      count: log.length,
      log
    };
  });

  /**
   * GET /api/memory/layers/candidates - Get promotion candidates
   */
  fastify.get('/api/memory/layers/candidates', async (request, reply) => {
    const { userId } = request.query as { userId: string };

    if (!userId) {
      return reply.code(400).send({ error: 'userId is required' });
    }

    const candidates = await MemoryTiersService.getPromotionCandidates(userId);

    return {
      success: true,
      count: candidates.length,
      candidates
    };
  });

  /**
   * POST /api/memory/importance - Update memory importance score
   */
  fastify.post('/api/memory/importance', async (request, reply) => {
    const body = request.body as {
      memoryId: string;
      importanceScore: number;
    };

    if (!body.memoryId || body.importanceScore === undefined) {
      return reply.code(400).send({
        error: 'memoryId and importanceScore are required'
      });
    }

    const success = await MemoryTiersService.updateImportanceScore(
      body.memoryId,
      body.importanceScore
    );

    if (!success) {
      return reply.code(404).send({ error: 'Memory not found' });
    }

    return {
      success: true,
      message: 'Importance score updated'
    };
  });
}
