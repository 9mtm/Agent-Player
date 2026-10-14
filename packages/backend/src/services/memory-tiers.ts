/**
 * Multi-Tier Memory System
 *
 * Three-tier architecture based on research: https://arxiv.org/abs/2512.13564
 *
 * 1. Working Memory (temporary):
 *    - Current conversation context only
 *    - Auto-expires after session ends
 *    - Fast access (prioritized in search)
 *
 * 2. Experiential Memory (medium-term):
 *    - Learned patterns from interactions
 *    - Success/failure records
 *    - Consolidates from working memory nightly
 *    - TTL: 30-90 days
 *
 * 3. Factual Memory (long-term):
 *    - Verified knowledge and skills
 *    - User preferences and facts
 *    - Permanent storage
 *    - Current `.data/memory/` system
 */

import { all, run, sql } from '../repositories/sql-steps.js';

export type MemoryLayer = 'working' | 'experiential' | 'factual';
export type ConsolidationStatus = 'pending' | 'consolidated' | 'promoted';

export interface MemoryTierStats {
  layer: MemoryLayer;
  count: number;
  avgImportance: number;
  oldestTimestamp: number;
  newestTimestamp: number;
}

export interface ConsolidationResult {
  consolidated: number;
  promoted: number;
  expired: number;
  durationMs: number;
}

export class MemoryTiersService {
  /**
   * Get statistics for all memory layers
   */
  static async getLayerStats(userId: string): Promise<MemoryTierStats[]> {
    const stats = await sql().read(all(`
      SELECT
        memory_layer as layer,
        COUNT(*) as count,
        AVG(importance_score) as "avgImportance",
        MIN(created_at) as "oldestTimestamp",
        MAX(created_at) as "newestTimestamp"
      FROM memories
      WHERE user_id = ?
      GROUP BY memory_layer
      ORDER BY memory_layer
    `, userId));

    return stats.map(s => ({
      layer: s.layer,
      count: s.count,
      avgImportance: Math.round(s.avgImportance * 100) / 100,
      oldestTimestamp: s.oldestTimestamp,
      newestTimestamp: s.newestTimestamp,
    }));
  }

  /**
   * Promote working memory → experiential
   * Criteria: high importance score, accessed multiple times
   */
  static async promoteToExperiential(userId: string, memoryId: string): Promise<boolean> {
    try {
      const result = await sql().read(run(`
        UPDATE memories
        SET
          memory_layer = 'experiential',
          consolidation_status = 'promoted',
          expiry_timestamp = ?
        WHERE id = ? AND user_id = ? AND memory_layer = 'working'
      `, Date.now() + (90 * 24 * 60 * 60 * 1000), // 90 days TTL
        memoryId,
        userId
      ));

      return result.changes > 0;
    } catch (error: any) {
      console.error('[MemoryTiers] Failed to promote to experiential:', error.message);
      return false;
    }
  }

  /**
   * Promote experiential memory → factual
   * Criteria: very high importance, accessed frequently, verified
   */
  static async promoteToFactual(userId: string, memoryId: string): Promise<boolean> {
    try {
      const result = await sql().read(run(`
        UPDATE memories
        SET
          memory_layer = 'factual',
          consolidation_status = 'promoted',
          expiry_timestamp = NULL
        WHERE id = ? AND user_id = ? AND memory_layer = 'experiential'
      `, memoryId, userId));

      return result.changes > 0;
    } catch (error: any) {
      console.error('[MemoryTiers] Failed to promote to factual:', error.message);
      return false;
    }
  }

  /**
   * Expire old working memory
   * Called automatically on session end or periodically
   */
  static async expireWorkingMemory(): Promise<number> {
    const now = Date.now();

    try {
      const result = await sql().read(run(`
        DELETE FROM memories
        WHERE memory_layer = 'working'
          AND expiry_timestamp IS NOT NULL
          AND expiry_timestamp < ?
          -- CORE-07 forgetting rule 1: owner, project and people drawers are never expired.
          AND COALESCE(drawer_kind, CASE WHEN type IN ('skill', 'insight') THEN 'experience' ELSE 'owner' END) NOT IN ('owner', 'project', 'people')
      `, now));

      if (result.changes > 0) {
        console.log(`[MemoryTiers] Expired ${result.changes} working memories`);
      }

      return result.changes;
    } catch (error: any) {
      console.error('[MemoryTiers] Failed to expire working memory:', error.message);
      return 0;
    }
  }

