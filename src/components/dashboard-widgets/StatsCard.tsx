/**
 * Stats Card Widget
 * Displays statistics with icon and optional change indicator
 */

'use client';

import { Card } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Activity, Bot, ListTodo, Workflow, PlayCircle, HardDrive, Cpu, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StatItem {
  label: string;
  value: number | string;
  icon: string;
  color?: string;
  change?: number;
}

interface StatsCardProps {
  stats: StatItem[];
}

const ICON_MAP: Record<string, any> = {
  'activity': Activity,
  'bot': Bot,
  'list-todo': ListTodo,
  'workflow': Workflow,
  'play-circle': PlayCircle,
  'hard-drive': HardDrive,
  'cpu': Cpu,
  'zap': Zap,
};

const COLOR_MAP: Record<string, string> = {
  'blue': 'text-blue-500',
  'green': 'text-green-500',
  'purple': 'text-purple-500',
  'orange': 'text-orange-500',
  'red': 'text-red-500',
  'yellow': 'text-yellow-500',
};

export function StatsCard({ stats }: StatsCardProps) {
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {stats.map((stat, index) => {
        const Icon = ICON_MAP[stat.icon] || Activity;
        const colorClass = COLOR_MAP[stat.color || 'blue'];

        return (
          <Card key={index} className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
              </div>
              <Icon className={`h-8 w-8 ${colorClass}`} />
            </div>
            {stat.change !== undefined && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${stat.change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {stat.change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                <span>{Math.abs(stat.change)}% from yesterday</span>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
