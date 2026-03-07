/**
 * Notification Service
 *
 * Central dispatcher for all in-app notifications.
 * Stores every notification in the DB, then forwards to each
 * enabled channel (email, push, whatsapp, sound) based on user settings.
 *
 * Architecture:
 *  notify() → DB insert (always) → channel dispatchers (optional)
 *
 * Extending for new channels:
 *  1. Add column to notification_settings (migration)
 *  2. Add dispatcher function here
 *  3. Call it in notify() when enabled
 */

import { getDatabase } from '../db/index.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'agent'
  | 'system'
  | 'reminder';

export type NotificationChannel =
  | 'in_app'
  | 'email'
  | 'push'
  | 'whatsapp'
  | 'sound';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  body?: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  actionUrl?: string;
  meta?: Record<string, unknown>;
  source?: string; // extensionId or 'system'
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  channel: NotificationChannel;
  isRead: boolean;
  actionUrl: string | null;
  meta: string | null;
  source: string;
  createdAt: string;
}

export interface NotificationSettings {
  userId: string;
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
  pushSubscription: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToSettings(row: any): NotificationSettings {
  return {
    userId: row.user_id,
    channelInApp: !!row.channel_in_app,
    channelEmail: !!row.channel_email,
    channelPush: !!row.channel_push,
    channelWhatsapp: !!row.channel_whatsapp,
    channelSound: !!row.channel_sound,
    emailAddress: row.email_address,
    emailDigest: row.email_digest,
    whatsappPhone: row.whatsapp_phone,
    dndEnabled: !!row.dnd_enabled,
    dndStart: row.dnd_start,
    dndEnd: row.dnd_end,
    notifyTaskComplete: !!row.notify_task_complete,
    notifyAgentError: !!row.notify_agent_error,
    notifySkillExec: !!row.notify_skill_exec,
    notifyWorkflow: !!row.notify_workflow,
    notifySecurity: !!row.notify_security,
    notifySystem: !!row.notify_system,
    pushSubscription: row.push_subscription,
  };
}

/** Returns true if current time is within the DND window */
function isDndActive(settings: NotificationSettings): boolean {
  if (!settings.dndEnabled) return false;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const current = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const start = settings.dndStart;
  const end = settings.dndEnd;
  if (start <= end) {
    return current >= start && current < end;
  } else {
    // Overnight window e.g. 22:00 – 08:00
    return current >= start || current < end;
  }
}

// ── Settings CRUD ─────────────────────────────────────────────────────────────

export function getNotificationSettings(userId: string): NotificationSettings {
  const db = getDatabase();
  const row = db.prepare(
    'SELECT * FROM notification_settings WHERE user_id = ?'
  ).get(userId);

  if (!row) {
    // Auto-create defaults
    db.prepare(`
      INSERT INTO notification_settings (user_id) VALUES (?)
    `).run(userId);
    return getNotificationSettings(userId);
  }
  return rowToSettings(row);
}

export function saveNotificationSettings(
  userId: string,
  updates: Partial<Omit<NotificationSettings, 'userId'>>
): NotificationSettings {
  const db = getDatabase();
  // Ensure row exists
  getNotificationSettings(userId);

  const fields: string[] = [];
  const vals: any[] = [];

  const col = (key: string, val: any) => { fields.push(`${key} = ?`); vals.push(val); };

  if (updates.channelInApp !== undefined)    col('channel_in_app',      updates.channelInApp ? 1 : 0);
  if (updates.channelEmail !== undefined)    col('channel_email',       updates.channelEmail ? 1 : 0);
  if (updates.channelPush !== undefined)     col('channel_push',        updates.channelPush ? 1 : 0);
  if (updates.channelWhatsapp !== undefined) col('channel_whatsapp',    updates.channelWhatsapp ? 1 : 0);
  if (updates.channelSound !== undefined)    col('channel_sound',       updates.channelSound ? 1 : 0);
  if (updates.emailAddress !== undefined)    col('email_address',       updates.emailAddress);
  if (updates.emailDigest !== undefined)     col('email_digest',        updates.emailDigest);
  if (updates.whatsappPhone !== undefined)   col('whatsapp_phone',      updates.whatsappPhone);
  if (updates.dndEnabled !== undefined)      col('dnd_enabled',         updates.dndEnabled ? 1 : 0);
  if (updates.dndStart !== undefined)        col('dnd_start',           updates.dndStart);
  if (updates.dndEnd !== undefined)          col('dnd_end',             updates.dndEnd);
  if (updates.notifyTaskComplete !== undefined) col('notify_task_complete', updates.notifyTaskComplete ? 1 : 0);
  if (updates.notifyAgentError !== undefined)   col('notify_agent_error',   updates.notifyAgentError ? 1 : 0);
  if (updates.notifySkillExec !== undefined)    col('notify_skill_exec',    updates.notifySkillExec ? 1 : 0);
  if (updates.notifyWorkflow !== undefined)     col('notify_workflow',       updates.notifyWorkflow ? 1 : 0);
  if (updates.notifySecurity !== undefined)     col('notify_security',       updates.notifySecurity ? 1 : 0);
  if (updates.notifySystem !== undefined)       col('notify_system',         updates.notifySystem ? 1 : 0);
  if (updates.pushSubscription !== undefined)   col('push_subscription',     updates.pushSubscription);

  if (fields.length > 0) {
    fields.push('updated_at = CURRENT_TIMESTAMP');
    vals.push(userId);
    db.prepare(
      `UPDATE notification_settings SET ${fields.join(', ')} WHERE user_id = ?`
    ).run(...vals);
  }

  return getNotificationSettings(userId);
}

// ── Core notify() ─────────────────────────────────────────────────────────────

/**
 * Create a notification and dispatch to all enabled channels.
 * Always stores in DB (in_app). Respects DND for external channels.
 */
export function notify(input: CreateNotificationInput): Notification {
  const db = getDatabase();
  const {
    userId,
    title,
    body = '',
    type = 'info',
    channel = 'in_app',
    actionUrl,
    meta,
    source = 'system',
  } = input;

  // Insert into DB
  db.prepare(`
    INSERT INTO notifications (user_id, title, body, type, channel, action_url, meta, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    title,
    body,
    type,
    channel,
    actionUrl ?? null,
    meta ? JSON.stringify(meta) : null,
    source
  );

  const created = db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(userId) as any;

  // Dispatch to external channels if user settings allow
  try {
    const settings = getNotificationSettings(userId);
    const dnd = isDndActive(settings);

    if (!dnd) {
      if (settings.channelEmail && settings.emailAddress) {
        dispatchEmail(settings.emailAddress, title, body).catch(() => {});
      }
      if (settings.channelPush && settings.pushSubscription) {
        dispatchPush(settings.pushSubscription, title, body).catch(() => {});
      }
      if (settings.channelWhatsapp && settings.whatsappPhone) {
        dispatchWhatsApp(settings.whatsappPhone, title, body).catch(() => {});
      }
    }
  } catch {
    // Non-fatal — in-app notification already saved
  }

  return {
    id: created.id,
    userId: created.user_id,
    title: created.title,
    body: created.body,
    type: created.type,
    channel: created.channel,
    isRead: !!created.is_read,
    actionUrl: created.action_url,
    meta: created.meta,
    source: created.source || 'system',
    createdAt: created.created_at,
  };
}

// ── Channel Dispatchers ────────────────────────────────────────────────────────
// Each returns a Promise so they can be awaited or fire-and-forget.
// Replace stub implementations with real integrations as needed.

async function dispatchEmail(
  to: string,
  title: string,
  body: string
): Promise<void> {
  // TODO: integrate nodemailer / SendGrid / SES
  // Example with nodemailer:
  // const transporter = nodemailer.createTransport({ ... });
  // await transporter.sendMail({ from, to, subject: title, text: body });
  console.log(`[Notification] Email → ${to}: ${title}`);
}

async function dispatchPush(
  subscriptionJson: string,
  title: string,
  body: string
): Promise<void> {
  // TODO: integrate web-push library
  // const subscription = JSON.parse(subscriptionJson);
  // await webpush.sendNotification(subscription, JSON.stringify({ title, body }));
  console.log(`[Notification] Push → ${subscriptionJson.slice(0, 30)}: ${title}`);
}

async function dispatchWhatsApp(
  phone: string,
  title: string,
  body: string
): Promise<void> {
  // TODO: integrate Twilio / WhatsApp Business API / wwebjs
  // await twilioClient.messages.create({ body: `${title}: ${body}`, from: 'whatsapp:+...', to: `whatsapp:${phone}` });
  console.log(`[Notification] WhatsApp → ${phone}: ${title}`);
}

// ── Schedule Engine ───────────────────────────────────────────────────────────

/** Compute the next Date a schedule should fire, from a given "after" point */
export function computeNextFire(
  scheduleType: string,
  scheduleTime: string,
  scheduleDays: string | null,
  scheduleDate: string | null,
  after: Date = new Date()
): Date | null {
  const [hStr, mStr] = scheduleTime.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);

  const candidate = new Date(after);
  candidate.setSeconds(0, 0);
  candidate.setHours(h, m);

  // Advance past "after" if needed
  if (candidate <= after) {
    candidate.setDate(candidate.getDate() + 1);
  }

  if (scheduleType === 'once') {
    if (!scheduleDate) return null;
    const target = new Date(`${scheduleDate}T${scheduleTime}:00`);
    return target > after ? target : null;
  }

  if (scheduleType === 'daily') {
    return candidate;
  }

  if (scheduleType === 'weekdays') {
    while (candidate.getDay() === 0 || candidate.getDay() === 6) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
  }

  if (scheduleType === 'weekends') {
    while (candidate.getDay() !== 0 && candidate.getDay() !== 6) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
  }

  if (scheduleType === 'weekly' || scheduleType === 'custom') {
    const days: number[] = scheduleDays ? JSON.parse(scheduleDays) : [1];
    let tries = 0;
    while (!days.includes(candidate.getDay()) && tries < 8) {
      candidate.setDate(candidate.getDate() + 1);
      tries++;
    }
    return tries < 8 ? candidate : null;
  }

  return candidate;
}

/** Called by the cron runner — fires any overdue schedules */
export function processScheduledNotifications(): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  const due = db.prepare(`
    SELECT * FROM notification_schedules
    WHERE is_active = 1
      AND next_fire_at IS NOT NULL
      AND next_fire_at <= ?
  `).all(now) as any[];

  for (const sched of due) {
    // Create the in-app notification
    const channels: string[] = JSON.parse(sched.channels || '["in_app"]');
    for (const ch of channels) {
      notify({
        userId: sched.user_id,
        title: sched.title,
        body: sched.body,
        type: sched.type,
        channel: ch as NotificationChannel,
      });
    }

    // Compute next fire time
    const next = computeNextFire(
      sched.schedule_type,
      sched.schedule_time,
      sched.schedule_days,
      sched.schedule_date,
      new Date()
    );

    if (sched.schedule_type === 'once' || !next) {
      // One-time or exhausted — deactivate
      db.prepare(
        'UPDATE notification_schedules SET is_active = 0, last_fired_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(sched.id);
    } else {
      db.prepare(
        'UPDATE notification_schedules SET last_fired_at = CURRENT_TIMESTAMP, next_fire_at = ? WHERE id = ?'
      ).run(next.toISOString(), sched.id);
    }
  }
}
