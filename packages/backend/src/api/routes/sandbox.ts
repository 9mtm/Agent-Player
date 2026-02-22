/**
 * Sandbox API Routes
 * Endpoints for sandbox management and execution
 */

import type { FastifyInstance } from 'fastify';
import {
  getSandboxExecutor,
  getDockerManager,
  initializeSandbox,
  getSandboxStatus,
  type ExecutionRequest,
  type SandboxConfig,
} from '../../sandbox/index.js';
import { handleError } from '../error-handler.js';

export async function sandboxRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/sandbox/status
   * Get sandbox system status
   */
  fastify.get('/api/sandbox/status', async (request, reply) => {
    try {
      const docker = getDockerManager();
      const available = await docker.isDockerAvailable();
      const status = getSandboxStatus();

      return {
        ...status,
        dockerAvailable: available, // Override with actual Docker check
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Sandbox] Get status failed');
    }
  });

  /**
   * POST /api/sandbox/initialize
   * Initialize sandbox system
   */
  fastify.post('/api/sandbox/initialize', async (request, reply) => {
    try {
      const body = request.body as { config?: Partial<SandboxConfig>; agentId?: string };

      const executor = await initializeSandbox(body.config, body.agentId);
      const config = executor.getConfig();

      return {
        success: true,
        mode: config.mode,
        image: config.docker.image,
        stats: executor.getStats(),
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Sandbox] Initialize failed');
    }
  });

  /**
   * POST /api/sandbox/execute
   * Execute command in sandbox
   */
  fastify.post('/api/sandbox/execute', async (request, reply) => {
    try {
      const body = request.body as ExecutionRequest;

      if (!body.command) {
        return reply.status(400).send({
          error: 'Command is required',
        });
      }

      const executor = getSandboxExecutor();
      const result = await executor.execute(body);

      return result;
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Sandbox] Execute failed');
    }
  });

  /**
   * GET /api/sandbox/config
   * Get current sandbox configuration
   */
  fastify.get('/api/sandbox/config', async (request, reply) => {
    try {
      const executor = getSandboxExecutor();
      return executor.getConfig();
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Sandbox] Get config failed');
    }
  });

  /**
   * PUT /api/sandbox/config
   * Update sandbox configuration
   */
  fastify.put('/api/sandbox/config', async (request, reply) => {
    try {
      const body = request.body as Partial<SandboxConfig>;
      const executor = getSandboxExecutor();
      executor.updateConfig(body);

      return {
        success: true,
        config: executor.getConfig(),
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Sandbox] Update config failed');
    }
  });

  /**
   * GET /api/sandbox/sessions
   * List active sandbox sessions
   */
  fastify.get('/api/sandbox/sessions', async (request, reply) => {
    try {
      const docker = getDockerManager();
      const sessions = docker.getActiveSessions();

      return {
        count: sessions.length,
        sessions: sessions.map((s) => ({
          id: s.id,
          containerId: s.containerId.slice(0, 12),
          status: s.status,
          createdAt: s.createdAt,
          lastActivityAt: s.lastActivityAt,
          agentId: s.agentId,
        })),
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Sandbox] List sessions failed');
    }
  });

  /**
   * DELETE /api/sandbox/sessions/:id
   * Destroy a sandbox session
   */
  fastify.delete('/api/sandbox/sessions/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const docker = getDockerManager();

      await docker.destroySession(id);

      return { success: true, sessionId: id };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Sandbox] Destroy session failed');
    }
  });

  /**
   * POST /api/sandbox/cleanup
   * Cleanup all sandbox sessions
   */
  fastify.post('/api/sandbox/cleanup', async (request, reply) => {
    try {
      const docker = getDockerManager();
      await docker.cleanup();

      return { success: true, message: 'All sessions cleaned up' };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Sandbox] Cleanup failed');
    }
  });

  /**
   * POST /api/sandbox/cleanup-stale
   * Cleanup stale sandbox sessions
   */
  fastify.post('/api/sandbox/cleanup-stale', async (request, reply) => {
    try {
      const body = request.body as { maxIdleMs?: number };
      const docker = getDockerManager();

      const cleaned = await docker.cleanupStale(body.maxIdleMs);

      return { success: true, cleanedSessions: cleaned };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Sandbox] Cleanup stale failed');
    }
  });

  /**
   * GET /api/sandbox/stats
   * Get sandbox execution statistics
   */
  fastify.get('/api/sandbox/stats', async (request, reply) => {
    try {
      const executor = getSandboxExecutor();
      return executor.getStats();
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Sandbox] Get stats failed');
    }
  });
}
