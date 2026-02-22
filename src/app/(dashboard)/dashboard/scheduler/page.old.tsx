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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Clock,
  Plus,
  Play,
  Pause,
  Trash2,
  Calendar,
  RefreshCw,
  CheckCircle2,
  XCircle,
  History,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

// Cron presets for easy selection
const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at 8 AM', value: '0 8 * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
  { label: 'Every Sunday at midnight', value: '0 0 * * 0' }
];

export default function SchedulerDashboard() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [executions, setExecutions] = useState<{ [jobId: string]: JobExecution[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create job state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newJob, setNewJob] = useState({
    name: '',
    description: '',
    cronExpression: '0 8 * * *',
    actionType: 'skill' as const,
    actionData: { skillName: '', params: {} },
    enabled: true
  });

  // View executions state
  const [viewingJobId, setViewingJobId] = useState<string | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await schedulerAPI.listJobs();
      setJobs(data);

      // Load recent executions for each job
      const executionsData: { [jobId: string]: JobExecution[] } = {};
      for (const job of data) {
        try {
          const execs = await schedulerAPI.getExecutions(job.id, 5);
          executionsData[job.id] = execs;
        } catch (err) {
          executionsData[job.id] = [];
        }
      }
      setExecutions(executionsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();

    // Auto-refresh every minute
    const interval = setInterval(loadJobs, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async () => {
    if (!newJob.name || !newJob.cronExpression) {
      toast.error('Name and cron expression are required');
      return;
    }

    try {
      await schedulerAPI.createJob({
        name: newJob.name,
        description: newJob.description,
        cronExpression: newJob.cronExpression,
        actionType: newJob.actionType,
        actionData: newJob.actionData,
        enabled: newJob.enabled
      });

      setShowCreateDialog(false);
      setNewJob({
        name: '',
        description: '',
        cronExpression: '0 8 * * *',
        actionType: 'skill',
        actionData: { skillName: '', params: {} },
        enabled: true
      });
      loadJobs();
      toast.success('Job created!');
    } catch (err: any) {
      toast.error(`Failed to create: ${err.message}`);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      if (enabled) {
        await schedulerAPI.disableJob(id);
      } else {
        await schedulerAPI.enableJob(id);
      }
      loadJobs();
    } catch (err: any) {
      toast.error(`Failed to toggle: ${err.message}`);
    }
  };

  const handleRunNow = async (id: string, name: string) => {
    if (!confirm(`Run "${name}" now?`)) return;

    try {
      const execution = await schedulerAPI.runJob(id);
      if (execution.success) {
        toast.success('Job completed!');
      } else {
        toast.error(`Job failed: ${execution.error}`);
      }
      loadJobs();
    } catch (err: any) {
      toast.error(`Failed to run: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete job "${name}"?`)) return;

    try {
      await schedulerAPI.deleteJob(id);
      loadJobs();
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading jobs...</p>
        </div>
      </div>
    );
  }

  const activeJobs = jobs.filter(j => j.enabled).length;
  const totalExecutions = Object.values(executions).flat().length;
  const successfulExecutions = Object.values(executions).flat().filter(e => e.success).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="w-8 h-8" />
            Scheduler Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage cron jobs and scheduled tasks
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadJobs} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Scheduled Job</DialogTitle>
                <DialogDescription>
                  Schedule a recurring task using cron expressions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Job Name *</Label>
                  <Input
                    value={newJob.name}
                    onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
                    placeholder="Daily Weather Report"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    value={newJob.description}
                    onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                    placeholder="Send weather forecast every morning"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Schedule (Cron Expression) *</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={newJob.cronExpression}
                      onChange={(e) => setNewJob({ ...newJob, cronExpression: e.target.value })}
                      placeholder="0 8 * * *"
                      className="font-mono"
                    />
                    <select
                      onChange={(e) => setNewJob({ ...newJob, cronExpression: e.target.value })}
                      className="p-2 border rounded-md"
                    >
                      <option value="">Quick Select</option>
                      {CRON_PRESETS.map(preset => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: minute hour day month weekday (e.g., 0 8 * * * = every day at 8 AM)
                  </p>
                </div>

                <div>
                  <Label>Action Type *</Label>
                  <select
                    value={newJob.actionType}
                    onChange={(e) => setNewJob({ ...newJob, actionType: e.target.value as any })}
                    className="w-full p-2 border rounded-md mt-1"
                  >
                    <option value="skill">Execute Skill</option>
                    <option value="webhook">Call Webhook</option>
                    <option value="script">Run Script</option>
                    <option value="message">Send Message</option>
                  </select>
                </div>

                {newJob.actionType === 'skill' && (
                  <div>
                    <Label>Skill Name *</Label>
                    <Input
                      value={newJob.actionData.skillName}
                      onChange={(e) => setNewJob({
                        ...newJob,
                        actionData: { ...newJob.actionData, skillName: e.target.value }
                      })}
                      placeholder="weather"
                      className="mt-1"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Switch
                    checked={newJob.enabled}
                    onCheckedChange={(checked) => setNewJob({ ...newJob, enabled: checked })}
                  />
                  <Label>Enable immediately</Label>
                </div>

                <Button onClick={handleCreate} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Job
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{activeJobs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExecutions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalExecutions > 0
                ? `${Math.round((successfulExecutions / totalExecutions) * 100)}%`
                : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Jobs</CardTitle>
          <CardDescription>
            Manage and monitor your cron jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {jobs.map((job) => {
              const jobExecutions = executions[job.id] || [];
              const lastExecution = jobExecutions[0];

              return (
                <div
                  key={job.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{job.name}</h3>
                        <Badge variant={job.enabled ? 'default' : 'secondary'}>
                          {job.enabled ? 'Active' : 'Paused'}
                        </Badge>
                        <Badge variant="outline">{job.actionType}</Badge>
                      </div>

                      {job.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {job.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {job.cronExpression}
                        </span>
                        {job.nextRun && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Next: {new Date(job.nextRun).toLocaleString()}
                          </span>
                        )}
                        {job.lastRun && (
                          <span className="flex items-center gap-1">
                            Last: {new Date(job.lastRun).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {lastExecution && (
                        <div className="mt-2 text-xs">
                          <Badge variant={lastExecution.success ? 'default' : 'destructive'}>
                            {lastExecution.success ? (
                              <><CheckCircle2 className="w-3 h-3 mr-1" /> Last run: Success</>
                            ) : (
                              <><XCircle className="w-3 h-3 mr-1" /> Last run: Failed</>
                            )}
                          </Badge>
                          {lastExecution.error && (
                            <span className="ml-2 text-red-500">{lastExecution.error}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRunNow(job.id, job.name)}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Run Now
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggle(job.id, job.enabled)}
                      >
                        {job.enabled ? (
                          <><Pause className="w-4 h-4 mr-1" /> Pause</>
                        ) : (
                          <><Play className="w-4 h-4 mr-1" /> Enable</>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingJobId(viewingJobId === job.id ? null : job.id)}
                      >
                        <History className="w-4 h-4 mr-1" />
                        History
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(job.id, job.name)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {/* Execution History */}
                  {viewingJobId === job.id && jobExecutions.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <h4 className="text-sm font-semibold mb-2">Recent Executions</h4>
                      <div className="space-y-2">
                        {jobExecutions.map((exec) => (
                          <div
                            key={exec.id}
                            className="text-xs p-2 border rounded flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              {exec.success ? (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-500" />
                              )}
                              <span>{new Date(exec.executedAt).toLocaleString()}</span>
                              <span className="text-muted-foreground">
                                ({exec.duration}ms)
                              </span>
                            </div>
                            {exec.error && (
                              <span className="text-red-500 text-xs">{exec.error}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {jobs.length === 0 && (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  No scheduled jobs yet
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Job
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cron Help */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Cron Expression Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs space-y-1 font-mono">
            <p>Format: <strong>minute hour day month weekday</strong></p>
            <p>Examples:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><code>* * * * *</code> - Every minute</li>
              <li><code>0 8 * * *</code> - Every day at 8 AM</li>
              <li><code>0 */6 * * *</code> - Every 6 hours</li>
              <li><code>0 9 * * 1</code> - Every Monday at 9 AM</li>
              <li><code>0 0 1 * *</code> - First day of every month at midnight</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
