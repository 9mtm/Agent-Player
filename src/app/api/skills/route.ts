import { NextRequest, NextResponse } from 'next/server';
import { skillsClient, type Skill } from '@/lib/skills/client';
import fs from 'fs';
import path from 'path';

const SKILLS_DIR = path.join(process.cwd(), 'skills');

/**
 * Load skills directly from the skills folder
 * This is a fallback when backend is not available
 */
async function loadSkillsFromDisk(): Promise<Skill[]> {
    const skills: Skill[] = [];

    if (!fs.existsSync(SKILLS_DIR)) {
        return skills;
    }

    const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillDir = path.join(SKILLS_DIR, entry.name);
        const skillJsonPath = path.join(skillDir, 'skill.json');
        const skillMdPath = path.join(skillDir, 'SKILL.md');

        try {
            // Try new format (skill.json)
            if (fs.existsSync(skillJsonPath)) {
                const config = JSON.parse(fs.readFileSync(skillJsonPath, 'utf-8'));
                const instructions = fs.existsSync(skillMdPath)
                    ? fs.readFileSync(skillMdPath, 'utf-8')
                    : '';

                skills.push({
                    name: config.name || entry.name,
                    displayName: config.displayName,
                    description: config.description || '',
                    version: config.version || '1.0.0',
                    author: config.author,
                    category: config.category,
                    emoji: config.emoji,
                    tags: config.tags || [],
                    triggers: config.triggers || [],
                    settings: config.settings || [],
                    enabled: config.enabled !== false,
                    instructions,
                });
            }
            // Try legacy format (SKILL.md with frontmatter)
            else if (fs.existsSync(skillMdPath)) {
                const content = fs.readFileSync(skillMdPath, 'utf-8');
                const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

                if (frontmatterMatch) {
                    const yaml = frontmatterMatch[1];
                    const instructions = frontmatterMatch[2];

                    // Simple YAML parse
                    const name = yaml.match(/name:\s*(.+)/)?.[1]?.trim() || entry.name;
                    const description = yaml.match(/description:\s*["']?(.+?)["']?\s*$/m)?.[1]?.trim() || '';

                    skills.push({
                        name,
                        description,
                        version: '1.0.0',
                        triggers: [],
                        settings: [],
                        enabled: true,
                        instructions,
                    });
                }
            }
        } catch (error) {
            console.error(`Failed to load skill ${entry.name}:`, error);
        }
    }

    return skills;
}

/**
 * GET /api/skills
 * List all skills - tries backend first, falls back to direct disk read
 */
export async function GET() {
    try {
        // Try backend first
        try {
            const skills = await skillsClient.list();
            if (skills && skills.length > 0) {
                return NextResponse.json({
                    success: true,
                    data: skills,
                    source: 'backend',
                });
            }
        } catch (backendError) {
            console.log('[Skills API] Backend unavailable, using disk fallback');
        }

        // Fallback: read directly from disk
        const skills = await loadSkillsFromDisk();
        return NextResponse.json({
            success: true,
            data: skills,
            source: 'disk',
        });
    } catch (error) {
        console.error('Error listing skills:', error);
        return NextResponse.json(
            { error: 'Failed to list skills', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/skills
 * Reload skills from disk
 */
export async function POST() {
    try {
        // Try to reload via backend
        try {
            const result = await skillsClient.reload();
            return NextResponse.json({
                success: true,
                message: `Reloaded ${result.count} skill(s)`,
                count: result.count,
            });
        } catch (backendError) {
            // Fallback: just count from disk
            const skills = await loadSkillsFromDisk();
            return NextResponse.json({
                success: true,
                message: `Found ${skills.length} skill(s) on disk`,
                count: skills.length,
            });
        }
    } catch (error) {
        console.error('Error reloading skills:', error);
        return NextResponse.json(
            { error: 'Failed to reload skills', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
