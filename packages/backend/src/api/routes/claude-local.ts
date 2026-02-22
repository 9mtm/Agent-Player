/**
 * Claude Local Integration Routes
 *
 * Reads from the user's ~/.claude/ directory to expose:
 *   - Usage statistics (stats-cache.json)
 *   - Project memory (projects/.../memory/MEMORY.md)
 *   - Session history (.jsonl files)
 *   - Saved plans (plans/*.md)
 *
 * Auto-detects the ~/.claude path using os.homedir() — no hardcoding.
 */

import type { FastifyInstance } from 'fastify';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../db/index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClaudeDir(): string {
  return path.join(os.homedir(), '.claude');
}

async function claudeDirExists(): Promise<boolean> {
  try {
    await fs.access(getClaudeDir());
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert an absolute filesystem path to Claude Code's project slug format.
 * Formula: C:\foo\bar → c--foo-bar (drive letter lowercased, colon→dash, slashes→dash)
 */
function cwdToSlug(cwd: string): string {
  return cwd
    .replace(':', '-')
    .replace(/[\\/]/g, '-')
    .replace(/^./, (c) => c.toLowerCase());
}

/**
 * Find the best-matching project memory file for a given cwd.
 * Scans ~/.claude/projects/ and picks the slug that is the longest prefix of cwdSlug.
 */
async function findMemoryForCwd(cwd: string): Promise<string | null> {
  const projectsDir = path.join(getClaudeDir(), 'projects');
  const cwdSlug = cwdToSlug(cwd);

  let projects: string[] = [];
  try {
    projects = await fs.readdir(projectsDir);
  } catch {
    return null;
  }

  let bestSlug = '';
  for (const slug of projects) {
    if (cwdSlug.startsWith(slug) && slug.length > bestSlug.length) {
      bestSlug = slug;
    }
  }

  if (!bestSlug) return null;

  const memPath = path.join(projectsDir, bestSlug, 'memory', 'MEMORY.md');
  return fs.readFile(memPath, 'utf-8').catch(() => null);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function claudeLocalRoutes(fastify: FastifyInstance): Promise<void> {

  // ── GET /api/claude-local/status ──────────────────────────────────────────
  fastify.get('/api/claude-local/status', async (_req, reply) => {
    const available = await claudeDirExists();
    return reply.send({
      available,
      path: available ? getClaudeDir() : null,
    });
  });

  // ── GET /api/claude-local/stats ───────────────────────────────────────────
  fastify.get('/api/claude-local/stats', async (_req, reply) => {
    if (!(await claudeDirExists())) return reply.send({ available: false });

    try {
      const statsPath = path.join(getClaudeDir(), 'stats-cache.json');
      const raw = await fs.readFile(statsPath, 'utf-8');
      const stats = JSON.parse(raw);
      return reply.send({ available: true, stats });
    } catch (err: any) {
      fastify.log.error('[ClaudeLocal] stats error:', err.message);
      return reply.send({ available: false, error: err.message });
    }
  });

  // ── GET /api/claude-local/memory ──────────────────────────────────────────
  fastify.get('/api/claude-local/memory', async (_req, reply) => {
    if (!(await claudeDirExists())) return reply.send({ available: false });

    const content = await findMemoryForCwd(process.cwd());
    if (!content) return reply.send({ available: false });

    return reply.send({ available: true, content });
  });

  // ── GET /api/claude-local/sessions ────────────────────────────────────────
  fastify.get('/api/claude-local/sessions', async (_req, reply) => {
    if (!(await claudeDirExists())) return reply.send({ available: false });

    try {
      const projectsDir = path.join(getClaudeDir(), 'projects');
      const slugs = await fs.readdir(projectsDir).catch(() => [] as string[]);

      const projects = await Promise.all(
        slugs.map(async (slug) => {
          const dir = path.join(projectsDir, slug);
          let stat;
          try { stat = await fs.stat(dir); } catch { return null; }
          if (!stat.isDirectory()) return null;

          // Count .jsonl session files
          const entries = await fs.readdir(dir).catch(() => [] as string[]);
          const sessions = entries.filter((e) => e.endsWith('.jsonl'));

          // Find most recent session date
          let lastModified: Date | null = null;
          for (const s of sessions) {
            try {
              const st = await fs.stat(path.join(dir, s));
              if (!lastModified || st.mtime > lastModified) {
                lastModified = st.mtime;
              }
            } catch { /* skip */ }
          }

          // Check if memory file exists
          const hasMemory = await fs.access(path.join(dir, 'memory', 'MEMORY.md'))
            .then(() => true).catch(() => false);

          return {
            slug,
            sessionCount: sessions.length,
            lastModified: lastModified?.toISOString() ?? null,
            hasMemory,
          };
        })
      );

      return reply.send({
        available: true,
        projects: projects.filter(Boolean),
      });
    } catch (err: any) {
      fastify.log.error('[ClaudeLocal] sessions error:', err.message);
      return reply.status(500).send({ error: err.message });
    }
  });

  // ── GET /api/claude-local/sessions/:slug ──────────────────────────────────
  fastify.get<{ Params: { slug: string } }>(
    '/api/claude-local/sessions/:slug',
    async (req, reply) => {
      if (!(await claudeDirExists())) return reply.send({ available: false });

      const { slug } = req.params;
      // Validate slug — no path traversal
      if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
        return reply.status(400).send({ error: 'Invalid slug' });
      }

      const dir = path.join(getClaudeDir(), 'projects', slug);
      const entries = await fs.readdir(dir).catch(() => null);
      if (!entries) return reply.status(404).send({ error: 'Project not found' });

      const sessions = await Promise.all(
        entries
          .filter((e) => e.endsWith('.jsonl'))
          .map(async (filename) => {
            const filePath = path.join(dir, filename);
            const stat = await fs.stat(filePath).catch(() => null);
            return {
              id: filename.replace('.jsonl', ''),
              filename,
              size: stat?.size ?? 0,
              lastModified: stat?.mtime.toISOString() ?? null,
            };
          })
      );

      // Sort newest first
      sessions.sort((a, b) =>
        (b.lastModified ?? '').localeCompare(a.lastModified ?? '')
      );

      return reply.send({ available: true, slug, sessions });
    }
  );

  // ── GET /api/claude-local/session/:slug/:id ───────────────────────────────
  fastify.get<{ Params: { slug: string; id: string } }>(
    '/api/claude-local/session/:slug/:id',
    async (req, reply) => {
      if (!(await claudeDirExists())) return reply.send({ available: false });

      const { slug, id } = req.params;
      if (slug.includes('..') || id.includes('..')) {
        return reply.status(400).send({ error: 'Invalid path' });
      }

      const filePath = path.join(getClaudeDir(), 'projects', slug, `${id}.jsonl`);
      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        // Parse each line as JSON
        const messages = raw
          .split('\n')
          .filter((l) => l.trim())
          .map((line) => {
            try { return JSON.parse(line); }
            catch { return null; }
          })
          .filter(Boolean);

        return reply.send({ available: true, slug, id, messages });
      } catch (err: any) {
        return reply.status(404).send({ error: 'Session not found' });
      }
    }
  );

  // ── GET /api/claude-local/plans ───────────────────────────────────────────
  fastify.get('/api/claude-local/plans', async (_req, reply) => {
    if (!(await claudeDirExists())) return reply.send({ available: false });

    try {
      const plansDir = path.join(getClaudeDir(), 'plans');
      const entries = await fs.readdir(plansDir).catch(() => [] as string[]);
      const mdFiles = entries.filter((e) => e.endsWith('.md'));

      const plans = await Promise.all(
        mdFiles.map(async (filename) => {
          const filePath = path.join(plansDir, filename);
          const stat = await fs.stat(filePath).catch(() => null);
          return {
            name: filename,
            size: stat?.size ?? 0,
            lastModified: stat?.mtime.toISOString() ?? null,
          };
        })
      );

      // Sort newest first
      plans.sort((a, b) =>
        (b.lastModified ?? '').localeCompare(a.lastModified ?? '')
      );

      return reply.send({ available: true, plans });
    } catch (err: any) {
      fastify.log.error('[ClaudeLocal] plans error:', err.message);
      return reply.status(500).send({ error: err.message });
    }
  });

  // ── GET /api/claude-local/plans/:name ─────────────────────────────────────
  fastify.get<{ Params: { name: string } }>(
    '/api/claude-local/plans/:name',
    async (req, reply) => {
      if (!(await claudeDirExists())) return reply.send({ available: false });

      const { name } = req.params;
      if (!name.endsWith('.md') || name.includes('..') || name.includes('/')) {
        return reply.status(400).send({ error: 'Invalid plan name' });
      }

      try {
        const filePath = path.join(getClaudeDir(), 'plans', name);
        const content = await fs.readFile(filePath, 'utf-8');
        return reply.send({ available: true, name, content });
      } catch {
        return reply.status(404).send({ error: 'Plan not found' });
      }
    }
  );

  // ── POST /api/claude-local/import/:slug/:id ───────────────────────────────
  // Import a Claude Code session into Agent Player's chat_sessions + chat_messages tables.
  // Returns the new sessionId so the frontend can navigate to /chat.
  fastify.post<{ Params: { slug: string; id: string } }>(
    '/api/claude-local/import/:slug/:id',
    async (req, reply) => {
      if (!(await claudeDirExists())) {
        return reply.status(404).send({ error: 'Claude Code not found' });
      }

      const { slug, id } = req.params;
      if (slug.includes('..') || id.includes('..')) {
        return reply.status(400).send({ error: 'Invalid path' });
      }

      // Read and parse .jsonl file
      const filePath = path.join(getClaudeDir(), 'projects', slug, `${id}.jsonl`);
      let raw: string;
      try {
        raw = await fs.readFile(filePath, 'utf-8');
      } catch {
        return reply.status(404).send({ error: 'Session not found' });
      }

      // Parse each line as JSON and extract user/assistant messages
      const lines = raw.split('\n').filter((l) => l.trim());
      const importedMessages: Array<{ role: 'user' | 'assistant'; content: string; ts: string }> = [];

      for (const line of lines) {
        let obj: any;
        try { obj = JSON.parse(line); } catch { continue; }

        // Claude Code uses different formats across versions — handle all
        const msg = obj.message ?? obj;
        const role: string = msg.role ?? obj.type ?? '';
        if (role !== 'user' && role !== 'assistant') continue;

        let content = '';
        if (typeof msg.content === 'string') {
          content = msg.content;
        } else if (Array.isArray(msg.content)) {
          content = msg.content
            .filter((b: any) => b.type === 'text')
            .map((b: any) => b.text ?? '')
            .join('\n')
            .trim();
        }

        if (!content) continue;

        const ts = obj.timestamp ?? obj.created_at ?? new Date().toISOString();
        importedMessages.push({ role: role as 'user' | 'assistant', content, ts });
      }

      if (importedMessages.length === 0) {
        return reply.status(400).send({ error: 'No readable messages in this session' });
      }

      // Build a title from the first user message
      const firstUserMsg = importedMessages.find((m) => m.role === 'user');
      const title = firstUserMsg
        ? `[Claude Code] ${firstUserMsg.content.slice(0, 60)}${firstUserMsg.content.length > 60 ? '…' : ''}`
        : `[Claude Code] ${slug}`;

      // Insert into Agent Player's database
      const db = getDatabase().getDb();
      const sessionId = uuidv4();
      const now = new Date().toISOString();

      try {
        // Create session
        db.prepare(`
          INSERT INTO chat_sessions (id, user_id, title, model, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(sessionId, 'default', title, 'claude-sonnet-4-5-20250929', now, now);

        // Insert all messages preserving original timestamps
        const insertMsg = db.prepare(`
          INSERT INTO chat_messages (id, session_id, role, content, created_at)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (const m of importedMessages) {
          insertMsg.run(uuidv4(), sessionId, m.role, m.content, m.ts);
        }

        fastify.log.info(`[ClaudeLocal] Imported ${importedMessages.length} messages as session ${sessionId}`);
        return reply.send({
          success: true,
          sessionId,
          title,
          messageCount: importedMessages.length,
        });
      } catch (err: any) {
        fastify.log.error('[ClaudeLocal] Import error:', err.message);
        return reply.status(500).send({ error: `Import failed: ${err.message}` });
      }
    }
  );
}

// ─── Exported helper for chat-claude.ts ───────────────────────────────────────

/**
 * Load the MEMORY.md for the current working directory from Claude Code's projects.
 * Returns null silently if not found — agent still works without it.
 */
export async function loadClaudeProjectMemory(): Promise<string | null> {
  try {
    return await findMemoryForCwd(process.cwd());
  } catch {
    return null;
  }
}
