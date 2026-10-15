/**
 * Conversations other coding agents saved on this computer (MEM-IMPORT-01):
 * Claude Code (~/.claude/projects/<project>/<session>.jsonl) and Codex
 * (~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl). Read-only: these files are
 * never changed, moved or deleted. Only the human and agent text turns are
 * kept (no tool calls, tool output, thinking or injected system text); the
 * result goes through the import pipeline's secret scan before anything is
 * stored. Sessions are named by an opaque id, never by their path, in every
 * response.
 */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

export const LOCAL_SOURCES = ['claude-code', 'codex'] as const;
export type LocalSource = (typeof LOCAL_SOURCES)[number];
export type Turn = { role: 'user' | 'assistant'; text: string };
export type LocalSession = { id: string; source: LocalSource; cwd: string | null; title: string; startedAt: string | null; updatedAt: string; bytes: number; turns: number };

export const MAX_SESSION_BYTES = 60 * 1024 * 1024;
const MAX_SESSIONS = 400;

export function sourceRoot(source: LocalSource, home = os.homedir()): string {
  return source === 'claude-code' ? path.join(home, '.claude', 'projects') : path.join(home, '.codex', 'sessions');
}
/** Opaque, stable id of a session file (no path leaves the server). */
export const sessionId = (source: LocalSource, file: string) => createHash('sha256').update(`${source}\0${file}`).digest('hex').slice(0, 32);

async function walk(dir: string, depth: number, out: string[]) {
  let entries; try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory() && depth > 0) await walk(p, depth - 1, out);
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(p);
  }
}
async function sessionFiles(source: LocalSource, home?: string): Promise<string[]> {
  const out: string[] = [];
  await walk(sourceRoot(source, home), source === 'claude-code' ? 1 : 3, out);
  return out;
}

/** Text a person typed or an agent wrote; not injected tool, command or system text. */
function humanText(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^<(system-reminder|command-|local-command|environment_context|user_instructions|user-prompt-submit-hook|task-notification|ide_)/.test(t)) return null;
  if (/^(Caveat: The messages below|# AGENTS\.md instructions|<permissions instructions>)/.test(t)) return null;
  return t.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim() || null;
}

/** The human and agent text turns of one parsed log line, if any. */
export function lineTurns(source: LocalSource, o: any): { turns: Turn[]; cwd?: string; at?: string } {
  if (!o || typeof o !== 'object') return { turns: [] };
  if (source === 'claude-code') {
    if ((o.type !== 'user' && o.type !== 'assistant') || o.isSidechain || o.isMeta || !o.message) return { turns: [], cwd: typeof o.cwd === 'string' ? o.cwd : undefined };
    const c = o.message.content;
    const parts: string[] = typeof c === 'string' ? [c] : Array.isArray(c) ? c.filter((x: any) => x?.type === 'text' && typeof x.text === 'string').map((x: any) => x.text) : [];
    const turns = parts.map(humanText).filter((t): t is string => !!t).map(text => ({ role: o.type as Turn['role'], text }));
    return { turns, cwd: typeof o.cwd === 'string' ? o.cwd : undefined, at: typeof o.timestamp === 'string' ? o.timestamp : undefined };
  }
  if (o.type === 'session_meta' && o.payload && typeof o.payload.cwd === 'string') return { turns: [], cwd: o.payload.cwd, at: typeof o.timestamp === 'string' ? o.timestamp : undefined };
  const p = o.payload;
  if (o.type !== 'response_item' || !p || p.type !== 'message' || (p.role !== 'user' && p.role !== 'assistant') || !Array.isArray(p.content)) return { turns: [] };
  const parts = p.content.filter((x: any) => (x?.type === 'input_text' || x?.type === 'output_text') && typeof x.text === 'string').map((x: any) => x.text);
  return { turns: parts.map(humanText).filter((t: string | null): t is string => !!t).map((text: string) => ({ role: p.role as Turn['role'], text })), at: typeof o.timestamp === 'string' ? o.timestamp : undefined };
}

/** Reads one log, line by line (bounded), into turns plus its working folder. */
export async function readSession(source: LocalSource, file: string): Promise<{ turns: Turn[]; cwd: string | null; startedAt: string | null }> {
  const st = await fs.stat(file);
  if (st.size > MAX_SESSION_BYTES) throw new Error('too large');
  const turns: Turn[] = []; let cwd: string | null = null; let startedAt: string | null = null;
  const rl = readline.createInterface({ input: createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let o: unknown; try { o = JSON.parse(line); } catch { continue; }
    const r = lineTurns(source, o);
    if (r.cwd && !cwd) cwd = r.cwd;
    if (r.at && !startedAt) startedAt = r.at;
    for (const t of r.turns) {
      const last = turns.at(-1);
      if (last && last.role === t.role) last.text += `\n\n${t.text}`; else turns.push({ ...t });
    }
  }
  return { turns, cwd, startedAt };
}

/** Sessions on this computer, newest first (title = start of the first human message). */
export async function listLocalSessions(home?: string): Promise<LocalSession[]> {
  const found: { source: LocalSource; file: string; mtime: number; size: number }[] = [];
  for (const source of LOCAL_SOURCES) for (const file of await sessionFiles(source, home)) {
    try { const st = await fs.stat(file); if (st.size > 0) found.push({ source, file, mtime: st.mtimeMs, size: st.size }); } catch { /* gone */ }
  }
  found.sort((a, b) => b.mtime - a.mtime);
  const out: LocalSession[] = [];
  for (const f of found.slice(0, MAX_SESSIONS)) {
    if (f.size > MAX_SESSION_BYTES) continue;
    try {
      const s = await readSession(f.source, f.file);
      const first = s.turns.find(t => t.role === 'user');
      if (!first) continue;
      out.push({ id: sessionId(f.source, f.file), source: f.source, cwd: s.cwd, title: first.text.replace(/\s+/g, ' ').slice(0, 120), startedAt: s.startedAt, updatedAt: new Date(f.mtime).toISOString(), bytes: f.size, turns: s.turns.length });
    } catch { /* unreadable: left out */ }
  }
  return out;
}

/** The file behind an opaque id (only files under the two known roots). */
export async function findSession(id: string, home?: string): Promise<{ source: LocalSource; file: string } | null> {
  if (!/^[0-9a-f]{32}$/.test(id)) return null;
  for (const source of LOCAL_SOURCES) for (const file of await sessionFiles(source, home)) if (sessionId(source, file) === id) return { source, file };
  return null;
}

/** A transcript as Markdown (for the archive and the memory agent). */
export function transcriptMarkdown(source: LocalSource, s: { turns: Turn[]; cwd: string | null; startedAt: string | null }): string {
  const who = source === 'claude-code' ? 'Claude Code' : 'Codex';
  return [`# ${who} conversation`, s.cwd ? `Folder: ${s.cwd}` : '', s.startedAt ? `Started: ${s.startedAt}` : '', '',
    ...s.turns.map(t => `## ${t.role === 'user' ? 'Owner' : who}\n\n${t.text}`)].filter((l, i) => l !== '' || i > 2).join('\n\n');
}
