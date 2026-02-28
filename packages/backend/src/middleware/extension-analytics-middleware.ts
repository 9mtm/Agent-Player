/**
 * Extension Analytics Middleware
 * Automatically tracks API calls to extension routes
 */

import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { recordApiCall } from '../services/extension-analytics.js';

/**
 * Middleware to track extension API calls
 * Attaches to all /api/ext/:extensionId/* routes
 */
export function extensionAnalyticsMiddleware() {
  return (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
    // Check if this is an extension route
    const pathSegments = request.url.split('/');
    const extIndex = pathSegments.indexOf('ext');

    if (extIndex === -1 || !pathSegments[extIndex + 1]) {
      // Not an extension route, skip tracking
      done();
      return;
    }

    const extensionId = pathSegments[extIndex + 1].split('?')[0]; // Remove query params
    const startTime = Date.now();

    // Track response to record success/error
    reply.addHook('onSend', async (request, reply, payload) => {
      const responseTime = Date.now() - startTime;
      const success = reply.statusCode < 400;

      // Record the API call
      recordApiCall(extensionId, {
        success,
        responseTimeMs: responseTime,
        errorType: success ? undefined : `HTTP ${reply.statusCode}`,
      });

      return payload;
    });

    done();
  };
}
