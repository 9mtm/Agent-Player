'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Server,
  CheckCircle,
  AlertTriangle,
  Database,
  Mail,
  Shield,
  HardDrive,
  Activity,
  TrendingUp,
  Globe,
  Cloud,
  Calendar,
} from 'lucide-react';
import { SummaryCard } from '../common/SummaryCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { toast } from 'sonner';

interface ServerData {
  id: string;
  name: string;
  online: boolean;
  accounts: number;
  suspendedAccounts: number;
  load: { one: number; five: number; fifteen: number };
  disk: Array<{ partition: string; percentage: number; used: number; total: number }>;
  sslTotal: number;
  sslWarnings: number;
  emailQueueSize: number;
  backupJobs: number;
  backupFailed: number;
  services: Array<{ name: string; running: boolean }>;
  health: number;
}

interface DashboardData {
  totalServers: number;
  onlineServers: number;
  offlineServers: number;
  totalAccounts: number;
  totalSuspended: number;
  totalBuckets: number;
  sslWarnings: number;
  emailQueue: number;
  healthScore: number;
  backupJobs: number;
  backupFailed: number;
  servicesUp: number;
  servicesDown: number;
  servers: ServerData[];
}

interface BandwidthData {
  grandTotal: number;
  servers: Array<{ id: string; name: string; totalUsed: number }>;
}

interface PulseData {
  servers: Array<{ id: string; name: string; responseTime: number; status: string }>;
  timestamp: number;
}

interface UptimeData {
  servers: Array<{
    id: string;
    name: string;
    days: Array<{ date: string; uptime: number }>;
  }>;
}

interface LoadHistoryData {
  period: string;
  servers: Array<{
    serverId: string;
    serverName: string;
    data: Array<{ timestamp: number; load: number }>;
  }>;
}

