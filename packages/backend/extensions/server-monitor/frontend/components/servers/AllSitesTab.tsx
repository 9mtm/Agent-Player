import { useState, useEffect } from 'react';
import { Globe, Server, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SummaryCard } from '../common/SummaryCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { toast } from 'sonner';

interface Site {
  domain: string;
  user: string;
  email: string;
  server: string;
  diskUsed: string;
  diskLimit: string;
  plan: string;
  suspended: boolean;
}

export function AllSitesTab() {
  const [sites, setSites] = useState<Site[]>([]);
  const [filteredSites, setFilteredSites] = useState<Site[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSites = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ext/server-monitor/sites`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load sites');
      }

      const data = await response.json();
      setSites(data.sites || []);
      setFilteredSites(data.sites || []);
    } catch (err: any) {
      console.error('[AllSites] Failed to load:', err);
      setError(err.message);
      toast.error('Failed to load sites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredSites(sites);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = sites.filter(
      (site) =>
        site.domain.toLowerCase().includes(query) ||
        site.user.toLowerCase().includes(query) ||
        site.email.toLowerCase().includes(query)
    );
    setFilteredSites(filtered);
  }, [searchQuery, sites]);

  if (loading) {
    return <LoadingSpinner message="Loading all sites..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={loadSites} />;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          icon={Globe}
          label="Total Sites"
          value={sites.length}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10"
        />
        <SummaryCard
          icon={Server}
          label="Servers"
          value={new Set(sites.map((s) => s.server)).size}
          iconColor="text-green-500"
          iconBg="bg-green-500/10"
        />
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search domains, users, emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Sites Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-3 text-left text-sm font-semibold">Domain</th>
                <th className="p-3 text-left text-sm font-semibold">User</th>
                <th className="p-3 text-left text-sm font-semibold">Server</th>
                <th className="p-3 text-left text-sm font-semibold">Disk Used</th>
                <th className="p-3 text-left text-sm font-semibold">Plan</th>
                <th className="p-3 text-left text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                    No sites found
                  </td>
                </tr>
              ) : (
                filteredSites.map((site, idx) => (
                  <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="p-3 text-sm">{site.domain}</td>
                    <td className="p-3 text-sm">{site.user}</td>
                    <td className="p-3 text-sm">{site.server}</td>
                    <td className="p-3 text-sm">{site.diskUsed}</td>
                    <td className="p-3 text-sm">{site.plan}</td>
                    <td className="p-3 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                          site.suspended
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-green-500/10 text-green-500'
                        }`}
                      >
                        {site.suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
