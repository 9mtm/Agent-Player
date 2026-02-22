import { skillsDb, SkillRecord } from './db';
import { parseSkillMarkdown } from './parser';

export class SkillRegistry {
    /**
     * Install a new skill from markdown content
     */
    async install(content: string, author?: string, localPath?: string) {
        // Parse markdown
        const parsed = parseSkillMarkdown(content);
        const { metadata } = parsed;

        // Check if skill already exists with same name
        const existing = skillsDb.findUnique({ name: metadata.name });

        if (existing) {
            // Update existing skill
            return skillsDb.update({ name: metadata.name }, {
                version: metadata.version,
                description: metadata.description,
                author: metadata.author || author,
                settings: {
                    markdown: content,
                    settingsSchema: metadata.settings,
                    requiredBins: metadata.requirements?.binaries || [],
                    requiredEnv: metadata.requirements?.env || [],
                    supportedOS: metadata.requirements?.os || [],
                    localPath,
                },
            });
        }

        // Create new skill
        return skillsDb.create({
            name: metadata.name,
            description: metadata.description,
            version: metadata.version || '1.0.0',
            author: metadata.author || author || 'unknown',
            path: localPath || '',
            enabled: true,
            settings: {
                markdown: content,
                settingsSchema: metadata.settings,
                requiredBins: metadata.requirements?.binaries || [],
                requiredEnv: metadata.requirements?.env || [],
                supportedOS: metadata.requirements?.os || [],
            },
        });
    }

    /**
     * Get a skill by name
     */
    async get(name: string): Promise<SkillRecord | null> {
        return skillsDb.findUnique({ name });
    }

    /**
     * List all installed skills
     */
    async list(): Promise<SkillRecord[]> {
        return skillsDb.findMany();
    }

    /**
     * Uninstall a skill
     */
    async uninstall(name: string) {
        return skillsDb.delete({ name });
    }

    /**
     * Update skill settings (values)
     */
    async updateSettings(name: string, settings: Record<string, unknown>) {
        const skill = skillsDb.findUnique({ name });
        if (!skill) return null;

        return skillsDb.update({ name }, {
            settings: { ...skill.settings, ...settings },
        });
    }
}

export const skillRegistry = new SkillRegistry();
