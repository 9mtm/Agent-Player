/**
 * Agent Files Service
 *
 * Manages per-agent PERSONALITY.md and MEMORY.md files
 * File-based storage for agent identity and learned patterns
 */

import fs from 'fs/promises';
import path from 'path';

const AGENTS_DIR = path.join(process.cwd(), '.data', 'agents');

export interface AgentFiles {
  personality: string;
  memory: string;
  knowledgeFiles: string[];
}

/**
 * SECURITY: Sanitize path parameter to prevent directory traversal
 * @param param Path parameter (agentId or filename)
 * @returns Sanitized path component
 * @throws Error if parameter is invalid
 */
function sanitizePathParam(param: string): string {
  // Use path.basename to strip all directory components
  const sanitized = path.basename(param);

  // Reject empty, '.', or '..' after sanitization
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    throw new Error('Invalid path parameter');
  }

  // Reject paths that still contain path separators (suspicious)
  if (sanitized.includes('/') || sanitized.includes('\\')) {
    throw new Error('Invalid path parameter');
  }

  return sanitized;
}

/**
 * Get agent directory path
 */
export function getAgentDir(agentId: string): string {
  const sanitizedId = sanitizePathParam(agentId);
  return path.join(AGENTS_DIR, sanitizedId);
}

/**
 * Initialize agent directory structure
 */
export async function initializeAgentDir(agentId: string): Promise<void> {
  const agentDir = getAgentDir(agentId);
  const knowledgeDir = path.join(agentDir, 'knowledge');

  // Create directories
  await fs.mkdir(agentDir, { recursive: true });
  await fs.mkdir(knowledgeDir, { recursive: true });
  await fs.mkdir(path.join(knowledgeDir, 'docs'), { recursive: true });
  await fs.mkdir(path.join(knowledgeDir, 'templates'), { recursive: true });
  await fs.mkdir(path.join(knowledgeDir, 'data'), { recursive: true });

  // Create default files if they don't exist
  const personalityPath = path.join(agentDir, 'PERSONALITY.md');
  const memoryPath = path.join(agentDir, 'MEMORY.md');

  try {
    await fs.access(personalityPath);
  } catch {
    await fs.writeFile(personalityPath, getDefaultPersonality(), 'utf-8');
  }

  try {
    await fs.access(memoryPath);
  } catch {
    await fs.writeFile(memoryPath, getDefaultMemory(), 'utf-8');
  }
}

/**
 * Read PERSONALITY.md for an agent
 */
export async function readPersonality(agentId: string): Promise<string> {
  const filePath = path.join(getAgentDir(agentId), 'PERSONALITY.md');

  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    // File doesn't exist, initialize and return default
    await initializeAgentDir(agentId);
    return getDefaultPersonality();
  }
}

/**
 * Write PERSONALITY.md for an agent
 */
export async function writePersonality(agentId: string, content: string): Promise<void> {
  await initializeAgentDir(agentId);
  const filePath = path.join(getAgentDir(agentId), 'PERSONALITY.md');
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Read MEMORY.md for an agent
 */
export async function readMemory(agentId: string): Promise<string> {
  const filePath = path.join(getAgentDir(agentId), 'MEMORY.md');

  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    // File doesn't exist, initialize and return default
    await initializeAgentDir(agentId);
    return getDefaultMemory();
  }
}

/**
 * Write MEMORY.md for an agent
 */
export async function writeMemory(agentId: string, content: string): Promise<void> {
  await initializeAgentDir(agentId);
  const filePath = path.join(getAgentDir(agentId), 'MEMORY.md');
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Append to MEMORY.md (for AI to add learnings)
 */
export async function appendMemory(agentId: string, content: string): Promise<void> {
  const existing = await readMemory(agentId);
  const timestamp = new Date().toISOString();
  const newContent = `${existing}\n\n## ${timestamp}\n\n${content}`;
  await writeMemory(agentId, newContent);
}

/**
 * List knowledge files for an agent
 */
export async function listKnowledgeFiles(agentId: string): Promise<string[]> {
  const knowledgeDir = path.join(getAgentDir(agentId), 'knowledge');

  try {
    const files: string[] = [];
    const scan = async (dir: string, prefix = '') => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          await scan(fullPath, relativePath);
        } else {
          files.push(relativePath);
        }
      }
    };

    await scan(knowledgeDir);
    return files;
  } catch (err) {
    return [];
  }
}

