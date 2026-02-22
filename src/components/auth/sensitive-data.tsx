/**
 * Sensitive Data Component
 * Masks or hides sensitive data based on user permissions
 *
 * Usage:
 * <SensitiveData value="sk-ant-api03-..." permission="view_api_keys" />
 */

'use client';

import { type ReactNode, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Permission } from '@/lib/auth/roles';
import { usePermissions } from '@/hooks/use-permissions';

interface SensitiveDataProps {
    value: string;
    permission: Permission;
    maskChar?: string;
    showLength?: number; // Number of characters to show at start/end
    allowToggle?: boolean; // Allow user to toggle visibility
    fallback?: ReactNode;
}

export function SensitiveData({
    value,
    permission,
    maskChar = '•',
    showLength = 4,
    allowToggle = true,
    fallback = <span className="text-muted-foreground italic">Access denied</span>,
}: SensitiveDataProps) {
    const { can } = usePermissions();
    const [isVisible, setIsVisible] = useState(false);
    const hasPermission = can(permission);

    if (!hasPermission) {
        return <>{fallback}</>;
    }

    const maskValue = (str: string): string => {
        if (str.length <= showLength * 2) {
            return maskChar.repeat(str.length);
        }
        const start = str.substring(0, showLength);
        const end = str.substring(str.length - showLength);
        const masked = maskChar.repeat(str.length - showLength * 2);
        return `${start}${masked}${end}`;
    };

    const displayValue = isVisible ? value : maskValue(value);

    return (
        <div className="flex items-center gap-2">
            <code className="text-sm bg-muted px-2 py-1 rounded">
                {displayValue}
            </code>
            {allowToggle && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsVisible(!isVisible)}
                    className="h-8 w-8 p-0"
                >
                    {isVisible ? (
                        <EyeOff className="h-4 w-4" />
                    ) : (
                        <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                        {isVisible ? 'Hide' : 'Show'} value
                    </span>
                </Button>
            )}
        </div>
    );
}

/**
 * API Key Component
 * Specialized component for API keys
 */
export function ApiKey({ value }: { value: string }) {
    return (
        <SensitiveData
            value={value}
            permission="view_api_keys"
            showLength={8}
            fallback={
                <span className="text-muted-foreground italic">
                    ••••••••••••••••
                </span>
            }
        />
    );
}

/**
 * Secret Component
 * Specialized component for secrets
 */
export function Secret({ value }: { value: string }) {
    return (
        <SensitiveData
            value={value}
            permission="view_secrets"
            showLength={0}
            maskChar="•"
            fallback={
                <span className="text-muted-foreground italic">
                    ••••••••••••••••
                </span>
            }
        />
    );
}
