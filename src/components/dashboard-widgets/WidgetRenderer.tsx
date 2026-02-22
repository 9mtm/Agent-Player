/**
 * Widget Renderer
 * Dynamically renders widgets based on their type
 */

'use client';

import { useEffect, useState } from 'react';
import { StatsCard } from './StatsCard';
import { ChartCard } from './ChartCard';
import { ListCard } from './ListCard';
import { TableCard } from './TableCard';
import { CalendarCard } from './CalendarCard';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import { config } from '@/lib/config';

interface DashboardWidget {
  id: string;
  name: string;
  component_type: string;
  data_endpoint: string;
  refresh_interval: number;
}

interface WidgetRendererProps {
  widget: DashboardWidget;
}

export function WidgetRenderer({ widget }: WidgetRendererProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const response = await fetch(`${config.backendUrl}${widget.data_endpoint}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const json = await response.json();
      setData(json);
    } catch (err: any) {
      console.error(`[Widget:${widget.id}] Fetch error:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up auto-refresh
    const interval = setInterval(fetchData, widget.refresh_interval);

    return () => clearInterval(interval);
  }, [widget.id, widget.data_endpoint, widget.refresh_interval]);

  // Loading state
  if (loading && !data) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Loading {widget.name}...</p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="flex flex-col items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-6 w-6" />
          <p className="text-sm">Failed to load widget</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Render widget based on type
  switch (widget.component_type) {
    case 'stats':
      return <StatsCard stats={data?.stats || []} />;

    case 'chart':
      return <ChartCard title={widget.name} chart={data?.chart} />;

    case 'list':
      return <ListCard title={widget.name} items={data?.items || []} />;

    case 'table':
      return <TableCard title={widget.name} columns={data?.columns || []} rows={data?.rows || []} />;

    case 'calendar':
      return <CalendarCard title={widget.name} events={data?.events || []} />;

    case 'activity':
      return <ListCard title={widget.name} items={data?.items || []} />;

    default:
      return (
        <Card className="h-full flex items-center justify-center">
          <CardContent className="text-muted-foreground">
            <p className="text-sm">Unknown widget type: {widget.component_type}</p>
          </CardContent>
        </Card>
      );
  }
}
