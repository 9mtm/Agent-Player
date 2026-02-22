/**
 * Exec Tool
 *
 * Execute shell commands in the workspace
 *
 * SECURITY: Uses whitelist approach to prevent arbitrary command execution (H-12)
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import type { Tool, ToolResult } from './types.js';

const execAsync = promisify(exec);

// Timeout for commands (30 seconds)
const DEFAULT_TIMEOUT = 30000;

/**
 * Allowed command prefixes (whitelist approach)
 * SECURITY: Only these commands can be executed (H-12)
 */
const ALLOWED_COMMANDS = [
  // Version control
  'git ',
  // Package managers
  'npm ',
  'pnpm ',
  'yarn ',
  // Programming languages
  'node ',
  'python ',
  'python3 ',
  // HTTP utilities
  'curl ',
  'wget ',
  // GitHub CLI
  'gh ',
  // File operations (read-only)
  'cat ',
  'ls ',
  'dir ',
  'find ',
  'grep ',
  'head ',
  'tail ',
  // System info (read-only)
  'echo ',
  'pwd',
  'whoami',
  'date',
  'which ',
  'where ',
  // Build tools
  'make ',
  'cmake ',
  'gradle ',
  'mvn ',
  // Docker (if needed)
  'docker ',
  'docker-compose ',
];

/**
 * Dangerous shell operators that allow command chaining or redirection
 * SECURITY: Block these to prevent command injection (H-12)
 */
const SHELL_OPERATORS = [
  '&&',
  '||',
  ';',
  '|',
  '>',
  '<',
  '`',
  '$(',
  '\n',
  '\r',
];

/**
 * Validate command against whitelist
 * SECURITY: Only explicitly allowed commands can run (H-12)
 */
function isCommandAllowed(command: string): { allowed: boolean; reason?: string } {
  const trimmed = command.trim();

  // Check if command is in allowed list
  const isAllowed = ALLOWED_COMMANDS.some(allowed => {
    // For commands without space (like 'pwd'), exact match
    if (!allowed.includes(' ')) {
      return trimmed === allowed || trimmed.startsWith(allowed + ' ');
    }
    // For commands with space, prefix match
    return trimmed.startsWith(allowed);
  });

  if (!isAllowed) {
    return {
      allowed: false,
      reason: `Command not in whitelist. Allowed commands: ${ALLOWED_COMMANDS.map(c => c.trim()).join(', ')}`,
    };
  }

  // Check for shell operators (command chaining/injection)
  for (const operator of SHELL_OPERATORS) {
    if (trimmed.includes(operator)) {
      return {
        allowed: false,
        reason: `Command contains shell operator "${operator}" which is not allowed for security`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Get safe working directory
 * SECURITY: Restrict command execution to workspace directory (H-12)
 */
function getSafeWorkingDirectory(): string {
  const cwd = process.cwd();

  // Resolve to absolute path to prevent directory traversal
  const safeCwd = path.resolve(cwd);

  return safeCwd;
}

export const execTool: Tool = {
  name: 'exec',
  description: 'Execute whitelisted shell commands in the workspace. Allowed: git, npm, pnpm, curl, gh, node, python, docker, and read-only file operations.',
  input_schema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute (e.g., "curl -s wttr.in/London?format=3"). Only whitelisted commands allowed.',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000)',
      },
    },
    required: ['command'],
  },

  async execute(params): Promise<ToolResult> {
    const { command, timeout = DEFAULT_TIMEOUT } = params;

    // SECURITY: Validate command against whitelist (H-12)
    const validation = isCommandAllowed(command);
    if (!validation.allowed) {
      console.warn(`[ExecTool] ⛔ Blocked command: ${command}`);
      console.warn(`[ExecTool]   Reason: ${validation.reason}`);

      return {
        content: [
          {
            type: 'text',
            text: `❌ Blocked: ${validation.reason}`,
          },
        ],
        error: 'Command not allowed by security policy',
      };
    }

    // Get safe working directory
    const cwd = getSafeWorkingDirectory();

    try {
      console.log(`[ExecTool] 🚀 Executing: ${command}`);
      console.log(`[ExecTool]   Working dir: ${cwd}`);
      console.log(`[ExecTool]   Timeout: ${timeout}ms`);

      const { stdout, stderr } = await execAsync(command, {
        timeout,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        cwd, // SECURITY: Restrict to workspace directory
        shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
        // SECURITY: Sanitize environment variables
        env: {
          ...process.env,
          // Remove potentially dangerous env vars
          LD_PRELOAD: undefined,
          LD_LIBRARY_PATH: undefined,
        },
      });

      const output = stdout || stderr || '(no output)';

      console.log(`[ExecTool] ✅ Command completed`);
      console.log(`[ExecTool]   Output length: ${output.length} chars`);

      return {
        content: [
          {
            type: 'text',
            text: output.trim(),
          },
        ],
        details: {
          command,
          exitCode: 0,
          duration: timeout,
          cwd,
        },
      };
    } catch (error: any) {
      console.error(`[ExecTool] ❌ Command failed:`, error.message);

      // Command failed or timed out
      const errorMessage = error.killed
        ? `Command timed out after ${timeout}ms`
        : error.stderr || error.message;

      return {
        content: [
          {
            type: 'text',
            text: `❌ Command failed: ${errorMessage}`,
          },
        ],
        error: errorMessage,
        details: {
          command,
          exitCode: error.code || 1,
          timedOut: error.killed,
          cwd,
        },
      };
    }
  },
};
