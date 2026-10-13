import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { backendFetch, getSessionUser } from '@/lib/session';

const BACKEND_URL = config.backendUrl;

/**
 * GET /api/models
 * Fetch available models from all providers via Backend API.
 * SECURITY (S0-A.8): signed-in users only; the caller's token is forwarded.
 */
export async function GET() {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ models: [], error: 'Unauthorized' }, { status: 401 });
    try {
        const res = await backendFetch(`${BACKEND_URL}/api/models`, { cache: 'no-store' });
        if (!res.ok) {
            return NextResponse.json({ models: [], error: `API Error: ${res.status}` }, { status: res.status });
        }
        const data = await res.json();
        const models = Array.isArray(data?.models) ? data.models : [];

        return NextResponse.json({
            models,
            count: models.length,
        });
    } catch (error) {
        console.error('Error fetching models:', error);
        return NextResponse.json({
            models: [],
            error: 'Failed to fetch models'
        }, { status: 500 });
    }
}
