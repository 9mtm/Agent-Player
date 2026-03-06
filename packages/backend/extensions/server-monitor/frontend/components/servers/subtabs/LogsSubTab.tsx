'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorDisplay } from '../../common/ErrorDisplay';
import { RefreshCw } from 'lucide-react';

interface LogEntry {
  domain: string;
  user: string;
  errors: string[];
}

interface Props {
  serverId: string;
}

export function LogsSubTab({ serverId }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalErrors, setTotalErrors] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, [serverId]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ext/server-monitor/whm/server/${serverId}/logs`);
      if (!response.ok) throw new Error('Failed to load logs');
      const data = await response.json();
      setLogs(data.logs || []);
      setTotalErrors(data.totalErrors || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadLogs} />;

  if (logs.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>No error logs available</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">
          {totalErrors} errors · {logs.length} accounts
        </span>
        <Button size="sm" variant="outline" onClick={loadLogs}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {logs.map((log, idx) => (
          <div key={idx} className="border rounded-lg">
            <div className="flex items-center justify-between bg-muted/30 px-4 py-2 border-b">
              <span className="font-medium text-sm">
                {log.domain} ({log.user})
              </span>
              <span className="text-xs text-muted-foreground">{log.errors.length} errors</span>
            </div>
            <pre className="p-4 text-xs bg-background overflow-x-auto whitespace-pre-wrap break-words">
              {log.errors.join('\n')}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