export function EnhancedDashboardTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [bandwidth, setBandwidth] = useState<BandwidthData | null>(null);
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [uptime, setUptime] = useState<UptimeData | null>(null);
  const [loadHistory, setLoadHistory] = useState<LoadHistoryData | null>(null);
  const [loadPeriod, setLoadPeriod] = useState<'1h' | '6h' | '24h'>('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pulseCanvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
  const pulseDataRefs = useRef<{ [key: string]: number[] }>({});

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashRes, bwRes, uptimeRes, loadRes] = await Promise.all([
        fetch('/api/ext/server-monitor/dashboard'),
        fetch('/api/ext/server-monitor/bandwidth'),
        fetch('/api/ext/server-monitor/uptime'),
        fetch(`/api/ext/server-monitor/load-history?period=${loadPeriod}`),
      ]);

      if (!dashRes.ok) throw new Error('Failed to load dashboard');
      if (!bwRes.ok) throw new Error('Failed to load bandwidth');
      if (!uptimeRes.ok) throw new Error('Failed to load uptime');
      if (!loadRes.ok) throw new Error('Failed to load load history');

      const dashData = await dashRes.json();
      const bwData = await bwRes.json();
      const uptimeData = await uptimeRes.json();
      const loadData = await loadRes.json();

      setData(dashData);
      setBandwidth(bwData);
      setUptime(uptimeData);
      setLoadHistory(loadData);
    } catch (err: any) {
      console.error('[Dashboard] Failed to load:', err);
      setError(err.message);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadPulse = async () => {
    try {
      const res = await fetch('/api/ext/server-monitor/pulse');
      if (res.ok) {
        const pulseData = await res.json();
        setPulse(pulseData);
        updatePulseCharts(pulseData);
      }
    } catch (err) {
      console.error('[Pulse] Failed:', err);
    }
  };

  const updatePulseCharts = (pulseData: PulseData) => {
    pulseData.servers.forEach((server) => {
      const canvas = pulseCanvasRefs.current[server.id];
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Initialize data array
      if (!pulseDataRefs.current[server.id]) {
        pulseDataRefs.current[server.id] = [];
      }

      const data = pulseDataRefs.current[server.id];
      data.push(server.responseTime);
      if (data.length > 60) data.shift(); // Keep last 60 points

      // Draw chart
      const width = canvas.width;
      const height = canvas.height;
      const max = Math.max(...data, 100);

      ctx.clearRect(0, 0, width, height);

      // Draw grid
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw line
      ctx.strokeStyle = server.status === 'online' ? '#10b981' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();

      data.forEach((value, index) => {
        const x = (width / 59) * index;
        const y = height - (value / max) * height;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();
    });
  };

  useEffect(() => {
    loadData();

    // Start pulse monitoring
    const pulseInterval = setInterval(loadPulse, 3000);

    return () => clearInterval(pulseInterval);
  }, []);

  // Reload load history when period changes
  useEffect(() => {
    if (!loading) {
      fetch(`/api/ext/server-monitor/load-history?period=${loadPeriod}`)
        .then((res) => res.json())
        .then((data) => setLoadHistory(data))
        .catch((err) => console.error('Failed to reload load history:', err));
    }
  }, [loadPeriod]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getHealthColor = (health: number) => {
    if (health >= 80) return 'text-green-500';
    if (health >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthBg = (health: number) => {
    if (health >= 80) return 'bg-green-500';
    if (health >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLoadColor = (load: number) => {
    if (load >= 3) return 'text-red-500';
    if (load >= 2) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getDiskColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return <LoadingSpinner message="Loading comprehensive dashboard..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={loadData} />;
  }

  if (!data) {
    return <ErrorDisplay message="No data available" />;
  }

  const onlineServers = data.servers.filter((s) => s.online);

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Server}
          label="Total Servers"
          value={data.totalServers}
          subtitle={`${data.onlineServers} online${
            data.offlineServers > 0 ? `, ${data.offlineServers} offline` : ''
          }`}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10"
        />
        <SummaryCard
          icon={CheckCircle}
          label="Total Accounts"
          value={data.totalAccounts}
          subtitle={data.totalSuspended > 0 ? `${data.totalSuspended} suspended` : 'All active'}
          iconColor="text-purple-500"
          iconBg="bg-purple-500/10"
        />
        <SummaryCard
          icon={Database}
          label="S3 Buckets"
          value={data.totalBuckets}
          iconColor="text-orange-500"
          iconBg="bg-orange-500/10"
        />
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${data.healthScore >= 80 ? 'bg-green-500/10' : data.healthScore >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10'}`}>
              <Activity className={`h-6 w-6 ${data.healthScore >= 80 ? 'text-green-500' : data.healthScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Health Score</p>
              <p className={`text-2xl font-bold ${getHealthColor(data.healthScore)}`}>{data.healthScore}%</p>
              <p className="text-xs text-muted-foreground">
                {data.servicesDown > 0 ? `${data.servicesDown} services down` : `${data.servicesUp} services up`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Server Health Cards */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Server Health</h2>
            <div className="space-y-3">
              {data.servers.map((server) => (
                <div key={server.id} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${server.online ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="font-medium">{server.name}</span>
                    </div>
                    <span className={`text-sm font-semibold ${getHealthColor(server.health)}`}>
                      {server.health}%
                    </span>
                  </div>
                  {server.online ? (
                    <>
                      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full ${getHealthBg(server.health)}`}
                          style={{ width: `${server.health}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{server.accounts} accounts</span>
                        <span className={getLoadColor(server.load.one)}>
                          Load: {server.load.one}
                        </span>
                        {server.sslWarnings > 0 && (
                          <span className="text-yellow-500">{server.sslWarnings} SSL</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-red-500">Server offline</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Disk Usage */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Disk Usage
            </h2>
            <div className="space-y-3">
              {onlineServers.map((server) => (
                <div key={server.id}>
                  {server.disk.map((disk, idx) => (
                    <div key={idx} className="mb-2">
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {server.name} <span className="text-xs">({disk.partition})</span>
                        </span>
                        <span className={`font-semibold ${disk.percentage >= 90 ? 'text-red-500' : disk.percentage >= 75 ? 'text-yellow-500' : 'text-green-500'}`}>
                          {disk.percentage}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={getDiskColor(disk.percentage)}
                          style={{ width: `${disk.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Alerts Summary */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Alerts Summary</h2>
            {data.sslWarnings === 0 && data.servicesDown === 0 && data.emailQueue < 20 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="mb-2 h-12 w-12 text-green-500" />
                <p className="text-lg font-semibold text-green-500">All Systems Healthy</p>
                <p className="text-sm text-muted-foreground">No issues detected</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.sslWarnings > 0 && (
                  <div className="flex items-center gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span className="text-sm">
                      <strong>{data.sslWarnings}</strong> SSL certificates expiring soon
                    </span>
                  </div>
                )}
                {data.servicesDown > 0 && (
                  <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-sm">
                      <strong>{data.servicesDown}</strong> services are down
                    </span>
                  </div>
                )}
                {data.emailQueue > 20 && (
                  <div className="flex items-center gap-3 rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                    <span className="text-sm">
                      Email queue high: <strong>{data.emailQueue}</strong> messages
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SSL Overview */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              SSL Overview
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">
                  {onlineServers.reduce((sum, s) => sum + s.sslTotal - s.sslWarnings, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Valid</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${data.sslWarnings > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                  {data.sslWarnings}
                </p>
                <p className="text-xs text-muted-foreground">Expiring</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {onlineServers.reduce((sum, s) => sum + s.sslTotal, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Quick Stats</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <Mail className={`mx-auto mb-1 h-5 w-5 ${data.emailQueue > 100 ? 'text-red-500' : data.emailQueue > 20 ? 'text-yellow-500' : 'text-green-500'}`} />
                <p className="text-2xl font-bold">{data.emailQueue}</p>
                <p className="text-xs text-muted-foreground">Email Queue</p>
              </div>
              <div className="text-center">
                <Database className={`mx-auto mb-1 h-5 w-5 ${data.backupFailed > 0 ? 'text-red-500' : 'text-green-500'}`} />
                <p className="text-2xl font-bold">{data.backupJobs}</p>
                <p className="text-xs text-muted-foreground">Backup Jobs</p>
              </div>
              <div className="text-center">
                <Activity className="mx-auto mb-1 h-5 w-5 text-blue-500" />
                <p className="text-2xl font-bold">{data.servicesUp + data.servicesDown}</p>
                <p className="text-xs text-muted-foreground">Services</p>
              </div>
            </div>
          </div>

          {/* Bandwidth Overview */}
          {bandwidth && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center justify-between text-lg font-semibold">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Bandwidth
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {formatBytes(bandwidth.grandTotal)} total
                </span>
              </h2>
              <div className="space-y-3">
                {bandwidth.servers
                  .sort((a, b) => b.totalUsed - a.totalUsed)
                  .map((server) => {
                    const maxBw = Math.max(...bandwidth.servers.map((s) => s.totalUsed), 1);
                    const percentage = Math.round((server.totalUsed / maxBw) * 100);
                    return (
                      <div key={server.id}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{server.name}</span>
                          <span className="font-semibold">{formatBytes(server.totalUsed)}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-blue-500" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Server Pulse Monitor */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            Server Pulse Monitor
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              LIVE
            </span>
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.servers.map((server) => {
            const pulseServer = pulse?.servers.find((p) => p.id === server.id);
            return (
              <div key={server.id} className="rounded-lg border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{server.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {pulseServer?.responseTime ? `${Math.round(pulseServer.responseTime)}ms` : '--'}
                  </span>
                </div>
                <canvas
                  ref={(el) => (pulseCanvasRefs.current[server.id] = el)}
                  width={300}
                  height={80}
                  className="w-full rounded bg-black/5"
                />
                <div className="mt-2 flex items-center justify-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full ${server.online ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-muted-foreground">
                    {server.online ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Uptime Tracker & Load History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Uptime Tracker - 90 Days */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Calendar className="h-5 w-5" />
            Uptime Tracker (90 Days)
          </h2>
          {uptime && uptime.servers.length > 0 ? (
            <div className="space-y-4">
              {uptime.servers.slice(0, 2).map((server) => {
                const avgUptime = server.days.reduce((sum, d) => sum + d.uptime, 0) / server.days.length;
                return (
                  <div key={server.id}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">{server.name}</span>
                      <span className={`text-sm font-bold ${avgUptime >= 99 ? 'text-green-500' : avgUptime >= 95 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {avgUptime.toFixed(1)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-30 gap-1">
                      {server.days.slice(-30).map((day, idx) => (
                        <div
                          key={idx}
                          className={`h-3 w-3 rounded-sm ${
                            day.uptime === 100
                              ? 'bg-green-500'
                              : day.uptime >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          title={`${day.date}: ${day.uptime}%`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-sm bg-green-500" />
                  <span>100%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-sm bg-yellow-500" />
                  <span>50-99%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-sm bg-red-500" />
                  <span>&lt;50%</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading uptime data...</p>
          )}
        </div>

        {/* Load History Charts */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Activity className="h-5 w-5" />
              Load History
            </h2>
            <div className="flex gap-1">
              {(['1h', '6h', '24h'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setLoadPeriod(period)}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    loadPeriod === period
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          {loadHistory && loadHistory.servers.length > 0 ? (
            <div className="space-y-4">
              {loadHistory.servers.slice(0, 2).map((server) => {
                const maxLoad = Math.max(...server.data.map((d) => d.load));
                const avgLoad = server.data.reduce((sum, d) => sum + d.load, 0) / server.data.length;
                return (
                  <div key={server.serverId}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">{server.serverName}</span>
                      <span className="text-xs text-muted-foreground">
                        Avg: {avgLoad.toFixed(2)} | Max: {maxLoad.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex h-16 items-end gap-px">
                      {server.data.slice(-24).map((point, idx) => {
                        const height = (point.load / (maxLoad || 1)) * 100;
                        return (
                          <div
                            key={idx}
                            className={`flex-1 rounded-t transition-all ${
                              point.load >= 3
                                ? 'bg-red-500'
                                : point.load >= 2
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ height: `${height}%` }}
                            title={`Load: ${point.load}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-sm bg-green-500" />
                  <span>&lt;2.0</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-sm bg-yellow-500" />
                  <span>2.0-3.0</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-sm bg-red-500" />
                  <span>&gt;3.0</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading load history...</p>
          )}
        </div>
      </div>
    </div>
  );
}
