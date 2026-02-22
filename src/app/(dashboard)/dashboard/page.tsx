/**
 * Main Dashboard Page
 * Customizable dashboard with drag & drop widgets
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { config } from '@/lib/config';
import { DashboardCanvas } from '@/components/dashboard/DashboardCanvas';
import { WidgetLibrary } from '@/components/dashboard/WidgetLibrary';
import { toast } from 'sonner';

const SIZE_MAP: Record<string, { w: number; h: number }> = {
  small: { w: 3, h: 2 },
  medium: { w: 6, h: 3 },
  large: { w: 9, h: 4 },
  full: { w: 12, h: 4 },
};

export default function DashboardPage() {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAddWidget = async (widgetId: string, size: string) => {
    try {
      // Get current layout
      const layoutResponse = await fetch(`${config.backendUrl}/api/dashboard/layout`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!layoutResponse.ok) {
        throw new Error('Failed to load current layout');
      }

      const layoutData = await layoutResponse.json();
      const currentWidgets = layoutData.widgets || [];

      // Calculate position for new widget (bottom of the grid)
      const maxY = currentWidgets.reduce((max: number, w: any) => Math.max(max, w.y + w.h), 0);
      const dimensions = SIZE_MAP[size] || SIZE_MAP.medium;

      // Add new widget
      const newWidget = {
        widgetId,
        x: 0,
        y: maxY,
        w: dimensions.w,
        h: dimensions.h,
      };

      // Save updated layout
      const saveResponse = await fetch(`${config.backendUrl}/api/dashboard/layout`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ widgets: [...currentWidgets, newWidget] }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save layout');
      }

      // Trigger DashboardCanvas refresh
      setRefreshTrigger(prev => prev + 1);
      toast.success('Widget added successfully');
    } catch (error: any) {
      console.error('[Dashboard] Failed to add widget:', error);
      toast.error('Failed to add widget');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Customize your dashboard with widgets
          </p>
        </div>
        <Button onClick={() => setLibraryOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Widget
        </Button>
      </div>

      {/* Dashboard Canvas */}
      <DashboardCanvas refreshTrigger={refreshTrigger} onAddWidget={() => setLibraryOpen(true)} />

      {/* Widget Library Sidebar */}
      <WidgetLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onAddWidget={handleAddWidget}
      />
    </div>
  );
}
