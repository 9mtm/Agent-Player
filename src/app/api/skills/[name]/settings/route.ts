import { NextRequest, NextResponse } from 'next/server';
import { skillRegistry } from '@/lib/skills/registry';
import { requireSessionRole } from '@/lib/session';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ name: string }> }
) {
    // SECURITY (S0-Q.9): owner/admin only, verified by the backend JWT check
    const auth = await requireSessionRole();
    if (auth instanceof Response) return auth;

    try {
        const { name } = await params;
        const body = await request.json();
        const settings = body.settings;

        const skill = await skillRegistry.get(name);
        if (!skill) {
            return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
        }

        // Update skill settings using the registry
        const updated = await skillRegistry.updateSettings(name, settings);

        if (!updated) {
            return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Settings saved' });
    } catch (error) {
        console.error('Error saving settings:', error);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
