/**
 * Cost Tracker - Monitor and analyze cost savings from Model Router
 *
 * Tracks:
 * - Which models are being used
 * - Estimated cost savings
 * - Usage patterns over time
 */

import { getDatabase } from '../db/index.js';
import type { ModelTier, TaskComplexity } from './model-router.js';

export interface CostEntry {
  id?: number;
  user_id: string;
  session_id: string;
  timestamp: number;
  model_used: ModelTier;
  task_complexity: TaskComplexity;
  message_length: number;
  tools_used: string;
  estimated_savings_percent: number;
  created_at?: string;
}

export interface CostStats {
  totalRequests: number;
  modelBreakdown: {
    haiku: number;
    sonnet: number;
    opus: number;
  };
  averageSavings: number;
  totalEstimatedSavings: number;
  complexityBreakdown: {
    simple: number;
    medium: number;
    complex: number;
  };
}

export class CostTracker {
  /**
   * Log a model usage event
   */
  static async logUsage(entry: CostEntry): Promise<void> {
    const db = getDatabase();

    try {
      db.prepare(
        `INSERT INTO cost_analytics (
          user_id,
          session_id,
          timestamp,
          model_used,
          task_complexity,
          message_length,
          tools_used,
          estimated_savings_percent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        entry.user_id,
        entry.session_id,
        entry.timestamp,
        entry.model_used,
        entry.task_complexity,
        entry.message_length,
        entry.tools_used,
        entry.estimated_savings_percent
      );

      console.log(
        `[CostTracker] 💰 Logged ${entry.model_used} usage (${entry.estimated_savings_percent}% savings)`
      );
    } catch (error: any) {
      console.error('[CostTracker] Failed to log usage:', error.message);
    }
  }

  /**
   * Get cost statistics for a user
   */
  static async getStats(
    userId: string,
    daysBack: number = 30
  ): Promise<CostStats> {
    const db = getDatabase();
    const timestampLimit = Date.now() - daysBack * 24 * 60 * 60 * 1000;

    try {
      // Get all entries for user in time range
      const entries = db
        .prepare(
          `SELECT * FROM cost_analytics
           WHERE user_id = ? AND timestamp >= ?
           ORDER BY timestamp DESC`
        )
        .all(userId, timestampLimit) as CostEntry[];

      if (entries.length === 0) {
        return this.getEmptyStats();
      }

      // Calculate stats
      const totalRequests = entries.length;

      const modelBreakdown = {
        haiku: entries.filter((e) => e.model_used === 'haiku').length,
        sonnet: entries.filter((e) => e.model_used === 'sonnet').length,
        opus: entries.filter((e) => e.model_used === 'opus').length,
      };

      const complexityBreakdown = {
        simple: entries.filter((e) => e.task_complexity === 'simple').length,
        medium: entries.filter((e) => e.task_complexity === 'medium').length,
        complex: entries.filter((e) => e.task_complexity === 'complex').length,
      };

      const totalSavings = entries.reduce(
        (sum, e) => sum + e.estimated_savings_percent,
        0
      );
      const averageSavings = totalSavings / totalRequests;

      return {
        totalRequests,
        modelBreakdown,
        averageSavings: Math.round(averageSavings),
        totalEstimatedSavings: Math.round(totalSavings),
        complexityBreakdown,
      };
    } catch (error: any) {
      console.error('[CostTracker] Failed to get stats:', error.message);
      return this.getEmptyStats();
    }
  }

  /**
   * Get recent cost entries for debugging
   */
  static async getRecentEntries(
    userId: string,
    limit: number = 50
  ): Promise<CostEntry[]> {
    const db = getDatabase();

    try {
      return db
        .prepare(
          `SELECT * FROM cost_analytics
           WHERE user_id = ?
           ORDER BY timestamp DESC
           LIMIT ?`
        )
        .all(userId, limit) as CostEntry[];
    } catch (error: any) {
      console.error('[CostTracker] Failed to get entries:', error.message);
      return [];
    }
  }

  /**
   * Clean up old entries (keep last 90 days)
   */
  static async cleanup(daysToKeep: number = 90): Promise<number> {
    const db = getDatabase();
    const timestampLimit = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    try {
      const result = db
        .prepare('DELETE FROM cost_analytics WHERE timestamp < ?')
        .run(timestampLimit);

      console.log(
        `[CostTracker] 🧹 Cleaned up ${result.changes} old entries`
      );
      return result.changes;
    } catch (error: any) {
      console.error('[CostTracker] Failed to cleanup:', error.message);
      return 0;
    }
  }

  private static getEmptyStats(): CostStats {
    return {
      totalRequests: 0,
      modelBreakdown: { haiku: 0, sonnet: 0, opus: 0 },
      averageSavings: 0,
      totalEstimatedSavings: 0,
      complexityBreakdown: { simple: 0, medium: 0, complex: 0 },
    };
  }
}
