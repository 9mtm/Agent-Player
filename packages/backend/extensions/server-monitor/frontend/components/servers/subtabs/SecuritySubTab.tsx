'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorDisplay } from '../../common/ErrorDisplay';
import { Shield, AlertTriangle, Clock, FileWarning } from 'lucide-react';

interface Vulnerability {
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  cve: string;
}

interface SecurityData {
  firewall: {
    status: 'active' | 'inactive';
    rules: number;
  };
  failedLogins: number;
  lastSecurityScan: string;
  vulnerabilities: Vulnerability[];
}

interface Props {
  serverId: string;
}

export function SecuritySubTab({ serverId }: Props) {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSecurity();
  }, [serverId]);

  const loadSecurity = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ext/server-monitor/whm/server/${serverId}/security`);
      if (!response.ok) throw new Error('Failed to load security data');
      const securityData = await response.json();
      setData(securityData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-600';
      case 'high':
        return 'bg-orange-500/10 text-orange-600';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-600';
      case 'low':
        return 'bg-blue-500/10 text-blue-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadSecurity} />;

  return (
    <div className="p-6 space-y-6">
      {/* Security Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className={`w-4 h-4 ${data?.firewall.status === 'active' ? 'text-green-500' : 'text-red-500'}`} />
            <span className="text-sm font-medium">Firewall</span>
          </div>
          <div className="text-lg font-bold capitalize">{data?.firewall.status}</div>
          <div className="text-xs text-muted-foreground">{data?.firewall.rules} rules</div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">Failed Logins</span>
          </div>
          <div className="text-lg font-bold">{data?.failedLogins || 0}</div>
          <div className="text-xs text-muted-foreground">Last 24 hours</div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Last Scan</span>
          </div>
          <div className="text-sm">
            {data?.lastSecurityScan ? new Date(data.lastSecurityScan).toLocaleString() : 'Never'}
          </div>
        </div>
      </div>

      {/* Vulnerabilities */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <FileWarning className="w-4 h-4" />
          Vulnerabilities ({data?.vulnerabilities.length || 0})
        </h3>
        <div className="space-y-3">
          {data?.vulnerabilities.map((vuln, idx) => (
            <div key={idx} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(vuln.severity)}`}>
                  {vuln.severity.toUpperCase()}
                </span>
                {vuln.cve !== 'N/A' && (
                  <code className="text-xs bg-muted px-2 py-1 rounded">{vuln.cve}</code>
                )}
              </div>
              <p className="text-sm">{vuln.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
