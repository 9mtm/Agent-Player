/**
 * Runtime uploads live outside `public/` (Q-11, CL-05).
 *
 * Avatars, backgrounds, animations, profile pictures, logos and the storage
 * manager's cache/cdn/extension zones used to be written under the repo
 * `public/storage/`, which Next.js serves to anyone. They now live under
 * `<repo>/.data/uploads/` (override: `UPLOADS_DIR`), with the same layout:
 * `public/storage/<rel>` -> `.data/uploads/<rel>`.
 *
 * Stored URLs keep the `/storage/<rel>` form. The browser loads them from the
 * Next.js `/storage/[...path]` route, which forwards the signed-in user's
 * token to the backend `GET /api/uploads/*`; that route applies
 * `canReadUpload` (owner/admin or the user the files belong to).
 *
 * `moveLegacyPublicUploads` moves existing files from `public/storage/` to
 * the new root. It is called only by `scripts/move-public-uploads.ts`, never
 * at startup.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

/** URL prefix stored in the database for uploaded files. */
export const UPLOAD_URL_PREFIX = '/storage/';

/** Repo root as seen from the backend process (cwd = packages/backend). */
function repoRoot(): string {
  return path.join(process.cwd(), '..', '..');
}

export function getUploadsRoot(): string {
  return process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.join(repoRoot(), '.data', 'uploads');
}

/** Old location (repo `public/storage`), only for the explicit move. */
export function getLegacyPublicStorageRoot(): string {
  return path.join(repoRoot(), 'public', 'storage');
}

// Printable ASCII; first char not a space; last char not a dot or space.
const SAFE_SEGMENT = /^[\x21-\x7e](?:[\x20-\x7e]*[\x21-\x2d\x2f-\x7e])?$/;

/** Split a relative upload path into safe segments, or null. */
export function safeSegments(rel: string): string[] | null {
  if (typeof rel !== 'string' || rel.includes('\0') || rel.includes('\\')) return null;
  const parts = rel.split('/').filter((s) => s !== '');
  if (parts.length === 0) return null;
  for (const s of parts) {
    if (s === '.' || s === '..' || !SAFE_SEGMENT.test(s)) return null;
  }
  return parts;
}

/** Absolute path under the uploads root for trusted, code-built segments. */
export function uploadsPath(...segments: string[]): string {
  const root = getUploadsRoot();
  const abs = path.resolve(root, ...segments);
  const rel = path.relative(root, abs);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Upload path escapes the uploads root');
  return abs;
}

/** `/storage/<rel>` URL for a path relative to the uploads root. */
export function uploadUrl(...segments: string[]): string {
  return UPLOAD_URL_PREFIX + segments.join('/');
}

/**
 * Absolute file path for a stored `/storage/<rel>` URL (used to delete a
 * user's own file), or null when the URL is not an upload URL or unsafe.
 */
