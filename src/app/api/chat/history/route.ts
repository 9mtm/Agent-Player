import { getSessionUser } from '@/lib/session';
import { NextRequest } from 'next/server';
import { config } from '@/lib/config';

export const runtime = 'nodejs';

const BACKEND_URL = config.backendUrl;

// GET /api/chat/history - Get chat history for all sessions or specific session
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const searchParams = req.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const limit = searchParams.get('limit') || '50';

    if (sessionId) {
      // Get messages for specific session
      const messagesRes = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/messages`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!messagesRes.ok) {
        if (messagesRes.status === 404) {
          return new Response(JSON.stringify({ error: 'Session not found', messages: [] }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ error: 'Failed to fetch messages', messages: [] }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await messagesRes.json();
      return new Response(JSON.stringify({
        messages: data.messages || [],
        sessionId
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all sessions with their latest messages
    const sessionsRes = await fetch(`${BACKEND_URL}/api/sessions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!sessionsRes.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch history', sessions: [] }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sessionsData = await sessionsRes.json();
    const sessions = sessionsData.sessions || [];

    // Limit the number of sessions returned
    const limitedSessions = sessions.slice(0, parseInt(limit));

    return new Response(JSON.stringify({
      sessions: limitedSessions,
      total: sessions.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[History API] Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch history',
      message: error.message,
      sessions: [],
      messages: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
