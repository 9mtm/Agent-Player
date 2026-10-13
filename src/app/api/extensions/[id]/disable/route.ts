import { NextResponse } from 'next/server';
import { disableExtension } from '@/lib/extensions/manager';
import { requireSessionRole } from '@/lib/session';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
    // SECURITY (S0-Q.9): owner/admin only, verified by the backend JWT check
    const auth = await requireSessionRole();
    if (auth instanceof Response) return auth;

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
