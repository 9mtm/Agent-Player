import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { skillsDb } from './db';

interface ExecutionResult {
    exitCode: number | null;
    stdout: string;
    stderr: string;
    durationMs: number;
}

export class SkillExecutor {

    /**
     * Execute a skill by name
     */
    async execute(
        skillName: string,
        args: string[] = [],
        additionalEnv: Record<string, string> = {}
    ): Promise<ExecutionResult> {

        // 1. Fetch Skill from file-based DB
        const skill = skillsDb.findUnique({ name: skillName });

        if (!skill) {
            throw new Error(`Skill not found: ${skillName}`);
        }

        if (!skill.enabled) {
            throw new Error(`Skill is disabled: ${skillName}`);
        }

        // 2. Get local path from settings (temporary storage) or column
        const settings = skill.settings as any;
        const localPath = settings?._internal?.localPath || (skill as any).localPath;

        if (!localPath || !fs.existsSync(localPath)) {
            throw new Error(`Skill local path not found: ${localPath}`);
        }

        // 3. Detect Runtime & Entry Point
        const runConfig = this.detectRuntime(localPath);
        if (!runConfig) {
            throw new Error(`Could not auto-detect entry point (e.g. main.py, package.json). This skill might be documentation-only (Knowledge Skill) and cannot be executed directly.`);
        }

        // 4. Prepare Environment
        // Merge system env + skill required env (from secrets in future) + additionalEnv
        const env = {
            ...process.env,
            ...additionalEnv,
            SKILL_NAME: skillName,
            SKILL_PATH: localPath,
        };

        // 5. Execute
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let stdout = '';
            let stderr = '';

            const child = spawn(runConfig.command, [...runConfig.args, ...args], {
                cwd: localPath,
                env,
                shell: true, // Use shell for better compatibility
            });

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('error', (err) => {
                reject(new Error(`Failed to start skill process: ${err.message}`));
            });

            child.on('close', (code) => {
                const durationMs = Date.now() - startTime;
                resolve({
                    exitCode: code,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    durationMs
                });
            });
        });
    }

    /**
     * Auto-detect how to run the skill based on file presence
     */
    private detectRuntime(skillPath: string): { command: string, args: string[] } | null {
        // 1. Python (main.py, run.py, agent.py)
        const pyFiles = ['main.py', 'run.py', 'agent.py', 'cli.py', 'app.py', 'client.py', 'server.py', 'logic.py'];
        for (const file of pyFiles) {
            if (fs.existsSync(path.join(skillPath, file))) {
                return { command: 'python', args: [file] };
            }
        }

        // 2. Node.js (package.json start script)
        if (fs.existsSync(path.join(skillPath, 'package.json'))) {
            try {
                const pkg = JSON.parse(fs.readFileSync(path.join(skillPath, 'package.json'), 'utf-8'));
                if (pkg.scripts && pkg.scripts.start) {
                    return { command: 'npm', args: ['start', '--'] }; // -- passes args to script
                }
                if (pkg.main) {
                    return { command: 'node', args: [pkg.main] };
                }
            } catch (e) {
                // ignore invalid json
            }
        }

        // 3. Node.js (index.js, main.js)
        const jsFiles = ['index.js', 'main.js', 'run.js', 'server.js'];
        for (const file of jsFiles) {
            if (fs.existsSync(path.join(skillPath, file))) {
                return { command: 'node', args: [file] };
            }
        }

        // 4. Shell Scripts (run.sh, start.sh)
        // TODO: On windows check for .bat or .ps1
        const shFiles = ['run.sh', 'start.sh', 'entrypoint.sh'];
        for (const file of shFiles) {
            if (fs.existsSync(path.join(skillPath, file))) {
                return { command: 'bash', args: [file] };
            }
        }

        // 5. Explicit Check in SKILL.md (advanced - TODO)
        // Parse "Run Command" from metadata if exists

        return null;
    }
}

export const skillExecutor = new SkillExecutor();
