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
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Check if this is an extension route
    const pathSegments = request.url.split('/');
    const extIndex = pathSegments.indexOf('ext');

    if (extIndex === -1 || !pathSegments[extIndex + 1]) {
      // Not an extension route, skip tracking
      return;
    }

    const extensionId = pathSegments[extIndex + 1].split('?')[0]; // Remove query params
    const startTime = Date.now();

    // Store start time on request for later access
    (request as any).__analyticsStartTime = startTime;
    (request as any).__analyticsExtensionId = extensionId;
  };
}
