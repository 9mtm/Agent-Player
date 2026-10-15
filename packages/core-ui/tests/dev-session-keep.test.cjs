require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SessionClient } = require('../src/session.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const { devSessionKeep } = require('../src/dev-session-keep.ts');

const accounts = [{ label: 'Tester', email: 'demo@example.invalid', password: 'mock-only' }];
const memoryStore = () => { const m = new Map(); return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }; };

test('the sign-in is kept only on a loopback host of a build with dev quick sign-in', () => {
  assert.equal(devSessionKeep('127.0.0.1', memoryStore(), null), null, 'no test accounts compiled in');
  assert.equal(devSessionKeep('example.com', memoryStore(), accounts), null, 'not a loopback host');
  const store = memoryStore(); const keep = devSessionKeep('127.0.0.1', store, accounts);
  keep.save('abc.DEF-1'); assert.equal(keep.load(), 'abc.DEF-1');
  store.setItem('dpro.dev.session', 'bad token with spaces'); assert.equal(keep.load(), null);
  keep.save(null); assert.equal(store.m.size, 0);
});

test('a refresh resumes the kept sign-in; sign-out and a dead token drop it', async () => {
  const store = memoryStore(); const keep = devSessionKeep('127.0.0.1', store, accounts);
  const mock = createLoginMock();
  const first = new SessionClient({ live: mock }); first.selectMode('live');
  assert.equal(await first.resume(keep), false, 'nothing kept yet');
  await first.login('demo@example.invalid', 'mock-only');
  assert.equal(first.getSnapshot().phase, 'authenticated');
  assert.ok(keep.load(), 'the token is kept after sign-in');

  const second = new SessionClient({ live: mock }); second.selectMode('live');
  assert.equal(await second.resume(keep), true);
  assert.equal(second.getSnapshot().phase, 'authenticated');
  assert.equal(second.getSnapshot().user.id, first.getSnapshot().user.id);

  await second.logoutAllDevices();
  assert.equal(keep.load(), null, 'sign-out drops the kept token');

  store.setItem('dpro.dev.session', 'not-a-live-token');
  const third = new SessionClient({ live: mock }); third.selectMode('live');
  assert.equal(await third.resume(keep), false);
  assert.equal(third.getSnapshot().phase, 'signed-out');
  assert.equal(keep.load(), null, 'a token the server refuses is dropped');
});
