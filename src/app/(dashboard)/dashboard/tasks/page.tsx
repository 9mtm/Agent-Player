'use client';

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { config } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, XCircle, Play, Plus, RefreshCw, Clock, AlertCircle, Eye, Repeat, Bot, Activity, Zap, ListChecks, Users } from 'lucide-react';
import { AgentActivityFeed } from '@/components/dashboard/agent-activity-feed';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'review' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progress?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  dependencies?: string[];
}

interface Agent {
  id: string;
  name: string;
  emoji: string;
  model?: string;
  cron_schedule?: string;
  cron_enabled?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const COLUMN_CONFIG = [
  { key: 'pending',     label: 'Needs Approval', icon: <AlertCircle className="w-4 h-4 text-yellow-500" /> },
  { key: 'assigned',    label: 'Queued',         icon: <Clock className="w-4 h-4 text-blue-500" /> },
  { key: 'in_progress', label: 'In Progress',    icon: <Play className="w-4 h-4 text-purple-500" /> },
  { key: 'completed',   label: 'Done',           icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
] as const;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Task Detail Dialog ───────────────────────────────────────────────────────

function TaskDetailDialog({ task, agents, open, onClose }: {
  task: Task;
  agents: Agent[];
  open: boolean;
  onClose: () => void;
}) {
  const agent = agents.find(a => a.id === task.assignedTo);
  const output = task.output ?? task.result;
  const upstream = task.input?._upstream as Record<string, unknown> | undefined;
  const meta = (task.input as any)?._meta as { repeat_schedule?: string } | undefined;
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`${config.backendUrl}/api/multi-agent/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, description: editDesc }),
    });
    task.title = editTitle;
    task.description = editDesc;
    setSaving(false);
    setEditing(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {editing ? (
                <Input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="text-base font-semibold h-8"
                  autoFocus
                />
              ) : (
                <DialogTitle className="text-base leading-tight">{task.title}</DialogTitle>
              )}
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{task.id}</p>
            </div>
            <div className="flex gap-2 shrink-0 items-center">
              <Badge className={PRIORITY_COLORS[task.priority]}>{task.priority}</Badge>
              <Badge variant="outline">{task.status}</Badge>
              {!editing ? (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button size="sm" className="h-7 text-xs" disabled={saving} onClick={handleSave}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(false); setEditTitle(task.title); setEditDesc(task.description); }}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-5 py-4">
          <div className="space-y-5">

            {/* Agent + times */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {agent && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Assigned to</p>
                  <p>{agent.emoji} {agent.name}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p>{timeAgo(task.createdAt)}</p>
              </div>
              {task.startedAt && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Started</p>
                  <p>{timeAgo(task.startedAt)}</p>
                </div>
              )}
              {task.completedAt && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Completed</p>
                  <p>{timeAgo(task.completedAt)}</p>
                </div>
              )}
            </div>

            {/* Progress */}
            {task.status === 'in_progress' && task.progress !== undefined && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Progress — {task.progress}%</p>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${task.progress}%` }} />
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              {editing ? (
                <Textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  rows={6}
                  className="text-sm"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-3">{task.description}</p>
              )}
            </div>

