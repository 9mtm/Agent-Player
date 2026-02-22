import { getSessionUser } from '@/lib/session';
import { config } from '@/lib/config';

export const runtime = 'nodejs';

const BACKEND_URL = config.backendUrl;

// POST /api/chat/sessions - Create new session
export async function POST(req: Request) {
  try {
    // Check authentication
    const user = await getSessionUser();
    if (!user) {
      console.log('[Sessions API] ❌ Unauthorized - No user session');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[Sessions API] ✅ User authenticated:', user.email);

    const body = await req.json().catch(() => ({}));
    const { title, model } = body;

    const sessionData = {
      title: title || 'New Chat',
      model: model || process.env.LOCAL_MODEL_NAME || 'qwen2.5:7b'
    };

    console.log('[Sessions API] 📝 Creating new session:', sessionData);

    // Create session via backend
    const sessionRes = await fetch(`${BACKEND_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    });

    if (!sessionRes.ok) {
      const error = await sessionRes.text();
      console.error('[Sessions API] ❌ Backend error:', error);
      return new Response(JSON.stringify({ error: 'Failed to create session' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await sessionRes.json();

    console.log('[Sessions API] ✅ Session created successfully:');
    console.log('  📌 Session ID:', data.session?.id);
    console.log('  📝 Title:', data.session?.title);
    console.log('  🤖 Model:', data.session?.model);
    console.log('  📅 Created:', data.session?.createdAt);
    console.log('  💾 Stored in database: SQLite (backend)');

    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[Sessions API] ❌ Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to create session',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// GET /api/chat/sessions - List all sessions
export async function GET() {
  try {
    // Check authentication
    const user = await getSessionUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get sessions from backend
    const sessionRes = await fetch(`${BACKEND_URL}/api/sessions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!sessionRes.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch sessions' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await sessionRes.json();
    console.log('[Sessions API] 📋 Fetched', data.sessions?.length || 0, 'sessions');

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[Sessions API] ❌ Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch sessions',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
