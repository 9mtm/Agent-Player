'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorDisplay } from '../../common/ErrorDisplay';
import { Circle } from 'lucide-react';

interface Service {
  name: string;
  displayName: string;
  running: boolean;
  enabled: boolean;
}

interface Props {
  serverId: string;
}

export function ServicesSubTab({ serverId }: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadServices();
  }, [serverId]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ext/server-monitor/whm/server/${serverId}/services`);
      if (!response.ok) throw new Error('Failed to load services');
      const data = await response.json();
      setServices(data.services || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadServices} />;

  const running = services.filter((s) => s.running).length;
  const stopped = services.filter((s) => !s.running && s.enabled).length;

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm text-green-600 font-medium">{running} running</span>
        {stopped > 0 && <span className="text-sm text-red-600 font-medium">{stopped} stopped</span>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, idx) => (
          <div
            key={idx}
            className={`border rounded-lg p-4 ${
              service.running
                ? 'bg-green-500/5 border-green-500/20'
                : service.enabled
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-muted/50 border-muted'
            }`}
          >
            <div className="flex items-center gap-3">
              <Circle
                className={`w-3 h-3 ${
                  service.running ? 'fill-green-500 text-green-500' : 'fill-muted text-muted'
                }`}
              />
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {service.displayName || service.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {service.running ? 'Running' : 'Stopped'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
