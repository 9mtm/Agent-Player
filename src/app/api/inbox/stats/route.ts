/**
 * Inbox Stats API - Proxy to Backend
 * GET /api/inbox/stats
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

    const response = await backendFetch(
      `${BACKEND_URL}/api/inbox/stats`,
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
        { error: data.error || 'Failed to fetch stats' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Inbox Stats API] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
