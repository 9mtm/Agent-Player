'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorDisplay } from '../../common/ErrorDisplay';
import { ExternalLink } from 'lucide-react';

interface Account {
  domain: string;
  user: string;
  diskused: string;
  disklimit: string;
  plan: string;
  ip: string;
  suspended: boolean;
}

interface Props {
  serverId: string;
}

export function AccountsSubTab({ serverId }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAccounts();
  }, [serverId]);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredAccounts(
        accounts.filter(
          (acc) =>
            acc.domain.toLowerCase().includes(query) ||
            acc.user.toLowerCase().includes(query) ||
            acc.ip.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredAccounts(accounts);
    }
  }, [searchQuery, accounts]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ext/server-monitor/whm/server/${serverId}/accounts`);
      if (!response.ok) throw new Error('Failed to load accounts');
      const data = await response.json();
      setAccounts(data.accounts || []);
      setFilteredAccounts(data.accounts || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadAccounts} />;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="Filter accounts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-sm text-muted-foreground">{filteredAccounts.length} accounts</span>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 text-sm font-medium">Domain</th>
              <th className="text-left p-3 text-sm font-medium">User</th>
              <th className="text-left p-3 text-sm font-medium">Disk Used</th>
              <th className="text-left p-3 text-sm font-medium">Disk Limit</th>
              <th className="text-left p-3 text-sm font-medium">Plan</th>
              <th className="text-left p-3 text-sm font-medium">IP</th>
              <th className="text-left p-3 text-sm font-medium">Status</th>
              <th className="text-left p-3 text-sm font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map((account, idx) => (
              <tr key={idx} className={`border-t ${account.suspended ? 'opacity-50' : ''}`}>
                <td className="p-3">
                  <strong>{account.domain}</strong>
                </td>
                <td className="p-3">{account.user}</td>
                <td className="p-3">{account.diskused}</td>
                <td className="p-3">{account.disklimit}</td>
                <td className="p-3">{account.plan}</td>
                <td className="p-3 font-mono text-sm">{account.ip}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      account.suspended
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-green-500/10 text-green-500'
                    }`}
                  >
                    {account.suspended ? 'Suspended' : 'Active'}
                  </span>
                </td>
                <td className="p-3">
                  <a
                    href={`https://${account.ip}:2087`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    WHM
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
