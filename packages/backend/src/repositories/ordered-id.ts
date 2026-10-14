/**
 * Time-ordered row ids (B2.2b-3), UUIDv7 layout (RFC 9562): 48 bits of Unix
 * milliseconds, then 74 random bits; the version/variant bits make it a
 * valid UUID of the usual 36-character shape.
 *
 * Why: listings ordered "newest first" (task runs, personality and Evolution
 * proposals) broke ties of created_at with SQLite's rowid, which PostgreSQL
 * does not have. They now break ties with the primary key, so the key must
 * sort in insertion order: lower-case hex of fixed width compares like the
 * number, and within one millisecond a per-process counter (the 12 bits
 * after the version) keeps ids increasing. Ids made by other processes in
 * the same millisecond sort in random order among themselves, as before.
 */

import { randomBytes } from 'node:crypto';

let lastMs = -1;
let counter = 0;

export function orderedId(now = Date.now()): string {
  let ms = Math.max(now, lastMs);
  if (ms === lastMs) {
    counter++;
    if (counter > 0xfff) { ms = lastMs + 1; counter = 0; } // the counter ran out: borrow the next millisecond
  } else {
    counter = 0;
  }
  lastMs = ms;
  const rand = randomBytes(8);
  const hex = ms.toString(16).padStart(12, '0').slice(-12);
  const ver = (0x7000 | counter).toString(16).padStart(4, '0');
  const variant = ((rand[0] & 0x3f) | 0x80).toString(16).padStart(2, '0') + rand[1].toString(16).padStart(2, '0');
  const tail = rand.subarray(2).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${ver}-${variant}-${tail}`;
}
