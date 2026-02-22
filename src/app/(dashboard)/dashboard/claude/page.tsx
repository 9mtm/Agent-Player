'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { BarChart2, History, ClipboardList, AlertCircle, CheckCircle, FileText, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { config } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type TabType = 'stats' | 'sessions' | 'plans';

const tabs = [
  { id: 'stats' as TabType, label: 'Stats', icon: BarChart2 },
  { id: 'sessions' as TabType, label: 'Sessions', icon: History },
  { id: 'plans' as TabType, label: 'Plans', icon: ClipboardList },
];

interface ClaudeStats {
  total_tokens?: number;
  total_cost?: number;
  total_sessions?: number;
  last_session?: string;
  models_used?: Record<string, number>;
}

interface ProjectSession {
  slug: string;
  sessionCount: number;
  lastModified: string | null;
  hasMemory: boolean;
}

interface SessionFile {
  id: string;
  filename: string;
  size: number;
  lastModified: string | null;
}

interface Plan {
  name: string;
  size: number;
  lastModified: string | null;
}

export default function ClaudeCodePage() {
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [claudePath, setClaudePath] = useState<string | null>(null);
  const [stats, setStats] = useState<ClaudeStats | null>(null);
  const [projects, setProjects] = useState<ProjectSession[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectSessions, setProjectSessions] = useState<SessionFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if Claude Code is available
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${config.backendUrl}/api/claude-local/status`);
        const data = await res.json();
        setAvailable(data.available);
        setClaudePath(data.path);
      } catch (err) {
        console.error('[ClaudePage] Status check failed:', err);
        setAvailable(false);
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!available) return;
    try {
      const res = await fetch(`${config.backendUrl}/api/claude-local/stats`);
      const data = await res.json();
      if (data.available && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('[ClaudePage] Stats fetch failed:', err);
    }
  }, [available]);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    if (!available) return;
    try {
      const res = await fetch(`${config.backendUrl}/api/claude-local/sessions`);
      const data = await res.json();
      if (data.available && data.projects) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error('[ClaudePage] Sessions fetch failed:', err);
    }
  }, [available]);

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    if (!available) return;
    try {
      const res = await fetch(`${config.backendUrl}/api/claude-local/plans`);
      const data = await res.json();
      if (data.available && data.plans) {
        setPlans(data.plans);
      }
    } catch (err) {
      console.error('[ClaudePage] Plans fetch failed:', err);
    }
  }, [available]);

  // Fetch data based on active tab
  useEffect(() => {
    if (!available) return;
    if (activeTab === 'stats') fetchStats();
    if (activeTab === 'sessions') fetchSessions();
    if (activeTab === 'plans') fetchPlans();
  }, [available, activeTab, fetchStats, fetchSessions, fetchPlans]);

  // Fetch project sessions
  const loadProjectSessions = async (slug: string) => {
    try {
      const res = await fetch(`${config.backendUrl}/api/claude-local/sessions/${slug}`);
      const data = await res.json();
      if (data.available && data.sessions) {
        setProjectSessions(data.sessions);
        setSelectedProject(slug);
      }
    } catch (err) {
      console.error(`[ClaudePage] Project sessions fetch failed:`, err);
    }
  };

  // Import session into Agent Player
  const importSession = async (slug: string, id: string) => {
    try {
      const res = await fetch(`${config.backendUrl}/api/claude-local/import/${slug}/${id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.sessionId) {
        window.location.href = `/chat?session=${data.sessionId}`;
      } else {
        toast.error(`Import failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Claude Code</h1>
          <p className="text-sm text-muted-foreground">
            Monitor Claude Code sessions, statistics, and plans
          </p>
        </div>
        <div className="rounded-lg border bg-card p-12 text-center">
          <div className="animate-pulse">Checking Claude Code availability...</div>
        </div>
      </div>
    );
  }

  if (available === false) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Claude Code</h1>
          <p className="text-sm text-muted-foreground">
            Monitor Claude Code sessions, statistics, and plans
          </p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
            <h3 className="mt-4 text-lg font-semibold">Claude Code Not Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The Claude Code CLI is not installed or the ~/.claude directory was not found.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Install Claude Code from{' '}
              <a
                href="https://github.com/anthropics/claude-code"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-600 hover:underline"
              >
                github.com/anthropics/claude-code
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSessions = projects.reduce((sum, p) => sum + p.sessionCount, 0);
  const lastActivity = projects.length > 0
    ? new Date(Math.max(...projects.map(p => p.lastModified ? new Date(p.lastModified).getTime() : 0)))
    : null;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Claude Code</h1>
        <p className="text-sm text-muted-foreground">
          Monitor Claude Code sessions, statistics, and plans
        </p>
        <div className="mt-2 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-xs text-muted-foreground">
            Connected to: {claudePath}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'stats' && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Claude Code Statistics</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{stats?.total_sessions ?? totalSessions}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-bold">{projects.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Tokens</p>
                  <p className="text-2xl font-bold">
                    {stats?.total_tokens ? (stats.total_tokens / 1000000).toFixed(1) + 'M' : '—'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Last Active</p>
                  <p className="text-sm">
                    {lastActivity ? lastActivity.toLocaleDateString() : 'Never'}
                  </p>
                </CardContent>
              </Card>
            </div>
            {stats?.models_used && Object.keys(stats.models_used).length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold">Models Used</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.models_used).map(([model, count]) => (
                    <Badge key={model} variant="secondary">
                      {model}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-4">
            {selectedProject ? (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedProject(null);
                    setProjectSessions([]);
                  }}
                  className="mb-4"
                >
                  ← Back to Projects
                </Button>
                <Card>
                  <CardHeader>
                    <CardTitle>Sessions for {selectedProject}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {projectSessions.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        No sessions found
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {projectSessions.map((session) => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{session.filename}</p>
                                <p className="text-xs text-muted-foreground">
                                  {session.lastModified
                                    ? new Date(session.lastModified).toLocaleString()
                                    : 'Unknown'}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => importSession(selectedProject, session.id)}
                            >
                              Import to Chat
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  {projects.length === 0 ? (
                    <div className="py-12 text-center">
                      <History className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-4 text-sm text-muted-foreground">
                        No Claude Code projects found
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Projects will appear here when you use the Claude Code CLI
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {projects.map((proj) => (
                        <button
                          key={proj.slug}
                          onClick={() => loadProjectSessions(proj.slug)}
                          className="flex w-full items-center justify-between rounded-lg border p-4 text-left hover:bg-muted/50"
                        >
                          <div>
                            <p className="font-medium">{proj.slug}</p>
                            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{proj.sessionCount} sessions</span>
                              {proj.lastModified && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(proj.lastModified).toLocaleDateString()}
                                </span>
                              )}
                              {proj.hasMemory && (
                                <Badge variant="secondary" className="text-xs">
                                  Has Memory
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'plans' && (
          <Card>
            <CardHeader>
              <CardTitle>Saved Plans</CardTitle>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <div className="py-12 text-center">
                  <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-sm text-muted-foreground">No plans found</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Plans created by Claude Code will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {plans.map((plan) => (
                    <div
                      key={plan.name}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{plan.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {plan.lastModified
                              ? new Date(plan.lastModified).toLocaleString()
                              : 'Unknown'} · {(plan.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
