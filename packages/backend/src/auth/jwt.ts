/**
 * JWT Authentication Utilities
 */

import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { FastifyRequest } from 'fastify';
import { getRepositories } from '../db/index.js';

// SECURITY: JWT payload schema validation (M-13)
const JwtPayloadSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
    tokenVersion: z.number().int().positive().optional(),
    iat: z.number().optional(), // Issued at
    exp: z.number().optional(), // Expiration
});

type JwtPayload = z.infer<typeof JwtPayloadSchema>;

/**
 * Get JWT secret from environment
 * SECURITY: Lazy loading to ensure .env is loaded first
 */
function getJwtSecret(): string {
    if (!process.env.JWT_SECRET) {
        throw new Error('FATAL: JWT_SECRET environment variable is not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    }
    return process.env.JWT_SECRET;
}

/**
 * Extract and verify user ID from JWT token in request headers
 * SECURITY: Validates token_version to invalidate old tokens (H-01)
 * @param request Fastify request object
 * @returns User ID if valid token, throws error if invalid/missing
 */
export function getUserIdFromRequest(request: FastifyRequest): string {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Unauthorized: Missing or invalid authorization header');
    }

    try {
        const token = authHeader.substring(7); // Remove "Bearer " prefix

        // SECURITY: Verify and validate JWT payload structure (M-13)
        const decoded = verifyToken(token);

        // SECURITY: Verify token_version matches current user version (H-01)
        // If password was changed, token_version is incremented and old tokens are invalidated
        const repos = getRepositories();
        const user = repos.users.findById(decoded.userId);

        if (!user) {
            throw new Error('Unauthorized: User not found');
        }

        // Check token version if present in token and user
        const tokenVersion = decoded.tokenVersion || 1; // Default to 1 for old tokens
        const userVersion = user.token_version || 1; // Default to 1 for old users

        if (tokenVersion !== userVersion) {
            throw new Error('Unauthorized: Token invalidated (password changed)');
        }

        return decoded.userId;
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Unauthorized: Token expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Unauthorized: Invalid token');
        }
        throw error;
    }
}

/**
 * Extract user ID from request, returns null if invalid (non-throwing version)
 * @param request Fastify request object
 * @returns User ID if valid token, null otherwise
 */
export function getUserIdFromRequestSafe(request: FastifyRequest): string | null {
    try {
        return getUserIdFromRequest(request);
    } catch {
        return null;
    }
}

/**
 * Generate JWT token for user
 * SECURITY: Includes token_version for invalidation support (H-01)
 * @param userId User ID to encode in token
 * @param tokenVersion Token version number (from user.token_version)
 * @param expiresIn Token expiration time (default: 7 days)
 * @returns JWT token string
 */
export function generateToken(userId: string, tokenVersion: number = 1, expiresIn: string = '7d'): string {
    return jwt.sign({ userId, tokenVersion }, getJwtSecret(), { expiresIn });
}

/**
 * Verify JWT token with schema validation
 * SECURITY: Validates JWT payload structure using Zod (M-13)
 * @param token JWT token to verify
 * @returns Decoded and validated payload if valid, throws error if invalid
 */
export function verifyToken(token: string): JwtPayload {
    const decoded = jwt.verify(token, getJwtSecret());

    // SECURITY: Validate payload structure with Zod schema (M-13)
    const validationResult = JwtPayloadSchema.safeParse(decoded);

    if (!validationResult.success) {
        throw new Error(`Invalid JWT payload structure: ${validationResult.error.message}`);
    }

    return validationResult.data;
}
