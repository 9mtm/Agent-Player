'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Mail, MessageSquare, Smartphone, Volume2, Save, Trash2, Check,
         CheckCheck, Clock, Plus, X, AlarmClock, Info, AlertTriangle, AlertCircle,
         Bot, Settings2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNotifications } from '@/contexts/notification-context';
import { config } from '@/lib/config';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NotifSettings {
  channelInApp: boolean;
  channelEmail: boolean;
  channelPush: boolean;
  channelWhatsapp: boolean;
  channelSound: boolean;
  emailAddress: string | null;
  emailDigest: string;
  whatsappPhone: string | null;
  dndEnabled: boolean;
  dndStart: string;
  dndEnd: string;
  notifyTaskComplete: boolean;
  notifyAgentError: boolean;
  notifySkillExec: boolean;
  notifyWorkflow: boolean;
  notifySecurity: boolean;
  notifySystem: boolean;
}

interface Schedule {
  id: string;
  title: string;
  body: string;
  type: string;
  scheduleType: string;
  scheduleTime: string;
  scheduleDays: number[] | null;
  scheduleDate: string | null;
  channels: string[];
  isActive: boolean;
  nextFireAt: string | null;
  createdAt: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const authH = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function typeIcon(type: string) {
  switch (type) {
    case 'success':  return <Check className="h-4 w-4 text-green-500" />;
    case 'warning':  return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'error':    return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'agent':    return <Bot className="h-4 w-4 text-indigo-500" />;
    case 'system':   return <Settings2 className="h-4 w-4 text-slate-500" />;
    case 'reminder': return <AlarmClock className="h-4 w-4 text-blue-500" />;
    default:         return <Info className="h-4 w-4 text-blue-400" />;
  }
}

const EMPTY_SCHED = {
  title: '', body: '', type: 'reminder',
  scheduleType: 'daily', scheduleTime: '09:00',
  scheduleDays: [] as number[], scheduleDate: '',
  channels: ['in_app'],
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, refresh,
          markRead, markAllRead, deleteNotification, clearRead } = useNotifications();

  const [tab, setTab] = useState<'inbox' | 'settings' | 'schedules'>('inbox');

