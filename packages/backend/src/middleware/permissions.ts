/**
 * Backend Permissions Middleware
 * Enforces role-based access control on API routes
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

export type Role = 'owner' | 'admin' | 'user' | 'guest';

export type Permission =
    | 'view_dashboard'
    | 'view_chat'
    | 'view_calendar'
    | 'view_team'
    | 'configure_agent'
    | 'view_agent_settings'
    | 'view_skills'
    | 'install_skills'
    | 'configure_skills'
    | 'delete_skills'
    | 'view_extensions'
    | 'install_extensions'
    | 'configure_extensions'
    | 'delete_extensions'
    | 'view_team'
    | 'invite_members'
    | 'manage_members'
    | 'change_roles'
    | 'remove_members'
    | 'view_profile'
    | 'edit_profile'
    | 'view_notifications'
    | 'edit_notifications'
    | 'view_security'
    | 'edit_security'
    | 'view_credentials'
    | 'edit_credentials'
    | 'view_database'
    | 'manage_database'
    | 'view_api_keys'
    | 'edit_api_keys'
    | 'view_secrets'
    | 'edit_secrets'
    | 'view_logs'
    | 'delete_data'
    | 'view_workflows'
    | 'create_workflows'
    | 'edit_workflows'
    | 'delete_workflows'
    | 'execute_workflows';

// Define permissions for each role
const rolePermissions: Record<Role, Permission[]> = {
    owner: [
        'view_dashboard', 'view_chat', 'view_calendar', 'view_team',
        'configure_agent', 'view_agent_settings',
        'view_skills', 'install_skills', 'configure_skills', 'delete_skills',
        'view_extensions', 'install_extensions', 'configure_extensions', 'delete_extensions',
        'invite_members', 'manage_members', 'change_roles', 'remove_members',
        'view_profile', 'edit_profile',
        'view_notifications', 'edit_notifications',
        'view_security', 'edit_security',
        'view_credentials', 'edit_credentials',
        'view_database', 'manage_database',
        'view_api_keys', 'edit_api_keys',
        'view_secrets', 'edit_secrets',
        'view_logs', 'delete_data',
        'view_workflows', 'create_workflows', 'edit_workflows', 'delete_workflows', 'execute_workflows',
    ],
    admin: [
        'view_dashboard', 'view_chat', 'view_calendar', 'view_team',
        'configure_agent', 'view_agent_settings',
        'view_skills', 'install_skills', 'configure_skills', 'delete_skills',
        'view_extensions', 'install_extensions', 'configure_extensions', 'delete_extensions',
        'view_team', 'invite_members', 'manage_members',
        'view_profile', 'edit_profile',
        'view_notifications', 'edit_notifications',
        'view_security', 'edit_security',
        'view_credentials', // Cannot edit
        'view_database', // Cannot manage
        'view_logs',
        'view_workflows', 'create_workflows', 'edit_workflows', 'delete_workflows', 'execute_workflows',
    ],
    user: [
        'view_dashboard', 'view_chat', 'view_calendar',
        'view_agent_settings',
        'view_skills',
        'view_extensions',
        'view_profile', 'edit_profile',
        'view_notifications', 'edit_notifications',
        'view_workflows', 'create_workflows', 'edit_workflows', 'execute_workflows',
    ],
    guest: [
        'view_dashboard', 'view_chat', 'view_calendar',
        'view_skills',
        'view_extensions',
        'view_profile',
        'view_workflows',
    ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
    return rolePermissions[role].includes(permission);
}

/**
 * Get user from request
 * In production, this would extract user from JWT token or session
 */
function getUserFromRequest(request: FastifyRequest): { role: Role } | null {
    // TODO: Implement actual authentication
    // For now, return mock user from session/header

    // Check for user in session (if using session auth)
    const session = (request as any).session;
    if (session?.user) {
        return session.user;
    }

    // Check for Authorization header (if using JWT)
    const authHeader = request.headers.authorization;
    if (authHeader) {
        // TODO: Verify JWT and extract user
        // const token = authHeader.replace('Bearer ', '');
        // const user = verifyToken(token);
        // return user;
    }

    // Development: Allow all requests as owner
    if (process.env.NODE_ENV === 'development') {
        return { role: 'owner' };
    }

    return null;
}

/**
 * Middleware factory to require specific permission
 */
export function requirePermission(permission: Permission) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = getUserFromRequest(request);

        if (!user) {
            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }

        if (!hasPermission(user.role, permission)) {
            return reply.code(403).send({
                error: 'Forbidden',
                message: `Permission '${permission}' required`,
            });
        }

        // Permission granted, continue to route handler
    };
}

/**
 * Middleware to require any of the specified permissions
 */
export function requireAnyPermission(permissions: Permission[]) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = getUserFromRequest(request);

        if (!user) {
            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }

        const hasAny = permissions.some(p => hasPermission(user.role, p));

        if (!hasAny) {
            return reply.code(403).send({
                error: 'Forbidden',
                message: `One of these permissions required: ${permissions.join(', ')}`,
            });
        }
    };
}

/**
 * Middleware to require all of the specified permissions
 */
export function requireAllPermissions(permissions: Permission[]) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = getUserFromRequest(request);

        if (!user) {
            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }

        const hasAll = permissions.every(p => hasPermission(user.role, p));

        if (!hasAll) {
            return reply.code(403).send({
                error: 'Forbidden',
                message: `All of these permissions required: ${permissions.join(', ')}`,
            });
        }
    };
}

/**
 * Middleware to require specific role
 */
export function requireRole(role: Role) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = getUserFromRequest(request);

        if (!user) {
            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }

        if (user.role !== role) {
            return reply.code(403).send({
                error: 'Forbidden',
                message: `Role '${role}' required`,
            });
        }
    };
}

/**
 * Middleware to require owner role only
 */
export function requireOwner() {
    return requireRole('owner');
}