  /**
   * Expire old experiential memory (older than 90 days)
   */
  static async expireExperientialMemory(): Promise<number> {
    const now = Date.now();

    try {
      const result = await sql().read(run(`
        DELETE FROM memories
        WHERE memory_layer = 'experiential'
          AND expiry_timestamp IS NOT NULL
          AND expiry_timestamp < ?
          AND importance_score < 0.7
          -- CORE-07 forgetting rule 1: owner, project and people drawers are never expired.
          AND COALESCE(drawer_kind, CASE WHEN type IN ('skill', 'insight') THEN 'experience' ELSE 'owner' END) NOT IN ('owner', 'project', 'people')
      `, now));

      if (result.changes > 0) {
        console.log(`[MemoryTiers] Expired ${result.changes} experiential memories`);
      }

      return result.changes;
    } catch (error: any) {
      console.error('[MemoryTiers] Failed to expire experiential memory:', error.message);
      return 0;
    }
  }

  /**
   * Increment access count for a memory
   * Used to track importance and determine promotion
   */
  static async incrementAccessCount(memoryId: string): Promise<void> {
    try {
      await sql().read(run(`
        UPDATE memories
        SET
          access_count = access_count + 1,
          last_accessed_at = ?
        WHERE id = ?
      `, Date.now(), memoryId));
    } catch (error: any) {
      console.error('[MemoryTiers] Failed to increment access count:', error.message);
    }
  }

  /**
   * Update importance score for a memory
   */
  static async updateImportanceScore(memoryId: string, score: number): Promise<boolean> {
    try {
      const result = await sql().read(run(`
        UPDATE memories
        SET importance_score = ?
        WHERE id = ?
      `, Math.max(0, Math.min(1, score)), memoryId));

      return result.changes > 0;
    } catch (error: any) {
      console.error('[MemoryTiers] Failed to update importance score:', error.message);
      return false;
    }
  }

  /**
   * Get candidates for promotion (working → experiential)
   * Criteria: access_count >= 3, importance_score >= 0.6
   */
  static async getPromotionCandidates(userId: string): Promise<any[]> {
    try {
      return await sql().read(all(`
        SELECT id, content, importance_score, access_count
        FROM memories
        WHERE user_id = ?
          AND memory_layer = 'working'
          AND access_count >= 3
          AND importance_score >= 0.6
        ORDER BY importance_score DESC, access_count DESC
        LIMIT 50
      `, userId));
    } catch (error: any) {
      console.error('[MemoryTiers] Failed to get promotion candidates:', error.message);
      return [];
    }
  }

  /**
   * Get consolidation log (recent runs)
   */
  static async getConsolidationLog(limit: number = 10): Promise<any[]> {
    try {
      return await sql().read(all(`
        SELECT *
        FROM memory_consolidation_log
        ORDER BY run_timestamp DESC
        LIMIT ?
      `, limit));
    } catch (error: any) {
      console.error('[MemoryTiers] Failed to get consolidation log:', error.message);
      return [];
    }
  }

  /**
   * Log consolidation run
   */
  static async logConsolidation(result: ConsolidationResult & { status: string; error?: string }): Promise<void> {
    try {
      await sql().read(run(`
        INSERT INTO memory_consolidation_log (
          run_timestamp,
          memories_consolidated,
          memories_promoted,
          memories_expired,
          duration_ms,
          status,
          error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, Date.now(),
        result.consolidated,
        result.promoted,
        result.expired,
        result.durationMs,
        result.status,
        result.error || null
      ));
    } catch (error: any) {
      console.error('[MemoryTiers] Failed to log consolidation:', error.message);
    }
  }
}
