import { z } from 'zod';

/**
 * Skill Metadata (Frontmatter from SKILL.md)
 */
export const SkillMetadataSchema = z.object({
    name: z.string(),
    description: z.string(),
    version: z.string(),
    author: z.string().optional(),
    license: z.string().optional(),
    repository: z.string().url().optional(),
    icon: z.string().optional(), // path to icon or emoji
    tags: z.array(z.string()).optional(),

    // Requirements
    requirements: z.object({
        os: z.array(z.enum(['windows', 'linux', 'macos'])).optional(),
        binaries: z.array(z.string()).optional(), // e.g., ["docker", "python"]
        env: z.array(z.string()).optional(), // e.g., ["OPENAI_API_KEY"]
    }).optional(),

    // Settings Schema for UI generation
    settings: z.record(z.string(), z.object({
        type: z.enum(['string', 'number', 'boolean', 'password', 'select']),
        label: z.string(),
        description: z.string().optional(),
        required: z.boolean().optional(),
        default: z.any().optional(),
        options: z.array(z.string()).optional(), // for select
    })).optional(),
});

export type SkillMetadata = z.infer<typeof SkillMetadataSchema>;

/**
 * Parsed Skill Structure
 */
export interface ParsedSkill {
    metadata: SkillMetadata;
    markdown: string; // The full content
    instructions: string; // The instructions part after frontmatter
    examples: Array<{
        title: string;
        code: string;
        language: string;
    }>;
}

/**
 * Skill Execution Context
 */
export interface SkillContext {
    workflowId: string;
    executionId: string;
    stepId: string;
    variables: Record<string, any>; // Workflow variables
    secrets: Record<string, string>; // Decrypted secrets
    cwd: string; // Working directory for this execution
}
