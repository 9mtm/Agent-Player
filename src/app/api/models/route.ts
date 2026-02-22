import { NextResponse } from 'next/server';
import { modelsAPI } from '@/lib/backend';

/**
 * GET /api/models
 * Fetch available models from all providers via Backend API
 */
export async function GET() {
    try {
        const models = await modelsAPI.list();

        return NextResponse.json({
            models,
            count: models.length,
        });
    } catch (error) {
        console.error('Error fetching models:', error);
        return NextResponse.json({
            models: [],
            error: error instanceof Error ? error.message : 'Failed to fetch models'
        }, { status: 500 });
    }
}
