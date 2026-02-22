/**
 * Memory item API - Delete and update individual memories
 */

import { getSessionUser } from '@/lib/session';
import { config } from '@/lib/config';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BACKEND_URL = config.backendUrl;

async function getUserId(): Promise<string | null> {
    const user = await getSessionUser();
    if (!user) return null;
    return (user as any).id || user.email;
}

/** DELETE /api/memory/[id] - Delete a memory */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const res = await fetch(`${BACKEND_URL}/api/memory/${id}`, {
        method: 'DELETE',
    });
    return NextResponse.json(await res.json());
}

/** PUT /api/memory/[id] - Update a memory */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/api/memory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json());
}
