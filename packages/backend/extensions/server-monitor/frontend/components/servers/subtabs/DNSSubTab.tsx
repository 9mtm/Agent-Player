'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorDisplay } from '../../common/ErrorDisplay';
import { Globe, FileText } from 'lucide-react';

interface DNSRecord {
  type: string;
  name: string;
  value: string;
  ttl: number;
}

interface DNSZone {
  domain: string;
  records: number;
}

interface DNSData {
  zones: DNSZone[];
  records: DNSRecord[];
}

interface Props {
  serverId: string;
}

export function DNSSubTab({ serverId }: Props) {
  const [data, setData] = useState<DNSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDNS();
  }, [serverId]);

  const loadDNS = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ext/server-monitor/whm/server/${serverId}/dns`);
      if (!response.ok) throw new Error('Failed to load DNS data');
      const dnsData = await response.json();
      setData(dnsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load DNS data');
    } finally {
      setLoading(false);
    }
  };

  const getRecordColor = (type: string) => {
    switch (type) {
      case 'A':
        return 'bg-blue-500/10 text-blue-600';
      case 'CNAME':
        return 'bg-purple-500/10 text-purple-600';
      case 'MX':
        return 'bg-green-500/10 text-green-600';
      case 'TXT':
        return 'bg-yellow-500/10 text-yellow-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadDNS} />;

  return (
    <div className="p-6 space-y-6">
      {/* DNS Zones Summary */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Globe className="w-4 h-4" />
          DNS Zones
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data?.zones.map((zone, idx) => (
            <div key={idx} className="border rounded-lg p-3">
              <div className="font-medium">{zone.domain}</div>
              <div className="text-sm text-muted-foreground">{zone.records} records</div>
            </div>
          ))}
        </div>
      </div>

      {/* DNS Records */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <FileText className="w-4 h-4" />
          DNS Records
        </h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Type</th>
                <th className="text-left p-3 text-sm font-medium">Name</th>
                <th className="text-left p-3 text-sm font-medium">Value</th>
                <th className="text-left p-3 text-sm font-medium">TTL</th>
              </tr>
            </thead>
            <tbody>
              {data?.records.map((record, idx) => (
                <tr key={idx} className="border-t hover:bg-muted/20">
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRecordColor(record.type)}`}>
                      {record.type}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{record.name}</td>
                  <td className="p-3 text-sm text-muted-foreground">{record.value}</td>
                  <td className="p-3 text-sm">{record.ttl}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
