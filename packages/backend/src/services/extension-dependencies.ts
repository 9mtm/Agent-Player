/**
 * Extension Dependencies Service
 * Handles dependency resolution, validation, and conflict detection
 */

import { getDatabase } from '../db/index.js';
import { compareVersions } from './extension-update-manager.js';

export interface ExtensionDependency {
  id: string;
  extension_id: string;
  depends_on_id: string;
  depends_on_name?: string;
  min_version?: string;
  max_version?: string;
  required: boolean;
}

export interface DependencyResolution {
  success: boolean;
  missing: Array<{ id: string; name: string; min_version?: string }>;
  conflicts: Array<{
    dependency: string;
    required_version: string;
    installed_version: string;
  }>;
  install_order: string[]; // Order to install dependencies
}

/**
 * Get dependencies for an extension
 */
export function getExtensionDependencies(extensionId: string): ExtensionDependency[] {
  const db = getDatabase();

  const deps = db
    .prepare(
      `
    SELECT ed.*, er.name as depends_on_name
    FROM extension_dependencies ed
    LEFT JOIN extension_registry er ON ed.depends_on_id = er.id
    WHERE ed.extension_id = ?
  `
    )
    .all(extensionId) as any[];

  return deps.map((d) => ({
    ...d,
    required: Boolean(d.required),
  }));
}

/**
 * Check if all dependencies are met for an extension
 */
export function checkDependencies(
  extensionId: string,
  userId: string
): DependencyResolution {
  const db = getDatabase();

  // Get extension's dependencies
  const dependencies = getExtensionDependencies(extensionId);

  const missing: Array<{ id: string; name: string; min_version?: string }> = [];
  const conflicts: Array<{
    dependency: string;
    required_version: string;
    installed_version: string;
  }> = [];

  for (const dep of dependencies) {
    if (!dep.required) continue; // Skip optional dependencies

    // Check if dependency is installed
    const installed = db
      .prepare(
        `
      SELECT ei.installed_version, er.name
      FROM extension_installations ei
      JOIN extension_registry er ON ei.extension_id = er.id
      WHERE ei.extension_id = ? AND ei.user_id = ?
    `
      )
      .get(dep.depends_on_id, userId) as any;

    if (!installed) {
      missing.push({
        id: dep.depends_on_id,
        name: dep.depends_on_name || dep.depends_on_id,
        min_version: dep.min_version,
      });
      continue;
    }

    // Check version constraints
    const installedVersion = installed.installed_version;

    if (dep.min_version && compareVersions(installedVersion, dep.min_version) < 0) {
      conflicts.push({
        dependency: installed.name,
        required_version: `>= ${dep.min_version}`,
        installed_version: installedVersion,
      });
    }

    if (dep.max_version && compareVersions(installedVersion, dep.max_version) > 0) {
      conflicts.push({
        dependency: installed.name,
        required_version: `<= ${dep.max_version}`,
        installed_version: installedVersion,
      });
    }
  }

  // Calculate install order (topological sort)
  const installOrder = calculateInstallOrder(extensionId, userId);

  return {
    success: missing.length === 0 && conflicts.length === 0,
    missing,
    conflicts,
    install_order: installOrder,
  };
}

/**
 * Calculate installation order using topological sort
 */
function calculateInstallOrder(extensionId: string, userId: string): string[] {
  const db = getDatabase();
  const order: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(id: string): boolean {
    if (visited.has(id)) return true;
    if (visiting.has(id)) {
      console.warn(`[Dependencies] Circular dependency detected involving ${id}`);
      return false; // Circular dependency
    }

    visiting.add(id);

    // Get dependencies
    const deps = db
      .prepare(
        `
      SELECT depends_on_id FROM extension_dependencies
      WHERE extension_id = ? AND required = 1
    `
      )
      .all(id) as any[];

    // Check if each dependency is installed
    for (const dep of deps) {
      const installed = db
        .prepare(
          `
        SELECT 1 FROM extension_installations
        WHERE extension_id = ? AND user_id = ?
      `
        )
        .get(dep.depends_on_id, userId);

      if (!installed) {
        // Need to install dependency first
        if (!visit(dep.depends_on_id)) {
          return false; // Circular dependency or error
        }
      }
    }

    visiting.delete(id);
    visited.add(id);

    // Add to install order (dependencies first)
    if (!order.includes(id)) {
      order.push(id);
    }

    return true;
  }

  visit(extensionId);

  return order;
}

/**
 * Get reverse dependencies (extensions that depend on this one)
 */
export function getReverseDependencies(extensionId: string, userId: string): Array<{
  id: string;
  name: string;
  installed: boolean;
}> {
  const db = getDatabase();

  const reverseDeps = db
    .prepare(
      `
    SELECT DISTINCT
      ed.extension_id as id,
      er.name,
      CASE WHEN ei.id IS NOT NULL THEN 1 ELSE 0 END as installed
    FROM extension_dependencies ed
    JOIN extension_registry er ON ed.extension_id = er.id
    LEFT JOIN extension_installations ei ON ed.extension_id = ei.extension_id AND ei.user_id = ?
    WHERE ed.depends_on_id = ? AND ed.required = 1
  `
    )
    .all(userId, extensionId) as any[];

  return reverseDeps.map((d) => ({
    ...d,
    installed: Boolean(d.installed),
  }));
}

/**
 * Validate extension can be uninstalled (no active reverse dependencies)
 */
export function canUninstall(extensionId: string, userId: string): {
  canUninstall: boolean;
  blockedBy: string[];
} {
  const reverseDeps = getReverseDependencies(extensionId, userId);
  const installed = reverseDeps.filter((d) => d.installed);

  return {
    canUninstall: installed.length === 0,
    blockedBy: installed.map((d) => d.name),
  };
}

/**
 * Add dependency relationship
 */
export function addDependency(
  extensionId: string,
  dependsOnId: string,
  minVersion?: string,
  maxVersion?: string,
  required = true
): { success: boolean; error?: string } {
  try {
    const db = getDatabase();

    // Check if both extensions exist
    const ext1 = db.prepare('SELECT 1 FROM extension_registry WHERE id = ?').get(extensionId);
    const ext2 = db.prepare('SELECT 1 FROM extension_registry WHERE id = ?').get(dependsOnId);

    if (!ext1 || !ext2) {
      return { success: false, error: 'One or both extensions not found' };
    }

    // Prevent self-dependency
    if (extensionId === dependsOnId) {
      return { success: false, error: 'Extension cannot depend on itself' };
    }

    // Add dependency
    db.prepare(
      `
      INSERT INTO extension_dependencies (id, extension_id, depends_on_id, min_version, max_version, required)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(extension_id, depends_on_id) DO UPDATE SET
        min_version = excluded.min_version,
        max_version = excluded.max_version,
        required = excluded.required
    `
    ).run(
      `${extensionId}-${dependsOnId}`,
      extensionId,
      dependsOnId,
      minVersion || null,
      maxVersion || null,
      required ? 1 : 0
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Remove dependency relationship
 */
export function removeDependency(
  extensionId: string,
  dependsOnId: string
): { success: boolean; error?: string } {
  try {
    const db = getDatabase();

    const result = db
      .prepare('DELETE FROM extension_dependencies WHERE extension_id = ? AND depends_on_id = ?')
      .run(extensionId, dependsOnId);

    if (result.changes === 0) {
      return { success: false, error: 'Dependency not found' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
