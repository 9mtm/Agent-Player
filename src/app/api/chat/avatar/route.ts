/**
 * Avatar Chat API - Non-streaming proxy for the avatar viewer
 * Collects the full streamed response and returns it as JSON
 * (Avatar needs complete text at once for TTS processing)
 */

import { getSessionUser } from '@/lib/session';
import { config } from '@/lib/config';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BACKEND_URL = config.backendUrl;

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // 🧠 Fetch relevant memories for context injection
        const userId = String(user.id);
        const lastUserMsg = body.messages?.findLast?.((m: any) => m.role === 'user')?.content || '';
        let memoryContext = '';
        if (lastUserMsg) {
            try {
                const memRes = await fetch(
                    `${BACKEND_URL}/api/memory/relevant?query=${encodeURIComponent(lastUserMsg)}&userId=${encodeURIComponent(userId)}&limit=5`,
                    { signal: AbortSignal.timeout(2000) }
                );
                if (memRes.ok) {
                    const { memories } = await memRes.json();
                    if (memories?.length > 0) {
                        memoryContext = memories.map((m: any) => `- [${m.type}] ${m.content}`).join('\n');
                    }
                }
            } catch { /* ignore */ }
        }

        // Always stream from backend — we'll collect and return as JSON
        const res = await fetch(`${BACKEND_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, stream: true, userId, memoryContext: memoryContext || undefined }),
        });

        if (!res.ok) {
            const err = await res.text();
            return NextResponse.json({ error: err }, { status: res.status });
        }

        // Read the SSE stream and collect the full content
        const reader = res.body?.getReader();
        if (!reader) {
            return NextResponse.json({ error: 'No response body' }, { status: 500 });
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                // Process any remaining buffer
                if (buffer.trim()) processLine(buffer);
                break;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) processLine(line);
        }

        function processLine(line: string) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) return;
            try {
                const json = JSON.parse(trimmed.slice(6));
                if (json.content && !json.done) fullContent += json.content;
            } catch { /* skip */ }
        }

        // Fire-and-forget memory extraction — don't block the response
        if (lastUserMsg && fullContent) {
            const extractText = `User: ${lastUserMsg}\nAssistant: ${fullContent}`;
            fetch(`${BACKEND_URL}/api/memory/extract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: extractText, userId }),
            }).then(r => {
                if (r.ok) r.json().then(d => {
                    if (d.count > 0) console.log('[Avatar Chat API] 🧠 Extracted', d.count, 'memories');
                });
            }).catch(() => { /* ignore extraction errors */ });
        }

        return NextResponse.json({
            message: { role: 'assistant', content: fullContent }
        });

    } catch (error: any) {
        console.error('[Avatar Chat API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
