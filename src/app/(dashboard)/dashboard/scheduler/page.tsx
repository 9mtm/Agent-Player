'use client';

import { useEffect, useState } from 'react';
import { schedulerAPI, type CronJob, type JobExecution } from '@/lib/backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock,
  Play,
  Pause,
  History,
  Zap,
  CheckCircle2,
  XCircle,
  Filter,
  Calendar,
  TrendingUp,
  Activity
} from 'lucide-react';

export default function ImprovedSchedulerPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [executions, setExecutions] = useState<JobExecution[]>([]);
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [jobFilter, setJobFilter] = useState<string>('all');

  const loadData = async () => {
    try {
      const jobsData = await schedulerAPI.listJobs();
      setJobs(jobsData);

      // Load all executions
      const allExecs: JobExecution[] = [];
      for (const job of jobsData) {
        const execs = await schedulerAPI.getExecutions(job.id, 50);
        allExecs.push(...execs);
      }
      setExecutions(allExecs.sort((a, b) =>
        new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
      ));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleRunNow = async (id: string) => {
    setRunningJobs(prev => new Set(prev).add(id));
    try {
      await schedulerAPI.runJob(id);
      await loadData();
    } finally {
      setRunningJobs(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Apply filters
  const filterExecutions = () => {
    let filtered = executions;

    // Status filter
    if (statusFilter === 'success') filtered = filtered.filter(e => e.success);
    if (statusFilter === 'failed') filtered = filtered.filter(e => !e.success);

    // Date filter
    const now = new Date();
    if (dateFilter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(e => new Date(e.executedAt) >= today);
    } else if (dateFilter === 'week') {
      const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(e => new Date(e.executedAt) >= week);
    } else if (dateFilter === 'month') {
      const month = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(e => new Date(e.executedAt) >= month);
    }

    // Job filter
    if (jobFilter !== 'all') {
      filtered = filtered.filter(e => e.jobId === jobFilter);
    }

    return filtered;
  };

  const filteredExecutions = filterExecutions();
  const successCount = executions.filter(e => e.success).length;
  const failureCount = executions.filter(e => !e.success).length;
  const activeJobs = jobs.filter(j => j.enabled).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Clock className="w-8 h-8" />
          Scheduler Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage scheduled jobs in real-time
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Running Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{runningJobs.size}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently executing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{activeJobs} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{successCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Successful runs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{failureCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Failed runs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {executions.length > 0
                ? `${Math.round((successCount / executions.length) * 100)}%`
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Overall performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">
            <Clock className="w-4 h-4 mr-2" />
            Jobs ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="running">
            <Activity className="w-4 h-4 mr-2" />
            Running ({runningJobs.size})
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            Execution History ({filteredExecutions.length})
          </TabsTrigger>
        </TabsList>

        {/* Jobs List */}
        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Jobs</CardTitle>
              <CardDescription>All configured cron jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{job.name}</h3>
                          <Badge variant={job.enabled ? 'default' : 'secondary'}>
                            {job.enabled ? 'Active' : 'Paused'}
                          </Badge>
                          {runningJobs.has(job.id) && (
                            <Badge variant="outline" className="bg-blue-500 text-white">
                              <Activity className="w-3 h-3 mr-1 animate-pulse" />
                              Running
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {job.cronExpression}
                        </div>
                        {job.nextRun && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Next run: {new Date(job.nextRun).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRunNow(job.id)}
                        disabled={runningJobs.has(job.id)}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Run Now
                      </Button>
                    </div>
                  </div>
                ))}
                {jobs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No jobs configured yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Currently Running */}
        <TabsContent value="running">
          <Card>
            <CardHeader>
              <CardTitle>Currently Running Jobs</CardTitle>
              <CardDescription>Jobs being executed right now</CardDescription>
            </CardHeader>
            <CardContent>
              {runningJobs.size === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No jobs currently running
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.from(runningJobs).map((jobId) => {
                    const job = jobs.find(j => j.id === jobId);
                    return job ? (
                      <div key={jobId} className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
                          <h3 className="font-semibold">{job.name}</h3>
                          <Badge variant="outline">Executing</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Started: {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Execution History */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Execution History</span>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-normal">Filters</span>
                </div>
              </CardTitle>
              <CardDescription>Complete execution log with filters</CardDescription>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mt-4">
                <div>
                  <Label className="text-xs">Status</Label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="mt-1 p-2 border rounded-md text-sm"
                  >
                    <option value="all">All</option>
                    <option value="success">Success Only</option>
                    <option value="failed">Failed Only</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs">Period</Label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="mt-1 p-2 border rounded-md text-sm"
                  >
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="all">All Time</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs">Job</Label>
                  <select
                    value={jobFilter}
                    onChange={(e) => setJobFilter(e.target.value)}
                    className="mt-1 p-2 border rounded-md text-sm"
                  >
                    <option value="all">All Jobs</option>
                    {jobs.map(job => (
                      <option key={job.id} value={job.id}>{job.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredExecutions.map((exec, idx) => {
                  const job = jobs.find(j => j.id === exec.jobId);
                  return (
                    <div
                      key={idx}
                      className={`p-3 border rounded-lg ${
                        exec.success ? 'border-green-200 bg-green-50 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:bg-red-950'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {exec.success ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="font-medium text-sm">{job?.name || 'Unknown Job'}</span>
                          <Badge variant={exec.success ? 'default' : 'destructive'} className="text-xs">
                            {exec.success ? 'Success' : 'Failed'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(exec.executedAt).toLocaleString()} · Duration: {exec.duration}ms
                        </div>

                        {/* AI Response / Output */}
                        {exec.output && (
                          <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded border">
                            <div className="flex items-center gap-1 mb-1">
                              <Zap className="w-3 h-3 text-blue-500" />
                              <span className="text-xs font-medium">AI Response:</span>
                            </div>
                            <pre className="text-xs whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                              {typeof exec.output === 'string'
                                ? (exec.output.startsWith('{') || exec.output.startsWith('[')
                                    ? JSON.stringify(JSON.parse(exec.output), null, 2)
                                    : exec.output)
                                : JSON.stringify(exec.output, null, 2)}
                            </pre>
                          </div>
                        )}

                        {exec.error && (
                          <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded border border-red-200">
                            <div className="flex items-center gap-1 mb-1">
                              <XCircle className="w-3 h-3 text-red-500" />
                              <span className="text-xs font-medium text-red-600">Error:</span>
                            </div>
                            <div className="text-xs text-red-600">{exec.error}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredExecutions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No executions found with current filters
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
