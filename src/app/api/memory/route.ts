/**
 * Memory API - Frontend proxy with session user ID injection
 * All memory operations are scoped to the authenticated user
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

/** GET /api/memory - List all memories for current user */
export async function GET(req: Request) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const type = url.searchParams.get('type');

    const backendUrl = new URL(`${BACKEND_URL}/api/memory`);
    backendUrl.searchParams.set('userId', userId);
    if (type) backendUrl.searchParams.set('type', type);

    try {
        const res = await fetch(backendUrl.toString());
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }
}

/** POST /api/memory - Create a new memory */
export async function POST(req: Request) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    const body = await req.json();

    // Handle search
    if (action === 'search') {
        const res = await fetch(`${BACKEND_URL}/api/memory/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, userId }),
        });
        return NextResponse.json(await res.json());
    }

    // Handle extract
    if (action === 'extract') {
        const res = await fetch(`${BACKEND_URL}/api/memory/extract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, userId }),
        });
        return NextResponse.json(await res.json());
    }

    // Create memory
    const res = await fetch(`${BACKEND_URL}/api/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, userId }),
    });
    return NextResponse.json(await res.json());
}

/** PUT /api/memory/:id - Update a memory */
export async function PUT(req: Request) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Memory ID required' }, { status: 400 });

    const body = await req.json();

    try {
        const res = await fetch(`${BACKEND_URL}/api/memory/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, userId }),
        });
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }
}

/** DELETE /api/memory/:id - Delete a memory */
export async function DELETE(req: Request) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Memory ID required' }, { status: 400 });

    try {
        const res = await fetch(`${BACKEND_URL}/api/memory/${id}?userId=${userId}`, {
            method: 'DELETE',
        });
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }
}
