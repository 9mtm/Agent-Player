/**
 * System API Routes
 * System-level operations (restart, shutdown, etc.)
 */

import type { FastifyInstance } from 'fastify';
import { exec } from 'child_process';
import { resolve } from 'path';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import { handleError } from '../error-handler.js';

export async function systemRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/system/restart - Restart backend server
   */
  fastify.post('/api/system/restart', {
    schema: {
      tags: ['System'],
      description: 'Restart the backend server (requires authentication)',
    },
  }, async (request, reply) => {
    try {
      // SECURITY: Require authentication
      getUserIdFromRequest(request);
      // Use the existing restart script
      const scriptPath = resolve('./restart-backend.ps1');

      // Execute restart script in background
      exec(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, (error) => {
        if (error) {
          console.error('[System] ❌ Restart failed:', error);
        }
      });

      // Send response immediately before server restarts
      return reply.send({
        success: true,
        message: 'Backend restarting...',
      });
    } catch (error: any) {
      console.error('[System API] ❌ Restart failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[System] Restart failed');
    }
  });

  console.log('[System API] ✅ Routes registered');
}
