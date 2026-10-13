import { NextResponse } from 'next/server';
import { requireSessionRole } from '@/lib/session';
import { skillRepo } from '@/lib/skills/repo';

export async function GET() {
    // SECURITY (S0-A.8): owner/admin only (reads the local skills repository).
    const auth = await requireSessionRole();
    if (auth instanceof Response) return auth;
    try {
        const skills = await skillRepo.findAllSkills();
        return NextResponse.json(skills);
    } catch (e) {
        console.error("Failed to list all skills", e);
        return NextResponse.json({ error: 'Failed to list skills' }, { status: 500 });
    }
}
