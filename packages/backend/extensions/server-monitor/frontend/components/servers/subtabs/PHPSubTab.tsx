'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorDisplay } from '../../common/ErrorDisplay';

interface DomainPHP {
  domain: string;
  phpVersion: string;
}

interface Props {
  serverId: string;
}

export function PHPSubTab({ serverId }: Props) {
  const [domains, setDomains] = useState<DomainPHP[]>([]);
  const [versionCounts, setVersionCounts] = useState<Record<string, number>>({});
  const [totalDomains, setTotalDomains] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPHP();
  }, [serverId]);

  const loadPHP = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ext/server-monitor/whm/server/${serverId}/php`);
      if (!response.ok) throw new Error('Failed to load PHP data');
      const data = await response.json();
      setDomains(data.domains || []);
      setVersionCounts(data.versionCounts || {});
      setTotalDomains(data.totalDomains || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PHP data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadPHP} />;

  const phpColors: Record<string, string> = {
    'ea-php56': '#8892bf',
    'ea-php70': '#7b68ee',
    'ea-php71': '#6a5acd',
    'ea-php72': '#4169e1',
    'ea-php73': '#1e90ff',
    'ea-php74': '#00bfff',
    'ea-php80': '#2ecc71',
    'ea-php81': '#27ae60',
    'ea-php82': '#1abc9c',
    'ea-php83': '#16a085',
    'ea-php84': '#0d9b6e',
  };

  const sortedVersions = Object.entries(versionCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-6">
      <div className="mb-4 text-sm text-muted-foreground">{totalDomains} domains</div>

      {/* Version distribution chart */}
      {sortedVersions.length > 0 && (
        <div className="space-y-2 mb-6">
          {sortedVersions.map(([version, count]) => {
            const pct = Math.round((count / totalDomains) * 100);
            const color = phpColors[version] || '#ff9900';

            return (
              <div key={version} className="flex items-center gap-3">
                <span className="text-sm w-24 flex-shrink-0">{version}</span>
                <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full flex items-center justify-end pr-2 text-xs font-medium text-white"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  >
                    {pct > 15 && `${count} (${pct}%)`}
                  </div>
                </div>
                <span className="text-sm w-20 text-right">
                  {count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Domain table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 text-sm font-medium">Domain</th>
              <th className="text-left p-3 text-sm font-medium">PHP Version</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((domain, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-3">
                  <strong>{domain.domain}</strong>
                </td>
                <td className="p-3">
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                    {domain.phpVersion}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
