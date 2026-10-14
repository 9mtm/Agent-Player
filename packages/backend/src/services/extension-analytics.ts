/**
 * Extension Analytics Service
 * Tracks extension usage, performance, and errors
 *
 * B2.2c: extension_usage_stats, extension_configs and audit_logs are read and
 * written on the process driver (SQL steps). A call is counted with one
 * upsert on (extension_id, date), so concurrent calls (and several
 * processes) never lose a count; it is fire-and-forget and, on PostgreSQL,
 * runs outside any open transaction of the caller. Storage sizes still come
 * from the storage manager.
 */

import type { Dialect } from '../db/pg/dialect.js';
import { nowTs } from '../db/pg/dialect.js';
import { outsidePgTransaction } from '../db/pg/pool.js';
import { all, dialect, one, run, sql, type Step } from '../repositories/sql-steps.js';
import { getStorageManager } from './storage-manager.js';

export interface ExtensionAnalytics {
  extensionId: string;
  today: DailyStats;
  last7Days: DailyStats;
  last30Days: DailyStats;
  allTime: DailyStats;
  dailyBreakdown: DailyStats[];
  storageUsage: StorageStats;
  topErrors: ErrorStat[];
}

export interface DailyStats {
  apiCalls: number;
  errorCount: number;
  errorRate: number; // percentage
  avgResponseTime?: number;
}

export interface StorageStats {
  fileCount: number;
  totalBytes: number;
  totalMB: number;
}

export interface ErrorStat {
  errorType: string;
  count: number;
  lastOccurred: string;
}

function* recordApiCallStep(extensionId: string, failed: number, today: string): Step<void> {
  const d = yield* dialect();
  // Get or create today's stats in one statement (no lost count under concurrency).
  yield* run(`
    INSERT INTO extension_usage_stats (extension_id, date, api_calls, error_count)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(extension_id, date) DO UPDATE SET
      api_calls = COALESCE(extension_usage_stats.api_calls, 0) + 1,
      error_count = COALESCE(extension_usage_stats.error_count, 0) + excluded.error_count,
      updated_at = ${updatedAtNow(d)}
  `, extensionId, today, failed);
}

/** updated_at = now: CURRENT_TIMESTAMP (on SQLite the same 'YYYY-MM-DD HH:MM:SS' text as before; timestamptz on PostgreSQL). */
function updatedAtNow(d: Dialect): string {
  return nowTs(d);
}

/**
 * Record an API call for analytics tracking (fire-and-forget; never throws).
 * SQLite: written by the time this returns, as before.
 */
export function recordApiCall(
  extensionId: string,
  options?: {
    success?: boolean;
    responseTimeMs?: number;
    errorType?: string;
  }
): void {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const failed = options?.success === false ? 1 : 0;
    outsidePgTransaction(() => sql().read(recordApiCallStep(extensionId, failed, today)))
      .catch((error) => console.error('[ExtensionAnalytics] Failed to record API call:', error?.code ?? 'error'));
  } catch (error) {
    console.error('[ExtensionAnalytics] Failed to record API call:', error);
    // Don't throw - analytics should never break the main operation
  }
}

/**
 * Get analytics for a specific extension
 */
export function getExtensionAnalytics(extensionId: string): Promise<ExtensionAnalytics> {
  return sql().read(extensionAnalyticsStep(extensionId));
}

function* extensionAnalyticsStep(extensionId: string): Step<ExtensionAnalytics> {
  // Get stats for different time periods
  const today = yield* getStatsForPeriod(extensionId, 0, 0);
  const last7Days = yield* getStatsForPeriod(extensionId, 6, 0);
  const last30Days = yield* getStatsForPeriod(extensionId, 29, 0);
  const allTime = yield* getStatsForPeriod(extensionId, 365 * 10, 0); // ~10 years

  // Get daily breakdown for charts (last 30 days)
  const dailyBreakdown = yield* getDailyBreakdown(extensionId, 30);

  // Get storage usage
  const storageUsage = getStorageUsage(extensionId);

  // Get top errors from audit logs
  const topErrors = yield* getTopErrors(extensionId, 30);

  return {
    extensionId,
    today,
    last7Days,
    last30Days,
    allTime,
    dailyBreakdown,
    storageUsage,
    topErrors,
  };
}

/**
 * Get overview analytics for all extensions
 */
export function getOverviewAnalytics(): Promise<OverviewAnalytics> {
  return sql().read(overviewStep());
}

export interface OverviewAnalytics {
  totalExtensions: number;
  enabledExtensions: number;
  totalApiCalls: number;
  totalErrors: number;
  totalStorageMB: number;
  extensionStats: Array<{
    extensionId: string;
    name: string;
    enabled: boolean;
    apiCalls: number;
    errorRate: number;
    storageMB: number;
  }>;
}

