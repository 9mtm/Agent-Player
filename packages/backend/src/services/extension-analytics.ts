/**
 * Extension Analytics Service
 * Tracks extension usage, performance, and errors
 */

import { getDatabase } from '../db/index.js';
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

/**
 * Record an API call for analytics tracking
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
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Get or create today's stats
    const existing = db
      .prepare('SELECT * FROM extension_usage_stats WHERE extension_id = ? AND date = ?')
      .get(extensionId, today) as any;

    if (existing) {
      // Update existing stats
      const newApiCalls = existing.api_calls + 1;
      const newErrorCount = options?.success === false ? existing.error_count + 1 : existing.error_count;

      db.prepare(`
        UPDATE extension_usage_stats
        SET
          api_calls = ?,
          error_count = ?,
          updated_at = datetime('now')
        WHERE extension_id = ? AND date = ?
      `).run(newApiCalls, newErrorCount, extensionId, today);
    } else {
      // Create new stats
      db.prepare(`
        INSERT INTO extension_usage_stats (extension_id, date, api_calls, error_count)
        VALUES (?, ?, ?, ?)
      `).run(extensionId, today, 1, options?.success === false ? 1 : 0);
    }
  } catch (error) {
    console.error('[ExtensionAnalytics] Failed to record API call:', error);
    // Don't throw - analytics should never break the main operation
  }
}

/**
 * Get analytics for a specific extension
 */
export function getExtensionAnalytics(extensionId: string): ExtensionAnalytics {
  const db = getDatabase();

  // Get stats for different time periods
  const today = getStatsForPeriod(extensionId, 0, 0);
  const last7Days = getStatsForPeriod(extensionId, 6, 0);
  const last30Days = getStatsForPeriod(extensionId, 29, 0);
  const allTime = getStatsForPeriod(extensionId, 365 * 10, 0); // ~10 years

  // Get daily breakdown for charts (last 30 days)
  const dailyBreakdown = getDailyBreakdown(extensionId, 30);

  // Get storage usage
  const storageUsage = getStorageUsage(extensionId);

  // Get top errors from audit logs
  const topErrors = getTopErrors(extensionId, 30);

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
export function getOverviewAnalytics(): {
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
} {
  const db = getDatabase();

  // Get all extensions
  const extensions = db
    .prepare(`
      SELECT ec.extension_id, ec.enabled
      FROM extension_configs ec
      ORDER BY ec.extension_id
    `)
    .all() as Array<{ extension_id: string; enabled: number }>;

  const totalExtensions = extensions.length;
  const enabledExtensions = extensions.filter((e) => e.enabled === 1).length;

  // Get extension stats
  const extensionStats = extensions.map((ext) => {
    const stats = getStatsForPeriod(ext.extension_id, 29, 0); // Last 30 days
    const storage = getStorageUsage(ext.extension_id);

    return {
      extensionId: ext.extension_id,
      name: ext.extension_id, // TODO: get from manifest
      enabled: ext.enabled === 1,
      apiCalls: stats.apiCalls,
      errorRate: stats.errorRate,
      storageMB: storage.totalMB,
    };
  });

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
function getStatsForPeriod(extensionId: string, daysAgo: number, daysEnd: number): DailyStats {
  const db = getDatabase();

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - daysEnd);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);

  const result = db
    .prepare(`
      SELECT
        COALESCE(SUM(api_calls), 0) as total_calls,
        COALESCE(SUM(error_count), 0) as total_errors
      FROM extension_usage_stats
      WHERE extension_id = ?
        AND date >= ?
        AND date <= ?
    `)
    .get(extensionId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]) as any;

  const apiCalls = result.total_calls || 0;
  const errorCount = result.total_errors || 0;
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
function getDailyBreakdown(extensionId: string, days: number): DailyStats[] {
  const db = getDatabase();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const rows = db
    .prepare(`
      SELECT date, api_calls, error_count
      FROM extension_usage_stats
      WHERE extension_id = ?
        AND date >= ?
      ORDER BY date ASC
    `)
    .all(extensionId, startDate.toISOString().split('T')[0]) as Array<{
    date: string;
    api_calls: number;
    error_count: number;
  }>;

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
function getTopErrors(extensionId: string, days: number): ErrorStat[] {
  const db = getDatabase();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const rows = db
    .prepare(`
      SELECT
        error_message,
        COUNT(*) as count,
        MAX(created_at) as last_occurred
      FROM audit_logs
      WHERE resource_id = ?
        AND event_category = 'extension'
        AND success = 0
        AND created_at >= ?
        AND error_message IS NOT NULL
      GROUP BY error_message
      ORDER BY count DESC
      LIMIT 10
    `)
    .all(extensionId, startDate.toISOString()) as Array<{
    error_message: string;
    count: number;
    last_occurred: string;
  }>;

  return rows.map((row) => ({
    errorType: row.error_message,
    count: row.count,
    lastOccurred: row.last_occurred,
  }));
}

/**
 * Update storage bytes for all extensions (run via scheduler)
 */
export function updateAllExtensionStorageStats(): void {
  const db = getDatabase();

  const extensions = db
    .prepare('SELECT DISTINCT extension_id FROM extension_configs')
    .all() as Array<{ extension_id: string }>;

  for (const { extension_id } of extensions) {
    try {
      const storage = getStorageUsage(extension_id);
      const today = new Date().toISOString().split('T')[0];

      // Update or insert
      db.prepare(`
        INSERT INTO extension_usage_stats (extension_id, date, storage_files, storage_bytes)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(extension_id, date) DO UPDATE SET
          storage_files = excluded.storage_files,
          storage_bytes = excluded.storage_bytes,
          updated_at = datetime('now')
      `).run(extension_id, today, storage.fileCount, storage.totalBytes);
    } catch (error) {
      console.error(`[ExtensionAnalytics] Failed to update storage for ${extension_id}:`, error);
    }
  }

  console.log('[ExtensionAnalytics] ✅ Updated storage stats for all extensions');
}
