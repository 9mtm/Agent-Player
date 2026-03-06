'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorDisplay } from '../../common/ErrorDisplay';
import { Network, Lock, Unlock, Shield } from 'lucide-react';

interface Port {
  port: number;
  protocol: string;
  service: string;
  status: 'open' | 'closed' | 'filtered';
}

interface PortsData {
  ports: Port[];
}

interface Props {
  serverId: string;
}

export function PortsSubTab({ serverId }: Props) {
  const [data, setData] = useState<PortsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPorts();
  }, [serverId]);

  const loadPorts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ext/server-monitor/whm/server/${serverId}/ports`);
      if (!response.ok) throw new Error('Failed to load ports data');
      const portsData = await response.json();
      setData(portsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ports data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-green-600';
      case 'filtered':
        return 'text-yellow-600';
      case 'closed':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Unlock className="w-4 h-4" />;
      case 'filtered':
        return <Shield className="w-4 h-4" />;
      case 'closed':
        return <Lock className="w-4 h-4" />;
      default:
        return <Network className="w-4 h-4" />;
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadPorts} />;

  const openCount = data?.ports.filter((p) => p.status === 'open').length || 0;
  const filteredCount = data?.ports.filter((p) => p.status === 'filtered').length || 0;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-4 text-sm">
        <span className="text-green-600 font-medium">{openCount} open</span>
        {filteredCount > 0 && <span className="text-yellow-600 font-medium">{filteredCount} filtered</span>}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 text-sm font-medium">Port</th>
              <th className="text-left p-3 text-sm font-medium">Protocol</th>
              <th className="text-left p-3 text-sm font-medium">Service</th>
              <th className="text-left p-3 text-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.ports.map((port, idx) => (
              <tr key={idx} className="border-t hover:bg-muted/20">
                <td className="p-3 font-bold">{port.port}</td>
                <td className="p-3 text-sm">
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-600 rounded text-xs">
                    {port.protocol}
                  </span>
                </td>
                <td className="p-3 text-sm text-muted-foreground">{port.service}</td>
                <td className="p-3">
                  <div className={`flex items-center gap-1 ${getStatusColor(port.status)}`}>
                    {getStatusIcon(port.status)}
                    <span className="text-sm capitalize">{port.status}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
