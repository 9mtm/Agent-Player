/**
 * List Card Widget
 * Displays a list of items (recent activity, notifications, workflows)
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Activity, Bell, Workflow, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ListItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  icon: string;
  status?: string;
  isRead?: boolean;
}

interface ListCardProps {
  title?: string;
  items: ListItem[];
}

const ICON_MAP: Record<string, any> = {
  'activity': Activity,
  'bell': Bell,
  'workflow': Workflow,
  'clock': Clock,
};

export function ListCard({ title, items }: ListCardProps) {
  return (
    <Card className="h-full">
      {title && (
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No items</p>
          ) : (
            items.map((item) => {
              const Icon = ICON_MAP[item.icon] || Activity;
              return (
                <div key={item.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className={`p-2 rounded-lg ${item.isRead === false ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-muted'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                    )}
                    {item.status && (
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 mt-1">
                        {item.status}
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
