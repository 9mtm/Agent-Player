/**
 * Dashboard API Routes
 * Manages customizable dashboard layouts and widgets
 */

import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import { randomUUID } from 'crypto';
import { handleError } from '../error-handler.js';

export async function registerDashboardRoutes(fastify: FastifyInstance) {
  const db = getDatabase();

  // ── Widget Management ──

  /**
   * GET /api/dashboard/widgets
   * List all available dashboard widgets (system + extensions)
   */
  fastify.get('/api/dashboard/widgets', async (request, reply) => {
    const widgets = db.prepare(`
      SELECT * FROM dashboard_widgets
      ORDER BY category, name
    `).all();

    return { widgets };
  });

  /**
   * GET /api/dashboard/widgets/:id
   * Get single widget details
   */
  fastify.get('/api/dashboard/widgets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const widget = db.prepare('SELECT * FROM dashboard_widgets WHERE id = ?').get(id);

    if (!widget) {
      return reply.code(404).send({ error: 'Widget not found' });
    }

    return widget;
  });

  // ── Layout Management ──

  /**
   * GET /api/dashboard/layout
   * Get user's active dashboard layout
   */
  fastify.get('/api/dashboard/layout', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);

      const layout = db.prepare(`
        SELECT * FROM user_dashboard_layouts
        WHERE user_id = ? AND is_active = 1
        ORDER BY updated_at DESC
        LIMIT 1
      `).get(userId) as { widgets: string } | undefined;

      if (!layout) {
        // Return empty layout if none exists
        return { widgets: [] };
      }

      return { widgets: JSON.parse(layout.widgets) };
    } catch (error: any) {
      if (error.message?.includes('Unauthorized')) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Dashboard] Get layout failed');
    }
  });

  /**
   * PUT /api/dashboard/layout
   * Save/update user's dashboard layout
   */
  fastify.put('/api/dashboard/layout', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { widgets } = request.body as { widgets: any[] };

      if (!Array.isArray(widgets)) {
        return reply.code(400).send({ error: 'widgets must be an array' });
      }

      // Deactivate all existing layouts
      db.prepare('UPDATE user_dashboard_layouts SET is_active = 0 WHERE user_id = ?').run(userId);

      // Create new layout
      db.prepare(`
        INSERT INTO user_dashboard_layouts (id, user_id, widgets, is_active)
        VALUES (?, ?, ?, 1)
      `).run(randomUUID(), userId, JSON.stringify(widgets));

      return { success: true };
    } catch (error: any) {
      if (error.message?.includes('Unauthorized')) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Dashboard] Save layout failed');
    }
  });

  /**
   * DELETE /api/dashboard/layout
   * Reset dashboard to default (remove user layout)
   */
  fastify.delete('/api/dashboard/layout', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);

      db.prepare('DELETE FROM user_dashboard_layouts WHERE user_id = ?').run(userId);

      return { success: true };
    } catch (error: any) {
      if (error.message?.includes('Unauthorized')) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Dashboard] Reset layout failed');
    }
  });

  // ── Widget Data Endpoints ──

  /**
   * GET /api/dashboard/widgets/quick-stats
   * Quick stats widget: Tasks, Agents, Workflows count
   */
  fastify.get('/api/dashboard/widgets/quick-stats', async (request, reply) => {
    // Helper to safely get count from a table
    const safeCount = (query: string, params?: any): number => {
      try {
        const result = params
          ? db.prepare(query).get(params) as { count: number }
          : db.prepare(query).get() as { count: number };
        return result?.count || 0;
      } catch (err) {
        // Table might not exist yet
        return 0;
      }
    };

    const tasksCount = safeCount('SELECT COUNT(*) as count FROM tasks');
    const agentsCount = safeCount('SELECT COUNT(*) as count FROM agents_config');
    const workflowsCount = safeCount('SELECT COUNT(*) as count FROM workflows');
    const activeWorkflows = safeCount('SELECT COUNT(*) as count FROM workflow_executions WHERE status = ?', 'running');

    return {
      stats: [
        { label: 'Total Tasks', value: tasksCount, icon: 'list-todo', color: 'blue' },
        { label: 'Active Agents', value: agentsCount, icon: 'bot', color: 'green' },
        { label: 'Workflows', value: workflowsCount, icon: 'workflow', color: 'purple' },
        { label: 'Running', value: activeWorkflows, icon: 'play-circle', color: 'orange' },
      ],
    };
  });

  /**
   * GET /api/dashboard/widgets/task-overview
   * Task breakdown by status (pie chart)
   */
  fastify.get('/api/dashboard/widgets/task-overview', async (request, reply) => {
    const statuses = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM tasks
      GROUP BY status
    `).all() as Array<{ status: string; count: number }>;

    return {
      chart: {
        type: 'pie',
        data: statuses.map(s => ({ label: s.status, value: s.count })),
      },
    };
  });

  /**
   * GET /api/dashboard/widgets/agent-performance
   * Agent activity chart (bar chart)
   */
  fastify.get('/api/dashboard/widgets/agent-performance', async (request, reply) => {
    const agents = db.prepare(`
      SELECT ac.name, COUNT(aa.id) as activity_count
      FROM agents_config ac
      LEFT JOIN agent_activity aa ON aa.agent_id = ac.id
      GROUP BY ac.id, ac.name
      ORDER BY activity_count DESC
      LIMIT 10
    `).all() as Array<{ name: string; activity_count: number }>;

    return {
      chart: {
        type: 'bar',
        data: agents.map(a => ({ label: a.name, value: a.activity_count })),
      },
    };
  });

  /**
   * GET /api/dashboard/widgets/storage-usage
   * Storage breakdown by zone (pie chart)
   */
  fastify.get('/api/dashboard/widgets/storage-usage', async (request, reply) => {
    const zones = db.prepare(`
      SELECT zone, SUM(size) as total_size
      FROM storage_files
      GROUP BY zone
    `).all() as Array<{ zone: string; total_size: number }>;

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
      return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
    };

    return {
      chart: {
        type: 'pie',
        data: zones.map(z => ({
          label: `${z.zone} (${formatSize(z.total_size)})`,
          value: z.total_size,
        })),
      },
    };
  });

  /**
   * GET /api/dashboard/widgets/recent-activity
   * Latest 10 system actions (list)
   */
  fastify.get('/api/dashboard/widgets/recent-activity', async (request, reply) => {
    const activities = db.prepare(`
      SELECT
        id,
        agent_id,
        action_type,
        summary,
        created_at
      FROM agent_activity
      ORDER BY created_at DESC
      LIMIT 10
    `).all() as Array<{
      id: string;
      agent_id: string;
      action_type: string;
      summary: string;
      created_at: string;
    }>;

    return {
      items: activities.map(a => ({
        id: a.id,
        title: a.action_type,
        description: a.summary || '',
        timestamp: a.created_at,
        icon: 'activity',
      })),
    };
  });

  /**
   * GET /api/dashboard/widgets/workflow-status
   * Active workflows (list)
   */
  fastify.get('/api/dashboard/widgets/workflow-status', async (request, reply) => {
    const workflows = db.prepare(`
      SELECT
        we.id,
        w.name,
        we.status,
        we.started_at,
        we.completed_at
      FROM workflow_executions we
      JOIN workflows w ON w.id = we.workflow_id
      WHERE we.status = 'running'
      ORDER BY we.started_at DESC
      LIMIT 10
    `).all() as Array<{
      id: string;
      name: string;
      status: string;
      started_at: string;
      completed_at: string | null;
    }>;

    return {
      items: workflows.map(w => ({
        id: w.id,
        title: w.name,
        status: w.status,
        timestamp: w.started_at,
        icon: 'workflow',
      })),
    };
  });

  /**
   * GET /api/dashboard/widgets/notifications
   * Recent 5 notifications (list)
   */
  fastify.get('/api/dashboard/widgets/notifications', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);

      const notifications = db.prepare(`
        SELECT id, type, title, message, created_at, is_read
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `).all(userId) as Array<{
        id: string;
        type: string;
        title: string;
        message: string;
        created_at: string;
        is_read: number;
      }>;

      return {
        items: notifications.map(n => ({
          id: n.id,
          title: n.title,
          description: n.message,
          timestamp: n.created_at,
          icon: 'bell',
          isRead: Boolean(n.is_read),
        })),
      };
    } catch (error: any) {
      if (error.message?.includes('Unauthorized')) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Dashboard] Get notifications failed');
    }
  });

  /**
   * GET /api/dashboard/widgets/calendar-events
   * Upcoming calendar events (calendar widget)
   */
  fastify.get('/api/dashboard/widgets/calendar-events', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);

      // Get upcoming events (next 7 days)
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const events = db.prepare(`
        SELECT
          e.id,
          e.title,
          e.start_time,
          e.end_time,
          e.is_all_day,
          e.location,
          e.event_type,
          s.name as calendar_name,
          s.color as calendar_color
        FROM calendar_events e
        LEFT JOIN calendar_sources s ON s.id = e.calendar_source_id
        WHERE e.user_id = ?
          AND e.start_time >= ?
          AND e.start_time <= ?
          AND e.status != 'cancelled'
        ORDER BY e.start_time ASC
        LIMIT 10
      `).all(userId, now.toISOString(), weekLater.toISOString());

      return {
        events: events.map((e: any) => ({
          id: e.id,
          title: e.title,
          start: e.start_time,
          end: e.end_time,
          allDay: Boolean(e.is_all_day),
          location: e.location,
          type: e.event_type,
          calendar: e.calendar_name,
          color: e.calendar_color,
        })),
      };
    } catch (error: any) {
      if (error.message?.includes('Unauthorized')) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      // Return empty array if calendar tables don't exist yet (graceful degradation)
      return { events: [] };
    }
  });

  /**
   * GET /api/dashboard/widgets/team-members
   * Active team members (table)
   */
  fastify.get('/api/dashboard/widgets/team-members', async (request, reply) => {
    const members = db.prepare(`
      SELECT id, name, email, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `).all() as Array<{
      id: string;
      name: string;
      email: string;
      created_at: string;
    }>;

    return {
      columns: ['Name', 'Email', 'Joined'],
      rows: members.map(m => [m.name, m.email, m.created_at.split('T')[0]]),
    };
  });

  /**
   * GET /api/dashboard/widgets/ai-usage
   * AI API usage stats (stats widget)
   */
  fastify.get('/api/dashboard/widgets/ai-usage', async (request, reply) => {
    // TODO: Implement AI usage tracking when implemented
    return {
      stats: [
        { label: 'API Calls Today', value: 0, icon: 'cpu', color: 'blue' },
        { label: 'Tokens Used', value: 0, icon: 'zap', color: 'yellow' },
      ],
    };
  });
}
