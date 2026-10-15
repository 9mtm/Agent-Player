import type { WireTransport } from './session';
import { validChatBody, validKey } from './chat-protocol.js';
/** Fictional, process-local ten-minute ledger. Explicit exercise; never a live fallback. */
export function createChatMock(): WireTransport {
  const ledger = new Map<string, { fingerprint: string; created: number; runId: string; messageId: string; running: boolean; text: string }>();
  let sequence = 0;
  return async request => {
    if (request.method !== 'POST' || request.path !== '/api/chat' || !validChatBody(request.body) || !validKey(request.headers['Idempotency-Key'])) return { status: 400, body: { code: 'invalid_idempotency_key' } };
    const b = request.body, key = request.headers.Authorization + ':' + request.headers['Idempotency-Key'];
    for (const [k, e] of ledger) if (Date.now() - e.created > 600000) ledger.delete(k);
    const fingerprint = JSON.stringify({ a: b.agentId ?? null, s: b.sessionId, st: true, n: b.messages.length, last: b.messages.at(-1) });
    const previous = ledger.get(key);
    if (previous && previous.fingerprint !== fingerprint) return { status: 422, body: { code: 'idempotency_key_reused' } };
    if (previous?.running) return { status: 409, body: { code: 'idempotency_in_progress', runId: previous.runId, messageId: previous.messageId } };
    const text = 'Fictional response: مرحباً — this stream exercises the current conversation. No model or tool ran.';
    const entry = previous ?? { fingerprint, created: Date.now(), runId: `fictional-run-${++sequence}`, messageId: `fictional-message-${sequence}`, running: true, text };
    ledger.set(key, entry);
    const ids = { runId: entry.runId, messageId: entry.messageId };
    const frames = previous ? [{ type: 'text', content: entry.text, done: false, replayed: true }, { type: 'done', done: true, replayed: true }]
      : [{ type: 'text', content: text.slice(0, 27) }, { type: 'text', content: text.slice(27) }, { type: 'done' }];
    const bytes = new TextEncoder().encode(': fictional mock\n\n' + frames.map(f => `data: ${JSON.stringify({ ...f, ...ids })}\n\n`).join(''));
    let offset = 0, cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        await new Promise(resolve => setTimeout(resolve, 10));
        if (cancelled) return;
        if (request.signal.aborted) { controller.close(); return; }
        if (offset >= bytes.length) { entry.running = false; controller.close(); return; }
        controller.enqueue(bytes.slice(offset, offset += 23));
      },
      cancel() { cancelled = true; /* Aborting reads does not claim server cancellation or allow a resend. */ },
    });
    return { status: 200, body: null, stream, streamIds: ids };
  };
}
