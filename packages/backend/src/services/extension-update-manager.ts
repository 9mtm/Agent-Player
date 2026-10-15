/**
 * Extension Update Manager Service
 * Handles extension updates, version comparison, and update queue.
 * B2.2d-11: on the process driver; queueing and processing are atomic.
 */

import { one, q, run, sql, type Step } from '../repositories/sql-steps.js';
import { randomUUID } from 'crypto';
import { checkForUpdates } from './extension-marketplace.js';

export interface PendingUpdate {
  id: string;
  extension_id: string;
  extension_name?: string;
  user_id: string;
  current_version: string;
  target_version: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error_message?: string;
  scheduled_at: string;
  completed_at?: string;
}

/**
 * Queue an extension update
 */
export async function queueUpdate(
  extensionId: string,
  userId: string,
  currentVersion: string,
  targetVersion: string
): Promise<{ success: boolean; error?: string; updateId?: string }> {
  try {
    return await sql().tx(function* (): Step<{ success: boolean; error?: string; updateId?: string }> {
      // Check if already queued
      const existing = yield* one(`
        SELECT 1 AS ok FROM extension_update_queue
        WHERE extension_id = ? AND user_id = ? AND status IN ('pending', 'in_progress')`,
        extensionId, userId);

      if (existing) {
        return { success: false, error: 'Update already queued' };
      }

      // Queue the update
      const updateId = randomUUID();
      yield* run(`
        INSERT INTO extension_update_queue (id, extension_id, user_id, current_version, target_version)
        VALUES (?, ?, ?, ?, ?)`,
        updateId, extensionId, userId, currentVersion, targetVersion);

      return { success: true, updateId };
    }, { immediate: true });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get pending updates for user
 */
export function getPendingUpdates(userId: string): Promise<PendingUpdate[]> {
  return q.all<PendingUpdate>(`
    SELECT uq.*, er.name as extension_name
    FROM extension_update_queue uq
    LEFT JOIN extension_registry er ON uq.extension_id = er.id
    WHERE uq.user_id = ? AND uq.status IN ('pending', 'in_progress')
    ORDER BY uq.scheduled_at DESC, uq.id DESC`,
    userId);
}

/**
 * Process a queued update
 */
export async function processUpdate(updateId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get update details
    const update = await q.one<any>('SELECT * FROM extension_update_queue WHERE id = ?', updateId);

    if (!update) {
      return { success: false, error: 'Update not found' };
    }

    // Claim it: pending → in_progress in one statement, so two concurrent
    // calls cannot both process the same update.
    const claimed = await q.run(`UPDATE extension_update_queue SET status = 'in_progress' WHERE id = ? AND status = 'pending'`, updateId);
    if (claimed.changes !== 1) {
      return { success: false, error: 'Update not in pending state' };
    }

    try {
      // TODO: Download and install new version
      // For now, just update the installation record
      await sql().tx(function* () {
        yield* run(`
          UPDATE extension_installations
          SET installed_version = ?, updated_at = CURRENT_TIMESTAMP
          WHERE extension_id = ? AND user_id = ?`,
          update.target_version, update.extension_id, update.user_id);

        // Mark as completed
        yield* run(`UPDATE extension_update_queue SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?`, updateId);
      });

      return { success: true };
    } catch (error: any) {
      // Mark as failed
      await q.run(`UPDATE extension_update_queue SET status = 'failed', error_message = ? WHERE id = ?`, error.message, updateId);

      return { success: false, error: error.message };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Cancel a pending update
 */
export async function cancelUpdate(updateId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await q.run(`
      DELETE FROM extension_update_queue
      WHERE id = ? AND user_id = ? AND status = 'pending'`,
      updateId, userId);

    if (result.changes === 0) {
      return { success: false, error: 'Update not found or cannot be cancelled' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Check for updates and queue them automatically
 */
export async function autoQueueUpdates(userId: string): Promise<{ queued: number; errors: string[] }> {
  const updates = await checkForUpdates(userId);
  const errors: string[] = [];
  let queued = 0;

  for (const update of updates) {
    const result = await queueUpdate(update.extension_id, userId, update.current_version, update.latest_version);

    if (result.success) {
      queued++;
    } else {
      errors.push(`${update.name}: ${result.error}`);
    }
  }

  return { queued, errors };
}

/**
 * Compare two semver versions
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

/**
 * Check if version is newer
 */
export function isNewerVersion(current: string, target: string): boolean {
  return compareVersions(target, current) > 0;
}
