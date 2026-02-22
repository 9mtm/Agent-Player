/**
 * Calendar API Routes
 * Manages calendar events, sources, and external calendar sync (Google Calendar, iCal)
 */

import type { FastifyInstance } from 'fastify';
import { handleError, handleSmartError } from '../error-handler.js';
import { getDatabase } from '../../db/index.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import { randomUUID } from 'crypto';

export async function registerCalendarRoutes(fastify: FastifyInstance) {
  const db = getDatabase();

  // ── Calendar Sources ──

  /**
   * GET /api/calendar/sources
   * Get all calendar sources for the current user
   */
  fastify.get('/api/calendar/sources', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);

      const sources = db.prepare(`
        SELECT
          id, name, type, url, color, is_enabled, is_primary,
          sync_enabled, sync_interval, last_synced_at, sync_status,
          created_at, updated_at
        FROM calendar_sources
        WHERE user_id = ?
        ORDER BY is_primary DESC, name ASC
      `).all(userId);

      return { sources };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleSmartError(reply, error, '[Calendar]');
    }
  });

  /**
   * POST /api/calendar/sources
   * Create a new calendar source
   */
  fastify.post('/api/calendar/sources', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { name, type, url, color, description, permission, allow_agent_access } = request.body as {
        name: string;
        type: string;
        url?: string;
        color?: string;
        description?: string;
        permission?: string;
        allow_agent_access?: boolean;
      };

      if (!name || !type) {
        return reply.code(400).send({ error: 'name and type are required' });
      }

      const validTypes = ['manual', 'google', 'ical', 'caldav', 'webcal'];
      if (!validTypes.includes(type)) {
        return reply.code(400).send({ error: 'Invalid calendar type' });
      }

      if ((type === 'ical' || type === 'webcal' || type === 'caldav') && !url) {
        return reply.code(400).send({ error: 'url is required for this calendar type' });
      }

      const id = randomUUID();
      db.prepare(`
        INSERT INTO calendar_sources (
          id, user_id, name, type, url, color, description, permission, allow_agent_access
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        userId,
        name,
        type,
        url || null,
        color || '#3b82f6',
        description || null,
        permission || 'read_write',
        allow_agent_access !== false ? 1 : 0
      );

      const source = db.prepare('SELECT * FROM calendar_sources WHERE id = ?').get(id);
      return { source };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleSmartError(reply, error, '[Calendar]');
    }
  });

  /**
   * PUT /api/calendar/sources/:id
   * Update calendar source
   */
  fastify.put('/api/calendar/sources/:id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params as { id: string };
      const { name, url, color, is_enabled, is_primary, sync_enabled, description, permission, allow_agent_access } = request.body as {
        name?: string;
        url?: string;
        color?: string;
        is_enabled?: boolean;
        is_primary?: boolean;
        sync_enabled?: boolean;
        description?: string;
        permission?: string;
        allow_agent_access?: boolean;
      };

      // Verify ownership
      const source = db.prepare('SELECT * FROM calendar_sources WHERE id = ? AND user_id = ?').get(id, userId);
      if (!source) {
        return reply.code(404).send({ error: 'Calendar source not found' });
      }

      // If setting as primary, unset other primary calendars
      if (is_primary) {
        db.prepare('UPDATE calendar_sources SET is_primary = 0 WHERE user_id = ?').run(userId);
      }

      db.prepare(`
        UPDATE calendar_sources
        SET
          name = COALESCE(?, name),
          url = COALESCE(?, url),
          color = COALESCE(?, color),
          is_enabled = COALESCE(?, is_enabled),
          is_primary = COALESCE(?, is_primary),
          sync_enabled = COALESCE(?, sync_enabled),
          description = COALESCE(?, description),
          permission = COALESCE(?, permission),
          allow_agent_access = COALESCE(?, allow_agent_access),
          updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).run(
        name,
        url,
        color,
        is_enabled !== undefined ? (is_enabled ? 1 : 0) : undefined,
        is_primary !== undefined ? (is_primary ? 1 : 0) : undefined,
        sync_enabled !== undefined ? (sync_enabled ? 1 : 0) : undefined,
        description,
        permission,
        allow_agent_access !== undefined ? (allow_agent_access ? 1 : 0) : undefined,
        id,
        userId
      );

      const updated = db.prepare('SELECT * FROM calendar_sources WHERE id = ?').get(id);
      return { source: updated };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleSmartError(reply, error, '[Calendar]');
    }
  });

  /**
   * DELETE /api/calendar/sources/:id
   * Delete calendar source (and all its events)
   */
  fastify.delete('/api/calendar/sources/:id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params as { id: string };

      const source = db.prepare('SELECT * FROM calendar_sources WHERE id = ? AND user_id = ?').get(id, userId);
      if (!source) {
        return reply.code(404).send({ error: 'Calendar source not found' });
      }

      db.prepare('DELETE FROM calendar_sources WHERE id = ?').run(id);
      return { success: true };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleSmartError(reply, error, '[Calendar]');
    }
  });

  // ── Calendar Events ──

  /**
   * GET /api/calendar/events
   * Get calendar events (with filters)
   */
  fastify.get('/api/calendar/events', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { start, end, source_id } = request.query as {
        start?: string;
        end?: string;
        source_id?: string;
      };

      let query = `
        SELECT
          e.*,
          s.name as calendar_name,
          s.color as calendar_color
        FROM calendar_events e
        LEFT JOIN calendar_sources s ON s.id = e.calendar_source_id
        WHERE e.user_id = ?
      `;

      const params: any[] = [userId];

      if (start) {
        query += ' AND e.start_time >= ?';
        params.push(start);
      }

      if (end) {
        query += ' AND e.start_time <= ?';
        params.push(end);
      }

      if (source_id) {
        query += ' AND e.calendar_source_id = ?';
        params.push(source_id);
      }

      query += ' ORDER BY e.start_time ASC';

      const events = db.prepare(query).all(...params);

      // Parse JSON fields
      const parsedEvents = events.map((event: any) => ({
        ...event,
        attendees: event.attendees ? JSON.parse(event.attendees) : [],
        reminders: event.reminders ? JSON.parse(event.reminders) : [],
        recurrence_exception: event.recurrence_exception ? JSON.parse(event.recurrence_exception) : [],
      }));

      return { events: parsedEvents };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleSmartError(reply, error, '[Calendar]');
    }
  });

  /**
   * GET /api/calendar/events/:id
   * Get single event
   */
  fastify.get('/api/calendar/events/:id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params as { id: string };

      const event = db.prepare(`
        SELECT
          e.*,
          s.name as calendar_name,
          s.color as calendar_color
        FROM calendar_events e
        LEFT JOIN calendar_sources s ON s.id = e.calendar_source_id
        WHERE e.id = ? AND e.user_id = ?
      `).get(id, userId) as any;

      if (!event) {
        return reply.code(404).send({ error: 'Event not found' });
      }

      // Parse JSON fields
      event.attendees = event.attendees ? JSON.parse(event.attendees) : [];
      event.reminders = event.reminders ? JSON.parse(event.reminders) : [];
      event.recurrence_exception = event.recurrence_exception ? JSON.parse(event.recurrence_exception) : [];

      return { event };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleSmartError(reply, error, '[Calendar]');
    }
  });

  /**
   * POST /api/calendar/events
   * Create new calendar event
   */
  fastify.post('/api/calendar/events', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const {
        calendar_source_id,
        title,
        description,
        location,
        start_time,
        end_time,
        is_all_day,
        timezone,
        event_type,
        attendees,
        reminders,
      } = request.body as {
        calendar_source_id?: string;
        title: string;
        description?: string;
        location?: string;
        start_time: string;
        end_time: string;
        is_all_day?: boolean;
        timezone?: string;
        event_type?: string;
        attendees?: any[];
        reminders?: any[];
      };

      if (!title || !start_time || !end_time) {
        return reply.code(400).send({ error: 'title, start_time, and end_time are required' });
      }

      // If no calendar_source_id provided, use primary calendar
      let sourceId = calendar_source_id;
      if (!sourceId) {
        const primary = db.prepare(`
          SELECT id FROM calendar_sources
          WHERE user_id = ? AND is_primary = 1
          LIMIT 1
        `).get(userId) as { id: string } | undefined;

        if (primary) {
          sourceId = primary.id;
        }
      }

      const id = randomUUID();
      db.prepare(`
        INSERT INTO calendar_events (
          id, user_id, calendar_source_id, title, description, location,
          start_time, end_time, is_all_day, timezone, event_type,
          attendees, reminders
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        userId,
        sourceId || null,
        title,
        description || null,
        location || null,
        start_time,
        end_time,
        is_all_day ? 1 : 0,
        timezone || 'UTC',
        event_type || 'event',
        attendees ? JSON.stringify(attendees) : null,
        reminders ? JSON.stringify(reminders) : null
      );

      const event = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id);
      return { event };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleSmartError(reply, error, '[Calendar]');
    }
  });

  /**
   * PUT /api/calendar/events/:id
   * Update calendar event
   */
  fastify.put('/api/calendar/events/:id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params as { id: string };
      const {
        title,
        description,
        location,
        start_time,
        end_time,
        is_all_day,
        timezone,
        event_type,
        status,
        attendees,
        reminders,
      } = request.body as any;

      const event = db.prepare('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?').get(id, userId);
      if (!event) {
        return reply.code(404).send({ error: 'Event not found' });
      }

      db.prepare(`
        UPDATE calendar_events
        SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          location = COALESCE(?, location),
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          is_all_day = COALESCE(?, is_all_day),
          timezone = COALESCE(?, timezone),
          event_type = COALESCE(?, event_type),
          status = COALESCE(?, status),
          attendees = COALESCE(?, attendees),
          reminders = COALESCE(?, reminders),
          updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).run(
        title,
        description,
        location,
        start_time,
        end_time,
        is_all_day !== undefined ? (is_all_day ? 1 : 0) : undefined,
        timezone,
        event_type,
        status,
        attendees ? JSON.stringify(attendees) : undefined,
        reminders ? JSON.stringify(reminders) : undefined,
        id,
        userId
      );

      const updated = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id);
      return { event: updated };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleSmartError(reply, error, '[Calendar]');
    }
  });

  /**
   * DELETE /api/calendar/events/:id
   * Delete calendar event
   */
  fastify.delete('/api/calendar/events/:id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params as { id: string };

      const event = db.prepare('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?').get(id, userId);
      if (!event) {
        return reply.code(404).send({ error: 'Event not found' });
      }

      db.prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
      return { success: true };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleSmartError(reply, error, '[Calendar]');
    }
  });

  // ── Calendar Sync ──

  /**
   * POST /api/calendar/sources/:id/sync
   * Manually trigger sync for a calendar source
   */
  fastify.post('/api/calendar/sources/:id/sync', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params as { id: string };

      const source = db.prepare('SELECT * FROM calendar_sources WHERE id = ? AND user_id = ?').get(id, userId) as any;
      if (!source) {
        return reply.code(404).send({ error: 'Calendar source not found' });
      }

      if (!source.sync_enabled) {
        return reply.code(400).send({ error: 'Sync is not enabled for this calendar' });
      }

      // Update sync status
      db.prepare(`
        UPDATE calendar_sources
        SET sync_status = 'syncing', updated_at = datetime('now')
        WHERE id = ?
      `).run(id);

      // Start sync (import from the calendar sync service)
      const { syncCalendarSource } = await import('../../services/calendar-sync.js');

      // Run sync in background
      syncCalendarSource(id).catch((error) => {
        console.error(`[Calendar] Sync failed for source ${id}:`, error);
      });

      return { success: true, message: 'Sync started' };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleSmartError(reply, error, '[Calendar]');
    }
  });

  /**
   * GET /api/calendar/sources/:id/sync-log
   * Get sync history for a calendar source
   */
  fastify.get('/api/calendar/sources/:id/sync-log', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params as { id: string };

      // Verify ownership
      const source = db.prepare('SELECT * FROM calendar_sources WHERE id = ? AND user_id = ?').get(id, userId);
      if (!source) {
        return reply.code(404).send({ error: 'Calendar source not found' });
      }

      const logs = db.prepare(`
        SELECT * FROM calendar_sync_log
        WHERE calendar_source_id = ?
        ORDER BY started_at DESC
        LIMIT 20
      `).all(id);

      return { logs };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleSmartError(reply, error, '[Calendar]');
    }
  });
}
