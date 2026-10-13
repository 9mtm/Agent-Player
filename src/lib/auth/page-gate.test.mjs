// S0-Q.12: page sign-in gate used by src/middleware.ts.
// Run from the repo root: node --import tsx --test src/lib/auth/page-gate.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { pageGate, looksLikeJwt } from './page-gate.ts';

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1In0.c2lnbmF0dXJl';

test('private pages without a token go to /login', () => {
  for (const p of ['/', '/dashboard', '/dashboard/settings', '/chat', '/onboarding', '/register', '/loginx', '/setup-evil', '/avatar-viewer']) {
    assert.deepEqual(pageGate(p, undefined), { action: 'redirect', location: '/login' }, p);
    assert.deepEqual(pageGate(p, ''), { action: 'redirect', location: '/login' }, p);
    assert.deepEqual(pageGate(p, 'garbage'), { action: 'redirect', location: '/login' }, p);
  }
});

test('private pages with a well-formed token pass (backend verifies it)', () => {
  for (const p of ['/', '/dashboard', '/chat']) assert.deepEqual(pageGate(p, JWT), { action: 'next' }, p);
});

test('public pages, static files and API routes are not gated', () => {
  for (const p of ['/login', '/setup', '/setup/step', '/avatar-lab', '/icons/a.svg', '/storage/cache/x.glb',
                   '/silero_vad_v5.onnx', '/api/chat', '/api/avatar-model', '/_next/data/x.json']) {
    assert.deepEqual(pageGate(p, undefined), { action: 'next' }, p);
  }
});

test('token shape check', () => {
  assert.ok(looksLikeJwt(JWT));
  for (const t of [null, undefined, '', 'a.b', 'a.b.c.d', 'a.b.c d', 'x'.repeat(5000) + '.a.b']) assert.ok(!looksLikeJwt(t), String(t));
});
