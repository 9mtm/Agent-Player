/**
 * Memory Consolidation Service
 *
 * Runs periodically (nightly at 3 AM) to:
 * 1. Analyze working memory patterns
 * 2. Promote important working memories → experiential
 * 3. Promote verified experiential memories → factual
 * 4. Expire old working and experiential memories
 * 5. Merge similar experiential memories
 */

import { MemoryTiersService, type ConsolidationResult } from './memory-tiers.js';
import { all, run, sql } from '../repositories/sql-steps.js';

export class MemoryConsolidationService {
  private running = false;

  /**
   * Run full consolidation cycle
   */
  async runConsolidation(): Promise<ConsolidationResult> {
    if (this.running) {
      console.log('[Consolidation] Already running, skipping...');
      return { consolidated: 0, promoted: 0, expired: 0, durationMs: 0 };
    }

    this.running = true;
    const startTime = Date.now();
    let consolidated = 0;
    let promoted = 0;
    let expired = 0;

    try {
      console.log('[Consolidation] Starting memory consolidation...');

      // Step 1: Expire old working memories
      const expiredWorking = await MemoryTiersService.expireWorkingMemory();
      expired += expiredWorking;

      // Step 2: Expire old experiential memories (low importance only)
      const expiredExperiential = await MemoryTiersService.expireExperientialMemory();
      expired += expiredExperiential;

      // Step 3: Find and promote working → experiential
      const users = await sql().read(all<{ user_id: string }>('SELECT DISTINCT user_id FROM memories WHERE memory_layer = ? ORDER BY user_id', 'working'));

      for (const { user_id } of users) {
        const candidates = await MemoryTiersService.getPromotionCandidates(user_id);

        for (const candidate of candidates) {
          const success = await MemoryTiersService.promoteToExperiential(user_id, candidate.id);
          if (success) {
            promoted++;
            console.log(`[Consolidation] Promoted working memory ${candidate.id} → experiential`);
          }
        }
      }

      // Step 4: Promote high-importance experiential → factual
      const factualCandidates = await sql().read(all(`
        SELECT id, user_id, importance_score, access_count
        FROM memories
        WHERE memory_layer = 'experiential'
          AND importance_score >= 0.85
          AND access_count >= 10
        ORDER BY importance_score DESC, access_count DESC, id
        LIMIT 100
      `));

      for (const candidate of factualCandidates) {
        const success = await MemoryTiersService.promoteToFactual(candidate.user_id, candidate.id);
        if (success) {
          promoted++;
          console.log(`[Consolidation] Promoted experiential memory ${candidate.id} → factual`);
        }
      }

      // Step 5: Mark experiential memories as consolidated
      const consolidatedCount = (await sql().read(run(`
        UPDATE memories
        SET consolidation_status = 'consolidated'
        WHERE memory_layer = 'experiential'
          AND consolidation_status = 'pending'
      `))).changes;

      consolidated = consolidatedCount;

      const durationMs = Date.now() - startTime;

      // Log successful consolidation
      await MemoryTiersService.logConsolidation({
        consolidated,
        promoted,
        expired,
        durationMs,
        status: 'success',
      });

      console.log(`[Consolidation] ✅ Complete: ${promoted} promoted, ${expired} expired, ${consolidated} consolidated (${durationMs}ms)`);

      return { consolidated, promoted, expired, durationMs };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      // Log failed consolidation
      await MemoryTiersService.logConsolidation({
        consolidated,
        promoted,
        expired,
        durationMs,
        status: 'failed',
        error: error.message,
      });

      console.error('[Consolidation] ❌ Failed:', error.message);

      return { consolidated, promoted, expired, durationMs };
    } finally {
      this.running = false;
    }
  }

  /**
   * Start consolidation scheduler (runs daily at 3 AM)
   */
  startScheduler(): void {
    console.log('[Consolidation] Scheduler started (runs daily at 3 AM)');

    // Run immediately on startup (for testing)
    // setTimeout(() => this.runConsolidation(), 5000);

    // Schedule daily at 3 AM
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 3 && now.getMinutes() === 0) {
        this.runConsolidation();
      }
    }, 60 * 1000); // Check every minute
  }

  /**
   * Run consolidation manually (for testing or manual trigger)
   */
  async runManual(): Promise<ConsolidationResult> {
    console.log('[Consolidation] Manual run triggered');
    return await this.runConsolidation();
  }
}

// Singleton instance
let consolidationServiceInstance: MemoryConsolidationService | null = null;

export function getConsolidationService(): MemoryConsolidationService {
  if (!consolidationServiceInstance) {
    consolidationServiceInstance = new MemoryConsolidationService();
  }
  return consolidationServiceInstance;
}
