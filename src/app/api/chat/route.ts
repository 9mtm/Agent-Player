import { getSessionUser } from '@/lib/session';
import { config } from '@/lib/config';

export const runtime = 'nodejs';

const BACKEND_URL = config.backendUrl;

export async function POST(req: Request) {
    try {
        // Check authentication
        const user = await getSessionUser();
        if (!user) {
            console.log('[Chat API] ❌ Unauthorized - No user session');
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('[Chat API] ✅ User authenticated:', user.email);

        const { messages, model: selectedModel, agentId, sessionId: requestedSessionId, systemPrompt: customSystemPrompt, systemPromptAppend } = await req.json();
        const modelName = selectedModel || process.env.LOCAL_MODEL_NAME || 'qwen2.5:7b';
        const userId = (user as any).id || user.email;

        console.log('[Chat API] 📨 Incoming request:');
        console.log('  🆔 Session ID:', requestedSessionId);
        console.log('  🤖 Agent ID:', agentId || 'primary');
        console.log('  🤖 Model:', agentId ? `[from agent config]` : modelName);
        console.log('  💬 Messages count:', messages?.length);
        console.log('  📝 Last message:', messages?.[messages.length - 1]?.content?.slice(0, 50) + '...');

        // Get or create session via backend
        let sessionId = requestedSessionId;
        if (!sessionId) {
            console.log('[Chat API] 📝 No session ID, creating new session...');
            const sessionRes = await fetch(`${BACKEND_URL}/api/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'New Chat', model: modelName })
            });
            if (sessionRes.ok) {
                const { session } = await sessionRes.json();
                sessionId = session.id;
                console.log('[Chat API] ✅ New session created:', sessionId);
            }
        }

        // Save User Message to backend
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'user' && sessionId) {
            await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: 'user',
                    content: lastMessage.content,
                    model: modelName
                })
            }).catch(err => console.error('[Chat API] ❌ Failed to save user message:', err));
        }

        // 🧠 Fetch relevant memories for this user + message
        let memoryContext = '';
        if (userId && lastMessage?.content) {
            try {
                const memRes = await fetch(
                    `${BACKEND_URL}/api/memory/relevant?query=${encodeURIComponent(lastMessage.content)}&userId=${encodeURIComponent(userId)}&limit=5`,
                    { signal: AbortSignal.timeout(2000) } // 2 second timeout
                );
                if (memRes.ok) {
                    const { memories } = await memRes.json();
                    if (memories && memories.length > 0) {
                        memoryContext = memories
                            .map((m: any) => `- [${m.type}] ${m.content}`)
                            .join('\n');
                        console.log('[Chat API] 🧠 Memory context loaded:', memories.length, 'memories');
                    }
                }
            } catch {
                // Memory fetch failed silently — chat continues without it
            }
        }

        // Call Backend API for AI (supports multiple providers)
        console.log('[Chat API] 🚀 Calling AI backend...');

        const backendResponse = await fetch(`${BACKEND_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': config.appUrl
            },
            body: JSON.stringify({
                model: agentId ? undefined : modelName,
                agentId: agentId || undefined,
                messages: messages,
                stream: true,
                userId,
                memoryContext: memoryContext || undefined,
                systemPrompt: customSystemPrompt || undefined,
                systemPromptAppend: systemPromptAppend || undefined,
            }),
        });

        if (!backendResponse.ok) {
            const errorText = await backendResponse.text();
            console.error('[Chat API] ❌ Backend error:', backendResponse.status, errorText);
            throw new Error(`Backend API error: ${backendResponse.status} ${backendResponse.statusText}`);
        }

        console.log('[Chat API] ✅ Backend connected, streaming response...');

        // Create a streaming response
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let buffer = '';
        let chunkCount = 0;

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const reader = backendResponse.body?.getReader();
                    if (!reader) {
                        console.error('[Chat API] ❌ No reader from backend');
                        controller.close();
                        return;
                    }

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            if (buffer.trim()) {
                                processLine(buffer, controller);
                            }
                            break;
                        }

                        const chunk = decoder.decode(value, { stream: true });
                        buffer += chunk;

                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            processLine(line, controller);
                        }
                    }

                    // Save assistant response to session
                    if (fullResponse && sessionId) {
                        console.log('[Chat API] 💾 Saving assistant response (' + fullResponse.length + ' chars)...');
                        await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/messages`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                role: 'assistant',
                                content: fullResponse,
                                model: modelName
                            })
                        }).catch(err => console.error('[Chat API] ❌ Failed to save response:', err));
                    }

                    // 🧠 Auto-extract memories from this conversation (fire-and-forget)
                    if (fullResponse && lastMessage?.content && userId) {
                        const conversationText = `User: ${lastMessage.content}\nAssistant: ${fullResponse}`;
                        fetch(`${BACKEND_URL}/api/memory/extract`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: conversationText, userId }),
                        }).then(r => {
                            if (r.ok) r.json().then(d => {
                                if (d.count > 0) console.log('[Chat API] 🧠 Extracted', d.count, 'memories');
                            });
                        }).catch(() => {});
                    }

                    console.log('[Chat API] ✅ Stream completed (' + chunkCount + ' chunks)');
                    controller.close();
                } catch (error) {
                    console.error("[Chat API] ❌ Streaming error:", error);
                    controller.error(error);
                }
            },
        });

        function processLine(line: string, controller: ReadableStreamDefaultController) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) return;

            // Forward the raw SSE event intact (preserves tool_start, tool_result, text, done)
            controller.enqueue(encoder.encode(trimmed + '\n\n'));
            chunkCount++;

            // Accumulate text content for DB save at end of stream
            try {
                const jsonStr = trimmed.slice(6);
                const json = JSON.parse(jsonStr);
                // Old format: {content, done}
                if (!json.type && json.content) {
                    fullResponse += json.content;
                    if (chunkCount === 1) console.log('[Chat API] 📡 First chunk (old):', String(json.content).slice(0, 30));
                }
                // New format: {type: 'text', content}
                if (json.type === 'text' && json.content) {
                    fullResponse += json.content;
                    if (chunkCount === 1) console.log('[Chat API] 📡 First chunk:', String(json.content).slice(0, 30));
                }
            } catch {
                // Skip invalid lines
            }
        }

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        });

    } catch (error: any) {
        console.error("[Chat API] ❌ Error:", error);
        return new Response(
            JSON.stringify({
                error: 'Chat API Error',
                message: error.message || 'Internal Server Error',
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}
