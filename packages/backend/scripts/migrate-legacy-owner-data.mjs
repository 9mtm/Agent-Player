#!/usr/bin/env node
/**
 * One-time move of the owner's legacy data to the owner account (Q-9).
 *
 * Before S0-Q.11 every chat session was stored under the placeholder user
 * `mock-user`, and memories under the old development email
 * (`admin@agentplayer.local` / ADMIN_EMAIL), the owner's email, `default` or
 * `mock-user`. Sessions and memories are now keyed by the signed-in user's
 * id, so that data no longer shows up. This script re-keys it to the first
 * owner's id (the key both tables use today).
 *
 * Safety:
 *   - runs only when invoked; `--dry-run` is the default (read-only, counts only)
 *   - `--apply` first writes a consistent backup (`VACUUM INTO`) next to the
 *     database in `backups/` (default `.data/backups/`), verifies it, then
 *     updates inside one transaction
 *   - prints counts only, never content
 *   - safe to re-run: a second run finds nothing left to move
 *
 * Usage (from packages/backend, or pass --db):
 *   node scripts/migrate-legacy-owner-data.mjs [--dry-run]
 *   node scripts/migrate-legacy-owner-data.mjs --apply [--db path/to/agent-player.db] [--legacy-email a@b]
 */

import { createRequire } from 'node:module';
import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

/** Placeholder ids/keys that legacy data was stored under. */
export const LEGACY_SESSION_USERS = Object.freeze(['mock-user']);
export const LEGACY_MEMORY_KEYS = Object.freeze(['mock-user', 'default', 'admin@agentplayer.local']);
const SYSTEM_IDS = ['mock-user', '1'];

function tableExists(db, name) {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
}

function firstOwner(db) {
  if (!tableExists(db, 'users')) return null;
  return db.prepare(
    `SELECT id, email FROM users
      WHERE role = 'owner' AND status = 'active' AND id NOT IN (${SYSTEM_IDS.map(() => '?').join(',')})
      ORDER BY created_at ASC, rowid ASC LIMIT 1`
  ).get(...SYSTEM_IDS) ?? null;
}

function countIn(db, table, column, keys) {
  if (!keys.length || !tableExists(db, table)) return 0;
  return db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${column} IN (${keys.map(() => '?').join(',')})`).get(...keys).n;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-');
}

/**
 * @param {object} opts
 * @param {string} opts.dbPath          SQLite database file
 * @param {boolean} [opts.apply]        false (default) = dry run
 * @param {string} [opts.backupDir]     default `<db dir>/backups`
 * @param {string[]} [opts.legacyEmails] extra legacy memory keys (e.g. ADMIN_EMAIL)
 * @returns {{ ok: boolean, reason?: string, applied: boolean, sessions: number, memories: number, backupPath?: string }}
 */
export function migrateLegacyOwnerData(opts) {
  const Database = require('better-sqlite3');
  const dbPath = resolve(opts.dbPath);
  const apply = opts.apply === true;
  if (!existsSync(dbPath)) return { ok: false, reason: 'database not found', applied: false, sessions: 0, memories: 0 };

  const db = new Database(dbPath, { readonly: !apply, fileMustExist: true });
  try {
    const owner = firstOwner(db);
    if (!owner) return { ok: false, reason: 'no active owner account', applied: false, sessions: 0, memories: 0 };

    const memoryKeys = [...new Set([
      ...LEGACY_MEMORY_KEYS,
      ...(opts.legacyEmails ?? []),
      owner.email,
    ].filter((k) => typeof k === 'string' && k !== '' && k !== owner.id))];
    const sessionKeys = LEGACY_SESSION_USERS.filter((k) => k !== owner.id);

    const sessions = countIn(db, 'chat_sessions', 'user_id', sessionKeys);
    const memories = countIn(db, 'memories', 'user_id', memoryKeys);
    if (!apply || (sessions === 0 && memories === 0)) {
      return { ok: true, applied: false, sessions, memories };
    }

    // Consistent backup first; refuse to change anything if it cannot be verified.
    const backupDir = resolve(opts.backupDir ?? join(dirname(dbPath), 'backups'));
    mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    const backupPath = join(backupDir, `agent-player-${timestamp()}-pre-legacy-owner.db`);
    if (existsSync(backupPath)) return { ok: false, reason: 'backup file already exists', applied: false, sessions, memories };
    db.prepare('VACUUM INTO ?').run(backupPath);
    try { chmodSync(backupPath, 0o600); } catch { /* best effort */ }
    const check = new Database(backupPath, { readonly: true, fileMustExist: true });
    try {
      const integrity = check.prepare('PRAGMA integrity_check').pluck().get();
      const bSessions = countIn(check, 'chat_sessions', 'user_id', sessionKeys);
      const bMemories = countIn(check, 'memories', 'user_id', memoryKeys);
      if (integrity !== 'ok' || bSessions !== sessions || bMemories !== memories) {
        return { ok: false, reason: 'backup verification failed', applied: false, sessions, memories, backupPath };
      }
    } finally {
      check.close();
    }

    const move = db.transaction(() => {
      let s = 0;
      let m = 0;
      if (sessions && sessionKeys.length) {
        s = db.prepare(`UPDATE chat_sessions SET user_id = ? WHERE user_id IN (${sessionKeys.map(() => '?').join(',')})`)
          .run(owner.id, ...sessionKeys).changes;
      }
      if (memories && memoryKeys.length) {
        m = db.prepare(`UPDATE memories SET user_id = ? WHERE user_id IN (${memoryKeys.map(() => '?').join(',')})`)
          .run(owner.id, ...memoryKeys).changes;
      }
      return { s, m };
    });
    const { s, m } = move();
    return { ok: true, applied: true, sessions: s, memories: m, backupPath };
  } finally {
    db.close();
  }
}

function parseArgs(argv) {
  const out = { apply: false, dbPath: process.env.DATABASE_PATH || join(process.cwd(), '.data', 'agent-player.db'), legacyEmails: [] };
  if (process.env.ADMIN_EMAIL) out.legacyEmails.push(process.env.ADMIN_EMAIL);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') out.apply = true;
    else if (a === '--dry-run') out.apply = false;
    else if (a === '--db') out.dbPath = argv[++i];
    else if (a === '--backup-dir') out.backupDir = argv[++i];
    else if (a === '--legacy-email') out.legacyEmails.push(argv[++i]);
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  if (args.help) {
    console.log('Usage: node scripts/migrate-legacy-owner-data.mjs [--dry-run | --apply] [--db FILE] [--backup-dir DIR] [--legacy-email EMAIL]');
    process.exit(0);
  }
  const r = migrateLegacyOwnerData(args);
  if (!r.ok) {
    console.error(`Not migrated: ${r.reason}.`);
    process.exit(1);
  }
  const mode = args.apply ? (r.applied ? 'applied' : 'nothing to move') : 'dry run (no changes; use --apply)';
  console.log(`Legacy owner data — ${mode}`);
  console.log(`  chat sessions: ${r.sessions}`);
  console.log(`  memories:      ${r.memories}`);
  if (r.backupPath) console.log(`  backup:        ${r.backupPath}`);
}
