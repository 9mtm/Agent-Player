/**
 * Secrets typed in the chat go to the key store (CHAT-SECRETS-01).
 *
 * When a user message is saved, every secret the memory-import redaction
 * finds (API keys, tokens, passwords, credentials in URLs …) is stored
 * encrypted in the credential store (AES-256-GCM, credentials/encryption.ts),
 * owned by that user, and the message keeps only a reference:
 *
 *     [SECRET:<type>:<id>]        e.g. [SECRET:github_token:k3j9x0a1bq]
 *
 * So the raw value never reaches chat_messages, the conversation title, run
 * events, search, export, memory or the model's history (cloud models too).
 *
 * Use by the agent: the model sees and passes the reference. The tools
 * registry resolves references in a tool call's input at call time
 * (resolveSecretRefs), only for the user who owns them and never in a
 * channel turn; such a call always waits for a one-time owner approval, and
 * the raw value is replaced by the reference again in the tool's result
 * (scrubSecretValues) before the model, the events or the stored turn see it.
 *
 * Credential rows: name `chat:<type>:<id>`, skill_id `chat`, description
 * `chat:<conversationId>`, user_id = the owner.
 *
 * If the store cannot save a value (e.g. encryption fails), the value is
 * dropped as `[REDACTED:<type>]`; it is never kept in plain text.
 */

import { randomBytes } from 'node:crypto';
import { getCredentialManager } from '../credentials/manager.js';
import { getCredentialStorage } from '../credentials/storage.js';
import { CredentialType } from '../credentials/types.js';
import { redactImportText, SECRET_REF_RE, type RedactionType } from '../memory/import/redact.js';
import { q } from '../repositories/sql-steps.js';
import { dbDriver } from '../db/pg/config.js';
import { getDatabase } from '../db/index.js';

export const CHAT_SECRET_SKILL = 'chat';
const NAME_RE = /^chat:([a-z_]+):([a-z0-9]{6,32})$/;
const REF_ID = /^[a-z0-9]{6,32}$/;

export interface SavedSecret { id: string; type: RedactionType; ref: string }
export interface ChatSecret { id: string; type: string; ref: string; conversationId: string | null; createdAt: string; lastUsed: string | null }

