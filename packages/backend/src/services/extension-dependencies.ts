/**
 * Extension Dependencies Service
 * Handles dependency resolution, validation, and conflict detection.
 * B2.2d-11: on the process driver; the *Step forms join the caller's
 * transaction (marketplace install/uninstall).
 */

import { all, one, run, sql, type Step } from '../repositories/sql-steps.js';
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
export function* dependenciesStep(extensionId: string): Step<ExtensionDependency[]> {
  const deps = yield* all<any>(`
    SELECT ed.*, er.name as depends_on_name
    FROM extension_dependencies ed
    LEFT JOIN extension_registry er ON ed.depends_on_id = er.id
    WHERE ed.extension_id = ?`,
    extensionId);

  return deps.map((d) => ({
    ...d,
    required: Boolean(d.required),
  }));
}

export function getExtensionDependencies(extensionId: string): Promise<ExtensionDependency[]> {
  return sql().read(dependenciesStep(extensionId));
}

/**
 * Check if all dependencies are met for an extension
 */
export function* checkDependenciesStep(extensionId: string, userId: string): Step<DependencyResolution> {
  // Get extension's dependencies
  const dependencies = yield* dependenciesStep(extensionId);

  const missing: Array<{ id: string; name: string; min_version?: string }> = [];
  const conflicts: Array<{
    dependency: string;
    required_version: string;
    installed_version: string;
  }> = [];

  for (const dep of dependencies) {
    if (!dep.required) continue; // Skip optional dependencies

    // Check if dependency is installed
    const installed = yield* one<{ installed_version: string; name: string }>(`
      SELECT ei.installed_version, er.name
      FROM extension_installations ei
      JOIN extension_registry er ON ei.extension_id = er.id
      WHERE ei.extension_id = ? AND ei.user_id = ?`,
      dep.depends_on_id, userId);

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
  const installOrder = yield* installOrderStep(extensionId, userId);

  return {
    success: missing.length === 0 && conflicts.length === 0,
    missing,
    conflicts,
    install_order: installOrder,
  };
}

export function checkDependencies(extensionId: string, userId: string): Promise<DependencyResolution> {
  return sql().read(checkDependenciesStep(extensionId, userId));
}

/**
 * Calculate installation order using topological sort
 */
function* installOrderStep(extensionId: string, userId: string): Step<string[]> {
  const order: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function* visit(id: string): Step<boolean> {
    if (visited.has(id)) return true;
    if (visiting.has(id)) {
      console.warn(`[Dependencies] Circular dependency detected involving ${id}`);
      return false; // Circular dependency
    }

    visiting.add(id);

    // Get dependencies
    const deps = yield* all<{ depends_on_id: string }>(`
      SELECT depends_on_id FROM extension_dependencies
      WHERE extension_id = ? AND required = 1`,
      id);

    // Check if each dependency is installed
    for (const dep of deps) {
      const installed = yield* one(`
        SELECT 1 AS ok FROM extension_installations
        WHERE extension_id = ? AND user_id = ?`,
        dep.depends_on_id, userId);

      if (!installed) {
        // Need to install dependency first
        if (!(yield* visit(dep.depends_on_id))) {
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

  yield* visit(extensionId);

  return order;
}

/**
 * Get reverse dependencies (extensions that depend on this one)
 */
function* reverseDependenciesStep(extensionId: string, userId: string): Step<Array<{ id: string; name: string; installed: boolean }>> {
  const reverseDeps = yield* all<any>(`
    SELECT DISTINCT
      ed.extension_id as id,
      er.name,
      CASE WHEN ei.id IS NOT NULL THEN 1 ELSE 0 END as installed
    FROM extension_dependencies ed
    JOIN extension_registry er ON ed.extension_id = er.id
    LEFT JOIN extension_installations ei ON ed.extension_id = ei.extension_id AND ei.user_id = ?
    WHERE ed.depends_on_id = ? AND ed.required = 1`,
    userId, extensionId);

  return reverseDeps.map((d) => ({
    ...d,
    installed: Boolean(d.installed),
  }));
}

export function getReverseDependencies(extensionId: string, userId: string): Promise<Array<{
  id: string;
  name: string;
  installed: boolean;
}>> {
  return sql().read(reverseDependenciesStep(extensionId, userId));
}

/**
 * Validate extension can be uninstalled (no active reverse dependencies)
 */
export function* canUninstallStep(extensionId: string, userId: string): Step<{ canUninstall: boolean; blockedBy: string[] }> {
  const reverseDeps = yield* reverseDependenciesStep(extensionId, userId);
  const installed = reverseDeps.filter((d) => d.installed);

  return {
    canUninstall: installed.length === 0,
    blockedBy: installed.map((d) => d.name),
  };
}

export function canUninstall(extensionId: string, userId: string): Promise<{
  canUninstall: boolean;
  blockedBy: string[];
}> {
  return sql().read(canUninstallStep(extensionId, userId));
}

/**
 * Add dependency relationship
 */
export async function addDependency(
  extensionId: string,
  dependsOnId: string,
  minVersion?: string,
  maxVersion?: string,
  required = true
): Promise<{ success: boolean; error?: string }> {
  try {
    // Prevent self-dependency
    if (extensionId === dependsOnId) {
      return { success: false, error: 'Extension cannot depend on itself' };
    }

    return await sql().tx(function* (): Step<{ success: boolean; error?: string }> {
      // Check if both extensions exist
      const ext1 = yield* one('SELECT 1 AS ok FROM extension_registry WHERE id = ?', extensionId);
      const ext2 = yield* one('SELECT 1 AS ok FROM extension_registry WHERE id = ?', dependsOnId);

      if (!ext1 || !ext2) {
        return { success: false, error: 'One or both extensions not found' };
      }

      // Add dependency
      yield* run(`
        INSERT INTO extension_dependencies (id, extension_id, depends_on_id, min_version, max_version, required)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(extension_id, depends_on_id) DO UPDATE SET
          min_version = excluded.min_version,
          max_version = excluded.max_version,
          required = excluded.required`,
        `${extensionId}-${dependsOnId}`,
        extensionId,
        dependsOnId,
        minVersion || null,
        maxVersion || null,
        required ? 1 : 0);

      return { success: true };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Remove dependency relationship
 */
export async function removeDependency(
  extensionId: string,
  dependsOnId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await sql().read(run('DELETE FROM extension_dependencies WHERE extension_id = ? AND depends_on_id = ?', extensionId, dependsOnId));

    if (result.changes === 0) {
      return { success: false, error: 'Dependency not found' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
