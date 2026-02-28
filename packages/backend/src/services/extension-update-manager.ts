/**
 * Extension Update Manager Service
 * Handles extension updates, version comparison, and update queue
 */

import { getDatabase } from '../db/index.js';
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
export function queueUpdate(
  extensionId: string,
  userId: string,
  currentVersion: string,
  targetVersion: string
): { success: boolean; error?: string; updateId?: string } {
  try {
    const db = getDatabase();

    // Check if already queued
    const existing = db
      .prepare(
        `
      SELECT * FROM extension_update_queue
      WHERE extension_id = ? AND user_id = ? AND status IN ('pending', 'in_progress')
    `
      )
      .get(extensionId, userId);

    if (existing) {
      return { success: false, error: 'Update already queued' };
    }

    // Queue the update
    const updateId = randomUUID();
    db.prepare(
      `
      INSERT INTO extension_update_queue (id, extension_id, user_id, current_version, target_version)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(updateId, extensionId, userId, currentVersion, targetVersion);

    return { success: true, updateId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get pending updates for user
 */
export function getPendingUpdates(userId: string): PendingUpdate[] {
  const db = getDatabase();

  const updates = db
    .prepare(
      `
    SELECT uq.*, er.name as extension_name
    FROM extension_update_queue uq
    LEFT JOIN extension_registry er ON uq.extension_id = er.id
    WHERE uq.user_id = ? AND uq.status IN ('pending', 'in_progress')
    ORDER BY uq.scheduled_at DESC
  `
    )
    .all(userId) as any[];

  return updates;
}

/**
 * Process a queued update
 */
export async function processUpdate(updateId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDatabase();

    // Get update details
    const update = db
      .prepare('SELECT * FROM extension_update_queue WHERE id = ?')
      .get(updateId) as any;

    if (!update) {
      return { success: false, error: 'Update not found' };
    }

    if (update.status !== 'pending') {
      return { success: false, error: 'Update not in pending state' };
    }

    // Mark as in progress
    db.prepare('UPDATE extension_update_queue SET status = ? WHERE id = ?').run('in_progress', updateId);

    try {
      // TODO: Download and install new version
      // For now, just update the installation record

      db.prepare(
        `
        UPDATE extension_installations
        SET installed_version = ?, updated_at = CURRENT_TIMESTAMP
        WHERE extension_id = ? AND user_id = ?
      `
      ).run(update.target_version, update.extension_id, update.user_id);

      // Mark as completed
      db.prepare('UPDATE extension_update_queue SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        'completed',
        updateId
      );

      return { success: true };
    } catch (error: any) {
      // Mark as failed
      db.prepare('UPDATE extension_update_queue SET status = ?, error_message = ? WHERE id = ?').run(
        'failed',
        error.message,
        updateId
      );

      return { success: false, error: error.message };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Cancel a pending update
 */
export function cancelUpdate(updateId: string, userId: string): { success: boolean; error?: string } {
  try {
    const db = getDatabase();

    const result = db
      .prepare(
        `
      DELETE FROM extension_update_queue
      WHERE id = ? AND user_id = ? AND status = 'pending'
    `
      )
      .run(updateId, userId);

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
export function autoQueueUpdates(userId: string): { queued: number; errors: string[] } {
  const updates = checkForUpdates(userId);
  const errors: string[] = [];
  let queued = 0;

  for (const update of updates) {
    const result = queueUpdate(update.extension_id, userId, update.current_version, update.latest_version);

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
