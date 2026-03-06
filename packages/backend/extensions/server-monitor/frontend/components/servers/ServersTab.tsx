'use client';

import { useState, useEffect } from 'react';
import { Server, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { AccountsSubTab } from './subtabs/AccountsSubTab';
import { ServicesSubTab } from './subtabs/ServicesSubTab';
import { LogsSubTab } from './subtabs/LogsSubTab';
import { BackupsSubTab } from './subtabs/BackupsSubTab';
import { SSLSubTab } from './subtabs/SSLSubTab';
import { EmailSubTab } from './subtabs/EmailSubTab';
import { PHPSubTab } from './subtabs/PHPSubTab';
import { MySQLSubTab } from './subtabs/MySQLSubTab';
import { DNSSubTab } from './subtabs/DNSSubTab';
import { BandwidthSubTab } from './subtabs/BandwidthSubTab';
import { CronSubTab } from './subtabs/CronSubTab';
import { PortsSubTab } from './subtabs/PortsSubTab';
import { BlacklistSubTab } from './subtabs/BlacklistSubTab';
import { SecuritySubTab } from './subtabs/SecuritySubTab';
import { EmailAuthSubTab } from './subtabs/EmailAuthSubTab';
import { PackagesSubTab } from './subtabs/PackagesSubTab';

type SubTabType =
  | 'accounts'
  | 'services'
  | 'logs'
  | 'backups'
  | 'ssl'
  | 'email'
  | 'php'
  | 'mysql'
  | 'dns'
  | 'bandwidth'
  | 'cron'
  | 'ports'
  | 'blacklist'
  | 'security'
  | 'emailauth'
  | 'packages';

interface ServerData {
  id: string;
  name: string;
  type: string;
  host: string;
  accounts: number;
  diskUsage: number;
  diskLimit: number;
  bandwidth: number;
  status: 'online' | 'offline' | 'warning';
  whmUrl?: string;
}

const SUB_TABS: { id: SubTabType; label: string }[] = [
  { id: 'accounts', label: 'Accounts' },
  { id: 'services', label: 'Services' },
  { id: 'logs', label: 'Logs' },
  { id: 'backups', label: 'Backups' },
  { id: 'ssl', label: 'SSL' },
  { id: 'email', label: 'Email' },
  { id: 'php', label: 'PHP' },
  { id: 'mysql', label: 'MySQL' },
  { id: 'dns', label: 'DNS' },
  { id: 'bandwidth', label: 'Bandwidth' },
  { id: 'cron', label: 'Cron' },
  { id: 'ports', label: 'Ports' },
  { id: 'blacklist', label: 'Blacklist' },
  { id: 'security', label: 'Security' },
  { id: 'emailauth', label: 'Email Auth' },
  { id: 'packages', label: 'Packages' },
];

export function ServersTab() {
  const [servers, setServers] = useState<ServerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<ServerData | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('accounts');

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ext/server-monitor/whm/servers');
      if (!response.ok) throw new Error('Failed to load servers');
      const data = await response.json();
      setServers(data.servers || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  const openServerDetail = (server: ServerData) => {
    setSelectedServer(server);
    setActiveSubTab('accounts');
  };

  const closeServerDetail = () => {
    setSelectedServer(null);
  };

  const renderSubTab = () => {
    if (!selectedServer) return null;

    const props = { serverId: selectedServer.id };

    switch (activeSubTab) {
      case 'accounts':
        return <AccountsSubTab {...props} />;
      case 'services':
        return <ServicesSubTab {...props} />;
      case 'logs':
        return <LogsSubTab {...props} />;
      case 'backups':
        return <BackupsSubTab {...props} />;
      case 'ssl':
        return <SSLSubTab {...props} />;
      case 'email':
        return <EmailSubTab {...props} />;
      case 'php':
        return <PHPSubTab {...props} />;
      case 'mysql':
        return <MySQLSubTab {...props} />;
      case 'dns':
        return <DNSSubTab {...props} />;
      case 'bandwidth':
        return <BandwidthSubTab {...props} />;
      case 'cron':
        return <CronSubTab {...props} />;
      case 'ports':
        return <PortsSubTab {...props} />;
      case 'blacklist':
        return <BlacklistSubTab {...props} />;
      case 'security':
        return <SecuritySubTab {...props} />;
      case 'emailauth':
        return <EmailAuthSubTab {...props} />;
      case 'packages':
        return <PackagesSubTab {...props} />;
      default:
        return null;
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadServers} />;

  // Server detail view
  if (selectedServer) {
    return (
      <div className="space-y-4">
        {/* Detail Header */}
        <div className="flex items-center justify-between bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Server className="w-6 h-6" />
            <div>
              <h3 className="text-lg font-semibold">{selectedServer.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedServer.host}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedServer.whmUrl && (
              <a
                href={selectedServer.whmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                Open WHM
              </a>
            )}
            <Button size="sm" variant="outline" onClick={closeServerDetail}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="bg-card border rounded-lg p-2">
          <div className="flex flex-wrap gap-1">
            {SUB_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  activeSubTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-tab Content */}
        <div className="bg-card border rounded-lg">{renderSubTab()}</div>
      </div>
    );
  }

  // Server list view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Server Overview</h3>
        <Button onClick={loadServers} size="sm" variant="outline">
          Refresh
        </Button>
      </div>

      {servers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No servers configured yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => (
            <div
              key={server.id}
              onClick={() => openServerDetail(server)}
              className="bg-card border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  <h4 className="font-semibold">{server.name}</h4>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    server.status === 'online'
                      ? 'bg-green-500/10 text-green-500'
                      : server.status === 'warning'
                        ? 'bg-yellow-500/10 text-yellow-500'
                        : 'bg-red-500/10 text-red-500'
                  }`}
                >
                  {server.status}
                </span>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Accounts:</span>
                  <span className="font-medium text-foreground">{server.accounts}</span>
                </div>
                <div className="flex justify-between">
                  <span>Disk Usage:</span>
                  <span className="font-medium text-foreground">
                    {Math.round((server.diskUsage / server.diskLimit) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Bandwidth:</span>
                  <span className="font-medium text-foreground">
                    {(server.bandwidth / 1024 / 1024 / 1024).toFixed(2)} GB
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