  const [settings, setSettings] = useState<NotifSettings>({
    channelInApp: true, channelEmail: false, channelPush: false,
    channelWhatsapp: false, channelSound: true,
    emailAddress: null, emailDigest: 'realtime',
    whatsappPhone: null,
    dndEnabled: false, dndStart: '22:00', dndEnd: '08:00',
    notifyTaskComplete: true, notifyAgentError: true, notifySkillExec: false,
    notifyWorkflow: true, notifySecurity: true, notifySystem: true,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedLoading, setSchedLoading] = useState(false);
  const [showNewSched, setShowNewSched] = useState(false);
  const [newSched, setNewSched] = useState({ ...EMPTY_SCHED });
  const [savingNewSched, setSavingNewSched] = useState(false);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch(`${config.backendUrl}/api/notifications/settings`, { headers: authH() });
      const data = await res.json();
      if (data.success) setSettings(data.settings);
    } catch {}
    finally { setSettingsLoading(false); }
  }, []);

  const loadSchedules = useCallback(async () => {
    setSchedLoading(true);
    try {
      const res = await fetch(`${config.backendUrl}/api/notifications/schedules`, { headers: authH() });
      const data = await res.json();
      if (data.success) setSchedules(data.schedules);
    } catch {}
    finally { setSchedLoading(false); }
  }, []);

  useEffect(() => {
    loadSettings();
    loadSchedules();
  }, []);

  const saveSettings = async () => {
    setSettingsLoading(true);
    try {
      await fetch(`${config.backendUrl}/api/notifications/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authH() },
        body: JSON.stringify(settings),
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch {}
    finally { setSettingsLoading(false); }
  };

  const setSetting = <K extends keyof NotifSettings>(k: K, v: NotifSettings[K]) =>
    setSettings(prev => ({ ...prev, [k]: v }));

  const createSchedule = async () => {
    if (!newSched.title || !newSched.scheduleTime) return;
    setSavingNewSched(true);
    try {
      const res = await fetch(`${config.backendUrl}/api/notifications/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH() },
        body: JSON.stringify({
          title: newSched.title,
          body: newSched.body,
          type: newSched.type,
          scheduleType: newSched.scheduleType,
          scheduleTime: newSched.scheduleTime,
          scheduleDays: newSched.scheduleDays.length ? newSched.scheduleDays : undefined,
          scheduleDate: newSched.scheduleDate || undefined,
          channels: newSched.channels,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSchedules(prev => [data.schedule, ...prev]);
        setNewSched({ ...EMPTY_SCHED });
        setShowNewSched(false);
      }
    } catch {}
    finally { setSavingNewSched(false); }
  };

  const toggleSchedule = async (id: string, isActive: boolean) => {
    await fetch(`${config.backendUrl}/api/notifications/schedules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authH() },
      body: JSON.stringify({ isActive }),
    });
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, isActive } : s));
  };

  const deleteSchedule = async (id: string) => {
    await fetch(`${config.backendUrl}/api/notifications/schedules/${id}`, {
      method: 'DELETE', headers: authH(),
    });
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground">Manage alerts and scheduled reminders.</p>
        </div>
        {tab === 'settings' && (
          <Button onClick={saveSettings} disabled={settingsLoading}>
            {settingsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : settingsSaved ? <Check className="mr-2 h-4 w-4" />
              : <Save className="mr-2 h-4 w-4" />}
            {settingsSaved ? 'Saved' : 'Save Settings'}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['inbox', 'schedules', 'settings'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'inbox' ? (
              <span className="flex items-center gap-1.5">
                Inbox
                {unreadCount > 0 && (
                  <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </span>
            ) : t === 'schedules' ? (
              <span className="flex items-center gap-1.5">
                <AlarmClock className="h-3.5 w-3.5" />
                Schedules
              </span>
            ) : 'Settings'}
          </button>
        ))}
      </div>

      {/* ── INBOX ──────────────────────────────────────────────────────────── */}
      {tab === 'inbox' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllRead}>
                  <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                  Mark all read
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={clearRead} className="text-muted-foreground">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Clear read
              </Button>
              <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Refresh'}
              </Button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Notifications from agents, schedules, and system events appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                    n.isRead ? 'bg-background opacity-60' : 'bg-card shadow-sm'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${n.isRead ? '' : 'font-medium'} truncate`}>{n.title}</p>
                      {n.source && n.source !== 'system' && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium shrink-0">
                          {n.source}
                        </span>
                      )}
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.isRead && (
                      <button onClick={() => markRead(n.id)} title="Mark as read"
                        className="rounded p-1 hover:bg-muted transition-colors">
                        <Check className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                    <button onClick={() => deleteNotification(n.id)} title="Delete"
                      className="rounded p-1 hover:bg-muted transition-colors">
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SCHEDULES ──────────────────────────────────────────────────────── */}
      {tab === 'schedules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Notifications that fire automatically at a set time.
            </p>
            <Button size="sm" onClick={() => setShowNewSched(v => !v)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Schedule
            </Button>
          </div>

          {showNewSched && (
            <Card className="border-primary/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlarmClock className="h-4 w-4" />
                  New Scheduled Notification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input placeholder="Daily standup reminder"
                      value={newSched.title}
                      onChange={e => setNewSched(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={newSched.type} onValueChange={v => setNewSched(p => ({ ...p, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reminder">Reminder</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Body (optional)</Label>
                  <Textarea placeholder="Optional message..." className="min-h-[60px]"
                    value={newSched.body}
                    onChange={e => setNewSched(p => ({ ...p, body: e.target.value }))} />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Repeat</Label>
                    <Select value={newSched.scheduleType}
                      onValueChange={v => setNewSched(p => ({ ...p, scheduleType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">Once</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekdays">Weekdays</SelectItem>
                        <SelectItem value="weekends">Weekends</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="custom">Custom days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Time</Label>
                    <Input type="time" value={newSched.scheduleTime}
                      onChange={e => setNewSched(p => ({ ...p, scheduleTime: e.target.value }))} />
                  </div>
                  {newSched.scheduleType === 'once' && (
                    <div className="space-y-1.5">
                      <Label>Date</Label>
                      <Input type="date" value={newSched.scheduleDate}
                        onChange={e => setNewSched(p => ({ ...p, scheduleDate: e.target.value }))} />
                    </div>
                  )}
                </div>

                {(newSched.scheduleType === 'weekly' || newSched.scheduleType === 'custom') && (
                  <div className="space-y-1.5">
                    <Label>Days</Label>
                    <div className="flex gap-2 flex-wrap">
                      {DAY_NAMES.map((d, i) => (
                        <button key={i}
                          onClick={() => setNewSched(p => ({
                            ...p,
                            scheduleDays: p.scheduleDays.includes(i)
                              ? p.scheduleDays.filter(x => x !== i)
                              : [...p.scheduleDays, i],
                          }))}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            newSched.scheduleDays.includes(i)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border hover:bg-muted'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowNewSched(false)}>Cancel</Button>
                  <Button onClick={createSchedule} disabled={savingNewSched || !newSched.title}>
                    {savingNewSched ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Create
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {schedLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : schedules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <AlarmClock className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No scheduled notifications</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create reminders, daily digests, or one-time alerts.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {schedules.map(s => (
                <div key={s.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${s.isActive ? 'bg-card' : 'bg-muted/30 opacity-60'}`}>
                  <AlarmClock className={`h-4 w-4 shrink-0 ${s.isActive ? 'text-blue-500' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.scheduleType} at {s.scheduleTime}
                      {s.nextFireAt && ` · next: ${timeAgo(s.nextFireAt)}`}
                    </p>
                  </div>
                  <Switch checked={s.isActive} onCheckedChange={v => toggleSchedule(s.id, v)} />
                  <button onClick={() => deleteSchedule(s.id)}
                    className="rounded p-1 hover:bg-muted transition-colors">
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SETTINGS ───────────────────────────────────────────────────────── */}
      {tab === 'settings' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Channels
              </CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2"><Bell className="h-4 w-4" /> In-App</Label>
                  <p className="text-sm text-muted-foreground">Always-on — shown in inbox and header badge</p>
                </div>
                <Switch checked={settings.channelInApp} onCheckedChange={v => setSetting('channelInApp', v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2"><Volume2 className="h-4 w-4" /> Sound Alerts</Label>
                  <p className="text-sm text-muted-foreground">Play a sound when a new notification arrives</p>
                </div>
                <Switch checked={settings.channelSound} onCheckedChange={v => setSetting('channelSound', v)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch checked={settings.channelEmail} onCheckedChange={v => setSetting('channelEmail', v)} />
                </div>
                {settings.channelEmail && (
                  <div className="ml-6 grid gap-3 md:grid-cols-2 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs">Email address</Label>
                      <Input type="email" placeholder="you@example.com"
                        value={settings.emailAddress || ''}
                        onChange={e => setSetting('emailAddress', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Digest frequency</Label>
                      <Select value={settings.emailDigest} onValueChange={v => setSetting('emailDigest', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="realtime">Real-time</SelectItem>
                          <SelectItem value="hourly">Hourly digest</SelectItem>
                          <SelectItem value="daily">Daily digest</SelectItem>
                          <SelectItem value="weekly">Weekly digest</SelectItem>
                          <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Browser push (requires HTTPS)</p>
                </div>
                <Switch checked={settings.channelPush} onCheckedChange={v => setSetting('channelPush', v)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> WhatsApp</Label>
                    <p className="text-sm text-muted-foreground">Requires WhatsApp Business API or Twilio</p>
                  </div>
                  <Switch checked={settings.channelWhatsapp} onCheckedChange={v => setSetting('channelWhatsapp', v)} />
                </div>
                {settings.channelWhatsapp && (
                  <div className="ml-6 pt-1">
                    <Label className="text-xs">Phone number (with country code)</Label>
                    <Input type="tel" placeholder="+1 555 000 0000" className="mt-1"
                      value={settings.whatsappPhone || ''}
                      onChange={e => setSetting('whatsappPhone', e.target.value)} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Do Not Disturb
              </CardTitle>
              <CardDescription>Silence external channels during set hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Do Not Disturb</Label>
                <Switch checked={settings.dndEnabled} onCheckedChange={v => setSetting('dndEnabled', v)} />
              </div>
              {settings.dndEnabled && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Start</Label>
                    <Input type="time" value={settings.dndStart}
                      onChange={e => setSetting('dndStart', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End</Label>
                    <Input type="time" value={settings.dndEnd}
                      onChange={e => setSetting('dndEnd', e.target.value)} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Event Notifications</CardTitle>
              <CardDescription>Choose which events trigger a notification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {([
                ['notifyTaskComplete', 'Task Completion',  'Agent finishes a task'],
                ['notifyAgentError',   'Agent Errors',     'Agent encounters an error'],
                ['notifySkillExec',    'Skill Execution',  'A skill runs successfully'],
                ['notifyWorkflow',     'Workflow Triggers','A scheduled workflow runs'],
                ['notifySecurity',     'Security Alerts',  'Suspicious login or activity'],
                ['notifySystem',       'System Events',    'Backend restarts, migrations, updates'],
              ] as [keyof NotifSettings, string, string][]).map(([key, label, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{label}</Label>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={!!settings[key]}
                    onCheckedChange={v => setSetting(key, v as any)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
