import { getSessionUser } from '@/lib/session';
import { NextRequest } from 'next/server';
import { config } from '@/lib/config';

export const runtime = 'nodejs';

const BACKEND_URL = config.backendUrl;

// GET /api/chat/sessions/:id - Get session by ID with messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      console.log('[Session API] ❌ Unauthorized');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = await params;
    console.log('[Session API] 📖 Loading session:', id);

    // Get session from backend
    const sessionRes = await fetch(`${BACKEND_URL}/api/sessions/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!sessionRes.ok) {
      console.log('[Session API] ❌ Session not found:', id);
      if (sessionRes.status === 404) {
        return new Response(JSON.stringify({ error: 'Session not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to fetch session' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await sessionRes.json();
    console.log('[Session API] ✅ Session found:', data.session?.title);

    // Also get messages for this session
    console.log('[Session API] 📨 Loading messages for session...');
    const messagesRes = await fetch(`${BACKEND_URL}/api/sessions/${id}/messages`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    let messages: any[] = [];
    if (messagesRes.ok) {
      const messagesData = await messagesRes.json();
      messages = messagesData.messages || [];
      console.log('[Session API] ✅ Messages loaded:', messages.length);
      messages.forEach((m: any, i: number) => {
        console.log(`  [${i + 1}] ${m.role}: ${m.content?.slice(0, 50)}...`);
      });
    } else {
      console.log('[Session API] ⚠️ No messages found or error loading');
    }

    return new Response(JSON.stringify({
      ...data,
      messages
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[Session API] ❌ Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch session',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PATCH /api/chat/sessions/:id - Update session
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    console.log('[Session API] 📝 Updating session:', id, body);

    // Update session via backend (PATCH for partial updates)
    const sessionRes = await fetch(`${BACKEND_URL}/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!sessionRes.ok) {
      if (sessionRes.status === 404) {
        return new Response(JSON.stringify({ error: 'Session not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to update session' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await sessionRes.json();
    console.log('[Session API] ✅ Session updated');

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[Session API] ❌ Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update session',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE /api/chat/sessions/:id - Delete session
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = await params;
    console.log('[Session API] 🗑️ Deleting session:', id);

    // Delete session via backend
    const sessionRes = await fetch(`${BACKEND_URL}/api/sessions/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!sessionRes.ok) {
      if (sessionRes.status === 404) {
        return new Response(JSON.stringify({ error: 'Session not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to delete session' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[Session API] ✅ Session deleted');
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[Session API] ❌ Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to delete session',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
