/**
 * Extension Marketplace Service
 * Handles extension registry, installation, updates, and reviews.
 * B2.2d-11: on the process driver; install, uninstall and reviews are one
 * transaction each.
 */

import { all, num, one, q, run, sql, type Step } from '../repositories/sql-steps.js';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface RegistryExtension {
  id: string;
  name: string;
  description?: string;
  author: string;
  author_email?: string;
  author_url?: string;
  version: string;
  type: 'app' | 'channel' | 'tool' | 'integration';
  category?: string;
  tags?: string[];
  icon_url?: string;
  screenshot_urls?: string[];
  download_url: string;
  homepage_url?: string;
  repository_url?: string;
  license: string;
  min_agent_version?: string;
  permissions?: string[];
  dependencies?: string[];
  install_count: number;
  rating_avg: number;
  rating_count: number;
  featured: boolean;
  verified: boolean;
  status: 'active' | 'deprecated' | 'removed';
  published_at: string;
  updated_at: string;
  installed?: boolean; // Computed field
  installed_version?: string; // Computed field
}

export interface ExtensionVersion {
  id: string;
  extension_id: string;
  version: string;
  changelog?: string;
  download_url: string;
  min_agent_version?: string;
  breaking_changes: boolean;
  release_date: string;
}

export interface ExtensionReview {
  id: string;
  extension_id: string;
  user_id: string;
  rating: number;
  review_title?: string;
  review_text?: string;
  helpful_count: number;
  version?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Search marketplace extensions with filters
 */
export async function searchMarketplace(options?: {
  query?: string;
  category?: string;
  type?: string;
  tags?: string[];
  featured?: boolean;
  verified?: boolean;
  userId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ extensions: RegistryExtension[]; total: number }> {
  const { query, category, type, tags, featured, verified, userId, limit = 50, offset = 0 } = options || {};
  // SQLite LIKE ignores ASCII case; ILIKE gives the same match on PostgreSQL.
  const like = q.dialect === 'postgres' ? 'ILIKE' : 'LIKE';

  const from = `
    FROM extension_registry er
    LEFT JOIN extension_installations ei ON er.id = ei.extension_id ${userId ? 'AND ei.user_id = ?' : 'AND 1 = 0'}
    WHERE er.status = 'active'
  `;
  let where = '';
  const params: Array<string | number> = userId ? [userId] : [];

  if (query) {
    where += ` AND (er.name ${like} ? OR er.description ${like} ? OR er.tags ${like} ?)`;
    const searchPattern = `%${query}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (category) {
    where += ` AND er.category = ?`;
    params.push(category);
  }

  if (type) {
    where += ` AND er.type = ?`;
    params.push(type);
  }

  if (tags && tags.length > 0) {
    const tagConditions = tags.map(() => `er.tags ${like} ?`).join(' OR ');
    where += ` AND (${tagConditions})`;
    tags.forEach(tag => params.push(`%"${tag}"%`));
  }

  if (featured !== undefined) {
    where += ` AND er.featured = ?`;
    params.push(featured ? 1 : 0);
  }

  if (verified !== undefined) {
    where += ` AND er.verified = ?`;
    params.push(verified ? 1 : 0);
  }

  // Count total (a separate COUNT over the same FROM/WHERE; the former regex
  // rewrite never matched across the newlines, so total was always 0)
  const countResult = await q.one<{ total: number }>(`SELECT COUNT(*) as total ${from}${where}`, ...params);
  const total = countResult?.total || 0;

  // Get paginated results
  const extensions = await q.all<any>(`
    SELECT er.*,
           ei.installed_version,
           CASE WHEN ei.id IS NOT NULL THEN 1 ELSE 0 END as installed
    ${from}${where}
    ORDER BY er.featured DESC, er.rating_avg DESC, er.install_count DESC, er.id ASC LIMIT ? OFFSET ?`,
    ...params, limit, offset);

  return {
    extensions: extensions.map(parseRegistryExtension),
    total,
  };
}

/**
 * Get extension details by ID
 */
function* extensionDetailsStep(extensionId: string, userId?: string): Step<RegistryExtension | null> {
  const extension = yield* one<any>(`
    SELECT er.*,
           ei.installed_version,
           CASE WHEN ei.id IS NOT NULL THEN 1 ELSE 0 END as installed
    FROM extension_registry er
    LEFT JOIN extension_installations ei ON er.id = ei.extension_id ${userId ? 'AND ei.user_id = ?' : 'AND 1 = 0'}
    WHERE er.id = ?`,
    ...(userId ? [userId, extensionId] : [extensionId]));

  return extension ? parseRegistryExtension(extension) : null;
}

export function getExtensionDetails(extensionId: string, userId?: string): Promise<RegistryExtension | null> {
  return sql().read(extensionDetailsStep(extensionId, userId));
}

/**
 * Get extension versions
 */
export async function getExtensionVersions(extensionId: string): Promise<ExtensionVersion[]> {
  const versions = await q.all<any>(`
    SELECT * FROM extension_versions
    WHERE extension_id = ?
    ORDER BY release_date DESC`,
    extensionId);

  return versions.map(parseExtensionVersion);
}

/**
 * Get extension reviews
 */
export function getExtensionReviews(extensionId: string, limit = 20): Promise<ExtensionReview[]> {
  return q.all<ExtensionReview>(`
    SELECT * FROM extension_reviews
    WHERE extension_id = ?
    ORDER BY helpful_count DESC, created_at DESC
    LIMIT ?`,
    extensionId, limit);
}

/**
 * Install extension from marketplace
 */
export async function installExtension(
  extensionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { checkDependenciesStep } = await import('./extension-dependencies.js');

    const outcome = await sql().tx(function* (): Step<{ success: boolean; error?: string }> {
      // Get extension from registry
      const extension = yield* extensionDetailsStep(extensionId);
      if (!extension) {
        return { success: false, error: 'Extension not found in registry' };
      }

      // Check if already installed
      const existing = yield* one('SELECT 1 AS ok FROM extension_installations WHERE extension_id = ? AND user_id = ?', extensionId, userId);
      if (existing) {
        return { success: false, error: 'Extension already installed' };
      }

      // Check dependencies
      const depCheck = yield* checkDependenciesStep(extensionId, userId);

      if (!depCheck.success) {
        const errors = [];
        if (depCheck.missing.length > 0) {
          errors.push(
            `Missing dependencies: ${depCheck.missing.map((m) => `${m.name}${m.min_version ? ` (>= ${m.min_version})` : ''}`).join(', ')}`
          );
        }
        if (depCheck.conflicts.length > 0) {
          errors.push(
            `Version conflicts: ${depCheck.conflicts.map((c) => `${c.dependency} requires ${c.required_version}, installed: ${c.installed_version}`).join(', ')}`
          );
        }
        return { success: false, error: errors.join('; ') };
      }

      // Record installation (UNIQUE (extension_id, user_id) refuses a concurrent second install)
      yield* run(`
        INSERT INTO extension_installations (id, extension_id, user_id, installed_version)
        VALUES (?, ?, ?, ?)`,
        randomUUID(), extensionId, userId, extension.version);

      // Increment install count
      yield* run('UPDATE extension_registry SET install_count = install_count + 1 WHERE id = ?', extensionId);

      return { success: true };
    });
    if (!outcome.success) return outcome;

    // Download and extract extension (after the commit; the id is a registry id)
    const extensionDir = join(process.cwd(), 'packages', 'backend', 'extensions', extensionId);
    if (!existsSync(extensionDir)) {
      mkdirSync(extensionDir, { recursive: true });
    }

    // TODO: Download from download_url and extract
    // For now, assume extension files are already in place (manual installation)
    // The extension runner loads it on its next initialization.

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Uninstall extension
 */
export async function uninstallExtension(
  extensionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { canUninstallStep } = await import('./extension-dependencies.js');

    return await sql().tx(function* (): Step<{ success: boolean; error?: string }> {
      // Check reverse dependencies
      const uninstallCheck = yield* canUninstallStep(extensionId, userId);

      if (!uninstallCheck.canUninstall) {
        return {
          success: false,
          error: `Cannot uninstall - required by: ${uninstallCheck.blockedBy.join(', ')}`,
        };
      }

      // Remove installation record
      const result = yield* run('DELETE FROM extension_installations WHERE extension_id = ? AND user_id = ?', extensionId, userId);

      if (result.changes === 0) {
        return { success: false, error: 'Extension not installed' };
      }

      // Disable extension in extension_configs
      yield* run('UPDATE extension_configs SET enabled = 0 WHERE extension_id = ?', extensionId);

      return { success: true };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Check for extension updates
 */
export function checkForUpdates(userId: string): Promise<Array<{
  extension_id: string;
  name: string;
  current_version: string;
  latest_version: string;
  changelog?: string;
}>> {
  return q.all(`
    SELECT
      ei.extension_id,
      er.name,
      ei.installed_version as current_version,
      er.version as latest_version,
      ev.changelog
    FROM extension_installations ei
    JOIN extension_registry er ON ei.extension_id = er.id
    LEFT JOIN extension_versions ev ON er.id = ev.extension_id AND er.version = ev.version
    WHERE ei.user_id = ?
      AND ei.installed_version != er.version
      AND er.status = 'active'
    ORDER BY ei.extension_id`,
    userId);
}

/**
 * Submit extension review
 */
export async function submitReview(
  extensionId: string,
  userId: string,
  rating: number,
  reviewTitle?: string,
  reviewText?: string,
  version?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate rating
    if (!(rating >= 1 && rating <= 5)) {
      return { success: false, error: 'Rating must be between 1 and 5' };
    }

    return await sql().tx(function* (): Step<{ success: boolean; error?: string }> {
      // Check if extension exists
      const extension = yield* one('SELECT 1 AS ok FROM extension_registry WHERE id = ?', extensionId);
      if (!extension) {
        return { success: false, error: 'Extension not found' };
      }

      // Upsert review
      yield* run(`
        INSERT INTO extension_reviews (id, extension_id, user_id, rating, review_title, review_text, version)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(extension_id, user_id) DO UPDATE SET
          rating = excluded.rating,
          review_title = excluded.review_title,
          review_text = excluded.review_text,
          version = excluded.version,
          updated_at = CURRENT_TIMESTAMP`,
        randomUUID(), extensionId, userId, rating, reviewTitle || null, reviewText || null, version || null);

      // Recalculate average rating (same transaction: no lost update between reviews)
      const stats = yield* one<{ avg_rating: unknown; count: number }>(`
        SELECT AVG(rating) as avg_rating, COUNT(*) as count
        FROM extension_reviews
        WHERE extension_id = ?`,
        extensionId);

      yield* run('UPDATE extension_registry SET rating_avg = ?, rating_count = ? WHERE id = ?',
        // AVG is numeric (text) on PostgreSQL
        num<number | null>(stats?.avg_rating) ?? 0,
        stats?.count || 0,
        extensionId);

      return { success: true };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Parse registry extension from database row
 */
function parseRegistryExtension(row: any): RegistryExtension {
  return {
    ...row,
    tags: row.tags ? JSON.parse(row.tags) : [],
    screenshot_urls: row.screenshot_urls ? JSON.parse(row.screenshot_urls) : [],
    permissions: row.permissions ? JSON.parse(row.permissions) : [],
    dependencies: row.dependencies ? JSON.parse(row.dependencies) : [],
    featured: Boolean(row.featured),
    verified: Boolean(row.verified),
    installed: Boolean(row.installed),
  };
}

/**
 * Parse extension version from database row
 */
function parseExtensionVersion(row: any): ExtensionVersion {
  return {
    ...row,
    breaking_changes: Boolean(row.breaking_changes),
  };
}
