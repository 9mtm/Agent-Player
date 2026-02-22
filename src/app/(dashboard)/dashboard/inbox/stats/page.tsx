/**
 * Inbox Statistics Page
 * Shows analytics and stats for inbox messages
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, TrendingUp, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface InboxStats {
  total: number;
  autoExecuted: number;
  needsApproval: number;
  completed: number;
  failed: number;
  pending: number;
  bySource: Record<string, number>;
  byRisk: {
    low: number;
    medium: number;
    high: number;
  };
}

export default function InboxStatsPage() {
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = 'test-user-123'; // TODO: Get from auth context

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const response = await fetch(`/api/inbox/stats?userId=${userId}`);
      const data = await response.json();

      if (response.ok) {
        setStats(data.stats);
      } else {
        console.error('Failed to fetch stats:', data.error);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Loading statistics...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">No stats available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const autoExecutionRate = stats.total > 0
    ? Math.round((stats.autoExecuted / stats.total) * 100)
    : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart className="h-8 w-8" />
          Inbox Statistics
        </h1>
        <p className="text-muted-foreground">
          Analytics and insights for your inbox
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Messages</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Auto-Executed
            </CardDescription>
            <CardTitle className="text-3xl">{stats.autoExecuted}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <p className="text-sm font-medium text-green-600">{autoExecutionRate}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Needs Approval
            </CardDescription>
            <CardTitle className="text-3xl">{stats.needsApproval}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Pending review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Failed
            </CardDescription>
            <CardTitle className="text-3xl">{stats.failed}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Status Breakdown</CardTitle>
          <CardDescription>Messages by current status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-64 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-full"
                    style={{
                      width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="font-medium w-12 text-right">{stats.completed}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-64 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-500 h-full"
                    style={{
                      width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="font-medium w-12 text-right">{stats.pending}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span>Needs Approval</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-64 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-orange-500 h-full"
                    style={{
                      width: `${stats.total > 0 ? (stats.needsApproval / stats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="font-medium w-12 text-right">{stats.needsApproval}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span>Failed</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-64 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-red-500 h-full"
                    style={{
                      width: `${stats.total > 0 ? (stats.failed / stats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="font-medium w-12 text-right">{stats.failed}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Levels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Low Risk</CardTitle>
            <CardDescription>Safe for auto-execution</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.byRisk.low}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-yellow-600">Medium Risk</CardTitle>
            <CardDescription>Requires caution</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.byRisk.medium}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">High Risk</CardTitle>
            <CardDescription>Needs approval</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.byRisk.high}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sources */}
      {Object.keys(stats.bySource).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Messages by Source</CardTitle>
            <CardDescription>Where messages are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.bySource).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="capitalize">{source}</span>
                  <div className="flex items-center gap-4">
                    <div className="w-64 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full"
                        style={{
                          width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="font-medium w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
