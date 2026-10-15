// B2.2d-4: one camera sessions scenario for both drivers (create, end,
// list with mode filter and bounded paging, delete). The caller registers
// the camera routes behind the auth gate and passes { app, q, auth }.
// Used by test/camera-routes.test.mjs (SQLite) and
// test/pg-camera.integration.test.mjs (PostgreSQL).
import assert from 'node:assert/strict';

export function cameraScenario(test, getM, { tag, skip = false }) {
  const m = () => getM();
  const owner = `cam-owner-${tag}`;
  const call = async (method, url, payload) => m().app.inject({ method, url, headers: m().auth(owner), payload });
  let a, b;

  test('seed owner', { skip }, async () => {
    await m().q.run(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', 'owner', 'active')`, owner, `${owner}@example.test`, owner);
  });

  test('create two sessions; text timestamps; defaults', { skip }, async () => {
    const r1 = await call('POST', '/api/camera/sessions', { mode: 'vision', agent_id: `ag-${tag}`, notes: 'n1' });
    assert.equal(r1.statusCode, 200, r1.body);
    a = r1.json().session;
    assert.equal(a.mode, 'vision');
    assert.equal(a.user_id, 'local');
    assert.equal(a.frame_count, 0);
    assert.equal(typeof a.frame_count, 'number');
    assert.equal(r1.json().roomId, a.room_id);
    assert.match(a.created_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    const r2 = await call('POST', '/api/camera/sessions', { mode: 'record', room_id: `room-${tag}` });
    b = r2.json().session;
    assert.equal(b.room_id, `room-${tag}`);
  });

  test('end a session: duration, frame count, file id; 404 for unknown', { skip }, async () => {
    const r = await call('PATCH', `/api/camera/sessions/${a.id}`, { frame_count: 12, file_id: `f-${tag}` });
    assert.equal(r.statusCode, 200, r.body);
    const s = r.json().session;
    assert.ok(s.ended_at);
    assert.equal(s.frame_count, 12);
    assert.equal(s.file_id, `f-${tag}`);
    assert.equal(s.notes, 'n1', 'COALESCE keeps notes');
    assert.equal(typeof s.duration_s, 'number');
    assert.equal((await call('PATCH', `/api/camera/sessions/missing-${tag}`, {})).statusCode, 404);
  });

  test('list: mode filter, bounded paging (non-numeric falls back)', { skip }, async () => {
    const vision = (await call('GET', '/api/camera/sessions?mode=vision&limit=500')).json().sessions;
    assert.ok(vision.some((s) => s.id === a.id) && !vision.some((s) => s.id === b.id));
    const bad = await call('GET', '/api/camera/sessions?limit=abc&offset=-5');
    assert.equal(bad.statusCode, 200, bad.body);
    assert.ok(bad.json().sessions.length >= 2);
    assert.equal((await call('GET', '/api/camera/sessions?limit=1')).json().sessions.length, 1);
  });

  test('delete removes the row', { skip }, async () => {
    assert.equal((await call('DELETE', `/api/camera/sessions/${b.id}`)).statusCode, 200);
    assert.equal(await m().q.one('SELECT id FROM camera_sessions WHERE id = ?', b.id), undefined);
  });
}
