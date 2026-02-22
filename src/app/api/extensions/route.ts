import { NextResponse } from 'next/server';
import { listExtensions } from '@/lib/extensions/manager';

export async function GET() {
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
