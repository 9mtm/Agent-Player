/**
 * Activity Logger Service
 *
 * Logs agent tool calls and task lifecycle events to the agent_activity table.
 * Used by chat-claude.ts (agentic loop) and agent-cron.ts (scheduled tasks).
 */

import { getDatabase } from '../db/index.js';

export type ActivityActionType =
  | 'task_started'
  | 'tool_called'
  | 'task_completed'
  | 'task_failed';

export interface ActivityEntry {
  agentId?: string;
  taskId?: string;
  sessionId?: string;
  actionType: ActivityActionType;
  toolName?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(entry: ActivityEntry): Promise<void> {
  try {
    const db = getDatabase();
    const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    db.prepare(`
      INSERT INTO agent_activity (id, agent_id, task_id, session_id, action_type, tool_name, summary, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      entry.agentId ?? null,
      entry.taskId ?? null,
      entry.sessionId ?? null,
      entry.actionType,
      entry.toolName ?? null,
      entry.summary ?? null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    );
  } catch (err) {
    // Never crash the caller — activity logging is best-effort
    console.warn('[ActivityLogger] Failed to log activity:', (err as Error).message);
  }
}

export interface ActivityQueryOptions {
  agentId?: string;
  taskId?: string;
  limit?: number;
  offset?: number;
}

export function getActivityLog(options: ActivityQueryOptions = {}) {
  const db = getDatabase();
  const { agentId, taskId, limit = 50, offset = 0 } = options;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (agentId) {
    conditions.push('agent_id = ?');
    params.push(agentId);
  }
  if (taskId) {
    conditions.push('task_id = ?');
    params.push(taskId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit, offset);

  return db.prepare(`
    SELECT * FROM agent_activity
    ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params);
}
