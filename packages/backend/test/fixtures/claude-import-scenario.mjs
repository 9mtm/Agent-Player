// B2.2d-9: one Claude Code session import scenario for both drivers. The
// caller sets HOME to a temp dir, registers the claude-local routes behind
// the auth gate and passes { app, q, auth, home }. Used by
// test/claude-import.test.mjs (SQLite) and
// test/pg-claude-import.integration.test.mjs (PostgreSQL).
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function claudeImportScenario(test, getM, { tag, skip = false }) {
  const m = () => getM();
  const owner = `ci-owner-${tag}`;
  const slug = `proj-${tag}`;
  const call = async (method, url, user = owner) => m().app.inject({ method, url, headers: m().auth(user) });

  test('seed owner and a Claude Code session file', { skip }, async () => {
    await m().q.run(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', 'owner', 'active')`, owner, `${owner}@example.test`, owner);
    const dir = join(m().home, '.claude', 'projects', slug);
    mkdirSync(dir, { recursive: true });
    const lines = [
      { type: 'user', timestamp: '2026-10-01T10:00:00.000Z', message: { role: 'user', content: 'Hello there, please help' } },
      { type: 'assistant', timestamp: '2026-10-01T10:00:00.400Z', message: { role: 'assistant', content: [{ type: 'text', text: 'Sure.' }, { type: 'tool_use', name: 'x' }] } },
      { type: 'assistant', timestamp: 'not-a-date', message: { role: 'assistant', content: 'Second reply' } },
      { type: 'summary', summary: 'ignored' },
    ];
    writeFileSync(join(dir, 'abc.jsonl'), lines.map((l) => JSON.stringify(l)).join('\n') + '\nnot json\n');
    writeFileSync(join(dir, 'empty.jsonl'), JSON.stringify({ type: 'summary' }) + '\n');
  });

  test('import: one session owned by the caller, messages in file order, normalized times', { skip }, async () => {
    const { q } = m();
    const r = await call('POST', `/api/claude-local/import/${slug}/abc`);
    assert.equal(r.statusCode, 200, r.body);
    const { sessionId, messageCount, title } = r.json();
    assert.equal(messageCount, 3);
    assert.match(title, /^\[Claude Code\] Hello there/);
    const s = await q.one('SELECT user_id FROM chat_sessions WHERE id = ?', sessionId);
    assert.equal(s.user_id, owner, 'owner = caller, not "default"');
    const msgs = await q.all('SELECT role, content, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC, id ASC', sessionId);
    assert.deepEqual(msgs.slice(0, 2).map((x) => [x.role, x.content]), [['user', 'Hello there, please help'], ['assistant', 'Sure.']]);
    assert.match(msgs[0].created_at, /^2026-10-01 10:00:00/);
    assert.equal(msgs[2].content, 'Second reply', 'an unparsable timestamp falls back to now');
  });

  test('refusals: no messages 400, missing 404, traversal 400; nothing half-written', { skip }, async () => {
    const { q } = m();
    const before = (await q.one('SELECT COUNT(*) AS n FROM chat_sessions WHERE user_id = ?', owner)).n;
    assert.equal((await call('POST', `/api/claude-local/import/${slug}/empty`)).statusCode, 400);
    assert.equal((await call('POST', `/api/claude-local/import/${slug}/missing`)).statusCode, 404);
    assert.equal((await call('POST', `/api/claude-local/import/${slug}/..%2Fx`)).statusCode, 400);
    assert.equal((await q.one('SELECT COUNT(*) AS n FROM chat_sessions WHERE user_id = ?', owner)).n, before);
  });
}
