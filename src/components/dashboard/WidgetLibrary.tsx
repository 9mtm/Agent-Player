/**
 * Widget Library
 * Sidebar showing available widgets that can be added to dashboard
 */

'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Activity, Bot, ListTodo, Workflow, HardDrive, Bell, Calendar, Users, Cpu, Plus } from 'lucide-react';
import { config } from '@/lib/config';

interface DashboardWidget {
  id: string;
  name: string;
  description: string;
  component_type: string;
  category: string;
  icon: string;
  default_size: string;
  extension_id: string | null;
}

interface WidgetLibraryProps {
  open: boolean;
  onClose: () => void;
  onAddWidget: (widgetId: string, size: string) => void;
}

const ICON_MAP: Record<string, any> = {
  'activity': Activity,
  'bot': Bot,
  'list-todo': ListTodo,
  'workflow': Workflow,
  'hard-drive': HardDrive,
  'bell': Bell,
  'calendar': Calendar,
  'users': Users,
  'cpu': Cpu,
};

const CATEGORY_COLORS: Record<string, string> = {
  'analytics': 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  'tasks': 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  'communications': 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  'storage': 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
  'team': 'bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300',
  'extensions': 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
};

export function WidgetLibrary({ open, onClose, onAddWidget }: WidgetLibraryProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    const loadWidgets = async () => {
      try {
        const response = await fetch(`${config.backendUrl}/api/dashboard/widgets`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load widgets');
        }

        const data = await response.json();
        setWidgets(data.widgets || []);
      } catch (err) {
        console.error('[WidgetLibrary] Failed to load widgets:', err);
      } finally {
        setLoading(false);
      }
    };

    loadWidgets();
  }, [open]);

  // Group widgets by category
  const grouped = widgets.reduce((acc, widget) => {
    const category = widget.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(widget);
    return acc;
  }, {} as Record<string, DashboardWidget[]>);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:w-[500px]">
        <SheetHeader>
          <SheetTitle>Add Widget</SheetTitle>
          <SheetDescription>
            Choose a widget to add to your dashboard
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto pr-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading widgets...</p>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${CATEGORY_COLORS[category] || 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'}`}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {items.map((widget) => {
                    const Icon = ICON_MAP[widget.icon] || Activity;
                    return (
                      <Card key={widget.id} className="hover:border-primary transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm">{widget.name}</h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {widget.description}
                                </p>
                                {widget.extension_id && (
                                  <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 mt-2">
                                    Extension
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={async () => {
                                await onAddWidget(widget.id, widget.default_size);
                                onClose();
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
