import fs from 'fs';
import path from 'path';
import { skillsDb } from './db';

// TODO: Move to .env
const REPO_ROOT = path.join(process.cwd(), 'public', 'skills_repo');

export interface RepoSkillSummary {
    name: string;
    title?: string;
    author: string;
    description: string;
    tags: string[];
    category?: string;
    isInstalled: boolean;
    localPath: string;
}

export const skillRepo = {
    async listAuthors(): Promise<string[]> {
        if (!fs.existsSync(REPO_ROOT)) return [];
        return fs.readdirSync(REPO_ROOT, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
            .map(dirent => dirent.name);
    },

    /**
     * Get ALL skills from ALL authors efficiently
     */
    async findAllSkills(): Promise<RepoSkillSummary[]> {
        if (!fs.existsSync(REPO_ROOT)) return [];

        // 1. Get all authors
        const authors = await this.listAuthors();

        // 2. Get all installed skills map for O(1) lookup
        const installedSkills = skillsDb.findMany();
        const installedSet = new Set(installedSkills.map(s => s.name)); // Simplified check by name

        const allSkills: RepoSkillSummary[] = [];

        // 3. Iterate authors and skills (Parallelized for speed)
        await Promise.all(authors.map(async (author) => {
            const authorPath = path.join(REPO_ROOT, author);
            let skillDirs: fs.Dirent[] = [];
            try {
                skillDirs = fs.readdirSync(authorPath, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'));
            } catch (e) { return; }

            for (const dir of skillDirs) {
                const skillName = dir.name;
                const skillPath = path.join(authorPath, skillName);

                // Metadata extraction
                let description = "No description available.";
                let title = skillName;
                let tags: string[] = [];
                let category = 'Uncategorized';

                // Try reading _meta.json first (faster)
                const metaPath = path.join(skillPath, '_meta.json');
                const mdPath = path.join(skillPath, 'SKILL.md'); // Fallback

                if (fs.existsSync(metaPath)) {
                    try {
                        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                        description = meta.description || description;
                        title = meta.title || meta.name || title;
                        tags = meta.tags || [];
                        category = meta.category || category;
                    } catch (e) { }
                } else if (fs.existsSync(mdPath)) {
                    try {
                        // Read only first 1KB to get frontmatter/header
                        const fd = fs.openSync(mdPath, 'r');
                        const buffer = Buffer.alloc(1024);
                        fs.readSync(fd, buffer, 0, 1024, 0);
                        fs.closeSync(fd);
                        const content = buffer.toString('utf-8');

                        // Simple regex parsers
                        // Title
                        const titleMatch = content.match(/^#\s+(.+)$/m);
                        if (titleMatch) title = titleMatch[1].trim();

                        // Description (yaml or text)
                        const descMatch = content.match(/description:\s*(.+)$/m);
                        if (descMatch) {
                            description = descMatch[1].trim();
                        } else {
                            // First paragraph
                            const paraMatch = content.replace(/^#.+\n/, '').trim().split('\n\n')[0];
                            if (paraMatch) description = paraMatch.slice(0, 150).replace(/\n/g, ' ') + '...';
                        }

                        // Category/Tags from frontmatter
                        const catMatch = content.match(/category:\s*(.+)$/m);
                        if (catMatch) category = catMatch[1].trim();

                        const tagsMatch = content.match(/tags:\s*\[(.*)\]/m);
                        if (tagsMatch) tags = tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));

                    } catch (e) { }
                }

                allSkills.push({
                    name: skillName,
                    title,
                    author,
                    description,
                    tags,
                    category,
                    isInstalled: installedSet.has(skillName),
                    localPath: skillPath
                });
            }
        }));

        return allSkills;
    },

    async listAuthorSkills(author: string): Promise<RepoSkillSummary[]> {
        // Reuse findAllSkills but filter by author? 
        // Or keep optimized separate function? 
        // For now, let's just reuse logic to be consistent, filtering in memory is fast enough.
        const all = await this.findAllSkills();
        return all.filter(s => s.author === author);
    },

    async getSkillDetails(author: string, name: string) {
        const skillPath = path.join(REPO_ROOT, author, name);
        const mdPath = path.join(skillPath, 'SKILL.md');

        if (!fs.existsSync(mdPath)) {
            // Check if directory exists at least, maybe create dummy MD?
            if (fs.existsSync(skillPath)) {
                return { markdown: "# No SKILL.md found", localPath: skillPath };
            }
            return null;
        }

        return {
            markdown: fs.readFileSync(mdPath, 'utf-8'),
            localPath: skillPath
        };
    }
};
