/**
 * Local file selection for `agent-player import` (CLI-02).
 *
 * Reads ONLY the paths the owner names on the command line. A folder is read
 * only with --recursive, and then only its readable text files (same filters,
 * bounded depth, no symlinks, no hidden folders). Nothing scans home folders
 * such as ~/.claude or ~/.codex on its own.
 *
 * These local checks only avoid sending obviously wrong files; the backend
 * pipeline repeats every check (one pipeline for UI and CLI).
 */

import fs from 'fs';
import path from 'path';

export const MAX_FILES = 20;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
export const MAX_DEPTH = 3;

const TEXT_EXT = /\.(md|markdown|mdown|mkd|txt|text)$/i;

export interface SelectedFile {
  /** Path as given / found (shown to the owner only). */
  path: string;
  /** Basename sent to the backend (never the full path). */
  name: string;
  bytes: Buffer;
}

export interface SkippedFile {
  path: string;
  reason: string;
}

export interface Selection {
  files: SelectedFile[];
  skipped: SkippedFile[];
}

/** Credential / key / config names that are never read (checked case-insensitively, like the on-disk name). */
export function deniedName(name: string): string | null {
  const lc = name.toLowerCase();
  if (lc.startsWith('.env') || lc.endsWith('.env')) return 'environment file';
  if (lc.startsWith('credentials') || lc === '.netrc' || lc === '.npmrc' || lc === '.pypirc' || lc === 'auth.json' || lc === 'secrets.env') return 'credential file';
  if (/^id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/.test(lc) || lc === 'authorized_keys' || lc === 'known_hosts') return 'SSH key file';
  if (/\.(pem|key|p12|pfx|ppk|kdbx|keychain|keychain-db|gpg|asc)$/.test(lc)) return 'key file';
  if (/\.(db|sqlite|sqlite3)(-wal|-shm)?$/.test(lc)) return 'database file';
  return null;
}

/** Folders that are never read from, whatever is asked (case-insensitive). */
export function deniedLocation(absolute: string): string | null {
  for (const part of absolute.split(path.sep)) {
    const lc = part.toLowerCase();
    if (lc === '.ssh' || lc === '.gnupg' || lc === '.aws' || lc === '.git') return `files under ${part} are never imported`;
    if (lc === 'keychains') return 'keychains are never imported';
  }
  return null;
}

function checkName(p: string): string | null {
  const base = path.basename(p);
  return deniedName(base) ?? (TEXT_EXT.test(base) ? null : 'only Markdown (.md) and plain text (.txt) files are imported');
}

/** Read one regular file without following a symlink; the opened file must be the one checked. */
function readChecked(p: string, st: fs.Stats): Buffer {
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
  const fd = fs.openSync(p, flags);
  try {
    const fst = fs.fstatSync(fd);
    if (!fst.isFile() || fst.ino !== st.ino || fst.dev !== st.dev) throw new Error('the file changed while it was opened');
    if (fst.size > MAX_FILE_BYTES) throw new Error('larger than 2 MiB');
    const buf = Buffer.alloc(fst.size);
    let off = 0;
    while (off < fst.size) {
      const n = fs.readSync(fd, buf, off, fst.size - off, off);
      if (n <= 0) break;
      off += n;
    }
    return buf.subarray(0, off);
  } finally {
    fs.closeSync(fd);
  }
}

export function selectFiles(paths: string[], options: { recursive?: boolean; cwd?: string } = {}): Selection {
  const cwd = options.cwd ?? process.cwd();
  const out: Selection = { files: [], skipped: [] };
  let total = 0;
  const seen = new Set<string>();

  const addFile = (p: string, st: fs.Stats) => {
    const abs = path.resolve(cwd, p);
    const key = `${st.dev}:${st.ino}`;
    if (seen.has(key)) return;
    seen.add(key);
    const reason = deniedLocation(abs) ?? checkName(abs);
    if (reason) { out.skipped.push({ path: p, reason }); return; }
    if (st.size > MAX_FILE_BYTES) { out.skipped.push({ path: p, reason: 'larger than 2 MiB' }); return; }
    if (out.files.length >= MAX_FILES) { out.skipped.push({ path: p, reason: `more than ${MAX_FILES} files selected` }); return; }
    if (total + st.size > MAX_TOTAL_BYTES) { out.skipped.push({ path: p, reason: 'the selection would exceed 10 MiB in total' }); return; }
    try {
      const bytes = readChecked(abs, st);
      total += bytes.length;
      out.files.push({ path: p, name: path.basename(abs), bytes });
    } catch (err: any) {
      out.skipped.push({ path: p, reason: err?.code === 'ELOOP' ? 'symbolic link (not followed)' : `cannot read: ${err?.message || 'error'}` });
    }
  };

  const walk = (dir: string, depth: number) => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(path.resolve(cwd, dir), { withFileTypes: true }); } catch { out.skipped.push({ path: dir, reason: 'cannot read folder' }); return; }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isSymbolicLink()) continue; // never followed
      if (e.isDirectory()) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        if (depth < MAX_DEPTH) walk(p, depth + 1);
        continue;
      }
      if (!e.isFile() || !TEXT_EXT.test(e.name) || deniedName(e.name)) continue;
      const st = fs.lstatSync(path.resolve(cwd, p));
      addFile(p, st);
    }
  };

  for (const p of paths) {
    let st: fs.Stats;
    try { st = fs.lstatSync(path.resolve(cwd, p)); } catch { out.skipped.push({ path: p, reason: 'not found' }); continue; }
    if (st.isSymbolicLink()) { out.skipped.push({ path: p, reason: 'symbolic link (not followed)' }); continue; }
    if (st.isDirectory()) {
      if (!options.recursive) { out.skipped.push({ path: p, reason: 'is a folder (add --recursive to import its text files)' }); continue; }
      const loc = deniedLocation(path.resolve(cwd, p));
      if (loc) { out.skipped.push({ path: p, reason: loc }); continue; }
      walk(p, 1);
      continue;
    }
    if (!st.isFile()) { out.skipped.push({ path: p, reason: 'not a regular file' }); continue; }
    addFile(p, st);
  }
  return out;
}
