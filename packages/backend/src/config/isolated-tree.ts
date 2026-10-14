/**
 * Isolated data tree checks (RUN-ISO ISO-1).
 *
 * An isolated run owns one fresh, private data root. Before any secret is
 * generated or any store is opened, and again after the startup chain, the
 * whole tree is checked without following links:
 *
 *  - the root is a canonical path (no symlinked parent), a real directory,
 *    owned by the current user and private (no group/other bits);
 *  - its parent is a real directory owned by the current user, not group- or
 *    world-writable; every further ancestor is owned by root or the current
 *    user and not group- or world-writable unless sticky (e.g. /private/tmp);
 *  - every known store path (and each parent up to the root) is either
 *    missing or the expected type, never a symlink, owned by the current
 *    user and not group- or world-writable;
 *  - every entry under the root is a plain file or directory with the same
 *    owner and mode rules (no symlink, fifo, socket or device anywhere).
 *
 * Any unexpected filesystem error fails closed. Messages name paths relative
 * to the data root, never file contents.
 *
 * Limit: this is a check, not a lock. It defends a fresh root against
 * pre-planted links; it does not stop a same-user process that swaps a path
 * between the check and the open.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Directories the launcher creates (in this order, each 0700, never recursive). */
export const ISOLATED_DIRS: readonly string[] = [
  'run', 'home', 'home/.config', 'tmp', 'logs',
  'encryption', 'memory', 'multi-agent', 'browser', 'browser/screenshots', 'browser/downloads',
  'audit', 'gateway', 'webhooks', 'uploads', 'audio', 'agents', 'workspaces', 'credentials',
  'backups', 'storage',
];

/** Store files under the root (checked when present; created later by the server). */
export const ISOLATED_FILES: readonly string[] = [
  'agent-player.db', 'agent-player.db-wal', 'agent-player.db-shm', 'secrets.env', 'instance.json',
  '.setup_complete', 'logs/backend.log',
  'encryption/keys.db', 'encryption/credentials.db', 'memory/memory.db', 'multi-agent/orchestrator.db',
  'audit/audit.db', 'audit/audit.log', 'webhooks/webhooks.db',
];

/** Folders some store may create later; when present they must be plain directories. */
const OPTIONAL_DIRS: readonly string[] = ['mcp-servers', 'skills', 'python', 'whatsapp-session'];

export const LOG_FILE = path.join('logs', 'backend.log');

const MAX_ENTRIES = 200_000;

export class IsolatedTreeError extends Error {
  constructor(readonly problems: string[]) {
    super(`isolated data tree refused: ${problems.join('; ')}`);
    this.name = 'IsolatedTreeError';
  }
}

function currentUid(): number | null {
  return typeof process.getuid === 'function' ? process.getuid() : null;
}

const groupOrWorldWritable = (st: fs.Stats) => (st.mode & 0o022) !== 0;
const sticky = (st: fs.Stats) => (st.mode & 0o1000) !== 0;

function lstatOrNull(p: string): fs.Stats | null {
  try {
    return fs.lstatSync(p);
  } catch (err: any) {
    if (err?.code === 'ENOENT') return null;
    throw err;
  }
}

/** Owner and mode problems of one entry (`label` names it in messages). */
function entryProblems(st: fs.Stats, label: string, uid: number | null): string[] {
  const out: string[] = [];
  if (st.isSymbolicLink()) return [`${label} is a symlink`];
  if (!st.isFile() && !st.isDirectory()) return [`${label} is not a plain file or directory`];
  if (uid !== null && st.uid !== uid) out.push(`${label} is owned by another user`);
  if (uid !== null && groupOrWorldWritable(st)) out.push(`${label} is group- or world-writable`);
  return out;
}

/**
 * The parent that will hold a fresh data root: an existing, canonical, real
 * directory owned by the current user and not group/world-writable unless
 * sticky; each further ancestor owned by root or the current user and not
 * group/world-writable unless sticky.
 */
export function checkTrustedParent(dir: string): string[] {
  const uid = currentUid();
  const abs = path.resolve(dir);
  let st: fs.Stats | null;
  try {
    st = lstatOrNull(abs);
  } catch {
    return ['the parent of AGENT_PLAYER_DATA_DIR cannot be checked'];
  }
  if (!st) return ['the parent of AGENT_PLAYER_DATA_DIR must exist'];
  if (st.isSymbolicLink()) return ['the parent of AGENT_PLAYER_DATA_DIR must not be a symlink'];
  if (!st.isDirectory()) return ['the parent of AGENT_PLAYER_DATA_DIR must be a directory'];
  const out: string[] = [];
  try {
    if (fs.realpathSync.native(abs) !== abs) out.push('the parent of AGENT_PLAYER_DATA_DIR must be a canonical path (no symlinked ancestor)');
  } catch {
    out.push('the parent of AGENT_PLAYER_DATA_DIR cannot be resolved');
  }
  if (uid !== null) {
    if (st.uid !== uid) out.push('the parent of AGENT_PLAYER_DATA_DIR must be owned by the current user');
    if (groupOrWorldWritable(st) && !sticky(st)) out.push('the parent of AGENT_PLAYER_DATA_DIR must not be group- or world-writable');
    for (let cur = path.dirname(abs); ; cur = path.dirname(cur)) {
      try {
        const a = fs.lstatSync(cur);
        if (a.uid !== 0 && a.uid !== uid) out.push(`ancestor ${cur} is owned by another user`);
        if (groupOrWorldWritable(a) && !sticky(a)) out.push(`ancestor ${cur} is group- or world-writable`);
      } catch {
        out.push(`ancestor ${cur} cannot be checked`);
      }
      if (path.dirname(cur) === cur) break;
    }
  }
  return out;
}

