'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorDisplay } from '../../common/ErrorDisplay';
import { TrendingUp, User } from 'lucide-react';

interface BandwidthAccount {
  user: string;
  domain: string;
  used: number;
}

interface BandwidthData {
  total: number;
  accounts: BandwidthAccount[];
}

interface Props {
  serverId: string;
}

export function BandwidthSubTab({ serverId }: Props) {
  const [data, setData] = useState<BandwidthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBandwidth();
  }, [serverId]);

  const loadBandwidth = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ext/server-monitor/whm/server/${serverId}/bandwidth`);
      if (!response.ok) throw new Error('Failed to load bandwidth data');
      const bwData = await response.json();
      setData(bwData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bandwidth data');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadBandwidth} />;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          Total: {formatBytes(data?.total || 0)}
        </span>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 text-sm font-medium">User</th>
              <th className="text-left p-3 text-sm font-medium">Domain</th>
              <th className="text-left p-3 text-sm font-medium">Bandwidth Used</th>
              <th className="text-left p-3 text-sm font-medium">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {data?.accounts.map((account, idx) => {
              const percentage = data.total > 0 ? (account.used / data.total) * 100 : 0;
              return (
                <tr key={idx} className="border-t hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {account.user}
                    </div>
                  </td>
                  <td className="p-3 font-medium">{account.domain}</td>
                  <td className="p-3 text-sm">{formatBytes(account.used)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
