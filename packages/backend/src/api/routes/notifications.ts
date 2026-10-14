import type { FastifyInstance } from 'fastify';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import {
  notify,
  getNotificationSettings,
  saveNotificationSettings,
  computeNextFire,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteReadNotifications,
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../../services/notification-service.js';

// SECURITY: Use centralized JWT verification from auth/jwt.ts
function getUserId(request: any): string | null {
  try {
    return getUserIdFromRequest(request);
  } catch {
    return null;
  }
}

function rowToNotif(r: any) {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    body: r.body,
    type: r.type,
    channel: r.channel,
    isRead: !!r.is_read,
    actionUrl: r.action_url,
    meta: r.meta ? JSON.parse(r.meta) : null,
    source: r.source || 'system',
    createdAt: r.created_at,
  };
}

function rowToSchedule(r: any) {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    body: r.body,
    type: r.type,
    scheduleType: r.schedule_type,
    scheduleTime: r.schedule_time,
    scheduleDays: r.schedule_days ? JSON.parse(r.schedule_days) : null,
    scheduleDate: r.schedule_date,
    channels: JSON.parse(r.channels || '["in_app"]'),
    isActive: !!r.is_active,
    lastFiredAt: r.last_fired_at,
    nextFireAt: r.next_fire_at,
    createdAt: r.created_at,
  };
}

export async function notificationsRoutes(fastify: FastifyInstance) {
  // ── Notifications CRUD ──────────────────────────────────────────────────────

  // GET /api/notifications — list (paginated), with optional ?unread=1&source=extensionId
  fastify.get('/api/notifications', async (request: any, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { unread, limit = '50', offset = '0', source } = request.query as any;

    // B2.2c: on the process driver (services/notification-service.ts)
    const { rows, unreadCount } = await listNotifications(userId, {
      unread: unread === '1', source: source || undefined, limit: parseInt(limit), offset: parseInt(offset),
    });

    return reply.send({
      success: true,
      notifications: rows.map(rowToNotif),
      unreadCount,
    });
  });

  // POST /api/notifications — create a notification manually (or via other systems)
  fastify.post<{ Body: any }>('/api/notifications', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { title, body, type, channel, actionUrl, meta, source } = request.body;
    if (!title) return reply.status(400).send({ error: 'title is required' });

    const notif = await notify({ userId, title, body, type, channel, actionUrl, meta, source });
    return reply.status(201).send({ success: true, notification: notif });
  });

  // PATCH /api/notifications/:id/read — mark one as read
  fastify.patch('/api/notifications/:id/read', async (request: any, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    await markNotificationRead(userId, request.params.id);

    return reply.send({ success: true });
  });

  // PATCH /api/notifications/read-all — mark all as read
  fastify.patch('/api/notifications/read-all', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    await markAllNotificationsRead(userId);

    return reply.send({ success: true });
  });

  // DELETE /api/notifications/:id — delete one
  fastify.delete('/api/notifications/:id', async (request: any, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    await deleteNotification(userId, request.params.id);

    return reply.send({ success: true });
  });

  // DELETE /api/notifications — delete all read notifications
  fastify.delete('/api/notifications', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    await deleteReadNotifications(userId);

    return reply.send({ success: true });
  });

  // ── Settings ────────────────────────────────────────────────────────────────

  // GET /api/notifications/settings
  fastify.get('/api/notifications/settings', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const settings = await getNotificationSettings(userId);
    return reply.send({ success: true, settings });
  });

  // PUT /api/notifications/settings
  fastify.put<{ Body: any }>('/api/notifications/settings', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const settings = await saveNotificationSettings(userId, request.body);
    return reply.send({ success: true, settings });
  });

  // ── Schedules ───────────────────────────────────────────────────────────────

  // GET /api/notifications/schedules
  fastify.get('/api/notifications/schedules', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const rows = await listSchedules(userId);

    return reply.send({ success: true, schedules: rows.map(rowToSchedule) });
  });

  // POST /api/notifications/schedules — create a schedule
  fastify.post<{ Body: any }>('/api/notifications/schedules', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const {
      title, body = '', type = 'reminder',
      scheduleType = 'daily', scheduleTime, scheduleDays, scheduleDate,
      channels = ['in_app'],
    } = request.body;

    if (!title || !scheduleTime) {
      return reply.status(400).send({ error: 'title and scheduleTime are required' });
    }

    const nextFire = computeNextFire(
      scheduleType, scheduleTime,
      scheduleDays ? JSON.stringify(scheduleDays) : null,
      scheduleDate || null
    );

    // RETURNING: the row just written (no "newest row of this user" race)
    const created = await createSchedule({
      userId, title, body, type, scheduleType, scheduleTime,
      scheduleDays: scheduleDays ? JSON.stringify(scheduleDays) : null,
      scheduleDate: scheduleDate || null,
      channels: JSON.stringify(channels),
      nextFireAt: nextFire ? nextFire.toISOString() : null,
    });

    return reply.status(201).send({ success: true, schedule: rowToSchedule(created) });
  });

  // PATCH /api/notifications/schedules/:id — update (rename, toggle active, etc.)
  fastify.patch<{ Body: any }>('/api/notifications/schedules/:id', async (request: any, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { id } = request.params;
    const {
      title, body, type, scheduleType, scheduleTime, scheduleDays, scheduleDate,
      channels, isActive,
    } = request.body;

    // One transaction: the schedule row is locked while the change is computed from it.
    const updated = await updateSchedule(userId, id, (existing) => {
      const fields: string[] = [];
      const vals: any[] = [];
      const set = (k: string, v: any) => { fields.push(`${k} = ?`); vals.push(v ?? null); };

      if (title !== undefined)        set('title', title);
      if (body !== undefined)         set('body', body);
      if (type !== undefined)         set('type', type);
      if (isActive !== undefined)     set('is_active', isActive ? 1 : 0);
      if (scheduleType !== undefined) set('schedule_type', scheduleType);
      if (scheduleTime !== undefined) set('schedule_time', scheduleTime);
      if (scheduleDays !== undefined) set('schedule_days', JSON.stringify(scheduleDays));
      if (scheduleDate !== undefined) set('schedule_date', scheduleDate);
      if (channels !== undefined)     set('channels', JSON.stringify(channels));

      // Recompute next_fire_at if timing changed
      if (scheduleType || scheduleTime || scheduleDays || scheduleDate) {
        const next = computeNextFire(
          scheduleType || existing.schedule_type,
          scheduleTime || existing.schedule_time,
          scheduleDays ? JSON.stringify(scheduleDays) : existing.schedule_days,
          scheduleDate || existing.schedule_date
        );
        set('next_fire_at', next ? next.toISOString() : null);
      }
      return { fields, vals };
    });
    if (!updated) return reply.status(404).send({ error: 'Schedule not found' });

    return reply.send({ success: true, schedule: rowToSchedule(updated) });
  });

  // DELETE /api/notifications/schedules/:id
  fastify.delete('/api/notifications/schedules/:id', async (request: any, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    await deleteSchedule(userId, request.params.id);

    return reply.send({ success: true });
  });
}
