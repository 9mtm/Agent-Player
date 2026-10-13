/**
 * Inbox API Routes - Proxy to Backend
 * GET /api/inbox - List messages
 * POST /api/inbox - Create new message
 */

import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { backendFetch, getSessionUser } from '@/lib/session';

const BACKEND_URL = config.backendUrl;

export async function GET(request: NextRequest) {
  try {
    // SECURITY (S0-Q.12): signed-in users only; the backend takes the user
    // from the forwarded token (no userId from the query).
    if (!(await getSessionUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // Build query string
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit);
    if (offset) params.append('offset', offset);

    const response = await backendFetch(
      `${BACKEND_URL}/api/inbox?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to fetch messages' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Inbox API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await getSessionUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();

    const response = await backendFetch(`${BACKEND_URL}/api/inbox`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to create message' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Inbox API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
