import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { skillsDb } from '@/lib/skills/db';

const REPO_ROOT = 'C:\\MAMP\\htdocs\\agent\\more_skills\\skills';

export interface RepoSkillSummary {
    name: string;
    description: string;
    isInstalled: boolean;
    localPath: string;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const { slug: author } = await params;

    if (!author) {
        return NextResponse.json({ error: 'Author is required' }, { status: 400 });
    }

    const authorPath = path.join(REPO_ROOT, author);

    if (!fs.existsSync(authorPath)) {
        return NextResponse.json([]);
    }

    try {
        const dirs = fs.readdirSync(authorPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'));

        const skills = [];

        for (const dir of dirs) {
            const skillPath = path.join(authorPath, dir.name);
            const mdPath = path.join(skillPath, 'SKILL.md');
            let description = "No description available.";

            if (fs.existsSync(mdPath)) {
                try {
                    // Quick read for description
                    const fd = fs.openSync(mdPath, 'r');
                    const buffer = Buffer.alloc(1000); // 1KB is enough for header
                    fs.readSync(fd, buffer, 0, 1000, 0);
                    fs.closeSync(fd);
                    const content = buffer.toString('utf-8');

                    // Regex for description
                    const match = content.match(/^description:\s*(.+)$/m);
                    if (match) description = match[1].trim();
                } catch (e) {
                    // Ignore read errors
                }
            }

            // Check if installed using file-based DB
            const existing = skillsDb.findUnique({ name: dir.name });

            skills.push({
                name: dir.name,
                description,
                isInstalled: !!existing,
                localPath: skillPath
            });
        }

        return NextResponse.json(skills);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
