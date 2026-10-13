import { NextResponse } from 'next/server';
import { listExtensions } from '@/lib/extensions/manager';
import { getSessionUser } from '@/lib/session';

export async function GET() {
  // SECURITY (S0-A.8): signed-in users only.
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const extensions = listExtensions();
    return NextResponse.json({ extensions });
  } catch (error) {
    console.error('[API] Extensions list error:', error);
    return NextResponse.json(
      { error: 'Failed to list extensions' },
      { status: 500 }
    );
  }
}
