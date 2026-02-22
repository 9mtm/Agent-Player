/**
 * Hook for checking user permissions
 * Usage: const { can, canAny, canAll } = usePermissions();
 */

'use client';

import { useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { type Role, type Permission, hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/auth/roles';

export function usePermissions() {
    const { user } = useAuth();
    const userRole: Role = user?.role || 'guest'; // Default to guest if not logged in

    const can = useCallback((permission: Permission): boolean => {
        return hasPermission(userRole, permission);
    }, [userRole]);

    const canAny = useCallback((permissions: Permission[]): boolean => {
        return hasAnyPermission(userRole, permissions);
    }, [userRole]);

    const canAll = useCallback((permissions: Permission[]): boolean => {
        return hasAllPermissions(userRole, permissions);
    }, [userRole]);

    return {
        can,
        canAny,
        canAll,
        role: userRole,
        user,
    };
}
