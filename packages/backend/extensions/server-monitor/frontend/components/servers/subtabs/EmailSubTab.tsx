'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorDisplay } from '../../common/ErrorDisplay';
import { Mail, Clock, AlertTriangle } from 'lucide-react';

interface Email {
  sender: string;
  recipient: string;
  subject: string;
  age: string;
  frozen: boolean;
}

interface EmailData {
  queueSize: number;
  emails: Email[];
}

interface Props {
  serverId: string;
}

export function EmailSubTab({ serverId }: Props) {
  const [data, setData] = useState<EmailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEmail();
  }, [serverId]);

  const loadEmail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ext/server-monitor/whm/server/${serverId}/email`);
      if (!response.ok) throw new Error('Failed to load email data');
      const emailData = await response.json();
      setData(emailData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadEmail} />;

  const frozenCount = data?.emails.filter((e) => e.frozen).length || 0;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{data?.queueSize || 0} emails in queue</span>
        </div>
        {frozenCount > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-yellow-600 font-medium">{frozenCount} frozen</span>
          </div>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 text-sm font-medium">Sender</th>
              <th className="text-left p-3 text-sm font-medium">Recipient</th>
              <th className="text-left p-3 text-sm font-medium">Subject</th>
              <th className="text-left p-3 text-sm font-medium">Age</th>
              <th className="text-left p-3 text-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.emails.map((email, idx) => (
              <tr
                key={idx}
                className={`border-t hover:bg-muted/20 ${email.frozen ? 'bg-yellow-500/5' : ''}`}
              >
                <td className="p-3 text-sm">{email.sender}</td>
                <td className="p-3 text-sm">{email.recipient}</td>
                <td className="p-3 font-medium">{email.subject}</td>
                <td className="p-3 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    {email.age}
                  </div>
                </td>
                <td className="p-3">
                  {email.frozen ? (
                    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-600 text-xs rounded">
                      Frozen
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-green-500/10 text-green-600 text-xs rounded">
                      Active
                    </span>
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
