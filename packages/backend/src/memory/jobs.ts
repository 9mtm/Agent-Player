/**
 * Scheduled memory jobs (CORE-05/07), run in-process by the cron engine
 * ('memory-job' action; never an HTTP call). Each job is for ONE owner
 * account (owner-scoped) and local only.
 *
 *   weekly-summary  "what I learned this week" (memory/weekly-summary.ts)
 *   retention       task TTL + experience consolidation (memory/retention.ts);
 *                   does nothing until the owner turns retention on
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/index.js';
import { runWeeklySummary } from './weekly-summary.js';
import { runRetention } from './retention.js';
import { logAudit } from '../services/audit-logger.js';

export const MEMORY_JOB_ACTION = 'memory-job';
export const WEEKLY_SUMMARY_CRON = '0 8 * * 1'; // Mondays 08:00
export const RETENTION_CRON = '0 4 * * *'; // daily 04:00 (no-op while retention is off)
export type MemoryJobName = 'weekly-summary' | 'retention';
const JOBS: ReadonlySet<string> = new Set(['weekly-summary', 'retention']);
const SCHEDULE: ReadonlyArray<[MemoryJobName, string, string]> = [
  ['weekly-summary', WEEKLY_SUMMARY_CRON, 'Weekly memory summary (what I learned this week)'],
  ['retention', RETENTION_CRON, 'Memory retention rules (task TTL, experience consolidation); only when turned on'],
];

function isOwner(userId: unknown): userId is string {
  if (typeof userId !== 'string' || !userId) return false;
  const row = getDatabase().prepare(`SELECT role, status FROM users WHERE id = ?`).get(userId) as { role: string; status: string } | undefined;
  return !!row && row.role === 'owner' && (row.status ?? 'active') === 'active';
}

/** Run one memory job (called by the cron engine). */
export async function runMemoryJob(action: { job?: unknown; userId?: unknown }): Promise<unknown> {
  const job = action?.job;
  if (typeof job !== 'string' || !JOBS.has(job)) throw new Error('Unknown memory job');
  if (!isOwner(action.userId)) throw new Error('Memory jobs run only for an active owner account');
  const userId = action.userId as string;
  if (job === 'weekly-summary') {
    const rec = await runWeeklySummary(userId, { actor: 'scheduler' });
    return { summaryId: rec.id, totals: rec.digest.totals };
  }
  if (job === 'retention') {
    const res = await runRetention(userId, { requireEnabled: true, actor: 'retention' });
    if (!res.skipped) {
      logAudit({
        event_type: 'data.delete', event_category: 'data_modification', severity: 'info', user_id: userId,
        resource_type: 'memory_retention', resource_id: res.id, action: 'memory_retention.run', success: true,
        metadata: { scheduled: true, forgotten: res.forgotten, actions: res.actions.length },
      });
    }
    return { runId: res.id, skipped: res.skipped ?? null, forgotten: res.forgotten, actions: res.actions.length };
  }
  throw new Error('Unknown memory job');
}

export function memoryJobName(job: MemoryJobName, userId: string): string {
  return `memory-${job}-${userId}`;
}

/**
 * Make sure every active owner account has its weekly summary job (idempotent).
 * Returns the jobs created. The cron engine loads them from cron_jobs.
 */
export function ensureMemoryJobs(): Array<{ id: string; name: string; cronExpression: string; actionData: Record<string, unknown> }> {
  const db = getDatabase();
  const owners = db.prepare(`SELECT id FROM users WHERE role = 'owner' AND COALESCE(status, 'active') = 'active'`).all() as Array<{ id: string }>;
  const created: Array<{ id: string; name: string; cronExpression: string; actionData: Record<string, unknown> }> = [];
  for (const { id: userId } of owners) {
    for (const [job, cronExpression, description] of SCHEDULE) {
      const name = memoryJobName(job, userId);
      if (db.prepare('SELECT 1 FROM cron_jobs WHERE name = ?').get(name)) continue;
      const id = uuidv4();
      const actionData = { job, userId };
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO cron_jobs (id, name, description, cron_expression, action_type, action_data, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(id, name, description, cronExpression, MEMORY_JOB_ACTION, JSON.stringify(actionData), now, now);
      created.push({ id, name, cronExpression, actionData });
    }
  }
  return created;
}
