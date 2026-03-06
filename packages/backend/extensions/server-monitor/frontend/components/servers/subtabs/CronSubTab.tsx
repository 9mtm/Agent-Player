'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorDisplay } from '../../common/ErrorDisplay';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';

interface CronJob {
  user: string;
  schedule: string;
  command: string;
  enabled: boolean;
}

interface CronData {
  jobs: CronJob[];
}

interface Props {
  serverId: string;
}

export function CronSubTab({ serverId }: Props) {
  const [data, setData] = useState<CronData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCron();
  }, [serverId]);

  const loadCron = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ext/server-monitor/whm/server/${serverId}/cron`);
      if (!response.ok) throw new Error('Failed to load cron data');
      const cronData = await response.json();
      setData(cronData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cron data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadCron} />;

  const enabledCount = data?.jobs.filter((j) => j.enabled).length || 0;
  const disabledCount = data?.jobs.filter((j) => !j.enabled).length || 0;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-4 text-sm">
        <span className="text-green-600 font-medium">{enabledCount} enabled</span>
        {disabledCount > 0 && <span className="text-muted-foreground">{disabledCount} disabled</span>}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 text-sm font-medium">User</th>
              <th className="text-left p-3 text-sm font-medium">Schedule</th>
              <th className="text-left p-3 text-sm font-medium">Command</th>
              <th className="text-left p-3 text-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.jobs.map((job, idx) => (
              <tr key={idx} className={`border-t hover:bg-muted/20 ${!job.enabled ? 'opacity-50' : ''}`}>
                <td className="p-3 font-medium">{job.user}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <code className="text-xs bg-muted px-2 py-1 rounded">{job.schedule}</code>
                  </div>
                </td>
                <td className="p-3 text-sm text-muted-foreground">
                  <code className="text-xs">{job.command}</code>
                </td>
                <td className="p-3">
                  {job.enabled ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm">Enabled</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <XCircle className="w-4 h-4" />
                      <span className="text-sm">Disabled</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
