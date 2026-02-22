/**
 * Memory API Routes
 *
 * RESTful endpoints for memory management
 */

import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { getMemoryStorage } from '../../memory/storage.js';
import { getMemoryRetrieval } from '../../memory/retrieval.js';
import type { Memory, MemoryType, ImportanceLevel } from '../../memory/types.js';

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

    const memory: Memory = {
      id: uuidv4(),
      userId: body.userId,
      type: body.type,
      content: body.content,
      importance: (body.importance || 5) as ImportanceLevel,
      layer: 'session',
      status: 'active',
      metadata: body.metadata || {},
      createdAt: new Date(),
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
   * POST /api/memory/search - Search memories by semantic similarity
   */
  fastify.post('/api/memory/search', async (request, reply) => {
    const body = request.body as {
      query: string;
      userId: string;
      type?: MemoryType;
      limit?: number;
      minImportance?: number;
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
      limit: body.limit,
      minImportance: body.minImportance as ImportanceLevel | undefined,
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
}
