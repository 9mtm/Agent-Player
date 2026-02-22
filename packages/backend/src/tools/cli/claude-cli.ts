/**
 * Claude Code CLI Tool
 *
 * Sends a prompt to the locally-installed Claude Code CLI (`claude`)
 * and returns the response. Uses the `--print` / `-p` flag for non-interactive
 * single-turn use.
 *
 * This creates a second Claude Code process — useful for:
 *   - Running Claude Code's own tools (file read/write/exec) on a sub-task
 *   - Getting a sandboxed agentic response without affecting the main chat
 *   - Delegating coding tasks with full Claude Code tool access
 */

import { execFile, exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { Tool, ToolResult } from '../types.js';
import { getDatabase } from '../../db/index.js';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

// npm global bin dirs — checked in priority order
const NODE_BIN_DIRS_WIN = [
  path.join('C:', 'Program Files', 'nodejs'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'npm'),
  path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'nodejs'),
];

async function findClaudeExecutable(): Promise<string> {
  if (process.platform === 'win32') {
    const candidates = NODE_BIN_DIRS_WIN.flatMap(d => [
      path.join(d, 'claude.cmd'),
      path.join(d, 'claude'),
    ]).concat(['claude']);
    for (const bin of candidates) {
      try { await fs.access(bin); return bin; } catch { /* next */ }
    }
  } else {
    const candidates = [
      'claude',
      '/usr/local/bin/claude',
      path.join(os.homedir(), '.local', 'bin', 'claude'),
    ];
    for (const bin of candidates) {
      try { await fs.access(bin); return bin; } catch { /* next */ }
    }
  }
  // Fall back to PATH — execFile will throw ENOENT if not found
  return 'claude';
}

export const claudeCliTool: Tool = {
  name: 'claude_cli',
  description:
    'Send a prompt to the locally-installed Claude Code CLI and get the response. ' +
    'Claude Code CLI has its own tools: file read/write, shell exec, web fetch, memory. ' +
    'Use this to delegate a coding or file-system task to a separate Claude Code process, ' +
    'or to run Claude Code with a specific working directory. ' +
    'Requires `claude` CLI to be installed (`npm install -g @anthropic-ai/claude-code`).',
  input_schema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The prompt / task to send to Claude Code CLI.',
      },
      workdir: {
        type: 'string',
        description:
          'Working directory for the Claude Code process (optional). ' +
          'Defaults to the current backend working directory.',
      },
      model: {
        type: 'string',
        description:
          'Model to use (optional). Example: "claude-sonnet-4-5-20250929". ' +
          'Leave empty to use the CLI default.',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 180000 = 3 minutes).',
      },
    },
    required: ['prompt'],
  },

  async execute(params): Promise<ToolResult> {
    const { prompt, workdir, model, timeout = 180_000 } = params;

    console.log(`[ClaudeCLI] 🚀 Sending prompt (${prompt.length} chars)`);
    if (workdir) console.log(`[ClaudeCLI]   Workdir: ${workdir}`);
    if (model) console.log(`[ClaudeCLI]   Model: ${model}`);

    // Resolve API key: env var → agent api_key → global credentials
    let anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!anthropicApiKey) {
      try {
        const db = getDatabase();
        // First try: get from any Claude or Claude-CLI agent
        const row = db.prepare(
          `SELECT api_key FROM agents_config WHERE provider IN ('claude', 'claude-cli') AND api_key IS NOT NULL AND api_key != '' LIMIT 1`
        ).get() as { api_key: string } | undefined;
        if (row?.api_key) {
          anthropicApiKey = row.api_key;
        } else {
          // Second try: get from global credentials table
          const credRow = db.prepare(
            `SELECT value FROM credentials WHERE key = 'anthropic_api_key' LIMIT 1`
          ).get() as { value: string } | undefined;
          if (credRow?.value) anthropicApiKey = credRow.value;
        }
      } catch { /* ignore DB errors */ }
    }

    const claudeBin = await findClaudeExecutable();
    console.log(`[ClaudeCLI] Binary: ${claudeBin}, API key: ${anthropicApiKey ? 'found' : 'MISSING'}`);

    // Build env: remove CLAUDECODE to allow nested sessions
    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      NO_COLOR: '1',
      TERM: 'dumb',
    };
    // CRITICAL: Delete CLAUDECODE completely (not just empty string)
    delete childEnv.CLAUDECODE;
    if (anthropicApiKey) childEnv.ANTHROPIC_API_KEY = anthropicApiKey;

    // claude -p "prompt" [--model model]
    const args: string[] = ['-p', prompt];
    if (model) args.push('--model', model);

    try {

      let stdout: string;
      let stderr: string;

      if (process.platform === 'win32' && claudeBin.endsWith('.cmd')) {
        // On Windows, .cmd files need exec() (shell) — use command name so PATH resolves correctly
        const binName = path.basename(claudeBin, '.cmd');
        const shellArgs = args.map(a => (a.includes(' ') ? `"${a.replace(/"/g, '\\"')}"` : a)).join(' ');
        const shellCmd = `${binName} ${shellArgs}`;
        ({ stdout, stderr } = await execAsync(shellCmd, {
          timeout,
          maxBuffer: 1024 * 1024 * 10,
          cwd: workdir || process.cwd(),
          env: childEnv,
        }));
      } else {
        ({ stdout, stderr } = await execFileAsync(claudeBin, args, {
          timeout,
          maxBuffer: 1024 * 1024 * 10,
          cwd: workdir || process.cwd(),
          env: childEnv,
        }));
      }

      const output = (stdout || stderr || '(no output)').trim();
      console.log(`[ClaudeCLI] ✅ Response length: ${output.length} chars`);

      return {
        content: [{ type: 'text', text: output }],
        details: { model: model || 'default', workdir: workdir || process.cwd() },
      };
    } catch (err: any) {
      const msg = err.killed
        ? `Claude CLI timed out after ${timeout}ms`
        : err.stderr || err.message;

      console.error(`[ClaudeCLI] ❌ Error:`, msg);

      // Only show install hint when the binary itself is missing (ENOENT), not for API errors
      const notFound = err.code === 'ENOENT';
      const hint = notFound
        ? '\n\nClaude Code CLI is not installed. Run: npm install -g @anthropic-ai/claude-code'
        : '';

      return {
        content: [{ type: 'text', text: `❌ Claude CLI error: ${msg}${hint}` }],
        error: msg,
      };
    }
  },
};
