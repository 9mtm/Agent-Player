'use client';

import { useState, useEffect } from 'react';
import { Database, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { SummaryCard } from '../common/SummaryCard';

interface BucketHistory {
  size: number;
  timestamp: string;
}

interface Bucket {
  name: string;
  region: string;
  totalSize: number;
  totalObjects: number;
  sizeChange: number;
  lastActivity: string;
  creationDate: string;
  metricsTimestamp: string;
  history: BucketHistory[];
}

interface S3Data {
  totalBuckets: number;
  grandTotalSize: number;
  grandTotalObjects: number;
  fetchedAt: string;
  buckets: Bucket[];
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return val.toFixed(i > 0 ? 2 : 0) + ' ' + sizes[i];
};

const formatNumber = (n: number) => {
  return new Intl.NumberFormat().format(n);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const renderSparkline = (history: BucketHistory[]) => {
  if (!history || history.length < 2) return null;

  const values = history.map((h) => h.size);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 160,
    h = 40,
    p = 2;

  const points = values
    .map((v, i) => {
      const x = p + (i / (values.length - 1)) * (w - p * 2);
      const y = h - p - ((v - min) / range) * (h - p * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className="w-40 h-10" viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={points}
        fill="none"
        stroke="#ff9900"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

export function S3Tab() {
  const [data, setData] = useState<S3Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ext/server-monitor/s3/summary');
      if (!response.ok) throw new Error('Failed to load S3 data');
      const s3Data = await response.json();
      setData(s3Data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load S3 data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadData} />;
  if (!data) return null;

  const sortedBuckets = [...data.buckets].sort((a, b) => b.totalSize - a.totalSize);
  const maxSize = Math.max(...data.buckets.map((b) => b.totalSize), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard icon={Database} label="Total Buckets" value={data.totalBuckets.toString()} />
        <SummaryCard icon={Database} label="Total Size" value={formatBytes(data.grandTotalSize)} />
        <SummaryCard icon={Database} label="Total Objects" value={formatNumber(data.grandTotalObjects)} />
        <SummaryCard icon={RefreshCw} label="Last Fetch" value={formatDate(data.fetchedAt)} />
      </div>

      {/* Buckets Grid */}
      {data.buckets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No S3 buckets configured</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedBuckets.map((bucket) => {
            const sizePercent = (bucket.totalSize / maxSize) * 100;
            const isDanger = bucket.totalSize > 50 * Math.pow(1024, 3);
            const isWarning = bucket.totalSize > 10 * Math.pow(1024, 3) && !isDanger;

            return (
              <div
                key={bucket.name}
                className={`bg-card border rounded-lg p-4 ${
                  isDanger
                    ? 'border-red-500/50'
                    : isWarning
                      ? 'border-yellow-500/50'
                      : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold truncate">{bucket.name}</h4>
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                    {bucket.region}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Size</div>
                    <div className="font-medium">
                      {bucket.totalSize === 0 ? 'Empty' : formatBytes(bucket.totalSize)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Objects</div>
                    <div className="font-medium">{formatNumber(bucket.totalObjects)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">24h Change</div>
                    <div
                      className={`font-medium flex items-center gap-1 ${
                        bucket.sizeChange > 0
                          ? 'text-green-600'
                          : bucket.sizeChange < 0
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {bucket.sizeChange > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : bucket.sizeChange < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : null}
                      {formatBytes(Math.abs(bucket.sizeChange))}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Last Activity</div>
                    <div className="font-medium">{formatDate(bucket.lastActivity)}</div>
                  </div>
                </div>

                {/* Sparkline */}
                {bucket.history && bucket.history.length >= 2 && (
                  <div className="mb-3">
                    <div className="text-xs text-muted-foreground mb-1">Last 7 days</div>
                    {renderSparkline(bucket.history)}
                  </div>
                )}

                {/* Size Bar */}
                <div className="mb-3">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        isDanger
                          ? 'bg-red-500'
                          : isWarning
                            ? 'bg-yellow-500'
                            : 'bg-primary'
                      }`}
                      style={{ width: `${sizePercent}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Created: {new Date(bucket.creationDate).toLocaleDateString()}</span>
                  <span>
                    Metrics: {new Date(bucket.metricsTimestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>
    </div>
  );
}
