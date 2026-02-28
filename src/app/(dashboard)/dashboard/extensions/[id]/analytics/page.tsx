'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, BarChart3, TrendingUp, TrendingDown, AlertTriangle, HardDrive, Activity } from 'lucide-react';
import { config } from '@/lib/config';
import { Alert, AlertDescription } from '@/components/ui/alert';

const API_URL = config.backendUrl;

interface DailyStats {
  apiCalls: number;
  errorCount: number;
  errorRate: number;
  avgResponseTime?: number;
}

interface StorageStats {
  fileCount: number;
  totalBytes: number;
  totalMB: number;
}

interface ErrorStat {
  errorType: string;
  count: number;
  lastOccurred: string;
}

interface ExtensionAnalytics {
  extensionId: string;
  today: DailyStats;
  last7Days: DailyStats;
  last30Days: DailyStats;
  allTime: DailyStats;
  dailyBreakdown: DailyStats[];
  storageUsage: StorageStats;
  topErrors: ErrorStat[];
}

export default function ExtensionAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const extensionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<ExtensionAnalytics | null>(null);
  const [extensionName, setExtensionName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [extensionId]);

  const loadAnalytics = async () => {
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

      // Fetch analytics
      const analyticsRes = await fetch(`${API_URL}/api/extensions/${extensionId}/analytics`);
      const analyticsData = await analyticsRes.json();

      if (analyticsData.success) {
        setAnalytics(analyticsData.analytics);
      } else {
        setError(analyticsData.error || 'Failed to load analytics');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container py-6 max-w-5xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error || 'No analytics data available'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-7xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/dashboard/extensions')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Extensions
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          {extensionName} - Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Usage statistics and performance metrics
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Today */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.today.apiCalls)}</div>
            <p className="text-xs text-muted-foreground">API Calls</p>
            {analytics.today.errorCount > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                <AlertTriangle className="h-3 w-3" />
                {analytics.today.errorCount} errors ({analytics.today.errorRate.toFixed(1)}%)
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last 7 Days */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.last7Days.apiCalls)}</div>
            <p className="text-xs text-muted-foreground">API Calls</p>
            {analytics.last7Days.errorRate > 0 && (
              <div className="mt-2 text-xs">
                Error Rate: <span className={analytics.last7Days.errorRate > 10 ? 'text-red-500' : 'text-yellow-500'}>
                  {analytics.last7Days.errorRate.toFixed(1)}%
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last 30 Days */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.last30Days.apiCalls)}</div>
            <p className="text-xs text-muted-foreground">API Calls</p>
            {analytics.last30Days.errorRate > 0 && (
              <div className="mt-2 text-xs">
                Error Rate: <span className={analytics.last30Days.errorRate > 10 ? 'text-red-500' : 'text-yellow-500'}>
                  {analytics.last30Days.errorRate.toFixed(1)}%
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Storage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.storageUsage.totalMB.toFixed(2)} MB</div>
            <p className="text-xs text-muted-foreground">{analytics.storageUsage.fileCount} files</p>
            <div className="mt-2 text-xs text-muted-foreground">
              {formatBytes(analytics.storageUsage.totalBytes)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Time Stats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            All Time Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total API Calls</p>
              <p className="text-2xl font-bold">{formatNumber(analytics.allTime.apiCalls)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Errors</p>
              <p className="text-2xl font-bold text-red-500">{formatNumber(analytics.allTime.errorCount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overall Error Rate</p>
              <p className={`text-2xl font-bold ${analytics.allTime.errorRate > 10 ? 'text-red-500' : analytics.allTime.errorRate > 5 ? 'text-yellow-500' : 'text-green-500'}`}>
                {analytics.allTime.errorRate.toFixed(2)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Errors */}
      {analytics.topErrors.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Top Errors (Last 30 Days)
            </CardTitle>
            <CardDescription>
              Most common errors encountered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topErrors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{error.errorType}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last occurred: {new Date(error.lastOccurred).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="destructive">
                    {error.count} {error.count === 1 ? 'occurrence' : 'occurrences'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Breakdown Chart */}
      {analytics.dailyBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily Activity (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.dailyBreakdown.map((day, index) => {
                const maxCalls = Math.max(...analytics.dailyBreakdown.map(d => d.apiCalls));
                const widthPercent = maxCalls > 0 ? (day.apiCalls / maxCalls) * 100 : 0;

                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Day {index + 1}</span>
                      <span className="font-medium">
                        {day.apiCalls} calls
                        {day.errorCount > 0 && (
                          <span className="text-red-500 ml-2">
                            ({day.errorCount} errors)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${day.errorRate > 10 ? 'bg-red-500' : day.errorRate > 5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Activity Message */}
      {analytics.allTime.apiCalls === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No activity recorded for this extension yet.</p>
              <p className="text-sm mt-2">Statistics will appear here once the extension starts being used.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
