/**
 * Centralized Error Handling Utility
 *
 * SECURITY: Prevents information disclosure via verbose error messages (H-09)
 * - Logs detailed errors server-side for debugging
 * - Returns sanitized generic messages to clients
 * - Includes error tracking IDs for support
 */

import type { FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { getTranslator } from '../i18n/index.js';

/**
 * Error categories for proper HTTP status codes
 */
export type ErrorCategory =
  | 'validation'      // 400 Bad Request
  | 'authentication'  // 401 Unauthorized
  | 'authorization'   // 403 Forbidden
  | 'not_found'       // 404 Not Found
  | 'conflict'        // 409 Conflict
  | 'rate_limit'      // 429 Too Many Requests
  | 'internal';       // 500 Internal Server Error

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string;
  errorId?: string;
  details?: string;
}

/**
 * Translation keys for safe error messages (resolved via i18n at runtime)
 */
const SAFE_ERROR_KEYS: Record<ErrorCategory, string> = {
  validation: 'validation',
  authentication: 'authentication',
  authorization: 'authorization',
  not_found: 'notFound',
  conflict: 'conflict',
  rate_limit: 'rateLimit',
  internal: 'internal',
};

/**
 * HTTP status codes for error categories
 */
const ERROR_STATUS_CODES: Record<ErrorCategory, number> = {
  validation: 400,
  authentication: 401,
  authorization: 403,
  not_found: 404,
  conflict: 409,
  rate_limit: 429,
  internal: 500,
};

/**
 * Handle errors with proper logging and sanitized responses
 *
 * SECURITY: Never expose internal error details to clients (H-09)
 *
 * @param reply - Fastify reply object
 * @param error - The error that occurred
 * @param category - Error category for proper status code
 * @param context - Context string for logging (e.g., '[Auth] Login failed')
 * @param userMessage - Optional user-friendly message (must be safe!)
 */
export function handleError(
  reply: FastifyReply,
  error: unknown,
  category: ErrorCategory = 'internal',
  context: string = '[API]',
  userMessage?: string
): void {
  // Generate unique error ID for tracking
  const errorId = randomUUID();

  // SECURITY: Log detailed error server-side only (H-09)
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(`${context} Error [${errorId}]:`, errorMessage);
  if (errorStack && category === 'internal') {
    console.error(`${context} Stack:`, errorStack);
  }

  // SECURITY: Return sanitized error to client (H-09)
  // i18n: Translate error message based on request locale
  const locale = (reply.request as any)?.locale || 'en';
  const t = getTranslator(locale);
  const statusCode = ERROR_STATUS_CODES[category];
  const safeMessage = userMessage || t(SAFE_ERROR_KEYS[category]);

  const response: ErrorResponse = {
    error: safeMessage,
    errorId: category === 'internal' ? errorId : undefined, // Include ID only for 500 errors
  };

  reply.status(statusCode).send(response);
}

/**
 * Handle validation errors with field-specific details
 * Safe to expose as they don't leak system internals
 */
export function handleValidationError(
  reply: FastifyReply,
  message: string,
  context: string = '[Validation]'
): void {
  console.warn(`${context} Validation failed: ${message}`);

  reply.status(400).send({
    error: 'Invalid input data',
    details: message, // Validation errors are safe to expose
  });
}

/**
 * Check if error is a known safe error type that can be exposed
 */
function isSafeError(error: unknown): error is { message: string; code?: string } {
  if (!(error instanceof Error)) return false;

  // JWT errors are safe to expose (already sanitized)
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return true;
  }

  // Validation errors are safe
  if (error.name === 'ValidationError') {
    return true;
  }

  return false;
}

/**
 * Smart error handler that detects safe vs unsafe errors
 */
export function handleSmartError(
  reply: FastifyReply,
  error: unknown,
  context: string = '[API]'
): void {
  // Authentication errors (JWT)
  if (error instanceof Error && (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')) {
    return handleError(reply, error, 'authentication', context, 'Invalid or expired token');
  }

  // Safe errors can expose message
  if (isSafeError(error)) {
    const category: ErrorCategory = error.message.includes('not found') ? 'not_found' : 'validation';
    return handleError(reply, error, category, context, error.message);
  }

  // Unknown errors - hide details
  return handleError(reply, error, 'internal', context);
}
