/**
 * Permission Guard Component
 * Conditionally renders children based on user permissions
 *
 * Usage:
 * <PermissionGuard permission="edit_credentials">
 *   <Button>Edit Credentials</Button>
 * </PermissionGuard>
 */

'use client';

import { type ReactNode } from 'react';
import { type Permission } from '@/lib/auth/roles';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionGuardProps {
    children: ReactNode;
    permission?: Permission;
    permissions?: Permission[];
    requireAll?: boolean; // If true, requires all permissions. If false, requires any permission.
    fallback?: ReactNode;
}

export function PermissionGuard({
    children,
    permission,
    permissions,
    requireAll = false,
    fallback = null,
}: PermissionGuardProps) {
    const { can, canAny, canAll } = usePermissions();

    let hasAccess = false;

    if (permission) {
        // Check single permission
        hasAccess = can(permission);
    } else if (permissions && permissions.length > 0) {
        // Check multiple permissions
        hasAccess = requireAll ? canAll(permissions) : canAny(permissions);
    } else {
        // No permissions specified, allow access
        hasAccess = true;
    }

    if (!hasAccess) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

/**
 * Higher-Order Component version
 * Wraps a component with permission checking
 */
export function withPermission<P extends object>(
    Component: React.ComponentType<P>,
    permission: Permission | Permission[],
    requireAll = false
) {
    return function PermissionWrappedComponent(props: P) {
        const permissions = Array.isArray(permission) ? permission : [permission];

        return (
            <PermissionGuard permissions={permissions} requireAll={requireAll}>
                <Component {...props} />
            </PermissionGuard>
        );
    };
}
