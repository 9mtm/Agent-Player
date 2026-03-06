'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorDisplay } from '../../common/ErrorDisplay';
import { Database, HardDrive } from 'lucide-react';

interface MySQLDatabase {
  name: string;
  user: string;
  size: string;
}

interface MySQLData {
  databases: MySQLDatabase[];
}

interface Props {
  serverId: string;
}

export function MySQLSubTab({ serverId }: Props) {
  const [data, setData] = useState<MySQLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMySQL();
  }, [serverId]);

  const loadMySQL = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ext/server-monitor/whm/server/${serverId}/mysql`);
      if (!response.ok) throw new Error('Failed to load MySQL data');
      const mysqlData = await response.json();
      setData(mysqlData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MySQL data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadMySQL} />;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Database className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">{data?.databases.length || 0} databases</span>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 text-sm font-medium">Database Name</th>
              <th className="text-left p-3 text-sm font-medium">User</th>
              <th className="text-left p-3 text-sm font-medium">Size</th>
            </tr>
          </thead>
          <tbody>
            {data?.databases.map((db, idx) => (
              <tr key={idx} className="border-t hover:bg-muted/20">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <strong>{db.name}</strong>
                  </div>
                </td>
                <td className="p-3 text-sm text-muted-foreground">{db.user}</td>
                <td className="p-3 text-sm">
                  <div className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-muted-foreground" />
                    {db.size}
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
