import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSessionUser } from '@/lib/session';
import { isSafePathSegment } from '@/lib/net/path-segment';

const SKILLS_DIR = path.join(process.cwd(), 'skills');
const ICON_EXTENSIONS = ['.png', '.svg', '.jpg', '.jpeg', '.webp', '.ico'];
const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

/**
 * GET /api/skills/[name]/icon
 * Serve skill icon
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    // SECURITY (S0-A.8): signed-in users only (same-origin cookie works for
    // <img>), and the name must be a plain directory name (no traversal).
    if (!(await getSessionUser())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { name } = await params;
    if (!isSafePathSegment(name)) {
      return NextResponse.json({ error: 'Invalid skill name' }, { status: 400 });
    }
    const skillDir = path.join(SKILLS_DIR, name);

    // Find icon file
    for (const ext of ICON_EXTENSIONS) {
      const iconPath = path.join(skillDir, `icon${ext}`);
      if (fs.existsSync(iconPath)) {
        const iconData = fs.readFileSync(iconPath);
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

        return new NextResponse(iconData, {
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'private, max-age=86400',
          },
        });
      }
    }

    // No icon found - return 404
    return NextResponse.json(
      { error: 'Icon not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error serving skill icon:', error);
    return NextResponse.json(
      { error: 'Failed to serve icon' },
      { status: 500 }
    );
  }
}
