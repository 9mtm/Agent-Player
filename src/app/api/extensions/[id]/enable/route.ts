import { NextResponse } from 'next/server';
import { enableExtension } from '@/lib/extensions/manager';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const config = body.config;

    const result = enableExtension(id, config);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Enable extension error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to enable extension' },
      { status: 500 }
    );
  }
}
