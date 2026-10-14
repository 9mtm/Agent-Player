// B2.2d-8: one chat sessions / messages scenario for both drivers (the
// /api/sessions routes: owner scoping, CRUD, message order within one
// second, clear count, delete cascade). The caller registers the session
// routes behind the auth gate and passes { app, q, auth }.
// Used by test/chat-sessions.test.mjs (SQLite) and
// test/pg-chat-sessions.integration.test.mjs (PostgreSQL).
import assert from 'node:assert/strict';

export function chatSessionsScenario(test, getM, { tag, skip = false }) {
  const m = () => getM();
  const alice = `cs-alice-${tag}`;
  const bob = `cs-bob-${tag}`;
  const call = async (method, url, user, payload) => m().app.inject({ method, url, headers: m().auth(user), payload });
  let sid;

  test('seed users', { skip }, async () => {
    for (const u of [alice, bob]) {
      await m().q.run(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', 'user', 'active')`, u, `${u}@example.test`, u);
    }
  });

  test('create, get, list, update a session (caller from the token)', { skip }, async () => {
    const c = await call('POST', '/api/sessions', alice, { title: `T ${tag}`, model: 'qwen', systemPrompt: 'be brief' });
    assert.equal(c.statusCode, 200, c.body);
    const s = c.json().session;
    sid = s.id;
    assert.equal(s.title, `T ${tag}`);
    assert.equal(s.systemPrompt, 'be brief');
    assert.equal((await call('GET', `/api/sessions/${sid}`, alice)).json().session.model, 'qwen');
    assert.deepEqual((await call('GET', '/api/sessions', alice)).json().sessions.map((x) => x.id), [sid]);
    const u = await call('PATCH', `/api/sessions/${sid}`, alice, { title: 'renamed' });
    assert.equal(u.json().session.title, 'renamed');
    assert.equal((await call('POST', '/api/sessions', alice, {})).json().session.model, 'gpt-4', 'default model kept');
  });

  test('another user gets 404 everywhere and sees an empty list', { skip }, async () => {
    assert.deepEqual((await call('GET', '/api/sessions', bob)).json().sessions, []);
    for (const [method, url, body] of [['GET', `/api/sessions/${sid}`], ['PATCH', `/api/sessions/${sid}`, { title: 'x' }], ['DELETE', `/api/sessions/${sid}`],
      ['GET', `/api/sessions/${sid}/messages`], ['POST', `/api/sessions/${sid}/messages`, { role: 'user', content: 'x' }], ['DELETE', `/api/sessions/${sid}/messages`]]) {
      assert.equal((await call(method, url, bob, body)).statusCode, 404, `${method} ${url}`);
    }
    assert.equal((await call('GET', '/api/sessions', 'nobody-at-all')).statusCode, 401);
  });

  test('messages keep insertion order within one second; bad role refused', { skip }, async () => {
    for (let i = 0; i < 6; i++) {
      const r = await call('POST', `/api/sessions/${sid}/messages`, alice, { role: i % 2 ? 'assistant' : 'user', content: `m${i}`, model: 'qwen', tokens: 3 });
      assert.equal(r.statusCode, 200, r.body);
      assert.equal(r.json().message.model, 'qwen');
    }
    const list = (await call('GET', `/api/sessions/${sid}/messages`, alice)).json().messages;
    assert.deepEqual(list.map((x) => x.content), ['m0', 'm1', 'm2', 'm3', 'm4', 'm5']);
    assert.equal((await call('POST', `/api/sessions/${sid}/messages`, alice, { role: 'tool', content: 'x' })).statusCode, 400);
  });

  test('clear answers the real count; delete cascades the messages', { skip }, async () => {
    const { q } = m();
    assert.equal((await call('DELETE', `/api/sessions/${sid}/messages`, alice)).json().deleted, 6);
    await call('POST', `/api/sessions/${sid}/messages`, alice, { role: 'user', content: 'again' });
    assert.equal((await call('DELETE', `/api/sessions/${sid}`, alice)).statusCode, 200);
    assert.equal((await call('GET', `/api/sessions/${sid}`, alice)).statusCode, 404);
    assert.equal((await q.one('SELECT COUNT(*) AS n FROM chat_messages WHERE session_id = ?', sid)).n, 0);
  });
}
