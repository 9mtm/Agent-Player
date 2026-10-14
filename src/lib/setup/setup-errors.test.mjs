// FU-04: setup page toasts for failed steps.
// Run from the repo root: node --import tsx --test src/lib/setup/setup-errors.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { SETUP_INTERNAL_ERROR_TEXT, readJsonBody, setupErrorMessage } from './setup-errors.ts';

test('internal_error and 5xx map to the fixed server text', () => {
    assert.equal(setupErrorMessage(500, { error: 'Internal error', code: 'internal_error' }, 'x'), SETUP_INTERNAL_ERROR_TEXT);
    assert.equal(setupErrorMessage(503, null, 'x'), SETUP_INTERNAL_ERROR_TEXT);
    assert.equal(setupErrorMessage(502, { message: 'leaked detail' }, 'x'), SETUP_INTERNAL_ERROR_TEXT);
    assert.match(SETUP_INTERNAL_ERROR_TEXT, /agent-player doctor/);
});

test('4xx keep their message, then error, then the fallback', () => {
    assert.equal(
        setupErrorMessage(400, { error: 'Invalid email', message: 'Please provide a valid email address' }, 'x'),
        'Please provide a valid email address',
    );
    assert.equal(setupErrorMessage(403, { error: 'Setup already completed' }, 'x'), 'Setup already completed');
    assert.equal(setupErrorMessage(409, {}, 'Failed to create admin account'), 'Failed to create admin account');
    assert.equal(setupErrorMessage(400, 'not an object', 'fb'), 'fb');
    assert.equal(setupErrorMessage(400, { message: '  ' }, 'fb'), 'fb');
});

test('readJsonBody returns null for a non-JSON body', async () => {
    assert.deepEqual(await readJsonBody({ json: async () => ({ a: 1 }) }), { a: 1 });
    assert.equal(await readJsonBody({ json: async () => { throw new SyntaxError('bad'); } }), null);
});
