/**
 * `agent-player uninstall` plan and removal (INST-12).
 *
 * Default is a dry run: the plan lists what would be removed and what is
 * kept, and nothing changes. Removed with --apply:
 *  - the service unit of this install (launchd plist / systemd user unit),
 *    only when the file names this install folder; it is never unloaded here,
 *    the unload command is printed;
 *  - pid/run files and logs (<data dir>/run, <data dir>/logs);
 *  - the CLI's own files in the CLI config folder (session token auth.json,
 *    install.json for this install, the backend's instance.json copy);
 *  - built output (packages/<name>/dist, .next).
 * Data (databases, secrets, memories, uploads, backups) is kept unless
 * --delete-data is given together with the typed confirmation
 * `DELETE MY DATA`. The source folder itself is never removed.
 *
 * Every path is checked to be inside an allowed base folder; symlinks are
 * removed as links and never followed.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { getConfigDir } from './auth-store.js';
import type { InstallPaths } from './install-root.js';
import { installHint, type ServicePlatform } from './service-templates.js';

export const DELETE_DATA_CONFIRMATION = 'DELETE MY DATA';

export type ItemKind = 'service' | 'run' | 'logs' | 'cli-config' | 'build' | 'data';

export interface PlanItem {
  kind: ItemKind;
  path: string;
  type: 'file' | 'dir' | 'symlink';
  note?: string;
}

export interface UninstallPlan {
  remove: PlanItem[];
  keep: PlanItem[];
  /** Commands the owner may want to run (printed, never run). */
  hints: string[];
  /** Folders a removed path must be inside. */
  allowedBases: string[];
  /** Paths that may be removed themselves although their parent is not a base. */
  allowedExact: string[];
}

export interface PlanContext {
  home?: string;
  configDir?: string;
  deleteData?: boolean;
}

function entryType(p: string): PlanItem['type'] | null {
  const st = fs.lstatSync(p, { throwIfNoEntry: false });
  if (!st) return null;
  if (st.isSymbolicLink()) return 'symlink';
  return st.isDirectory() ? 'dir' : 'file';
}

function readJson(file: string): any {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return null; }
}

