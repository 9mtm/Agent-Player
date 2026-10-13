// F-05: post-login redirect to the onboarding wizard.
// Run from the repo root: node --import tsx --test src/lib/auth/post-login.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { needsOnboardingCheck, parseOnboardingCompleted, postLoginRedirect } from './post-login.ts';

test('owner with onboarding not completed goes to /onboarding', () => {
  assert.equal(postLoginRedirect('owner', false), '/onboarding');
});

test('owner with onboarding completed goes to the default page', () => {
  assert.equal(postLoginRedirect('owner', true), '/dashboard');
});

test('owner with unknown onboarding state: no wizard redirect', () => {
  assert.equal(postLoginRedirect('owner', null), '/dashboard');
});

test('non-owners never go to the wizard', () => {
  for (const role of ['admin', 'user', 'guest', '', null, undefined, 'Owner']) {
    assert.equal(postLoginRedirect(role, false), '/dashboard', String(role));
  }
});

test('only an owner needs the onboarding check', () => {
  assert.equal(needsOnboardingCheck('owner'), true);
  for (const role of ['admin', 'user', 'guest', null, undefined]) assert.equal(needsOnboardingCheck(role), false);
});

test('GET /api/onboarding body parsing', () => {
  assert.equal(parseOnboardingCompleted({ success: true, state: { completed: false, currentStep: 1 } }), false);
  assert.equal(parseOnboardingCompleted({ state: { completed: true } }), true);
  assert.equal(parseOnboardingCompleted({ state: { completed: 'no' } }), null);
  assert.equal(parseOnboardingCompleted({ error: 'Authentication required' }), null);
  assert.equal(parseOnboardingCompleted(null), null);
  assert.equal(parseOnboardingCompleted('x'), null);
});
