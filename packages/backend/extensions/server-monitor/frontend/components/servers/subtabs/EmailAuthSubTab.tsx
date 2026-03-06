'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorDisplay } from '../../common/ErrorDisplay';
import { Mail, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface AuthRecord {
  status: 'pass' | 'fail' | 'warn';
  record?: string;
  selector?: string;
  policy?: string;
}

interface EmailAuthData {
  spf: AuthRecord;
  dkim: AuthRecord;
  dmarc: AuthRecord;
}

interface Props {
  serverId: string;
}

export function EmailAuthSubTab({ serverId }: Props) {
  const [data, setData] = useState<EmailAuthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEmailAuth();
  }, [serverId]);

  const loadEmailAuth = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ext/server-monitor/whm/server/${serverId}/email-auth`);
      if (!response.ok) throw new Error('Failed to load email auth data');
      const authData = await response.json();
      setData(authData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email auth data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-500/10 border-green-500/20';
      case 'fail':
        return 'bg-red-500/10 border-red-500/20';
      default:
        return 'bg-yellow-500/10 border-yellow-500/20';
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadEmailAuth} />;

  return (
    <div className="p-6 space-y-4">
      {/* SPF */}
      <div className={`border rounded-lg p-4 ${getStatusColor(data?.spf.status || 'warn')}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon(data?.spf.status || 'warn')}
            <div>
              <h3 className="font-semibold">SPF (Sender Policy Framework)</h3>
              <p className="text-xs text-muted-foreground">Validates sender IP addresses</p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
            data?.spf.status === 'pass' ? 'bg-green-500 text-white' :
            data?.spf.status === 'fail' ? 'bg-red-500 text-white' :
            'bg-yellow-500 text-white'
          }`}>
            {data?.spf.status}
          </span>
        </div>
        {data?.spf.record && (
          <code className="block text-xs bg-muted/50 p-2 rounded">{data.spf.record}</code>
        )}
      </div>

      {/* DKIM */}
      <div className={`border rounded-lg p-4 ${getStatusColor(data?.dkim.status || 'warn')}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon(data?.dkim.status || 'warn')}
            <div>
              <h3 className="font-semibold">DKIM (DomainKeys Identified Mail)</h3>
              <p className="text-xs text-muted-foreground">Cryptographic email authentication</p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
            data?.dkim.status === 'pass' ? 'bg-green-500 text-white' :
            data?.dkim.status === 'fail' ? 'bg-red-500 text-white' :
            'bg-yellow-500 text-white'
          }`}>
            {data?.dkim.status}
          </span>
        </div>
        {data?.dkim.selector && (
          <div className="text-sm">
            <span className="text-muted-foreground">Selector:</span>{' '}
            <code className="bg-muted/50 px-2 py-1 rounded text-xs">{data.dkim.selector}</code>
          </div>
        )}
      </div>

      {/* DMARC */}
      <div className={`border rounded-lg p-4 ${getStatusColor(data?.dmarc.status || 'warn')}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon(data?.dmarc.status || 'warn')}
            <div>
              <h3 className="font-semibold">DMARC (Domain-based Message Authentication)</h3>
              <p className="text-xs text-muted-foreground">Policy-based email validation</p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
            data?.dmarc.status === 'pass' ? 'bg-green-500 text-white' :
            data?.dmarc.status === 'fail' ? 'bg-red-500 text-white' :
            'bg-yellow-500 text-white'
          }`}>
            {data?.dmarc.status}
          </span>
        </div>
        {data?.dmarc.policy && (
          <div className="text-sm">
            <span className="text-muted-foreground">Policy:</span>{' '}
            <code className="bg-muted/50 px-2 py-1 rounded text-xs">{data.dmarc.policy}</code>
          </div>
        )}
      </div>
    </div>
  );
}