export function uploadPathFromUrl(url: string | null | undefined): string | null {
  if (typeof url !== 'string' || !url.startsWith(UPLOAD_URL_PREFIX)) return null;
  const parts = safeSegments(url.slice(UPLOAD_URL_PREFIX.length).split(/[?#]/)[0]);
  if (!parts) return null;
  return path.join(getUploadsRoot(), ...parts);
}

/**
 * Existing regular file for an untrusted relative path, with the canonical
 * on-disk path (symlinks resolved) inside the uploads root; else null.
 */
export function resolveUploadFile(rel: string): string | null {
  const parts = safeSegments(rel);
  if (!parts) return null;
  try {
    const realRoot = fs.realpathSync.native(getUploadsRoot());
    const real = fs.realpathSync.native(path.join(getUploadsRoot(), ...parts));
    const r = path.relative(realRoot, real);
    if (r === '' || r.startsWith('..') || path.isAbsolute(r)) return null;
    if (!fs.statSync(real).isFile()) return null;
    // The canonical path must be exactly the requested one (no symlink or
    // case/Unicode folding), so the access rule checked on it holds.
    if (r.split(path.sep).join('/') !== parts.join('/')) return null;
    return real;
  } catch {
    return null;
  }
}

export interface UploadReader { id: string; role: string }

const PRIVILEGED = new Set(['owner', 'admin']);

/**
 * Who may read an upload (by its path relative to the uploads root).
 *   avatars/user/<uid>/…, animations/user/<uid>/…, backgrounds/<uid>/… → that user, owner, admin
 *   profiles/…, logos/…, cache/avatar-models/…                         → any signed-in user
 *   everything else (cache, cdn, extensions, unknown zones)            → owner, admin
 * `guest` accounts never read uploads here.
 */
export function canReadUpload(user: UploadReader | null | undefined, rel: string): boolean {
  if (!user || !user.id || user.role === 'guest') return false;
  const parts = safeSegments(rel);
  if (!parts || parts.length < 2) return false;
  if (PRIVILEGED.has(user.role)) return true;
  const [zone, sub] = parts;
  if (zone === 'profiles' || zone === 'logos') return true;
  if (zone === 'cache' && sub === 'avatar-models') return parts.length > 2;
  if ((zone === 'avatars' || zone === 'animations') && sub === 'user') return parts.length > 3 && parts[2] === user.id;
  if (zone === 'backgrounds') return parts.length > 2 && parts[1] === user.id;
  return false;
}

export const UPLOAD_MIME: Readonly<Record<string, string>> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.fbx': 'application/octet-stream',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf',
};

export function uploadMimeType(file: string): string {
  return UPLOAD_MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
}

// ---------------------------------------------------------------------------
// Explicit one-time move: public/storage -> uploads root
// ---------------------------------------------------------------------------

export interface MoveUploadsResult {
  /** Files copied, verified and removed from the old location. */
  moved: number;
  /** Already present with identical content at the new location; old copy removed. */
  alreadyPresent: number;
  /** A different file already exists at the destination; left in place. */
  conflicts: number;
  /** Symlinks and other non-regular entries; left in place. */
  skipped: number;
  /** Copy or verification failures; source left in place. */
  errors: number;
  /** Files that would be moved (dry run). */
  planned: number;
}

function sha256File(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/**
 * Move every file under `from` (default `public/storage`) to `to` (default
 * the uploads root), keeping relative paths. Copy, verify (size + SHA-256),
 * then remove the source. Idempotent: a re-run finds nothing to move.
 * Never follows symlinks. Logs counts only.
 */
export function moveLegacyPublicUploads(opts: {
  from?: string;
  to?: string;
  dryRun?: boolean;
  log?: (line: string) => void;
} = {}): MoveUploadsResult {
  const from = path.resolve(opts.from ?? getLegacyPublicStorageRoot());
  const to = path.resolve(opts.to ?? getUploadsRoot());
  const dryRun = opts.dryRun === true;
  const result: MoveUploadsResult = { moved: 0, alreadyPresent: 0, conflicts: 0, skipped: 0, errors: 0, planned: 0 };
  const rel = path.relative(from, to);
  if (rel === '' || !rel.startsWith('..')) throw new Error('Destination must not be inside the source');

  if (!fs.existsSync(from) || !fs.lstatSync(from).isDirectory()) {
    opts.log?.('[uploads] nothing to move (no old storage folder)');
    return result;
  }

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const src = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) { result.skipped++; continue; }
      if (entry.isDirectory()) { walk(src); continue; }
      if (!entry.isFile()) { result.skipped++; continue; }
      const dest = path.join(to, path.relative(from, src));
      try {
        if (fs.existsSync(dest)) {
          const same = fs.lstatSync(dest).isFile() && fs.statSync(dest).size === fs.statSync(src).size && sha256File(dest) === sha256File(src);
          if (!same) { result.conflicts++; continue; }
          if (dryRun) { result.planned++; continue; }
          fs.unlinkSync(src);
          result.alreadyPresent++;
          continue;
        }
        if (dryRun) { result.planned++; continue; }
        fs.mkdirSync(path.dirname(dest), { recursive: true, mode: 0o700 });
        fs.copyFileSync(src, dest, fs.constants.COPYFILE_EXCL);
        if (fs.statSync(dest).size !== fs.statSync(src).size || sha256File(dest) !== sha256File(src)) {
          fs.unlinkSync(dest);
          result.errors++;
          continue;
        }
        fs.unlinkSync(src);
        result.moved++;
      } catch {
        result.errors++;
      }
    }
  };
  walk(from);

  if (!dryRun) {
    // Remove now-empty folders (deepest first); keep any folder that still holds files.
    const prune = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && !entry.isSymbolicLink()) prune(path.join(dir, entry.name));
      }
      if (dir !== from && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
    };
    try { prune(from); } catch { /* best effort */ }
  }

  opts.log?.(`[uploads] ${dryRun ? 'dry run' : 'done'}: moved ${result.moved}, already present ${result.alreadyPresent}, ` +
    `planned ${result.planned}, conflicts ${result.conflicts}, skipped ${result.skipped}, errors ${result.errors}`);
  return result;
}
