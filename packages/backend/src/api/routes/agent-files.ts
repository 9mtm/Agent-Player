/**
 * Agent Files API Routes
 *
 * RESTful endpoints for managing agent PERSONALITY.md and MEMORY.md files
 */

import type { FastifyInstance } from 'fastify';
import {
  readPersonality,
  writePersonality,
  readMemory,
  writeMemory,
  appendMemory,
  listKnowledgeFiles,
  readKnowledgeFile,
  writeKnowledgeFile,
  deleteKnowledgeFile,
  getAgentFiles,
  initializeAgentDir
} from '../../services/agent-files.js';

export async function agentFilesRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/agents/:id/personality - Get PERSONALITY.md
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/agents/:id/personality',
    async (request, reply) => {
      const { id } = request.params;

      try {
        const content = await readPersonality(id);
        return {
          success: true,
          content
        };
      } catch (err: any) {
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * PUT /api/agents/:id/personality - Update PERSONALITY.md
   */
  fastify.put<{ Params: { id: string }; Body: { content: string } }>(
    '/api/agents/:id/personality',
    async (request, reply) => {
      const { id } = request.params;
      const { content } = request.body;

      if (!content) {
        return reply.code(400).send({
          success: false,
          error: 'content is required'
        });
      }

      try {
        await writePersonality(id, content);
        return {
          success: true,
          message: 'Personality updated'
        };
      } catch (err: any) {
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/agents/:id/memory - Get MEMORY.md
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/agents/:id/memory',
    async (request, reply) => {
      const { id } = request.params;

      try {
        const content = await readMemory(id);
        return {
          success: true,
          content
        };
      } catch (err: any) {
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * PUT /api/agents/:id/memory - Update MEMORY.md
   */
  fastify.put<{ Params: { id: string }; Body: { content: string } }>(
    '/api/agents/:id/memory',
    async (request, reply) => {
      const { id } = request.params;
      const { content } = request.body;

      if (!content) {
        return reply.code(400).send({
          success: false,
          error: 'content is required'
        });
      }

      try {
        await writeMemory(id, content);
        return {
          success: true,
          message: 'Memory updated'
        };
      } catch (err: any) {
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * POST /api/agents/:id/memory/append - Append to MEMORY.md
   */
  fastify.post<{ Params: { id: string }; Body: { content: string } }>(
    '/api/agents/:id/memory/append',
    async (request, reply) => {
      const { id } = request.params;
      const { content } = request.body;

      if (!content) {
        return reply.code(400).send({
          success: false,
          error: 'content is required'
        });
      }

      try {
        await appendMemory(id, content);
        return {
          success: true,
          message: 'Memory appended'
        };
      } catch (err: any) {
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/agents/:id/knowledge - List knowledge files
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/agents/:id/knowledge',
    async (request, reply) => {
      const { id } = request.params;

      try {
        const files = await listKnowledgeFiles(id);
        return {
          success: true,
          files
        };
      } catch (err: any) {
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/agents/:id/knowledge/:filename - Read knowledge file
   */
  fastify.get<{ Params: { id: string; filename: string } }>(
    '/api/agents/:id/knowledge/*',
    async (request, reply) => {
      const { id } = request.params;
      const filename = (request.params as any)['*'];

      try {
        const content = await readKnowledgeFile(id, filename);
        return {
          success: true,
          filename,
          content
        };
      } catch (err: any) {
        return reply.code(404).send({
          success: false,
          error: 'File not found'
        });
      }
    }
  );

  /**
   * PUT /api/agents/:id/knowledge/:filename - Write knowledge file
   */
  fastify.put<{ Params: { id: string }; Body: { filename: string; content: string } }>(
    '/api/agents/:id/knowledge',
    async (request, reply) => {
      const { id } = request.params;
      const { filename, content } = request.body;

      if (!filename || !content) {
        return reply.code(400).send({
          success: false,
          error: 'filename and content are required'
        });
      }

      try {
        await writeKnowledgeFile(id, filename, content);
        return {
          success: true,
          message: 'File saved'
        };
      } catch (err: any) {
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * DELETE /api/agents/:id/knowledge/:filename - Delete knowledge file
   */
  fastify.delete<{ Params: { id: string }; Body: { filename: string } }>(
    '/api/agents/:id/knowledge',
    async (request, reply) => {
      const { id } = request.params;
      const { filename } = request.body;

      if (!filename) {
        return reply.code(400).send({
          success: false,
          error: 'filename is required'
        });
      }

      try {
        await deleteKnowledgeFile(id, filename);
        return {
          success: true,
          message: 'File deleted'
        };
      } catch (err: any) {
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/agents/:id/files - Get all agent files
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/agents/:id/files',
    async (request, reply) => {
      const { id } = request.params;

      try {
        const files = await getAgentFiles(id);
        return {
          success: true,
          ...files
        };
      } catch (err: any) {
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * POST /api/agents/:id/initialize - Initialize agent directory
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/agents/:id/initialize',
    async (request, reply) => {
      const { id } = request.params;

      try {
        await initializeAgentDir(id);
        return {
          success: true,
          message: 'Agent directory initialized'
        };
      } catch (err: any) {
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );
}