            {/* Recurring schedule */}
            {meta?.repeat_schedule && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                <Repeat className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Recurring task</p>
                  <p className="text-xs font-mono text-blue-600 dark:text-blue-400">{meta.repeat_schedule}</p>
                </div>
              </div>
            )}

            {/* Dependencies */}
            {task.dependencies && task.dependencies.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Depends on</p>
                <div className="flex flex-wrap gap-1">
                  {task.dependencies.map(d => (
                    <Badge key={d} variant="outline" className="font-mono text-xs">{d.slice(0, 8)}…</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Upstream pipeline input */}
            {upstream && Object.keys(upstream).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Pipeline Input (from previous tasks)</p>
                <pre className="text-xs bg-muted/60 rounded p-3 overflow-auto max-h-40">
                  {JSON.stringify(upstream, null, 2)}
                </pre>
              </div>
            )}

            {/* Output */}
            {output && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Output</p>
                <pre className="text-xs bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                  {typeof output.output === 'string'
                    ? output.output
                    : JSON.stringify(output, null, 2)}
                </pre>
              </div>
            )}

            {/* Error */}
            {task.error && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Error</p>
                <pre className="text-xs bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded p-3 overflow-auto max-h-32 whitespace-pre-wrap text-red-700 dark:text-red-400">
                  {task.error}
                </pre>
              </div>
            )}

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  agents,
  onApprove,
  onRun,
  onDelete,
}: {
  task: Task;
  agents: Agent[];
  onApprove: (taskId: string, agentId: string) => void;
  onRun: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}) {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const agent = agents.find(a => a.id === task.assignedTo);

  return (
    <Card className="mb-3 shadow-sm border border-border hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-2">
        {/* Title + priority */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-tight flex-1">{task.title}</p>
          <div className="flex gap-1 shrink-0">
            {(task.input as any)?._meta?.repeat_schedule && (
              <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 dark:text-blue-400">
                <Repeat className="w-2.5 h-2.5 mr-0.5" />
                recurring
              </Badge>
            )}
            <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
              {task.priority}
            </Badge>
          </div>
        </div>

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        {/* Assigned agent */}
        {agent && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{agent.emoji}</span>
            <span>{agent.name}</span>
          </div>
        )}

        {/* Progress bar */}
        {task.status === 'in_progress' && task.progress !== undefined && (
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        )}

        {/* Result / error */}
        {task.status === 'completed' && task.result && (
          <p className="text-xs text-green-600 line-clamp-2">
            {typeof task.result.output === 'string' ? task.result.output : 'Completed'}
          </p>
        )}
        {task.status === 'failed' && task.error && (
          <p className="text-xs text-red-500 line-clamp-2">{task.error}</p>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground">{timeAgo(task.createdAt)}</p>

        {/* Actions */}
        <div className="flex gap-1 flex-wrap">
          {task.status === 'pending' && (
            <>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.emoji} {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={!selectedAgent}
                onClick={() => onApprove(task.id, selectedAgent)}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Approve
              </Button>
            </>
          )}
          {task.status === 'assigned' && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onRun(task.id)}>
              <Play className="w-3 h-3 mr-1" />
              Run Now
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setShowDetail(true)}
          >
            <Eye className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={() => onDelete(task.id)}
          >
            <XCircle className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>

      {showDetail && (
        <TaskDetailDialog
          task={task}
          agents={agents}
          open={showDetail}
          onClose={() => setShowDetail(false)}
        />
      )}
    </Card>
  );
}

// ─── Cron schedule presets ───────────────────────────────────────────────────

const SCHEDULE_PRESETS = [
  { label: 'Every hour',       value: '0 * * * *'   },
  { label: 'Every 6 hours',    value: '0 */6 * * *'  },
  { label: 'Every day at 9am', value: '0 9 * * *'    },
  { label: 'Every Monday 9am', value: '0 9 * * 1'    },
  { label: 'Custom…',          value: '__custom__'   },
] as const;

// ─── Create Task Dialog ───────────────────────────────────────────────────────

function CreateTaskDialog({ agents, onCreated }: { agents: Agent[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    isRecurring: false,
    schedulePreset: '0 9 * * *',
    customCron: '',
  });

  const selectedAgent = agents.find(a => a.id === form.assignedTo);
  const effectiveCron = form.schedulePreset === '__custom__' ? form.customCron : form.schedulePreset;

  async function handleSubmit() {
    if (!form.title || !form.description) return;
    if (form.isRecurring && !effectiveCron.trim()) return;

    const inputData: Record<string, unknown> = {};
    if (form.isRecurring) {
      inputData._meta = {
        repeat_schedule: effectiveCron.trim(),
        repeat_assigned_to: form.assignedTo || undefined,
      };
    }

    await fetch(`${config.backendUrl}/api/multi-agent/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        priority: form.priority,
        assignedTo: form.assignedTo || undefined,
        inputData: Object.keys(inputData).length > 0 ? inputData : undefined,
      }),
    });

    setForm({ title: '', description: '', priority: 'medium', assignedTo: '', isRecurring: false, schedulePreset: '0 9 * * *', customCron: '' });
    setOpen(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">

          {/* One-time vs Recurring toggle */}
          <div className="flex rounded-lg border overflow-hidden text-sm">
            <button
              type="button"
              className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 transition-colors ${!form.isRecurring ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setForm(f => ({ ...f, isRecurring: false }))}
            >
              <Clock className="w-3.5 h-3.5" />
              One-time
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 transition-colors ${form.isRecurring ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setForm(f => ({ ...f, isRecurring: true }))}
            >
              <Repeat className="w-3.5 h-3.5" />
              Recurring
            </button>
          </div>

          {/* Schedule picker — only when recurring */}
          {form.isRecurring && (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
              <Label className="text-xs">Repeat schedule</Label>
              <Select value={form.schedulePreset} onValueChange={v => setForm(f => ({ ...f, schedulePreset: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_PRESETS.map(p => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.schedulePreset === '__custom__' && (
                <Input
                  value={form.customCron}
                  onChange={e => setForm(f => ({ ...f, customCron: e.target.value }))}
                  placeholder="e.g. 0 9 * * 1-5"
                  className="h-8 text-xs font-mono"
                />
              )}
              {effectiveCron && form.schedulePreset !== '__custom__' && (
                <p className="text-xs font-mono text-muted-foreground">{effectiveCron}</p>
              )}
            </div>
          )}

          {/* Agent selector */}
          <div>
            <Label>Assign to Agent</Label>
            <Select value={form.assignedTo} onValueChange={v => setForm(f => ({ ...f, assignedTo: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select agent (optional)" />
              </SelectTrigger>
              <SelectContent>
                {agents.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.emoji} {a.name}{a.model ? ` · ${a.model}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAgent && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedAgent.cron_enabled
                  ? `Agent runs: ${selectedAgent.cron_schedule ?? '—'} · task executes on next tick`
                  : 'No cron enabled on this agent — enable it in Scheduler first'}
              </p>
            )}
          </div>

          <div>
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Research competitors"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What should the agent do?"
              rows={4}
            />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!form.title || !form.description || (form.isRecurring && !effectiveCron.trim())}
          >
            {form.isRecurring ? <Repeat className="w-3.5 h-3.5 mr-1.5" /> : <Clock className="w-3.5 h-3.5 mr-1.5" />}
            {form.isRecurring ? 'Create Recurring Task' : 'Create Task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Agent Sidebar ────────────────────────────────────────────────────────────

function AgentSidebar({
  agents,
  tasks,
  selectedAgent,
  onSelect,
}: {
  agents: Agent[];
  tasks: Task[];
  selectedAgent: string | null;
  onSelect: (id: string | null) => void;
}) {
  const totalCount = tasks.length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;

  return (
    <div className="w-56 shrink-0 flex flex-col gap-3 h-full overflow-hidden">
      {/* Stats mini-cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => onSelect(null)}>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><ListChecks className="w-3 h-3" /> Total</p>
          <p className="text-xl font-bold mt-0.5">{totalCount}</p>
        </Card>
        <Card className={`p-3 ${pendingCount > 0 ? 'border-yellow-300 dark:border-yellow-700' : ''}`}>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Approval</p>
          <p className={`text-xl font-bold mt-0.5 ${pendingCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>{pendingCount}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3" /> Active</p>
          <p className="text-xl font-bold mt-0.5 text-purple-600 dark:text-purple-400">{inProgressCount}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Done</p>
          <p className="text-xl font-bold mt-0.5 text-green-600 dark:text-green-400">{completedCount}</p>
        </Card>
      </div>

      <Separator />

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto space-y-1">
        <p className="text-xs font-medium text-muted-foreground px-1 mb-2 flex items-center gap-1">
          <Users className="w-3 h-3" /> Agents
        </p>

        {/* All */}
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left rounded-lg px-2.5 py-2 flex items-center gap-2 text-sm transition-colors ${
            selectedAgent === null
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          }`}
        >
          <span className="text-base">🌐</span>
          <span className="flex-1 font-medium">All agents</span>
          <Badge variant={selectedAgent === null ? 'outline' : 'secondary'} className="text-xs">
            {totalCount}
          </Badge>
        </button>

        {agents.map(agent => {
          const count = tasks.filter(t => t.assignedTo === agent.id).length;
          const active = tasks.filter(t => t.assignedTo === agent.id && t.status === 'in_progress').length;
          const isSelected = selectedAgent === agent.id;

          return (
            <TooltipProvider key={agent.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelect(isSelected ? null : agent.id)}
                    className={`w-full text-left rounded-lg px-2.5 py-2 flex items-center gap-2 text-sm transition-colors ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                  >
                    <span className="text-base">{agent.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate leading-tight">{agent.name}</p>
                      {agent.model && (
                        <p className={`text-xs truncate leading-tight ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {agent.model.split('/').pop()}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <Badge variant={isSelected ? 'outline' : 'secondary'} className="text-xs px-1.5">{count}</Badge>
                      {active > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-purple-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                          {active}
                        </span>
                      )}
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  <div className="space-y-1">
                    <p className="font-medium">{agent.emoji} {agent.name}</p>
                    {agent.cron_enabled ? (
                      <p className="flex items-center gap-1 text-green-500">
                        <Zap className="w-3 h-3" />
                        Cron: {agent.cron_schedule}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">No cron schedule</p>
                    )}
                    <p>{count} tasks total · {active} running</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}

        {/* Unassigned */}
        {tasks.some(t => !t.assignedTo) && (
          <button
            onClick={() => onSelect(selectedAgent === '' ? null : '')}
            className={`w-full text-left rounded-lg px-2.5 py-2 flex items-center gap-2 text-sm transition-colors ${
              selectedAgent === '' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <Bot className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 font-medium">Unassigned</span>
            <Badge variant={selectedAgent === '' ? 'outline' : 'secondary'} className="text-xs">
              {tasks.filter(t => !t.assignedTo).length}
            </Badge>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  // null = All, '' = Unassigned, agentId = specific agent
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [tasksRes, agentsRes] = await Promise.all([
      fetch(`${config.backendUrl}/api/multi-agent/tasks?limit=100`),
      fetch(`${config.backendUrl}/api/agents`),
    ]);
    const tasksData = await tasksRes.json();
    const agentsData = await agentsRes.json();
    setTasks(tasksData.tasks ?? []);
    setAgents(agentsData.agents ?? []);
    setLoading(false);
  }, []);

  // Initial load + poll every 5 seconds
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  async function handleApprove(taskId: string, agentId: string) {
    await fetch(`${config.backendUrl}/api/multi-agent/tasks/${taskId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    });
    loadData();
  }

  async function handleRun(taskId: string) {
    await fetch(`${config.backendUrl}/api/multi-agent/tasks/${taskId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    });
    loadData();
  }

  async function handleDelete(taskId: string) {
    await fetch(`${config.backendUrl}/api/multi-agent/tasks/${taskId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    loadData();
  }

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId as Task['status'];
    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: newStatus } : t));

    await fetch(`${config.backendUrl}/api/multi-agent/tasks/${draggableId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  const filteredTasks = selectedAgent === null
    ? tasks
    : selectedAgent === ''
      ? tasks.filter(t => !t.assignedTo)
      : tasks.filter(t => t.assignedTo === selectedAgent);

  const tasksByColumn = (status: string) => filteredTasks.filter(t => t.status === status);

  const activeAgentName = selectedAgent === null
    ? 'All agents'
    : selectedAgent === ''
      ? 'Unassigned'
      : agents.find(a => a.id === selectedAgent)?.name ?? '';

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar — agents */}
      <div className="w-60 shrink-0 border-r p-3 overflow-y-auto">
        <AgentSidebar
          agents={agents}
          tasks={tasks}
          selectedAgent={selectedAgent}
          onSelect={setSelectedAgent}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h1 className="text-lg font-bold leading-tight">
              {selectedAgent === null ? 'All Tasks' : activeAgentName}
            </h1>
            <p className="text-xs text-muted-foreground">
              {filteredTasks.length} tasks
              {tasks.filter(t => t.status === 'pending').length > 0 && (
                <span className="ml-2 text-yellow-600 font-medium">
                  · {tasks.filter(t => t.status === 'pending').length} need approval
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <CreateTaskDialog agents={agents} onCreated={loadData} />
          </div>
        </div>

        {/* Kanban board + activity feed */}
        <div className="flex gap-0 flex-1 overflow-hidden">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-3 flex-1 overflow-x-auto p-4">
              {COLUMN_CONFIG.map(col => {
                const colTasks = tasksByColumn(col.key);
                return (
                  <div
                    key={col.key}
                    className="flex-1 min-w-[230px] max-w-[300px] flex flex-col rounded-xl bg-muted/30 border border-border/60"
                  >
                    {/* Column header */}
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/60">
                      {col.icon}
                      <h3 className="font-semibold text-sm flex-1">{col.label}</h3>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {colTasks.length}
                      </Badge>
                    </div>

                    <Droppable droppableId={col.key}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 overflow-y-auto p-2 space-y-2 min-h-[60px] transition-colors rounded-b-xl ${
                            snapshot.isDraggingOver ? 'bg-primary/5' : ''
                          }`}
                        >
                          {loading && colTasks.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-6">Loading…</p>
                          )}
                          {!loading && colTasks.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-6">Empty</p>
                          )}
                          {colTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={dragSnapshot.isDragging ? 'opacity-80 rotate-1 shadow-xl' : ''}
                                >
                                  <TaskCard
                                    task={task}
                                    agents={agents}
                                    onApprove={handleApprove}
                                    onRun={handleRun}
                                    onDelete={handleDelete}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>

          {/* Activity feed — right side */}
          <div className="w-64 shrink-0 border-l hidden xl:block overflow-y-auto p-3">
            <AgentActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
