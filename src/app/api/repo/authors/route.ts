import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const REPO_ROOT = 'C:\\MAMP\\htdocs\\agent\\more_skills\\skills';

export async function GET() {
    if (!fs.existsSync(REPO_ROOT)) {
        return NextResponse.json([]);
    }

    try {
        // Read only directories (Author names)
        const authors = fs.readdirSync(REPO_ROOT, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
            .map(dirent => dirent.name);

        return NextResponse.json(authors);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to read authors' }, { status: 500 });
    }
}
