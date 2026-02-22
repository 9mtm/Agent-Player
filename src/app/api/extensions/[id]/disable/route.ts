import { NextResponse } from 'next/server';
import { disableExtension } from '@/lib/extensions/manager';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = disableExtension(id);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Disable extension error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to disable extension' },
      { status: 500 }
    );
  }
}