function isInside(child: string, parent: string): boolean {
  const rel = path.relative(parent, child);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** Folders that hold user data; kept unless --delete-data. */
export function dataLocations(paths: InstallPaths, home: string): string[] {
  const storage = path.join(paths.root, 'public', 'storage');
  return [
    paths.dataDir,
    path.join(paths.root, '.data'),
    path.join(home, '.agent-player'),
    ...['cdn', 'temp', 'files', 'images', path.join('worlds', 'user'), 'data'].map((d) => path.join(storage, d)),
  ];
}

export function planUninstall(paths: InstallPaths, ctx: PlanContext = {}): UninstallPlan {
  const home = ctx.home ?? os.homedir();
  const configDir = ctx.configDir ?? getConfigDir();
  const remove: PlanItem[] = [];
  const keep: PlanItem[] = [];
  const hints: string[] = [];
  const add = (list: PlanItem[], kind: ItemKind, p: string, note?: string) => {
    const type = entryType(p);
    if (type) list.push({ kind, path: p, type, ...(note ? { note } : {}) });
  };

  // Service units (INST-04b) — only this install's.
  const serviceBases: string[] = [];
  for (const platform of ['macos', 'linux'] as ServicePlatform[]) {
    const hint = installHint(platform, home);
    serviceBases.push(path.dirname(hint.file));
    if (!entryType(hint.file)) continue;
    let text = '';
    try { text = fs.readFileSync(hint.file, 'utf-8'); } catch { /* unreadable */ }
    if (text.includes(paths.root)) {
      add(remove, 'service', hint.file, 'unload it first');
      hints.push(hint.commands[hint.commands.length - 1]);
    } else {
      add(keep, 'service', hint.file, 'belongs to another install');
    }
  }

  add(remove, 'run', paths.runDir);
  add(remove, 'logs', paths.logsDir);

  // CLI config folder: only the CLI's / backend's own files.
  const auth = path.join(configDir, 'auth.json');
  if (readJson(auth)?.createdBy === 'agent-player-cli') add(remove, 'cli-config', auth, 'saved session token');
  else add(keep, 'cli-config', auth, 'not created by the CLI');
  const install = path.join(configDir, 'install.json');
  const rec = readJson(install);
  if (rec?.createdBy === 'agent-player-cli' && rec.root === paths.root) add(remove, 'cli-config', install, 'install record');
  else add(keep, 'cli-config', install, 'records another install');
  const instance = path.join(configDir, 'instance.json');
  if (readJson(instance)?.createdBy === 'agent-player-backend') add(remove, 'cli-config', instance, 'backend identity copy');
  else add(keep, 'cli-config', instance, 'not created by the backend');

  // Built output.
  const pkgs = path.join(paths.root, 'packages');
  let names: string[] = [];
  try { names = fs.readdirSync(pkgs).sort(); } catch { /* none */ }
  for (const name of names) add(remove, 'build', path.join(pkgs, name, 'dist'));
  add(remove, 'build', path.join(paths.root, '.next'));

  // Data.
  for (const loc of dataLocations(paths, home)) add(ctx.deleteData ? remove : keep, 'data', loc, ctx.deleteData ? undefined : 'kept (use --delete-data)');

  // Drop entries inside another removed folder.
  const dirs = remove.filter((i) => i.type === 'dir').map((i) => i.path);
  const deduped = remove.filter((i) => !dirs.some((d) => isInside(i.path, d)));

  return {
    remove: deduped,
    keep,
    hints,
    allowedBases: [paths.root, configDir, ...serviceBases],
    allowedExact: [path.join(home, '.agent-player')],
  };
}

export class UnsafePathError extends Error {}

/** Refuse anything outside the allowed bases, or a base / home / filesystem root itself. */
export function assertRemovable(p: string, plan: UninstallPlan, forbidden: string[]): void {
  if (!path.isAbsolute(p)) throw new UnsafePathError(`not an absolute path: ${p}`);
  const resolved = path.resolve(p);
  if (resolved === path.parse(resolved).root || forbidden.some((f) => path.resolve(f) === resolved)) {
    throw new UnsafePathError(`refusing to remove ${resolved}`);
  }
  const exact = plan.allowedExact.some((e) => path.resolve(e) === resolved);
  if (!exact && !plan.allowedBases.some((b) => isInside(resolved, path.resolve(b)))) {
    throw new UnsafePathError(`outside the install: ${resolved}`);
  }
  // The real parent folder must still be inside (no symlinked parent leading elsewhere).
  const real = (x: string) => { try { return fs.realpathSync(x); } catch { return path.resolve(x); } };
  const parentReal = real(path.dirname(resolved));
  const ok = exact
    ? plan.allowedExact.some((e) => real(path.dirname(e)) === parentReal)
    : plan.allowedBases.some((b) => parentReal === real(b) || isInside(parentReal, real(b)));
  if (!ok) throw new UnsafePathError(`parent folder leads outside the install: ${resolved}`);
}

export interface ApplyResult { removed: number; failed: Array<{ path: string; error: string }> }

export function applyUninstall(plan: UninstallPlan, ctx: { root: string; home: string; configDir: string }): ApplyResult {
  const forbidden = [ctx.root, ctx.home, ctx.configDir, path.dirname(ctx.root)];
  let removed = 0;
  const failed: ApplyResult['failed'] = [];
  for (const item of plan.remove) {
    try {
      assertRemovable(item.path, plan, forbidden);
      const type = entryType(item.path);
      if (!type) continue;
      if (type === 'dir') fs.rmSync(item.path, { recursive: true, force: false });
      else fs.unlinkSync(item.path);
      removed++;
    } catch (err: any) {
      failed.push({ path: item.path, error: String(err?.message ?? err).slice(0, 200) });
    }
  }
  try {
    if (fs.readdirSync(ctx.configDir).length === 0) fs.rmdirSync(ctx.configDir);
  } catch { /* missing or not empty */ }
  return { removed, failed };
}
