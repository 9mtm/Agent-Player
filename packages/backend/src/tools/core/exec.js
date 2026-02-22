/**
 * Exec Tool
 *
 * Execute shell commands in the workspace
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
const execAsync = promisify(exec);
// Dangerous commands that should be blocked
const DANGEROUS_COMMANDS = [
    'rm -rf /',
    'rm -rf ~',
    'dd if=/dev/zero',
    'mkfs',
    ':(){ :|:& };:', // fork bomb
    'sudo rm',
    'del /f /s /q', // Windows
];
// Timeout for commands (30 seconds)
const DEFAULT_TIMEOUT = 30000;
/**
 * Check if command contains dangerous patterns
 */
function isDangerousCommand(command) {
    const lower = command.toLowerCase();
    for (const dangerous of DANGEROUS_COMMANDS) {
        if (lower.includes(dangerous.toLowerCase())) {
            return true;
        }
    }
    return false;
}
export const execTool = {
    name: 'exec',
    description: 'Execute shell commands in the workspace. Use this to run CLI tools like curl, gh, npm, etc.',
    input_schema: {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: 'The shell command to execute (e.g., "curl -s wttr.in/London?format=3")',
            },
            timeout: {
                type: 'number',
                description: 'Timeout in milliseconds (default: 30000)',
            },
        },
        required: ['command'],
    },
    async execute(params) {
        const { command, timeout = DEFAULT_TIMEOUT } = params;
        // Security check
        if (isDangerousCommand(command)) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Blocked: Command contains dangerous patterns and cannot be executed for security reasons.`,
                    },
                ],
                error: 'Dangerous command blocked',
            };
        }
        try {
            console.log(`[ExecTool] 🚀 Executing: ${command}`);
            console.log(`[ExecTool]   Timeout: ${timeout}ms`);
            const { stdout, stderr } = await execAsync(command, {
                timeout,
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer
                shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
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
                },
            };
        }
        catch (error) {
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
                },
            };
        }
    },
};
