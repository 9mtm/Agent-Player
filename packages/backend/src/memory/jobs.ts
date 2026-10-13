/**
 * Scheduled memory jobs (CORE-05/07), run in-process by the cron engine
 * ('memory-job' action; never an HTTP call). Each job is for ONE owner
 * account (owner-scoped) and local only.
 *
 *   weekly-summary  "what I learned this week" (memory/weekly-summary.ts)
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/index.js';
import { runWeeklySummary } from './weekly-summary.js';

export const MEMORY_JOB_ACTION = 'memory-job';
export const WEEKLY_SUMMARY_CRON = '0 8 * * 1'; // Mondays 08:00
export type MemoryJobName = 'weekly-summary';
const JOBS: ReadonlySet<string> = new Set(['weekly-summary']);

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
    const name = memoryJobName('weekly-summary', userId);
    if (db.prepare('SELECT 1 FROM cron_jobs WHERE name = ?').get(name)) continue;
    const id = uuidv4();
    const actionData = { job: 'weekly-summary', userId };
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO cron_jobs (id, name, description, cron_expression, action_type, action_data, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, name, 'Weekly memory summary (what I learned this week)', WEEKLY_SUMMARY_CRON, MEMORY_JOB_ACTION, JSON.stringify(actionData), now, now);
    created.push({ id, name, cronExpression: WEEKLY_SUMMARY_CRON, actionData });
  }
  return created;
}
