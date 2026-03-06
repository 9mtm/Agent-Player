'use client';

import {
  Database,
  Network,
  FileText,
  Wrench,
  Clock,
  HardDrive,
  Terminal,
  Info,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type PermissionType =
  | 'network'
  | 'database'
  | 'filesystem'
  | 'tools'
  | 'cron'
  | 'storage'
  | 'process';

interface PermissionMetadata {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  risk: 'low' | 'medium' | 'high';
  description: string;
}

const PERMISSION_CONFIG: Record<PermissionType, PermissionMetadata> = {
  storage: {
    icon: HardDrive,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    risk: 'low',
    description: 'Access extension-specific storage',
  },
  tools: {
    icon: Wrench,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    risk: 'medium',
    description: 'Register AI tools for agent use',
  },
  cron: {
    icon: Clock,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
    risk: 'medium',
    description: 'Schedule background tasks',
  },
  network: {
    icon: Network,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900',
    risk: 'medium',
    description: 'Make HTTP requests',
  },
  filesystem: {
    icon: FileText,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900',
    risk: 'high',
    description: 'Read/write files on disk',
  },
  database: {
    icon: Database,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900',
    risk: 'high',
    description: 'Direct database access',
  },
  process: {
    icon: Terminal,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900',
    risk: 'high',
    description: 'Execute shell commands',
  },
};

interface PermissionsBadgeProps {
  permissions: PermissionType[];
  /** Show full labels instead of just icons */
  showLabels?: boolean;
  /** Show risk indicator */
  showRisk?: boolean;
  /** Compact mode (smaller badges) */
  compact?: boolean;
}

export function PermissionsBadge({
  permissions,
  showLabels = false,
  showRisk = false,
  compact = false,
}: PermissionsBadgeProps) {
  if (!permissions || permissions.length === 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Info className="h-3 w-3" />
        <span>No special permissions</span>
      </div>
    );
  }

  // Filter out invalid permissions (not in PERMISSION_CONFIG)
  const validPermissions = permissions.filter((p) => p in PERMISSION_CONFIG);

  if (validPermissions.length === 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Info className="h-3 w-3" />
        <span>No special permissions</span>
      </div>
    );
  }

  // Sort by risk level (high → medium → low)
  const sortedPermissions = [...validPermissions].sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    return riskOrder[PERMISSION_CONFIG[a].risk] - riskOrder[PERMISSION_CONFIG[b].risk];
  });

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1.5">
        {sortedPermissions.map((permission) => {
          const config = PERMISSION_CONFIG[permission];
          const Icon = config.icon;

          const badge = (
            <div
              key={permission}
              className={`
                inline-flex items-center gap-1.5 rounded-md
                ${config.bgColor} ${config.color}
                ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'}
                text-xs font-medium
                transition-colors
              `}
            >
              <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
              {showLabels && (
                <span className="capitalize">{permission}</span>
              )}
              {showRisk && config.risk === 'high' && (
                <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                  HIGH
                </span>
              )}
            </div>
          );

          return (
            <Tooltip key={permission}>
              <TooltipTrigger asChild>
                {badge}
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-semibold capitalize">{permission}</p>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                  <p className="text-xs">
                    <span className="font-medium">Risk:</span>{' '}
                    <span className={`capitalize ${
                      config.risk === 'high' ? 'text-red-500' :
                      config.risk === 'medium' ? 'text-yellow-500' :
                      'text-green-500'
                    }`}>
                      {config.risk}
                    </span>
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
