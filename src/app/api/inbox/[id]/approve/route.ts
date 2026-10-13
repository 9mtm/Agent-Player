/**
 * Inbox Approve API - Proxy to Backend
 * POST /api/inbox/[id]/approve
 */

import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { backendFetch, getSessionUser } from '@/lib/session';

const BACKEND_URL = config.backendUrl;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY (S0-Q.12): signed-in users only; token forwarded to the backend.
    if (!(await getSessionUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const body = await request.json();

    const response = await backendFetch(`${BACKEND_URL}/api/inbox/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to approve message' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Inbox Approve API] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