/**
 * Read a knowledge file
 */
export async function readKnowledgeFile(agentId: string, filename: string): Promise<string> {
  // SECURITY: Sanitize filename to prevent path traversal
  const sanitizedFilename = sanitizePathParam(filename);
  const filePath = path.join(getAgentDir(agentId), 'knowledge', sanitizedFilename);
  return await fs.readFile(filePath, 'utf-8');
}

/**
 * Write a knowledge file
 */
export async function writeKnowledgeFile(
  agentId: string,
  filename: string,
  content: string
): Promise<void> {
  await initializeAgentDir(agentId);
  // SECURITY: Sanitize filename to prevent path traversal
  const sanitizedFilename = sanitizePathParam(filename);
  const filePath = path.join(getAgentDir(agentId), 'knowledge', sanitizedFilename);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Delete a knowledge file
 */
export async function deleteKnowledgeFile(agentId: string, filename: string): Promise<void> {
  // SECURITY: Sanitize filename to prevent path traversal
  const sanitizedFilename = sanitizePathParam(filename);
  const filePath = path.join(getAgentDir(agentId), 'knowledge', sanitizedFilename);
  await fs.unlink(filePath);
}

/**
 * Get all agent files
 */
export async function getAgentFiles(agentId: string): Promise<AgentFiles> {
  const personality = await readPersonality(agentId);
  const memory = await readMemory(agentId);
  const knowledgeFiles = await listKnowledgeFiles(agentId);

  return {
    personality,
    memory,
    knowledgeFiles
  };
}

/**
 * Default PERSONALITY.md template
 */
function getDefaultPersonality(): string {
  return `# Agent Personality

## Core Identity

- **Role**: [Define your role - e.g., Customer Support, Code Reviewer, Data Analyst]
- **Specialty**: [What you're best at]
- **Tone**: [Professional / Friendly / Direct / Technical]

## Behavioral Rules

### Communication Style
- Be genuinely helpful, not performatively helpful
- Skip filler phrases like "Great question!" - just help
- Have opinions - you're allowed to disagree and prefer things
- Be concise when possible, thorough when needed

### Work Approach
- Fix errors immediately - don't ask, don't wait
- Be resourceful before asking - read files, check context, search first
- Use subagents for parallel execution when possible
- Read documentation before changing configs

### Boundaries
- Never force push, delete branches, or rewrite git history
- When in doubt about external actions, ask first
- Be careful with public-facing actions (emails, messages, posts)
- Respect user privacy and data

## Specialization

### What I Do Best
- [List your key capabilities]
- [Your core competencies]
- [What makes you unique]

### What I Avoid
- [Things outside your scope]
- [Actions you shouldn't take]
- [Known limitations]

## Values

- **Competence over conversation**: Actions speak louder than words
- **Proactive over passive**: Anticipate needs, don't just react
- **Quality over speed**: Get it right the first time
- **Security first**: Never compromise safety for convenience

---

*This file defines who you are. Update it as you learn and grow.*
`;
}

/**
 * Default MEMORY.md template
 */
function getDefaultMemory(): string {
  return `# Agent Memory

## Learned Patterns

*As you work, record patterns you discover here*

---

## Common Tasks

*Document recurring tasks and their solutions*

---

## User Preferences

*Remember what the user likes and dislikes*

---

## Project Context

*Key information about the projects you work on*

---

## Mistakes & Learnings

*Record errors you made and how to avoid them*

---

*This file grows as you learn. Update it regularly.*
`;
}
