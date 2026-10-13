// S0-A.10: anonymous public-chat messages are rate limited per IP, per room
// and per day; signed-in users are not limited by it.
// Run: node --import tsx --test test/public-chat-limits.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

const { AnonymousChatLimiter } = await import(join(process.cwd(), 'src/api/public-chat-limits.ts'));

test('per-IP limit per minute, then it resets', () => {
  let t = 1_000_000;
  const l = new AnonymousChatLimiter(() => t);
  for (let i = 0; i < 5; i++) assert.equal(l.check('1.1.1.1', 'r1'), null, `msg ${i + 1}`);
  const retry = l.check('1.1.1.1', 'r1');
  assert.ok(retry > 0 && retry <= 60, String(retry));
  assert.equal(l.check('2.2.2.2', 'r1'), null, 'another IP still allowed');
  t += 61_000;
  assert.equal(l.check('1.1.1.1', 'r1'), null, 'after the window');
});

test('per-room limit per minute across IPs', () => {
  const t = 5_000_000;
  const l = new AnonymousChatLimiter(() => t);
  for (let i = 0; i < 20; i++) assert.equal(l.check(`10.0.0.${i}`, 'busy'), null);
  assert.ok(l.check('10.0.1.1', 'busy') > 0);
  assert.equal(l.check('10.0.1.1', 'quiet'), null, 'other rooms unaffected');
});

test('daily room budget and env overrides; refused requests do not use up budget', () => {
  process.env.PUBLIC_CHAT_ANON_PER_ROOM_PER_DAY = '3';
  process.env.PUBLIC_CHAT_ANON_PER_IP_PER_MIN = '100';
  try {
    let t = 10 * 86_400_000 + 1000;
    const l = new AnonymousChatLimiter(() => t);
    for (let i = 0; i < 3; i++) { assert.equal(l.check(`ip${i}`, 'r'), null); t += 61_000; }
    assert.ok(l.check('ip9', 'r') > 0, 'day budget used up');
    t = 11 * 86_400_000 + 5;
    assert.equal(l.check('ip9', 'r'), null, 'next UTC day');
    process.env.PUBLIC_CHAT_ANON_PER_ROOM_PER_DAY = '0';
    assert.ok(new AnonymousChatLimiter(() => t).check('x', 'r') > 0, '0 disables anonymous posting');
  } finally {
    delete process.env.PUBLIC_CHAT_ANON_PER_ROOM_PER_DAY;
    delete process.env.PUBLIC_CHAT_ANON_PER_IP_PER_MIN;
  }
});

test('the route applies the limiter to anonymous and guest senders', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(join(process.cwd(), 'src/api/routes/public-chat.ts'), 'utf-8');
  assert.match(src, /const isGuest = request\.authUser\?\.role === 'guest';\s*if \(!userId \|\| isGuest\) \{\s*const retryAfter = anonymousChatLimiter\.check\(`\$\{request\.ip\}:\$\{userId \?\? ''\}`, roomId\);/);
  assert.match(src, /code\(429\)/);
});
