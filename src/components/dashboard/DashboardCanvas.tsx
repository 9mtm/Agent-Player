/**
 * Dashboard Canvas
 * Main grid layout with drag & drop support using react-grid-layout
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { WidgetWrapper } from './WidgetWrapper';
import { WidgetRenderer } from '../dashboard-widgets/WidgetRenderer';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { config } from '@/lib/config';

interface WidgetLayout {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  settings?: Record<string, unknown>;
}

interface DashboardCanvasProps {
  refreshTrigger?: number;
  onAddWidget: () => void;
}

export function DashboardCanvas({ refreshTrigger, onAddWidget }: DashboardCanvasProps) {
  const [layout, setLayout] = useState<WidgetLayout[]>([]);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedInitialLayout, setHasLoadedInitialLayout] = useState(false);
  const isLoadingLayout = useRef(false);
  const hasInitializedWidth = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(1200);

  // Measure container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setGridWidth(containerRef.current.offsetWidth);
        // Mark width as initialized after first measurement
        if (!hasInitializedWidth.current) {
          setTimeout(() => {
            hasInitializedWidth.current = true;
          }, 150);
        }
      }
    };

    // Delay to ensure container is rendered
    const timer = setTimeout(updateWidth, 100);
    window.addEventListener('resize', updateWidth);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Load user's dashboard layout
  useEffect(() => {
    const loadLayout = async () => {
      setLoading(true);
      setHasLoadedInitialLayout(false); // Reset flag before loading
      isLoadingLayout.current = true; // Set ref to prevent saves during load
      try {
        const response = await fetch(`${config.backendUrl}/api/dashboard/layout`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load layout');
        }

        const data = await response.json();
        setLayout(data.widgets || []);
        setHasLoadedInitialLayout(true);

        // Use setTimeout to allow GridLayout to update before allowing saves
        setTimeout(() => {
          isLoadingLayout.current = false;
        }, 100);
      } catch (err) {
        console.error('[Dashboard] Failed to load layout:', err);
        setHasLoadedInitialLayout(true);
        isLoadingLayout.current = false;
      } finally {
        setLoading(false);
      }
    };

    loadLayout();
  }, [refreshTrigger]);

  // Load widget definitions for the widgets in the layout
  useEffect(() => {
    const loadWidgets = async () => {
      if (layout.length === 0) {
        setWidgets([]);
        return;
      }

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

        // Filter widgets to only those in the layout
        const widgetIds = layout.map(l => l.widgetId);
        const filteredWidgets = data.widgets.filter((w: any) => widgetIds.includes(w.id));

        setWidgets(filteredWidgets);
      } catch (err) {
        console.error('[Dashboard] Failed to load widgets:', err);
      }
    };

    loadWidgets();
  }, [layout]);

  // Save layout changes
  const handleLayoutChange = (newGridLayout: any[]) => {
    // Don't save if we're currently loading layout
    if (isLoadingLayout.current) {
      return;
    }

    // Don't save if we haven't loaded the initial layout yet
    // This prevents overwriting the layout on initial mount
    if (!hasLoadedInitialLayout) {
      return;
    }

    // Don't save during initial width calculation
    // This prevents clearing the layout when GridLayout remounts due to width change
    if (!hasInitializedWidth.current) {
      return;
    }

    const updatedLayout = newGridLayout.map(item => ({
      widgetId: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    }));

    // Check if layout actually changed (compare stringified versions)
    const currentLayoutString = JSON.stringify(layout.map(l => ({
      widgetId: l.widgetId,
      x: l.x,
      y: l.y,
      w: l.w,
      h: l.h,
    })));
    const newLayoutString = JSON.stringify(updatedLayout);

    if (currentLayoutString === newLayoutString) {
      return;
    }

    setLayout(updatedLayout);

    // Save to backend
    fetch(`${config.backendUrl}/api/dashboard/layout`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({ widgets: updatedLayout }),
    }).catch(err => {
      console.error('[Dashboard] Failed to save layout:', err);
    });
  };

  // Remove widget
  const handleRemoveWidget = (widgetId: string) => {
    const newLayout = layout.filter(l => l.widgetId !== widgetId);
    setLayout(newLayout);

    // Save to backend
    fetch(`${config.backendUrl}/api/dashboard/layout`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({ widgets: newLayout }),
    }).catch(err => {
      console.error('[Dashboard] Failed to save layout:', err);
    });
  };

  // Convert layout to grid layout format
  const gridLayout = layout.map(l => ({
    i: l.widgetId,
    x: l.x,
    y: l.y,
    w: l.w,
    h: l.h,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (layout.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Welcome to Your Dashboard</h2>
          <p className="text-muted-foreground mb-6">
            Add widgets to customize your dashboard
          </p>
          <Button onClick={onAddWidget} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Add Your First Widget
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full p-6">
      <GridLayout
        key={`grid-${gridWidth}`}
        className="layout"
        layout={gridLayout}
        cols={12}
        rowHeight={100}
        width={gridWidth}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isDraggable
        isResizable
        compactType="vertical"
        preventCollision={false}
      >
        {widgets.map(widget => {
          const layoutItem = gridLayout.find(l => l.i === widget.id);
          if (!layoutItem) return null;

          return (
            <div key={widget.id}>
              <WidgetWrapper
                widget={widget}
                onRemove={() => handleRemoveWidget(widget.id)}
              >
                <WidgetRenderer widget={widget} />
              </WidgetWrapper>
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}
