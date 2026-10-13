/**
 * Limits for anonymous messages in public chat rooms (S0-A.10).
 *
 * An anonymous POST /api/public-chat/rooms/:id/messages makes the agent
 * answer with the owner's model keys, so anonymous senders are limited:
 *   - per IP:   PUBLIC_CHAT_ANON_PER_IP_PER_MIN   (default 5) per minute
 *   - per room: PUBLIC_CHAT_ANON_PER_ROOM_PER_MIN (default 20) per minute
 *   - per room: PUBLIC_CHAT_ANON_PER_ROOM_PER_DAY (default 200) per UTC day
 * Signed-in users are not limited here. State is in memory (one process).
 */

type Bucket = { count: number; resetAt: number };

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function limit(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export class AnonymousChatLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(private now: () => number = Date.now) {}

  private take(key: string, max: number, windowMs: number, t: number): number | null {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= t) {
      if (max < 1) return Math.ceil(windowMs / 1000);
      this.buckets.set(key, { count: 1, resetAt: t + windowMs });
      return null;
    }
    if (bucket.count >= max) return Math.max(1, Math.ceil((bucket.resetAt - t) / 1000));
    bucket.count += 1;
    return null;
  }

  private peek(key: string, max: number, t: number): number | null {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= t) return max < 1 ? 60 : null;
    return bucket.count >= max ? Math.max(1, Math.ceil((bucket.resetAt - t) / 1000)) : null;
  }

  /** Returns null when allowed (and counts it), or seconds until retry. */
  check(ip: string, roomId: string): number | null {
    const t = this.now();
    const perIp = limit('PUBLIC_CHAT_ANON_PER_IP_PER_MIN', 5);
    const perRoomMin = limit('PUBLIC_CHAT_ANON_PER_ROOM_PER_MIN', 20);
    const perRoomDay = limit('PUBLIC_CHAT_ANON_PER_ROOM_PER_DAY', 200);
    const dayEnd = (Math.floor(t / DAY) + 1) * DAY;
    // Check every limit first so a refused request does not use up the others.
    const ipKey = `ip:${ip}`;
    const roomKey = `room:${roomId}`;
    const dayKey = `day:${roomId}`;
    const blocked = this.peek(ipKey, perIp, t) ?? this.peek(roomKey, perRoomMin, t) ?? this.peek(dayKey, perRoomDay, t);
    if (blocked !== null) return blocked;
    this.take(ipKey, perIp, MINUTE, t);
    this.take(roomKey, perRoomMin, MINUTE, t);
    this.take(dayKey, perRoomDay, dayEnd - t, t);
    this.prune(t);
    return null;
  }

  private prune(t: number) {
    if (this.buckets.size < 10_000) return;
    for (const [key, bucket] of this.buckets) if (bucket.resetAt <= t) this.buckets.delete(key);
  }
}

export const anonymousChatLimiter = new AnonymousChatLimiter();
