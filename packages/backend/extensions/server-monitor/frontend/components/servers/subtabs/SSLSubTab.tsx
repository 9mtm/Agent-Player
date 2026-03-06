'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorDisplay } from '../../common/ErrorDisplay';

interface Certificate {
  domain: string;
  issuer: string;
  expiry: string;
  daysRemaining: number | null;
  status: 'ok' | 'warning' | 'critical' | 'expired';
}

interface Props {
  serverId: string;
}

export function SSLSubTab({ serverId }: Props) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [totalCerts, setTotalCerts] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSSL();
  }, [serverId]);

  const loadSSL = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ext/server-monitor/whm/server/${serverId}/ssl`);
      if (!response.ok) throw new Error('Failed to load SSL certificates');
      const data = await response.json();
      setCertificates(data.certificates || []);
      setTotalCerts(data.totalCerts || 0);
      setWarningCount(data.warningCount || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SSL certificates');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'bg-green-500/10 text-green-500';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'critical':
        return 'bg-orange-500/10 text-orange-500';
      case 'expired':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ok':
        return 'Valid';
      case 'warning':
        return 'Expiring Soon';
      case 'critical':
        return 'Critical';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadSSL} />;

  if (certificates.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>No SSL certificates found</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="text-muted-foreground">{totalCerts} SSL certificates</span>
        {warningCount > 0 && (
          <span className="text-red-600 font-medium">{warningCount} warnings</span>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 text-sm font-medium">Domain</th>
              <th className="text-left p-3 text-sm font-medium">Issuer</th>
              <th className="text-left p-3 text-sm font-medium">Expiry</th>
              <th className="text-left p-3 text-sm font-medium">Days Left</th>
              <th className="text-left p-3 text-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {certificates.map((cert, idx) => (
              <tr key={idx} className={`border-t ${cert.status === 'expired' ? 'opacity-50' : ''}`}>
                <td className="p-3">
                  <strong>{cert.domain}</strong>
                </td>
                <td className="p-3">{cert.issuer}</td>
                <td className="p-3">
                  {cert.expiry ? new Date(cert.expiry).toLocaleDateString() : '--'}
                </td>
                <td className="p-3">
                  <span className={`font-medium ${getStatusColor(cert.status)}`}>
                    {cert.daysRemaining !== null ? cert.daysRemaining : '--'}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 text-xs rounded ${getStatusColor(cert.status)}`}>
                    {getStatusLabel(cert.status)}
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
