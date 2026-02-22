/**
 * Authentication Routes
 * Login, Register, JWT token management
 */

import type { FastifyInstance } from 'fastify';
import { getRepositories } from '../../db/index.js';
import { generateToken, verifyToken, getUserIdFromRequest } from '../../auth/jwt.js';
import { handleError, handleValidationError } from '../error-handler.js';
import {
  checkAccountLock,
  handleFailedLogin,
  handleSuccessfulLogin,
} from '../../auth/account-lockout.js';
import { logAuthEvent } from '../../services/audit-logger.js';

/**
 * SECURITY: Validate password strength
 * @param password Password to validate
 * @returns Validation result with success flag and error message
 */
function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  // Minimum 12 characters
  if (password.length < 12) {
    return {
      valid: false,
      error: 'Password must be at least 12 characters long'
    };
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter'
    };
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one lowercase letter'
    };
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one number'
    };
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one special character (!@#$%^&*...)'
    };
  }

  return { valid: true };
}

export async function authRoutes(fastify: FastifyInstance) {
  const repos = getRepositories();

  // SECURITY: Rate limiting configuration for auth endpoints
  const authRateLimit = {
    max: 5, // Maximum 5 attempts
    timeWindow: '15 minutes', // Per 15 minute window
    errorResponseBuilder: () => ({
      error: 'Too many attempts',
      message: 'Too many authentication attempts. Please try again in 15 minutes.'
    })
  };

  /**
   * POST /api/auth/register
   * Register a new user
   */
  fastify.post('/api/auth/register', {
    config: { rateLimit: authRateLimit }
  }, async (request, reply) => {
    const { email, username, password, full_name } = request.body as any;

    // Validation
    if (!email || !username || !password) {
      return reply.code(400).send({
        error: 'Missing required fields',
        message: 'email, username, and password are required'
      });
    }

    // SECURITY: Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return reply.code(400).send({
        error: 'Weak password',
        message: passwordValidation.error
      });
    }

    // Check if email already exists
    const existingEmail = repos.users.findByEmail(email);
    if (existingEmail) {
      return reply.code(409).send({
        error: 'Email already exists',
        message: 'A user with this email already exists'
      });
    }

    // Check if username already exists
    const existingUsername = repos.users.findByUsername(username);
    if (existingUsername) {
      return reply.code(409).send({
        error: 'Username already exists',
        message: 'A user with this username already exists'
      });
    }

    try {
      // Create user
      const user = await repos.users.create({
        email,
        username,
        password,
        full_name,
        role: 'user' // Default role
      });

      // SECURITY: Generate JWT token with token_version for invalidation support (H-01)
      const token = generateToken(user.id, user.token_version || 1);

      // SECURITY: Log successful registration (L-02)
      logAuthEvent('auth.register', request, user.id, username, true);

      // Return user (without password) and token
      return {
        user: repos.users.getSafeUser(user),
        token
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Auth] Registration failed');
    }
  });

  /**
   * POST /api/auth/login
   * Login with email/password
   */
  fastify.post('/api/auth/login', {
    config: { rateLimit: authRateLimit }
  }, async (request, reply) => {
    const { email, password } = request.body as any;

    // Validation
    if (!email || !password) {
      return reply.code(400).send({
        error: 'Missing credentials',
        message: 'email and password are required'
      });
    }

    // SECURITY: Check if account is locked (M-02)
    const lockStatus = checkAccountLock(email);
    if (lockStatus.isLocked) {
      return reply.code(429).send({
        error: 'Account locked',
        message: `Too many failed login attempts. Please try again in ${lockStatus.remainingMinutes} minutes.`
      });
    }

    try {
      // Get IP and User-Agent for attempt tracking
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];

      // Find user
      const user = repos.users.findByEmail(email);

      if (!user) {
        // SECURITY: Track failed attempt (M-02)
        const result = handleFailedLogin(email, ipAddress, userAgent);

        // SECURITY: Log failed login attempt (L-02)
        logAuthEvent('auth.login.failed', request, undefined, email, false, 'Invalid credentials');

        // SECURITY: Use generic "Unauthorized" message (M-12)
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password'
        });
      }

      // Check if user is active
      if (user.status !== 'active') {
        // SECURITY: Use generic "Forbidden" for account status (M-12)
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Account access denied'
        });
      }

      // SECURITY: Check if email is verified (M-09)
      if (!user.email_verified) {
        // SECURITY: Use generic "Forbidden" message (M-12)
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Account access denied'
        });
      }

      // Verify password
      const isValid = await repos.users.verifyPassword(user, password);

      if (!isValid) {
        // SECURITY: Track failed attempt (M-02)
        const result = handleFailedLogin(email, ipAddress, userAgent);

        // SECURITY: Log failed login attempt (L-02)
        logAuthEvent('auth.login.failed', request, user.id, user.username, false, 'Invalid password');

        // SECURITY: Use generic "Unauthorized" message (M-12)
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password'
        });
      }

      // SECURITY: Track successful login and clear failed attempts (M-02)
      handleSuccessfulLogin(email, ipAddress, userAgent);

      // SECURITY: Log successful login (L-02)
      logAuthEvent('auth.login', request, user.id, user.username, true);

      // Update last login
      repos.users.updateLastLogin(user.id);

      // SECURITY: Generate JWT token with token_version for invalidation support (H-01)
      const token = generateToken(user.id, user.token_version || 1);

      // Return user (without password) and token
      return {
        user: repos.users.getSafeUser(user),
        token
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Auth] Login failed');
    }
  });

  /**
   * GET /api/auth/me
   * Get current user (requires authentication)
   */
  fastify.get('/api/auth/me', async (request, reply) => {
    // Get token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header'
      });
    }

    const token = authHeader.substring(7);

    try {
      // SECURITY: Use centralized JWT verification (M-06)
      const decoded = verifyToken(token);

      // Get user
      const user = repos.users.findById(decoded.userId);

      if (!user) {
        // SECURITY: Use "Unauthorized" for consistency (M-12)
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired session'
        });
      }

      // Return user (without password)
      return {
        user: repos.users.getSafeUser(user)
      };
    } catch (error: any) {
      // SECURITY: Standardize error messages (M-12)
      if (error.name === 'TokenExpiredError') {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Session expired'
        });
      }

      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid session'
      });
    }
  });

  /**
   * POST /api/auth/change-password
   * Change user password (requires authentication)
   */
  fastify.post('/api/auth/change-password', {
    config: { rateLimit: authRateLimit }
  }, async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header'
      });
    }

    const token = authHeader.substring(7);
    const { currentPassword, newPassword } = request.body as any;

    if (!currentPassword || !newPassword) {
      return reply.code(400).send({
        error: 'Missing fields',
        message: 'currentPassword and newPassword are required'
      });
    }

    // SECURITY: Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return reply.code(400).send({
        error: 'Weak password',
        message: passwordValidation.error
      });
    }

    try {
      // SECURITY: Use centralized JWT verification (M-06)
      const decoded = verifyToken(token);

      // Get user
      const user = repos.users.findById(decoded.userId);

      if (!user) {
        // SECURITY: Use "Unauthorized" for consistency (M-12)
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid session'
        });
      }

      // Verify current password
      const isValid = await repos.users.verifyPassword(user, currentPassword);

      if (!isValid) {
        // SECURITY: Use "Unauthorized" for consistency (M-12)
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Current password is incorrect'
        });
      }

      // Update password
      await repos.users.updatePassword(user.id, newPassword);

      // SECURITY: Log password change (L-02)
      logAuthEvent('auth.password.change', request, user.id, user.username, true);

      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Auth] Password change failed');
    }
  });

  /**
   * GET /api/auth/stats
   * Get user statistics (for dashboard)
   */
  fastify.get('/api/auth/stats', async (request, reply) => {
    // SECURITY: Require authentication (M-15)
    getUserIdFromRequest(request);

    const counts = repos.users.countByRole();

    return {
      total: Object.values(counts).reduce((sum, count) => sum + count, 0),
      byRole: counts
    };
  });
}
