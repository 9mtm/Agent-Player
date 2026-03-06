'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorDisplay } from '../../common/ErrorDisplay';
import { CheckCircle2, XCircle, Clock, Calendar } from 'lucide-react';

interface Backup {
  job: string;
  destination: string;
  schedule: string;
  lastRun: string;
  status: 'success' | 'failed' | 'pending';
  nextRun: string;
}

interface Props {
  serverId: string;
}

export function BackupsSubTab({ serverId }: Props) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBackups();
  }, [serverId]);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ext/server-monitor/whm/server/${serverId}/backups`);
      if (!response.ok) throw new Error('Failed to load backups');
      const data = await response.json();
      setBackups(data.backups || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadBackups} />;

  const successCount = backups.filter((b) => b.status === 'success').length;
  const failedCount = backups.filter((b) => b.status === 'failed').length;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-4 text-sm">
        <span className="text-green-600 font-medium">{successCount} successful</span>
        {failedCount > 0 && <span className="text-red-600 font-medium">{failedCount} failed</span>}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 text-sm font-medium">Job</th>
              <th className="text-left p-3 text-sm font-medium">Destination</th>
              <th className="text-left p-3 text-sm font-medium">Schedule</th>
              <th className="text-left p-3 text-sm font-medium">Last Run</th>
              <th className="text-left p-3 text-sm font-medium">Next Run</th>
              <th className="text-left p-3 text-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((backup, idx) => (
              <tr key={idx} className="border-t hover:bg-muted/20">
                <td className="p-3 font-medium">{backup.job}</td>
                <td className="p-3 text-sm text-muted-foreground">{backup.destination}</td>
                <td className="p-3 text-sm">
                  <code className="px-2 py-1 bg-muted rounded text-xs">{backup.schedule}</code>
                </td>
                <td className="p-3 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    {formatDate(backup.lastRun)}
                  </div>
                </td>
                <td className="p-3 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    {formatDate(backup.nextRun)}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    {backup.status === 'success' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600">Success</span>
                      </>
                    ) : backup.status === 'failed' ? (
                      <>
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600">Failed</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-yellow-600">Pending</span>
                      </>
                    )}
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
