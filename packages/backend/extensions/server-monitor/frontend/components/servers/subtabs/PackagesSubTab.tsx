'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorDisplay } from '../../common/ErrorDisplay';
import { Package, HardDrive, TrendingUp, Users } from 'lucide-react';

interface HostingPackage {
  name: string;
  diskQuota: number;
  bandwidth: number;
  accounts: number;
}

interface PackagesData {
  packages: HostingPackage[];
}

interface Props {
  serverId: string;
}

export function PackagesSubTab({ serverId }: Props) {
  const [data, setData] = useState<PackagesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPackages();
  }, [serverId]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ext/server-monitor/whm/server/${serverId}/packages`);
      if (!response.ok) throw new Error('Failed to load packages data');
      const packagesData = await response.json();
      setData(packagesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load packages data');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(0)} ${sizes[i]}`;
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadPackages} />;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Package className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">{data?.packages.length || 0} hosting packages</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.packages.map((pkg, idx) => (
          <div key={idx} className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{pkg.name}</h3>
              <Package className="w-5 h-5 text-primary" />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <HardDrive className="w-3 h-3" />
                  <span>Disk Quota</span>
                </div>
                <span className="font-medium">{formatBytes(pkg.diskQuota)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  <span>Bandwidth</span>
                </div>
                <span className="font-medium">{formatBytes(pkg.bandwidth)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>Accounts</span>
                </div>
                <span className="font-medium">{pkg.accounts}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