/** Problems with the data root itself (must already exist). */
function rootProblems(root: string, uid: number | null): string[] {
  let st: fs.Stats | null;
  try {
    st = lstatOrNull(root);
  } catch {
    return ['the data root cannot be checked'];
  }
  if (!st) return ['the data root does not exist'];
  if (st.isSymbolicLink()) return ['the data root is a symlink'];
  if (!st.isDirectory()) return ['the data root is not a directory'];
  const out: string[] = [];
  try {
    if (fs.realpathSync.native(root) !== root) out.push('the data root must be a canonical path (no symlinked parent)');
  } catch {
    out.push('the data root cannot be resolved');
  }
  if (uid !== null && st.uid !== uid) out.push('the data root is owned by another user');
  if (uid !== null && (st.mode & 0o077) !== 0) out.push('the data root must be private (mode 0700)');
  return out;
}

/** Each component of `rel` under root: missing (fine), or the expected type with safe owner/mode. */
function storePathProblems(root: string, rel: string, kind: 'dir' | 'file', uid: number | null): string[] {
  const parts = rel.split('/');
  for (let i = 0; i < parts.length; i++) {
    const relPart = parts.slice(0, i + 1).join('/');
    const p = path.join(root, ...parts.slice(0, i + 1));
    let st: fs.Stats | null;
    try {
      st = lstatOrNull(p);
    } catch {
      return [`<data root>/${relPart} cannot be checked`];
    }
    if (!st) return [];
    const label = `<data root>/${relPart}`;
    const problems = entryProblems(st, label, uid);
    if (problems.length) return problems;
    const last = i === parts.length - 1;
    if (!last && !st.isDirectory()) return [`${label} must be a directory`];
    if (last && kind === 'dir' && !st.isDirectory()) return [`${label} must be a directory`];
    if (last && kind === 'file' && !st.isFile()) return [`${label} must be a regular file`];
  }
  return [];
}

/** Every entry under root, without following links. */
function walkProblems(root: string, uid: number | null): string[] {
  const out: string[] = [];
  const stack = [root];
  let seen = 0;
  while (stack.length) {
    const dir = stack.pop()!;
    let names: string[];
    try {
      names = fs.readdirSync(dir);
    } catch {
      out.push(`<data root>/${path.relative(root, dir)} cannot be listed`);
      continue;
    }
    for (const name of names) {
      if (++seen > MAX_ENTRIES) return [...out, 'the data root holds too many entries to check'];
      const p = path.join(dir, name);
      const label = `<data root>/${path.relative(root, p)}`;
      let st: fs.Stats;
      try {
        st = fs.lstatSync(p);
      } catch (err: any) {
        if (err?.code === 'ENOENT') continue; // removed while listing (e.g. a SQLite journal)
        out.push(`${label} cannot be checked`);
        continue;
      }
      out.push(...entryProblems(st, label, uid));
      if (!st.isSymbolicLink() && st.isDirectory()) stack.push(p);
    }
  }
  return out;
}

/** All problems with the isolated data tree at `root` (empty = safe). */
export function checkIsolatedTree(root: string): string[] {
  const abs = path.resolve(root);
  const uid = currentUid();
  const first = rootProblems(abs, uid);
  if (first.length) return first;
  const out = [...checkTrustedParent(path.dirname(abs))];
  for (const d of [...ISOLATED_DIRS, ...OPTIONAL_DIRS]) out.push(...storePathProblems(abs, d, 'dir', uid));
  for (const f of ISOLATED_FILES) out.push(...storePathProblems(abs, f, 'file', uid));
  out.push(...walkProblems(abs, uid));
  return [...new Set(out)];
}

/**
 * Create the launcher log file: it must not exist yet and is never followed
 * through a link (O_CREAT|O_EXCL|O_NOFOLLOW, mode 0600). Throws otherwise.
 */
export function openFreshLogFile(file: string): number {
  const c = fs.constants;
  return fs.openSync(file, c.O_WRONLY | c.O_CREAT | c.O_EXCL | c.O_NOFOLLOW | c.O_APPEND, 0o600);
}

/** Throws IsolatedTreeError when the isolated data tree is unsafe. */
export function assertSafeIsolatedTree(root: string): void {
  const problems = checkIsolatedTree(root);
  if (problems.length) throw new IsolatedTreeError(problems);
}
