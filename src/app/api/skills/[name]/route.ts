import { NextRequest, NextResponse } from 'next/server';
import { skillsClient } from '@/lib/skills/client';
import fs from 'fs';
import path from 'path';

const SKILLS_DIR = path.join(process.cwd(), 'skills');

/**
 * GET /api/skills/[name]
 * Get skill details (proxies to Backend API)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ name: string }> }
) {
    try {
        const { name } = await params;
        const skill = await skillsClient.get(name);

        if (!skill) {
            return NextResponse.json(
                { error: 'Skill not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: skill,
        });
    } catch (error) {
        console.error('Error fetching skill:', error);
        return NextResponse.json(
            { error: 'Failed to fetch skill', details: (error as Error).message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/skills/[name]
 * Delete a skill (file or folder)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ name: string }> }
) {
    try {
        const { name } = await params;

        // Check for folder-based skill first (skills/{name}/SKILL.md)
        const skillFolder = path.join(SKILLS_DIR, name);
        const skillFolderMd = path.join(skillFolder, 'SKILL.md');

        // Check for single file skill (skills/{name}.md)
        const skillFile = path.join(SKILLS_DIR, `${name}.md`);

        let deleted = false;

        if (fs.existsSync(skillFolder) && fs.existsSync(skillFolderMd)) {
            // Delete folder-based skill
            fs.rmSync(skillFolder, { recursive: true, force: true });
            deleted = true;
        } else if (fs.existsSync(skillFile)) {
            // Delete single file skill
            fs.unlinkSync(skillFile);
            deleted = true;
        }

        if (!deleted) {
            return NextResponse.json(
                { error: 'Skill not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Skill "${name}" deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting skill:', error);
        return NextResponse.json(
            { error: 'Failed to delete skill', details: (error as Error).message },
            { status: 500 }
        );
    }
}
