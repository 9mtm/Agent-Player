/**
 * One-time setup token for claiming the first owner (INSTALLER-07).
 *
 * The CLI (`agent-player setup` / `start`) or the desktop shell creates a
 * random token while no owner exists, keeps the plain value in memory only
 * (it is shown on the local terminal or put in the local link it opens) and
 * writes just its SHA-256 hash to `<data root>/setup-token.json` (0600).
 * POST /api/setup/admin then needs that token, from a loopback peer; the
 * file is deleted once the owner exists, so the token works only once.
 *
 * File format (shared with packages/cli/src/utils/setup-token.ts):
 *   { "v": 1, "hash": "<64 hex>", "createdAt": "<ISO time>" }
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { dataPath } from '../config/data-root.js';

export const SETUP_TOKEN_FILE = 'setup-token.json';
/** A token older than this is refused; run setup again for a new one. */
export const SETUP_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

export type SetupTokenCheck = 'ok' | 'missing' | 'invalid' | 'expired';

export function setupTokenPath(dir?: string): string {
  return dir ? path.join(dir, SETUP_TOKEN_FILE) : dataPath(SETUP_TOKEN_FILE);
}

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

/** True when the value has the shape of an issued token (32 random bytes, base64url). */
export function validSetupTokenShape(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_SHAPE.test(value);
}

/**
 * Create a new token (replacing any earlier one) and return its plain value.
 * Never log the return value.
 */
export function issueSetupToken(dir?: string, now: Date = new Date()): string {
  const token = randomBytes(32).toString('base64url');
  const file = setupTokenPath(dir);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify({ v: 1, hash: sha256(token), createdAt: now.toISOString() })}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
  return token;
}

function readRecord(file: string): { hash: string; createdAt: number } | null {
  let raw: unknown;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const createdAt = typeof r.createdAt === 'string' ? Date.parse(r.createdAt) : NaN;
  if (r.v !== 1 || typeof r.hash !== 'string' || !/^[a-f0-9]{64}$/.test(r.hash) || !Number.isFinite(createdAt)) return null;
  return { hash: r.hash, createdAt };
}

/** Compare a presented token with the stored hash (constant time). */
export function checkSetupToken(presented: unknown, dir?: string, now: number = Date.now()): SetupTokenCheck {
  const record = readRecord(setupTokenPath(dir));
  if (!record) return 'missing';
  if (!validSetupTokenShape(presented)) return 'invalid';
  const match = timingSafeEqual(Buffer.from(sha256(presented), 'hex'), Buffer.from(record.hash, 'hex'));
  if (!match) return 'invalid';
  if (now - record.createdAt > SETUP_TOKEN_MAX_AGE_MS || record.createdAt - now > 60_000) return 'expired';
  return 'ok';
}

/** Delete the token file (after the owner exists). Missing file is fine. */
export function consumeSetupToken(dir?: string): void {
  try { fs.unlinkSync(setupTokenPath(dir)); } catch (error: any) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

/** True when the TCP peer is this machine. Uses the socket, never forwarded headers. */
export function isLoopbackPeer(address: string | undefined): boolean {
  if (!address) return false;
  const a = address.startsWith('::ffff:') ? address.slice(7) : address;
  return a === '::1' || /^127(?:\.\d{1,3}){3}$/.test(a);
}