function* overviewStep(): Step<OverviewAnalytics> {
  // Get all extensions
  const extensions = yield* all<{ extension_id: string; enabled: number }>(`
      SELECT ec.extension_id, ec.enabled
      FROM extension_configs ec
      ORDER BY ec.extension_id
    `);

  const totalExtensions = extensions.length;
  const enabledExtensions = extensions.filter((e) => e.enabled === 1).length;

  // Get extension stats
  const extensionStats: OverviewAnalytics['extensionStats'] = [];
  for (const ext of extensions) {
    const stats = yield* getStatsForPeriod(ext.extension_id, 29, 0); // Last 30 days
    const storage = getStorageUsage(ext.extension_id);

    extensionStats.push({
      extensionId: ext.extension_id,
      name: ext.extension_id, // TODO: get from manifest
      enabled: ext.enabled === 1,
      apiCalls: stats.apiCalls,
      errorRate: stats.errorRate,
      storageMB: storage.totalMB,
    });
  }

  const totalApiCalls = extensionStats.reduce((sum, e) => sum + e.apiCalls, 0);
  const totalErrors = extensionStats.reduce(
    (sum, e) => sum + Math.round((e.apiCalls * e.errorRate) / 100),
    0
  );
  const totalStorageMB = extensionStats.reduce((sum, e) => sum + e.storageMB, 0);

  return {
    totalExtensions,
    enabledExtensions,
    totalApiCalls,
    totalErrors,
    totalStorageMB,
    extensionStats,
  };
}

/**
 * Get stats for a specific time period
 * @param daysAgo How many days back to start
 * @param daysEnd How many days back to end (0 = today)
 */
function* getStatsForPeriod(extensionId: string, daysAgo: number, daysEnd: number): Step<DailyStats> {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - daysEnd);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);

  const result = (yield* one<any>(`
      SELECT
        COALESCE(SUM(api_calls), 0) as total_calls,
        COALESCE(SUM(error_count), 0) as total_errors
      FROM extension_usage_stats
      WHERE extension_id = ?
        AND date >= ?
        AND date <= ?
    `, extensionId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]))!;

  // PostgreSQL SUM(bigint) is numeric (a string): numbers, as SQLite gives.
  const apiCalls = Number(result.total_calls || 0);
  const errorCount = Number(result.total_errors || 0);
  const errorRate = apiCalls > 0 ? (errorCount / apiCalls) * 100 : 0;

  return {
    apiCalls,
    errorCount,
    errorRate: Math.round(errorRate * 100) / 100, // 2 decimal places
  };
}

/**
 * Get daily breakdown for charts
 */
function* getDailyBreakdown(extensionId: string, days: number): Step<DailyStats[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const rows = yield* all<{
    date: string;
    api_calls: number;
    error_count: number;
  }>(`
      SELECT date, api_calls, error_count
      FROM extension_usage_stats
      WHERE extension_id = ?
        AND date >= ?
      ORDER BY date ASC
    `, extensionId, startDate.toISOString().split('T')[0]);

  return rows.map((row) => ({
    apiCalls: row.api_calls,
    errorCount: row.error_count,
    errorRate: row.api_calls > 0 ? (row.error_count / row.api_calls) * 100 : 0,
  }));
}

/**
 * Get storage usage for an extension
 */
function getStorageUsage(extensionId: string): StorageStats {
  const storageManager = getStorageManager();

  const files = storageManager.search({
    zone: 'cdn',
    category: `extensions/${extensionId}`,
    limit: 10000,
  });

  const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);

  return {
    fileCount: files.length,
    totalBytes,
    totalMB: Math.round((totalBytes / 1024 / 1024) * 100) / 100, // 2 decimal places
  };
}

/**
 * Get top errors from audit logs
 */
function* getTopErrors(extensionId: string, days: number): Step<ErrorStat[]> {
  const d = yield* dialect();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const rows = yield* all<{
    error_message: string;
    count: number;
    last_occurred: string;
  }>(`
      SELECT
        error_message,
        COUNT(*) as count,
        MAX(created_at) as last_occurred
      FROM audit_logs
      WHERE resource_id = ?
        AND event_category = 'extension'
        AND success = 0
        AND created_at >= ${d === 'postgres' ? '(?)::timestamptz' : '?'}
        AND error_message IS NOT NULL
      GROUP BY error_message
      ORDER BY count DESC, error_message
      LIMIT 10
    `, extensionId, startDate.toISOString());

  return rows.map((row) => ({
    errorType: row.error_message,
    count: row.count,
    lastOccurred: row.last_occurred,
  }));
}

/**
 * Update storage bytes for all extensions (run via scheduler)
 */
export async function updateAllExtensionStorageStats(): Promise<void> {
  const runner = sql();
  const extensions = await runner.read(all<{ extension_id: string }>('SELECT DISTINCT extension_id FROM extension_configs'));

  for (const { extension_id } of extensions) {
    try {
      const storage = getStorageUsage(extension_id);
      const today = new Date().toISOString().split('T')[0];

      // Update or insert
      await runner.read((function* () {
        const d = yield* dialect();
        yield* run(`
          INSERT INTO extension_usage_stats (extension_id, date, storage_files, storage_bytes)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(extension_id, date) DO UPDATE SET
            storage_files = excluded.storage_files,
            storage_bytes = excluded.storage_bytes,
            updated_at = ${updatedAtNow(d)}
        `, extension_id, today, storage.fileCount, storage.totalBytes);
      })());
    } catch (error) {
      console.error(`[ExtensionAnalytics] Failed to update storage for ${extension_id}:`, error);
    }
  }

  console.log('[ExtensionAnalytics] ✅ Updated storage stats for all extensions');
}
