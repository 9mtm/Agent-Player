// F-01: first-run routing decisions.
// Run from the repo root: node --import tsx --test src/lib/auth/first-run.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { firstRunRedirect, isPublicPath, parseSetupStatus } from './first-run.ts';

test('setup required: every page goes to /setup, /setup stays', () => {
  for (const p of ['/', '/login', '/dashboard', '/dashboard/agents', '/onboarding', '/register', '/chat']) {
    assert.equal(firstRunRedirect(p, false), '/setup', p);
  }
  assert.equal(firstRunRedirect('/setup', false), null);
});

test('setup done: /setup goes to /login, other pages stay', () => {
  assert.equal(firstRunRedirect('/setup', true), '/login');
  for (const p of ['/', '/login', '/dashboard', '/onboarding']) {
    assert.equal(firstRunRedirect(p, true), null, p);
  }
});

test('backend status unknown: no first-run redirect', () => {
  assert.equal(firstRunRedirect('/dashboard', null), null);
  assert.equal(firstRunRedirect('/setup', null), null);
});

test('public pages: /setup and /login without sign-in; no /register; no prefix tricks', () => {
  for (const p of ['/login', '/setup', '/avatar-lab', '/login/next']) assert.ok(isPublicPath(p), p);
  for (const p of ['/register', '/dashboard', '/', '/loginx', '/setup-evil', '/onboarding']) assert.ok(!isPublicPath(p), p);
});

test('status body parsing', () => {
  assert.equal(parseSetupStatus({ setupComplete: false, setupRequired: true }), false);
  assert.equal(parseSetupStatus({ setupComplete: true }), true);
  assert.equal(parseSetupStatus({ setupComplete: 'yes' }), null);
  assert.equal(parseSetupStatus(null), null);
  assert.equal(parseSetupStatus('x'), null);
});