export class ChatSecretsError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export const secretRef = (type: string, id: string): string => `[SECRET:${type}:${id}]`;
const credentialName = (type: string, id: string): string => `chat:${type}:${id}`;
const newId = (): string => {
  const bytes = randomBytes(10);
  return [...bytes].map((b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
};

function credentialTypeOf(type: RedactionType): CredentialType {
  if (type === 'password' || type === 'url_credentials' || type === 'basic_auth') return CredentialType.PASSWORD;
  if (type === 'private_key' || type === 'secret_assignment' || type === 'azure_connection_string') return CredentialType.SECRET;
  if (type === 'jwt' || type === 'bearer_token' || type === 'gcp_oauth_token') return CredentialType.OAUTH_TOKEN;
  return CredentialType.API_KEY;
}

let ready: Promise<void> | null = null;
function storeReady(): Promise<void> {
  ready ??= getCredentialStorage().initialize().catch((err) => { ready = null; throw err; });
  return ready;
}

/**
 * Move every secret in `text` into the key store of `userId` and return the
 * text with references. The same value twice in one text gets one reference.
 */
export async function vaultSecretsInText(userId: string, conversationId: string, text: string, known?: Map<string, SavedSecret>): Promise<{ text: string; saved: SavedSecret[] }> {
  const found = new Map<string, SavedSecret>(); // value -> reference (new in this text)
  const values = new Map<string, string>(); // id -> value
  const scanned = redactImportText(text, {
    onSecret: (type, value) => {
      const stored = known?.get(value);
      if (stored) return stored.ref;
      let s = found.get(value);
      if (!s) {
        const id = newId();
        s = { id, type, ref: secretRef(type, id) };
        found.set(value, s);
        values.set(id, value);
      }
      return s.ref;
    },
  });
  if (scanned.total === 0) return { text, saved: [] };
  let out = scanned.text;
  const saved: SavedSecret[] = [];
  for (const s of found.values()) {
    try {
      await storeReady();
      await getCredentialManager().create({
        name: credentialName(s.type, s.id), type: credentialTypeOf(s.type), value: values.get(s.id)!,
        description: `chat:${conversationId}`, skillId: CHAT_SECRET_SKILL, userId,
      });
      saved.push(s);
      known?.set(values.get(s.id)!, s);
    } catch {
      // Never keep the value in plain text: drop it instead of referencing it.
      out = out.split(s.ref).join(`[REDACTED:${s.type}]`);
      console.warn('[ChatSecrets] A secret could not be stored; it was removed from the message', { type: s.type });
    }
  }
  values.clear();
  return { text: out, saved };
}

async function ownChatSecrets(userId: string) {
  await storeReady();
  return (await getCredentialManager().list(userId)).filter((c) => c.userId === userId && c.skillId === CHAT_SECRET_SKILL && NAME_RE.test(c.name));
}

/** The caller's secrets that came from the chat (never their values). */
export async function listChatSecrets(userId: string): Promise<ChatSecret[]> {
  return (await ownChatSecrets(userId)).map((c) => {
    const [, type, id] = NAME_RE.exec(c.name)!;
    const conv = /^chat:(.+)$/.exec(c.description ?? '');
    return {
      id, type, ref: secretRef(type, id), conversationId: conv ? conv[1] : null,
      createdAt: c.createdAt.toISOString(), lastUsed: c.lastUsed ? c.lastUsed.toISOString() : null,
    };
  });
}

/** Delete one of the caller's chat secrets; false when it is not theirs or unknown. */
export async function deleteChatSecret(userId: string, id: string): Promise<boolean> {
  if (!REF_ID.test(id)) return false;
  const c = (await ownChatSecrets(userId)).find((x) => NAME_RE.exec(x.name)?.[2] === id);
  if (!c) return false;
  await getCredentialManager().delete(c.id);
  return true;
}

/** True when any string inside `value` holds a key-store reference. */
export function hasSecretRef(value: unknown): boolean {
  let hit = false;
  walkStrings(value, (s) => { if (!hit && new RegExp(SECRET_REF_RE.source).test(s)) hit = true; return s; });
  return hit;
}

/**
 * Replace the references in a tool call's input with the stored values of
 * `userId` (owner only). Unknown or foreign references stay as they are.
 */
export async function resolveSecretRefs<T>(userId: string, value: T): Promise<{ value: T; used: Array<{ ref: string; secret: string }> }> {
  const refs = new Set<string>();
  walkStrings(value, (s) => { for (const m of s.match(SECRET_REF_RE) ?? []) refs.add(m); return s; });
  if (refs.size === 0) return { value, used: [] };
  const own = await ownChatSecrets(userId);
  const used: Array<{ ref: string; secret: string }> = [];
  for (const ref of refs) {
    const [, type, id] = /^\[SECRET:([a-z_]+):([a-z0-9]+)\]$/.exec(ref) ?? [];
    const c = own.find((x) => x.name === credentialName(type, id));
    if (!c) continue;
    used.push({ ref, secret: await getCredentialManager().getValue(c.id) });
  }
  const out = walkStrings(value, (s) => used.reduce((acc, u) => acc.split(u.ref).join(u.secret), s));
  return { value: out, used };
}

/** Put the references back where a tool's result repeats a resolved value. */
export function scrubSecretValues<T>(value: T, used: Array<{ ref: string; secret: string }>): T {
  if (used.length === 0) return value;
  return walkStrings(value, (s) => used.reduce((acc, u) => (u.secret ? acc.split(u.secret).join(u.ref) : acc), s));
}

function walkStrings<T>(value: T, fn: (s: string) => string, depth = 0): T {
  if (typeof value === 'string') return fn(value) as unknown as T;
  if (depth > 20 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => walkStrings(v, fn, depth + 1)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = walkStrings(v, fn, depth + 1);
  return out as T;
}

// ---- one-time cleanup of messages saved before CHAT-SECRETS-01 -------------

export interface CleanupReport { conversations: number; messages: number; secrets: number; applied: boolean }

/**
 * Owner-run, explicit: find secrets in the caller's saved chats (message text,
 * stored tool work, titles). `apply: false` only counts; `apply: true` moves
 * each value to the key store and rewrites the rows with references.
 */
export async function cleanupChatSecrets(userId: string, apply: boolean): Promise<CleanupReport> {
  const sessions = await q.all<{ id: string; title: string | null }>('SELECT id, title FROM chat_sessions WHERE user_id = ?', userId);
  const report: CleanupReport = { conversations: 0, messages: 0, secrets: 0, applied: apply };
  // SQLite: rewritten and freed space is zeroed, and the WAL is emptied afterwards,
  // so the old values do not stay readable in the database files.
  const sqlite = apply && dbDriver() === 'sqlite' ? getDatabase().getDb() : null;
  const secureBefore = sqlite ? sqlite.pragma('secure_delete', { simple: true }) : null;
  if (sqlite) sqlite.pragma('secure_delete = ON');
  try {
    for (const s of sessions) {
      let touched = false;
      const known = new Map<string, SavedSecret>(); // one reference per value in a conversation
      const rows = await q.all<{ id: string; content: string | null; parts: string | null }>('SELECT id, content, parts FROM chat_messages WHERE session_id = ?', s.id);
      for (const row of rows) {
        const content = row.content ?? '';
        let parts: unknown = null;
        try { parts = row.parts ? JSON.parse(row.parts) : null; } catch { parts = null; }
        let count = redactImportText(content).total;
        walkStrings(parts, (x) => { count += redactImportText(x).total; return x; });
        if (count === 0) continue;
        report.messages++; report.secrets += count; touched = true;
        if (!apply) continue;
        const nextContent = (await vaultSecretsInText(userId, s.id, content, known)).text;
        let nextParts = row.parts;
        if (parts !== null) {
          const strings = new Map<string, string>();
          const todo: string[] = [];
          walkStrings(parts, (x) => { if (redactImportText(x).total) todo.push(x); return x; });
          for (const x of todo) if (!strings.has(x)) strings.set(x, (await vaultSecretsInText(userId, s.id, x, known)).text);
          nextParts = JSON.stringify(walkStrings(parts, (x) => strings.get(x) ?? x));
        }
        await q.run('UPDATE chat_messages SET content = ?, parts = ? WHERE id = ?', nextContent, nextParts, row.id);
      }
      if (s.title && redactImportText(s.title).total) {
        touched = true; report.secrets += redactImportText(s.title).total;
        if (apply) await q.run('UPDATE chat_sessions SET title = ? WHERE id = ?', (await vaultSecretsInText(userId, s.id, s.title, known)).text, s.id);
      }
      if (touched) report.conversations++;
    }
  } finally {
    if (sqlite) {
      sqlite.pragma(`secure_delete = ${secureBefore ? 'ON' : 'OFF'}`);
      if (report.secrets > 0) sqlite.pragma('wal_checkpoint(TRUNCATE)');
    }
  }
  return report;
}
