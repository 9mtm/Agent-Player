import { NextResponse } from 'next/server';
import { skillRepo } from '@/lib/skills/repo';

export async function GET() {
    try {
        const skills = await skillRepo.findAllSkills();
        return NextResponse.json(skills);
    } catch (e) {
        console.error("Failed to list all skills", e);
        return NextResponse.json({ error: 'Failed to list skills' }, { status: 500 });
    }
}
