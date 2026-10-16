// CHAT-SECRETS-01: secrets typed in the chat live in the key store — the strict
// saved-keys paths (browser and bridge), the projected answers (never a value),
// the "saved securely" chip in the user's bubble and the saved keys panel.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { SessionClient, allowedRequest } = require('../src/session.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const { ConversationsController } = require('../src/conversations.ts');
const { ChatView } = require('../src/ChatView.tsx');
const { SavedKeys } = require('../src/SavedKeys.tsx');
const { cleanupSecrets, listSecrets, secretLabel, splitSecrets } = require('../src/chat-secrets.ts');
const { allowedChatSecrets, chatSecretsResponse, CLEANUP_PATH, SECRETS_PATH, secretDeletePath, secretPath } = require('../src/chat-secrets-contract.js');
const { allowed } = require('../scripts/application-server.cjs');

const SID = 'k3j9x0a1bq';
const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (!fn()) { if (Date.now() > end) throw Error('timeout'); await new Promise(r => setTimeout(r, 20)); } };
const secret = { id: SID, type: 'github_token', ref: `[SECRET:github_token:${SID}]`, conversationId: 'conv-0000000001', createdAt: '2026-10-16T10:00:00.000Z', lastUsed: null };

async function signedIn(role = 'owner', extra) {
  const auth = createLoginMock(); const calls = [];
  const client = new SessionClient({ mock: async r => { calls.push({ method: r.method, path: r.path, body: r.body }); if (extra) { const x = await extra(r); if (x) return x; } const out = await auth(r); if (out.body?.user) out.body.user = { ...out.body.user, role }; return out; } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  return { client, calls };
}

test('contract (browser and bridge): list, delete one, owner cleanup with exactly { apply }', () => {
  const good = [['GET', SECRETS_PATH, undefined], ['DELETE', secretPath(SID), undefined], ['POST', CLEANUP_PATH, { apply: false }], ['POST', CLEANUP_PATH, { apply: true }]];
  const bad = [
    ['POST', SECRETS_PATH, {}], ['GET', SECRETS_PATH, {}], ['GET', `${SECRETS_PATH}?all=1`, undefined], ['GET', secretPath(SID), undefined],
    ['DELETE', secretPath('UPPER123'), undefined], ['DELETE', secretPath('abc'), undefined], ['DELETE', `${secretPath(SID)}/x`, undefined], ['DELETE', secretPath(SID), {}],
    ['DELETE', CLEANUP_PATH, undefined], ['POST', CLEANUP_PATH, {}], ['POST', CLEANUP_PATH, { apply: 'yes' }], ['POST', CLEANUP_PATH, { apply: true, all: true }], ['GET', CLEANUP_PATH, undefined],
  ];
  for (const [m, p, b] of good) {
    assert.equal(allowedChatSecrets(m, p, b), true, `${m} ${p}`);
    assert.equal(allowedRequest(m, p, b), true, `${m} ${p}`);
    assert.equal(allowed(m, p, b), true, `bridge ${m} ${p}`);
  }
  for (const [m, p, b] of bad) { assert.equal(allowedRequest(m, p, b), false, `${m} ${p}`); assert.equal(allowed(m, p, b), false, `bridge ${m} ${p}`); }
  assert.equal(secretDeletePath(secretPath(SID)), SID);
  assert.equal(secretDeletePath(CLEANUP_PATH), null);
});

test('answers are projected to reviewed fields (never a value); malformed ones are refused', () => {
  const out = chatSecretsResponse(SECRETS_PATH, 200, { secrets: [{ ...secret, value: 'ghp_leak', userId: 'u1' }] });
  assert.deepEqual(out, { secrets: [secret] });
  for (const s of [{ ...secret, ref: '[SECRET:github_token:other00]' }, { ...secret, id: 'X' }, { ...secret, createdAt: 'never' }, { ...secret, conversationId: '../x' }])
    assert.throws(() => chatSecretsResponse(SECRETS_PATH, 200, { secrets: [s] }));
  assert.throws(() => chatSecretsResponse(SECRETS_PATH, 200, { secrets: Array(501).fill(secret) }));
  assert.deepEqual(chatSecretsResponse(CLEANUP_PATH, 200, { report: { conversations: 1, messages: 2, secrets: 3, applied: false, ids: ['x'] } }), { report: { conversations: 1, messages: 2, secrets: 3, applied: false } });
  assert.throws(() => chatSecretsResponse(CLEANUP_PATH, 200, { report: { conversations: -1, messages: 0, secrets: 0, applied: true } }));
  assert.deepEqual(chatSecretsResponse(secretPath(SID), 200, { deleted: true, extra: 1 }), { deleted: true });
  assert.deepEqual(chatSecretsResponse(secretPath(SID), 404, { error: 'Not found', code: 'not_found' }), { code: 'not_found' });
  assert.equal(chatSecretsResponse(SECRETS_PATH, 500, { error: 'boom' }), null);
  assert.throws(() => chatSecretsResponse('/api/chat/secretsx', 200, {}));
});

test('a guest cannot read saved keys; only the owner runs the cleanup', async () => {
  const guest = await signedIn('guest');
  await assert.rejects(guest.client.request({ method: 'GET', path: SECRETS_PATH }));
  const user = await signedIn('user');
  await assert.rejects(user.client.request({ method: 'POST', path: CLEANUP_PATH, body: { apply: true } }));
  assert.equal(guest.calls.concat(user.calls).filter(c => c.path.startsWith(SECRETS_PATH)).length, 0);
  const owner = await signedIn('owner');
  assert.deepEqual(await listSecrets(owner.client), []);
  assert.deepEqual(await cleanupSecrets(owner.client, false), { conversations: 0, messages: 0, secrets: 0, applied: false });
});

test('a message splits into text and key-store references', () => {
  assert.deepEqual(splitSecrets(`use [SECRET:github_token:${SID}] now, pw [SECRET:password:aaaa1111]`), [
    { kind: 'text', text: 'use ' }, { kind: 'secret', type: 'github_token', id: SID }, { kind: 'text', text: ' now, pw ' }, { kind: 'secret', type: 'password', id: 'aaaa1111' },
  ]);
  assert.deepEqual(splitSecrets('no secrets'), [{ kind: 'text', text: 'no secrets' }]);
  assert.deepEqual(splitSecrets('[SECRET:Bad:x]'), [{ kind: 'text', text: '[SECRET:Bad:x]' }]);
  assert.equal(secretLabel('github_token'), 'GitHub token');
  assert.equal(secretLabel('unknown_kind'), 'Secret');
});

test('the user bubble shows a "saved securely" chip instead of the reference; the panel lists keys', async t => {
  // The stored user message comes back with the reference (as the backend saves it).
  const { client } = await signedIn('owner');
  let n = 0;
  const c = new ConversationsController(client, () => `id${String(++n).padStart(10, '0')}`);
  t.after(() => c.dispose());
  await c.load();
  c.edit(`Deploy with [SECRET:github_token:${SID}] please`); await c.send();
  await until(() => !c.getSnapshot().runId);
  const html = renderToStaticMarkup(React.createElement(ChatView, { controller: c, mode: 'mock', client }));
  assert.match(html, /class="secret-chip"[^>]*>.*GitHub token saved securely/);
  assert.ok(!html.includes(`[SECRET:github_token:${SID}]`), 'the raw reference is not shown as text');
  assert.match(html, /Deploy with /);
  const panel = renderToStaticMarkup(React.createElement(SavedKeys, { client, owner: true, onClose: () => {} }));
  assert.match(panel, /Saved keys/); assert.match(panel, /stored encrypted/); assert.match(panel, /Check older chats for secrets/);
  assert.ok(!renderToStaticMarkup(React.createElement(SavedKeys, { client, owner: false, onClose: () => {} })).includes('Check older chats'), 'cleanup is for the owner');
});
