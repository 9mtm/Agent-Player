/**
 * Write Tool
 *
 * Write content to a file in the workspace
 */
import fs from 'node:fs/promises';
import path from 'node:path';
/**
 * Validate that path is safe (no path traversal attacks)
 */
function isPathSafe(filePath, workspaceDir) {
    const resolvedPath = path.resolve(workspaceDir, filePath);
    const normalizedWorkspace = path.resolve(workspaceDir);
    // Path must be inside workspace
    return resolvedPath.startsWith(normalizedWorkspace);
}
export const writeTool = {
    name: 'write',
    description: 'Write content to a file in the workspace. Creates parent directories if needed.',
    input_schema: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'Path to the file to write (relative to workspace)',
            },
            content: {
                type: 'string',
                description: 'Content to write to the file',
            },
        },
        required: ['path', 'content'],
    },
    async execute(params) {
        const { path: filePath, content } = params;
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
            console.log(`[WriteTool] 📝 Writing: ${fullPath}`);
            console.log(`[WriteTool]   Content length: ${content.length} chars`);
            // Create parent directories if they don't exist
            const parentDir = path.dirname(fullPath);
            await fs.mkdir(parentDir, { recursive: true });
            // Write file
            await fs.writeFile(fullPath, content, 'utf-8');
            const stats = await fs.stat(fullPath);
            console.log(`[WriteTool] ✅ File written successfully`);
            console.log(`[WriteTool]   Size: ${stats.size} bytes`);
            return {
                content: [
                    {
                        type: 'text',
                        text: `✅ File written successfully: ${filePath} (${stats.size} bytes)`,
                    },
                ],
                details: {
                    path: filePath,
                    size: stats.size,
                    modified: stats.mtime,
                },
            };
        }
        catch (error) {
            console.error(`[WriteTool] ❌ Write failed:`, error.message);
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to write file: ${error.message}`,
                    },
                ],
                error: error.message,
            };
        }
    },
};
