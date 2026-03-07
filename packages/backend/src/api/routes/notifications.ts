import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import {
  notify,
  getNotificationSettings,
  saveNotificationSettings,
  computeNextFire,
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

    const db = getDatabase();
    const { unread, limit = '50', offset = '0', source } = request.query as any;

    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params: any[] = [userId];
    if (unread === '1') { sql += ' AND is_read = 0'; }
    if (source) { sql += ' AND source = ?'; params.push(source); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const rows = db.prepare(sql).all(...params) as any[];
    const unreadCount = (db.prepare(
      'SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0'
    ).get(userId) as any).c;

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

    const notif = notify({ userId, title, body, type, channel, actionUrl, meta, source });
    return reply.status(201).send({ success: true, notification: notif });
  });

  // PATCH /api/notifications/:id/read — mark one as read
  fastify.patch('/api/notifications/:id/read', async (request: any, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const db = getDatabase();
    db.prepare(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
    ).run(request.params.id, userId);

    return reply.send({ success: true });
  });

  // PATCH /api/notifications/read-all — mark all as read
  fastify.patch('/api/notifications/read-all', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const db = getDatabase();
    db.prepare(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?'
    ).run(userId);

    return reply.send({ success: true });
  });

  // DELETE /api/notifications/:id — delete one
  fastify.delete('/api/notifications/:id', async (request: any, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const db = getDatabase();
    db.prepare(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?'
    ).run(request.params.id, userId);

    return reply.send({ success: true });
  });

  // DELETE /api/notifications — delete all read notifications
  fastify.delete('/api/notifications', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const db = getDatabase();
    db.prepare(
      'DELETE FROM notifications WHERE user_id = ? AND is_read = 1'
    ).run(userId);

    return reply.send({ success: true });
  });

  // ── Settings ────────────────────────────────────────────────────────────────

  // GET /api/notifications/settings
  fastify.get('/api/notifications/settings', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const settings = getNotificationSettings(userId);
    return reply.send({ success: true, settings });
  });

  // PUT /api/notifications/settings
  fastify.put<{ Body: any }>('/api/notifications/settings', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const settings = saveNotificationSettings(userId, request.body);
    return reply.send({ success: true, settings });
  });

  // ── Schedules ───────────────────────────────────────────────────────────────

  // GET /api/notifications/schedules
  fastify.get('/api/notifications/schedules', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM notification_schedules WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId) as any[];

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

    const db = getDatabase();
    db.prepare(`
      INSERT INTO notification_schedules
        (user_id, title, body, type, schedule_type, schedule_time, schedule_days, schedule_date, channels, next_fire_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, title, body, type, scheduleType, scheduleTime,
      scheduleDays ? JSON.stringify(scheduleDays) : null,
      scheduleDate || null,
      JSON.stringify(channels),
      nextFire ? nextFire.toISOString() : null
    );

    const created = db.prepare(
      'SELECT * FROM notification_schedules WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(userId) as any;

    return reply.status(201).send({ success: true, schedule: rowToSchedule(created) });
  });

  // PATCH /api/notifications/schedules/:id — update (rename, toggle active, etc.)
  fastify.patch<{ Body: any }>('/api/notifications/schedules/:id', async (request: any, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { id } = request.params;
    const db = getDatabase();
    const existing = db.prepare(
      'SELECT * FROM notification_schedules WHERE id = ? AND user_id = ?'
    ).get(id, userId) as any;
    if (!existing) return reply.status(404).send({ error: 'Schedule not found' });

    const {
      title, body, type, scheduleType, scheduleTime, scheduleDays, scheduleDate,
      channels, isActive,
    } = request.body;

    const fields: string[] = [];
    const vals: any[] = [];
    const set = (k: string, v: any) => { fields.push(`${k} = ?`); vals.push(v); };

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

    if (fields.length > 0) {
      vals.push(id);
      db.prepare(
        `UPDATE notification_schedules SET ${fields.join(', ')} WHERE id = ?`
      ).run(...vals);
    }

    const updated = db.prepare(
      'SELECT * FROM notification_schedules WHERE id = ?'
    ).get(id) as any;

    return reply.send({ success: true, schedule: rowToSchedule(updated) });
  });

  // DELETE /api/notifications/schedules/:id
  fastify.delete('/api/notifications/schedules/:id', async (request: any, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const db = getDatabase();
    db.prepare(
      'DELETE FROM notification_schedules WHERE id = ? AND user_id = ?'
    ).run(request.params.id, userId);

    return reply.send({ success: true });
  });
}
