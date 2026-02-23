/**
 * Read Tool
 *
 * Read file contents from the workspace
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { Tool, ToolResult } from './types.js';

/**
 * Validate that path is safe (no path traversal attacks)
 */
function isPathSafe(filePath: string, workspaceDir: string): boolean {
  const resolvedPath = path.resolve(workspaceDir, filePath);
  const normalizedWorkspace = path.resolve(workspaceDir);

  // Path must be inside workspace
  return resolvedPath.startsWith(normalizedWorkspace);
}

export const readTool: Tool = {
  name: 'read',
  description: 'Read the contents of a file from the workspace',
  input_schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to read (relative to workspace)',
      },
    },
    required: ['path'],
    examples: [
      {
        path: 'package.json',
        description: 'Read package.json to check dependencies and scripts',
      },
      {
        path: 'src/config/settings.ts',
        description: 'Read application settings configuration file',
      },
      {
        path: '.env.example',
        description: 'Read environment variables template',
      },
      {
        path: 'README.md',
        description: 'Read project documentation',
      },
    ],
  },

  async execute(params): Promise<ToolResult> {
    const { path: filePath } = params;
    const workspaceDir = process.cwd(); // TODO: Get from context

    // Security check
    if (!isPathSafe(filePath, workspaceDir)) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Access denied: Path "${filePath}" is outside workspace`,
          },
        ],
        error: 'Path outside workspace',
      };
    }

    try {
      const fullPath = path.resolve(workspaceDir, filePath);
      console.log(`[ReadTool] 📖 Reading: ${fullPath}`);

      const content = await fs.readFile(fullPath, 'utf-8');
      const stats = await fs.stat(fullPath);

      console.log(`[ReadTool] ✅ File read successfully`);
      console.log(`[ReadTool]   Size: ${stats.size} bytes`);

      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
        details: {
          path: filePath,
          size: stats.size,
          modified: stats.mtime,
        },
      };
    } catch (error: any) {
      console.error(`[ReadTool] ❌ Read failed:`, error.message);

      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to read file: ${error.message}`,
          },
        ],
        error: error.message,
      };
    }
  },
};
