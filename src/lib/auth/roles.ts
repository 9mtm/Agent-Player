/**
 * Role-Based Access Control (RBAC) System
 * Defines roles, permissions, and access control logic
 */

export type Role = 'owner' | 'admin' | 'user' | 'guest';

export type Permission =
    // General permissions
    | 'view_dashboard'
    | 'view_chat'
    | 'view_calendar'
    | 'view_team'

    // Agent permissions
    | 'configure_agent'
    | 'view_agent_settings'

    // Skills permissions
    | 'view_skills'
    | 'install_skills'
    | 'configure_skills'
    | 'delete_skills'

    // Extensions permissions
    | 'view_extensions'
    | 'install_extensions'
    | 'configure_extensions'
    | 'delete_extensions'

    // Team permissions
    | 'view_team'
    | 'invite_members'
    | 'manage_members'
    | 'change_roles'
    | 'remove_members'

    // Settings permissions
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

    // Sensitive data permissions
    | 'view_api_keys'
    | 'edit_api_keys'
    | 'view_secrets'
    | 'edit_secrets'
    | 'view_logs'
    | 'delete_data'

    // Workflow permissions
    | 'view_workflows'
    | 'create_workflows'
    | 'edit_workflows'
    | 'delete_workflows'
    | 'execute_workflows';

// Define permissions for each role
export const rolePermissions: Record<Role, Permission[]> = {
    owner: [
        // Full access to everything
        'view_dashboard',
        'view_chat',
        'view_calendar',
        'view_team',
        'configure_agent',
        'view_agent_settings',
        'view_skills',
        'install_skills',
        'configure_skills',
        'delete_skills',
        'view_extensions',
        'install_extensions',
        'configure_extensions',
        'delete_extensions',
        'view_team',
        'invite_members',
        'manage_members',
        'change_roles',
        'remove_members',
        'view_profile',
        'edit_profile',
        'view_notifications',
        'edit_notifications',
        'view_security',
        'edit_security',
        'view_credentials',
        'edit_credentials',
        'view_database',
        'manage_database',
        'view_api_keys',
        'edit_api_keys',
        'view_secrets',
        'edit_secrets',
        'view_logs',
        'delete_data',
        'view_workflows',
        'create_workflows',
        'edit_workflows',
        'delete_workflows',
        'execute_workflows',
    ],
    admin: [
        // Most permissions except critical ones
        'view_dashboard',
        'view_chat',
        'view_calendar',
        'view_team',
        'configure_agent',
        'view_agent_settings',
        'view_skills',
        'install_skills',
        'configure_skills',
        'delete_skills',
        'view_extensions',
        'install_extensions',
        'configure_extensions',
        'delete_extensions',
        'view_team',
        'invite_members',
        'manage_members',
        // Cannot change owner role
        'view_profile',
        'edit_profile',
        'view_notifications',
        'edit_notifications',
        'view_security',
        'edit_security',
        'view_credentials',
        // Cannot edit credentials
        'view_database',
        // Cannot manage database
        // Cannot view/edit API keys
        // Cannot view/edit secrets
        'view_logs',
        // Cannot delete data
        'view_workflows',
        'create_workflows',
        'edit_workflows',
        'delete_workflows',
        'execute_workflows',
    ],
    user: [
        // Standard user permissions
        'view_dashboard',
        'view_chat',
        'view_calendar',
        // Cannot view team
        // Cannot configure agent
        'view_agent_settings',
        'view_skills',
        // Cannot install/configure/delete skills
        'view_extensions',
        // Cannot install/configure/delete extensions
        'view_profile',
        'edit_profile',
        'view_notifications',
        'edit_notifications',
        // Cannot view security settings
        // Cannot view credentials
        // Cannot view database
        // Cannot view API keys or secrets
        // Cannot view logs
        'view_workflows',
        'create_workflows',
        'edit_workflows',
        // Cannot delete workflows
        'execute_workflows',
    ],
    guest: [
        // View-only access to non-sensitive data
        'view_dashboard',
        'view_chat',
        'view_calendar',
        // Cannot view team
        // Cannot configure agent
        // Cannot view agent settings
        'view_skills',
        // Cannot install/configure/delete skills
        'view_extensions',
        // Cannot install/configure/delete extensions
        'view_profile',
        // Cannot edit profile
        // Cannot view notifications
        // Cannot view security
        // Cannot view credentials
        // Cannot view database
        // Cannot view API keys or secrets
        // Cannot view logs
        'view_workflows',
        // Cannot create/edit/delete workflows
        // Cannot execute workflows
    ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
    return rolePermissions[role].includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
    return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
    return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: Role): Permission[] {
    return rolePermissions[role];
}

/**
 * Check if role A can manage role B
 * Hierarchy: owner > admin > user > guest
 */
export function canManageRole(managerRole: Role, targetRole: Role): boolean {
    const hierarchy: Record<Role, number> = {
        owner: 4,
        admin: 3,
        user: 2,
        guest: 1,
    };

    // Owner can manage everyone
    if (managerRole === 'owner') return true;

    // Admin can manage user and guest
    if (managerRole === 'admin' && (targetRole === 'user' || targetRole === 'guest')) {
        return true;
    }

    // Others cannot manage anyone
    return false;
}

/**
 * Get role display information
 */
export function getRoleInfo(role: Role) {
    const roleInfo = {
        owner: {
            name: 'Owner',
            color: 'text-yellow-500',
            badgeVariant: 'default' as const,
            description: 'Full access to all features and settings',
        },
        admin: {
            name: 'Admin',
            color: 'text-blue-500',
            badgeVariant: 'default' as const,
            description: 'Manage team members, settings, and workflows',
        },
        user: {
            name: 'User',
            color: 'text-green-500',
            badgeVariant: 'secondary' as const,
            description: 'Use agent features and workflows',
        },
        guest: {
            name: 'Guest',
            color: 'text-gray-500',
            badgeVariant: 'outline' as const,
            description: 'View-only access to non-sensitive data',
        },
    };

    return roleInfo[role];
}
