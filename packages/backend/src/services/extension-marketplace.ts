/**
 * Extension Marketplace Service
 * Handles extension registry, installation, updates, and reviews
 */

import { getDatabase } from '../db/index.js';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

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
export function searchMarketplace(options?: {
  query?: string;
  category?: string;
  type?: string;
  tags?: string[];
  featured?: boolean;
  verified?: boolean;
  userId?: string;
  limit?: number;
  offset?: number;
}): { extensions: RegistryExtension[]; total: number } {
  const db = getDatabase();
  const { query, category, type, tags, featured, verified, userId, limit = 50, offset = 0 } = options || {};

  let sql = `
    SELECT er.*,
           ei.installed_version,
           CASE WHEN ei.id IS NOT NULL THEN 1 ELSE 0 END as installed
    FROM extension_registry er
    LEFT JOIN extension_installations ei ON er.id = ei.extension_id ${userId ? 'AND ei.user_id = ?' : 'AND 0=1'}
    WHERE er.status = 'active'
  `;

  const params: any[] = userId ? [userId] : [];

  if (query) {
    sql += ` AND (er.name LIKE ? OR er.description LIKE ? OR er.tags LIKE ?)`;
    const searchPattern = `%${query}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (category) {
    sql += ` AND er.category = ?`;
    params.push(category);
  }

  if (type) {
    sql += ` AND er.type = ?`;
    params.push(type);
  }

  if (tags && tags.length > 0) {
    const tagConditions = tags.map(() => `er.tags LIKE ?`).join(' OR ');
    sql += ` AND (${tagConditions})`;
    tags.forEach(tag => params.push(`%"${tag}"%`));
  }

  if (featured !== undefined) {
    sql += ` AND er.featured = ?`;
    params.push(featured ? 1 : 0);
  }

  if (verified !== undefined) {
    sql += ` AND er.verified = ?`;
    params.push(verified ? 1 : 0);
  }

  // Count total
  const countSql = sql.replace(/SELECT er\.\*.*?FROM/, 'SELECT COUNT(*) as total FROM');
  const countResult = db.prepare(countSql).get(...params) as any;
  const total = countResult.total || 0;

  // Get paginated results
  sql += ` ORDER BY er.featured DESC, er.rating_avg DESC, er.install_count DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const extensions = db.prepare(sql).all(...params) as any[];

  return {
    extensions: extensions.map(parseRegistryExtension),
    total,
  };
}

/**
 * Get extension details by ID
 */
export function getExtensionDetails(extensionId: string, userId?: string): RegistryExtension | null {
  const db = getDatabase();

  const extension = db
    .prepare(
      `
    SELECT er.*,
           ei.installed_version,
           CASE WHEN ei.id IS NOT NULL THEN 1 ELSE 0 END as installed
    FROM extension_registry er
    LEFT JOIN extension_installations ei ON er.id = ei.extension_id ${userId ? 'AND ei.user_id = ?' : 'AND 0=1'}
    WHERE er.id = ?
  `
    )
    .get(...(userId ? [userId, extensionId] : [extensionId])) as any;

  return extension ? parseRegistryExtension(extension) : null;
}

/**
 * Get extension versions
 */
export function getExtensionVersions(extensionId: string): ExtensionVersion[] {
  const db = getDatabase();

  const versions = db
    .prepare(
      `
    SELECT * FROM extension_versions
    WHERE extension_id = ?
    ORDER BY release_date DESC
  `
    )
    .all(extensionId) as any[];

  return versions.map(parseExtensionVersion);
}

/**
 * Get extension reviews
 */
export function getExtensionReviews(extensionId: string, limit = 20): ExtensionReview[] {
  const db = getDatabase();

  const reviews = db
    .prepare(
      `
    SELECT * FROM extension_reviews
    WHERE extension_id = ?
    ORDER BY helpful_count DESC, created_at DESC
    LIMIT ?
  `
    )
    .all(extensionId, limit) as any[];

  return reviews;
}

/**
 * Install extension from marketplace
 */
export async function installExtension(
  extensionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDatabase();

    // Get extension from registry
    const extension = getExtensionDetails(extensionId);
    if (!extension) {
      return { success: false, error: 'Extension not found in registry' };
    }

    // Check if already installed
    const existing = db
      .prepare('SELECT * FROM extension_installations WHERE extension_id = ? AND user_id = ?')
      .get(extensionId, userId);

    if (existing) {
      return { success: false, error: 'Extension already installed' };
    }

    // Check dependencies
    const { checkDependencies } = await import('./extension-dependencies.js');
    const depCheck = checkDependencies(extensionId, userId);

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

    // Download and extract extension
    const extensionDir = join(process.cwd(), 'packages', 'backend', 'extensions', extensionId);
    if (!existsSync(extensionDir)) {
      mkdirSync(extensionDir, { recursive: true });
    }

    // TODO: Download from download_url and extract
    // For now, assume extension files are already in place (manual installation)

    // Record installation
    db.prepare(
      `
      INSERT INTO extension_installations (id, extension_id, user_id, installed_version)
      VALUES (?, ?, ?, ?)
    `
    ).run(randomUUID(), extensionId, userId, extension.version);

    // Increment install count
    db.prepare('UPDATE extension_registry SET install_count = install_count + 1 WHERE id = ?').run(extensionId);

    // Enable extension in extension_configs
    const { getExtensionRunner } = await import('../plugins/extension-runner.js');
    const runner = getExtensionRunner();
    // Runner will auto-load on next initialization

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
    const db = getDatabase();

    // Check reverse dependencies
    const { canUninstall } = await import('./extension-dependencies.js');
    const uninstallCheck = canUninstall(extensionId, userId);

    if (!uninstallCheck.canUninstall) {
      return {
        success: false,
        error: `Cannot uninstall - required by: ${uninstallCheck.blockedBy.join(', ')}`,
      };
    }

    // Remove installation record
    const result = db
      .prepare('DELETE FROM extension_installations WHERE extension_id = ? AND user_id = ?')
      .run(extensionId, userId);

    if (result.changes === 0) {
      return { success: false, error: 'Extension not installed' };
    }

    // Disable extension in extension_configs
    db.prepare('UPDATE extension_configs SET enabled = 0 WHERE extension_id = ?').run(extensionId);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Check for extension updates
 */
export function checkForUpdates(userId: string): Array<{
  extension_id: string;
  name: string;
  current_version: string;
  latest_version: string;
  changelog?: string;
}> {
  const db = getDatabase();

  const updates = db
    .prepare(
      `
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
  `
    )
    .all(userId) as any[];

  return updates;
}

/**
 * Submit extension review
 */
export function submitReview(
  extensionId: string,
  userId: string,
  rating: number,
  reviewTitle?: string,
  reviewText?: string,
  version?: string
): { success: boolean; error?: string } {
  try {
    const db = getDatabase();

    // Validate rating
    if (rating < 1 || rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' };
    }

    // Check if extension exists
    const extension = db.prepare('SELECT * FROM extension_registry WHERE id = ?').get(extensionId);
    if (!extension) {
      return { success: false, error: 'Extension not found' };
    }

    // Upsert review
    db.prepare(
      `
      INSERT INTO extension_reviews (id, extension_id, user_id, rating, review_title, review_text, version)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(extension_id, user_id) DO UPDATE SET
        rating = excluded.rating,
        review_title = excluded.review_title,
        review_text = excluded.review_text,
        version = excluded.version,
        updated_at = CURRENT_TIMESTAMP
    `
    ).run(randomUUID(), extensionId, userId, rating, reviewTitle || null, reviewText || null, version || null);

    // Recalculate average rating
    const stats = db
      .prepare(
        `
      SELECT AVG(rating) as avg_rating, COUNT(*) as count
      FROM extension_reviews
      WHERE extension_id = ?
    `
      )
      .get(extensionId) as any;

    db.prepare('UPDATE extension_registry SET rating_avg = ?, rating_count = ? WHERE id = ?').run(
      stats.avg_rating || 0,
      stats.count || 0,
      extensionId
    );

    return { success: true };
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
