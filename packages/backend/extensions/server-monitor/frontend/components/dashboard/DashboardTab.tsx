import { useState, useEffect } from 'react';
import { Server, CheckCircle, AlertTriangle, Database, Mail, Shield } from 'lucide-react';
import { SummaryCard } from '../common/SummaryCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { toast } from 'sonner';

interface DashboardStats {
  totalServers: number;
  onlineServers: number;
  totalAccounts: number;
  totalBuckets: number;
  sslWarnings: number;
  emailQueue: number;
  healthScore: number;
}

export function DashboardTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ext/server-monitor/dashboard');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load dashboard');
      }

      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error('[Dashboard] Failed to load:', err);
      setError(err.message);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={loadDashboard} />;
  }

  if (!stats) {
    return <ErrorDisplay message="No data available" />;
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Server}
          label="Total Servers"
          value={stats.totalServers}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10"
        />
        <SummaryCard
          icon={CheckCircle}
          label="Online Servers"
          value={stats.onlineServers}
          iconColor="text-green-500"
          iconBg="bg-green-500/10"
        />
        <SummaryCard
          icon={Database}
          label="Total Accounts"
          value={stats.totalAccounts}
          iconColor="text-purple-500"
          iconBg="bg-purple-500/10"
        />
        <SummaryCard
          icon={Server}
          label="S3 Buckets"
          value={stats.totalBuckets}
          iconColor="text-orange-500"
          iconBg="bg-orange-500/10"
        />
      </div>

      {/* Health Score */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Overall Health</h2>
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24">
            <svg className="h-full w-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-muted"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeDasharray={`${stats.healthScore * 2.83} 283`}
                strokeLinecap="round"
                className={`${
                  stats.healthScore >= 80
                    ? 'text-green-500'
                    : stats.healthScore >= 50
                    ? 'text-yellow-500'
                    : 'text-red-500'
                }`}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold">{stats.healthScore}%</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              {stats.healthScore >= 80
                ? 'All systems operational'
                : stats.healthScore >= 50
                ? 'Some issues detected'
                : 'Critical issues require attention'}
            </p>
          </div>
        </div>
      </div>

      {/* Alerts Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">SSL Warnings</p>
              <p className="text-2xl font-bold">{stats.sslWarnings}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Services Down</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Email Queue</p>
              <p className="text-2xl font-bold">{stats.emailQueue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Server Grid - Placeholder */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Servers</h2>
        <p className="text-sm text-muted-foreground">
          Server grid will be displayed here. Click on "Servers" tab for detailed view.
        </p>
      </div>
    </div>
  );
}
