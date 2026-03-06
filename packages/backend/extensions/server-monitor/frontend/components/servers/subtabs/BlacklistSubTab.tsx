'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorDisplay } from '../../common/ErrorDisplay';
import { Shield, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface BlacklistCheck {
  list: string;
  status: 'clean' | 'listed' | 'unknown';
  checked: string;
}

interface BlacklistData {
  status: 'clean' | 'listed' | 'partial';
  checks: BlacklistCheck[];
}

interface Props {
  serverId: string;
}

export function BlacklistSubTab({ serverId }: Props) {
  const [data, setData] = useState<BlacklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBlacklist();
  }, [serverId]);

  const loadBlacklist = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ext/server-monitor/whm/server/${serverId}/blacklist`);
      if (!response.ok) throw new Error('Failed to load blacklist data');
      const blacklistData = await response.json();
      setData(blacklistData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blacklist data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clean':
        return 'text-green-600';
      case 'listed':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clean':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'listed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadBlacklist} />;

  const listedCount = data?.checks.filter((c) => c.status === 'listed').length || 0;
  const cleanCount = data?.checks.filter((c) => c.status === 'clean').length || 0;

  return (
    <div className="p-6">
      {/* Overall Status */}
      <div className="mb-6 flex items-center gap-3">
        <Shield className={`w-6 h-6 ${getStatusColor(data?.status || 'unknown')}`} />
        <div>
          <div className="text-lg font-semibold capitalize">{data?.status || 'Unknown'} Status</div>
          <div className="text-sm text-muted-foreground">
            {cleanCount} clean · {listedCount} listed
          </div>
        </div>
      </div>

      {/* Blacklist Checks */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 text-sm font-medium">Blacklist</th>
              <th className="text-left p-3 text-sm font-medium">Status</th>
              <th className="text-left p-3 text-sm font-medium">Last Checked</th>
            </tr>
          </thead>
          <tbody>
            {data?.checks.map((check, idx) => (
              <tr key={idx} className="border-t hover:bg-muted/20">
                <td className="p-3 font-medium">{check.list}</td>
                <td className="p-3">
                  <div className={`flex items-center gap-1 ${getStatusColor(check.status)}`}>
                    {getStatusIcon(check.status)}
                    <span className="text-sm capitalize">{check.status}</span>
                  </div>
                </td>
                <td className="p-3 text-sm text-muted-foreground">
                  {new Date(check.checked).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
