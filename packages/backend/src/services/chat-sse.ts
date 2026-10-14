/**
 * SSE helpers for the chat stream (CHAT-01).
 *
 * - `openSseStream` writes the event-stream headers once, flushes them and
 *   starts one heartbeat timer per stream: an SSE comment (`: ping`) every
 *   12 s while the turn is open, so tool steps, rate-limit waits and a cold
 *   model load never trip an idle timer downstream. Comments carry no data
 *   and are not counted as events by SSE clients. The timer is cleared on
 *   end, close, finish and error.
 * - `chunkText` splits text into pieces of bounded size without splitting a
 *   surrogate pair, so every `data:` frame stays small (the UI caps a frame
 *   at 64 KiB and a turn at 4,096 frames).
 */

const DEFAULT_HEARTBEAT_MS = 12_000;
let heartbeatMs = DEFAULT_HEARTBEAT_MS;
let activeHeartbeats = 0;

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const;

const opened = new WeakSet<object>();

/** Test hook: change the heartbeat interval (null restores the default). */
export function setSseHeartbeatMs(ms: number | null): void {
  heartbeatMs = ms && ms > 0 ? ms : DEFAULT_HEARTBEAT_MS;
}

/** Test hook: number of heartbeat timers still running. */
export function activeSseHeartbeats(): number {
  return activeHeartbeats;
}

/**
 * Send the SSE headers now (once per response) and start the heartbeat.
 * A second call on the same response is a no-op, so every provider path may
 * call it even when the route already opened the stream.
 */
export function openSseStream(raw: any): void {
  if (!raw || opened.has(raw)) return;
  opened.add(raw);
  if (!raw.headersSent) {
    raw.writeHead(200, { ...SSE_HEADERS });
    try { raw.flushHeaders?.(); } catch { /* already flushed */ }
  }
  startHeartbeat(raw);
}

function startHeartbeat(raw: any): void {
  if (raw.writableEnded || raw.destroyed) return;
  let timer: ReturnType<typeof setInterval> | null = setInterval(() => {
    if (raw.writableEnded || raw.destroyed) { stop(); return; }
    try { raw.write(': ping\n\n'); } catch { stop(); }
  }, heartbeatMs);
  timer.unref?.();
  activeHeartbeats++;
  function stop(): void {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    activeHeartbeats--;
  }
  if (typeof raw.once === 'function') {
    raw.once('close', stop);
    raw.once('finish', stop);
    raw.once('error', stop);
  }
  const origEnd = raw.end;
  raw.end = (...args: any[]) => {
    stop();
    return origEnd.apply(raw, args);
  };
}

/** Bytes this code point adds inside a JSON string (always >= its UTF-8 size). */
function jsonCost(cp: number): number {
  if (cp === 0x22 || cp === 0x5c) return 2;                       // \" \\
  if (cp < 0x20) return cp === 0x08 || cp === 0x09 || cp === 0x0a || cp === 0x0c || cp === 0x0d ? 2 : 6;
  if (cp < 0x80) return 1;
  if (cp < 0x800) return 2;
  if (cp >= 0xd800 && cp <= 0xdfff) return 6;                    // lone surrogate -> \udXXX
  if (cp < 0x10000) return 3;
  return 4;
}

/**
 * Split `text` into chunks whose UTF-8 size (and JSON-escaped size) is at
 * most `maxBytes`. Iterates by code point, so a surrogate pair (emoji) is
 * never split; joining the chunks gives back `text` exactly.
 */
export function chunkText(text: string, maxBytes: number): string[] {
  if (!text) return [];
  if (!(maxBytes >= 6)) throw new RangeError('maxBytes must be at least 6');
  const out: string[] = [];
  let start = 0;
  let size = 0;
  let i = 0;
  while (i < text.length) {
    const cp = text.codePointAt(i)!;
    const width = cp > 0xffff ? 2 : 1;
    const cost = jsonCost(cp);
    if (size + cost > maxBytes && i > start) {
      out.push(text.slice(start, i));
      start = i;
      size = 0;
    }
    size += cost;
    i += width;
  }
  if (start < text.length) out.push(text.slice(start));
  return out;
}
