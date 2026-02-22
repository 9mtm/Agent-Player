import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
    const { name } = await params;
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
            'Cache-Control': 'public, max-age=31536000, immutable',
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
