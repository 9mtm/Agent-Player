'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Shield, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { config } from '@/lib/config';
import { Alert, AlertDescription } from '@/components/ui/alert';

const API_URL = config.backendUrl;

interface AuditLogEntry {
  id: string;
  event_type: string;
  event_category: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  action: string;
  resource_type?: string;
  resource_id?: string;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

export default function ExtensionAuditPage() {
  const params = useParams();
  const router = useRouter();
  const extensionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [extensionName, setExtensionName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, [extensionId]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);

      // Fetch extension info
      const extRes = await fetch(`${API_URL}/api/extensions`);
      const extData = await extRes.json();
      const ext = extData.extensions.find((e: any) => e.id === extensionId);

      if (!ext) {
        setError('Extension not found');
        return;
      }

      setExtensionName(ext.name);

      // Fetch audit logs
      const logsRes = await fetch(`${API_URL}/api/extensions/${extensionId}/audit-logs`);
      const logsData = await logsRes.json();

      if (logsData.success) {
        setLogs(logsData.logs || []);
      } else {
        setError(logsData.error || 'Failed to load audit logs');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'error':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-5xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/dashboard/extensions')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Extensions
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {extensionName} - Audit Log
          </CardTitle>
          <CardDescription>
            Security and access log for extension activity (last 100 events)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No audit logs found for this extension.</p>
              <p className="text-sm mt-2">Events will appear here as the extension is used.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(log.severity)}
                      <div>
                        <p className="font-medium text-sm">{log.event_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.action && `Action: ${log.action}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(log.severity)}>
                        {log.severity}
                      </Badge>
                      {log.success ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Blocked
                        </Badge>
                      )}
                    </div>
                  </div>

                  {log.error_message && (
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-2">
                      <p className="text-xs text-red-700 dark:text-red-300">{log.error_message}</p>
                    </div>
                  )}

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="bg-muted rounded p-2">
                      <p className="text-xs font-medium mb-1">Details:</p>
                      <pre className="text-xs text-muted-foreground overflow-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                    {log.ip_address && (
                      <>
                        <span>•</span>
                        <span>IP: {log.ip_address}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
