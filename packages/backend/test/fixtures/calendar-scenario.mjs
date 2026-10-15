// B2.2d-12: one calendar scenario for both drivers (sources, events, owner
// scoping, no token in responses, primary switch, sync bookkeeping and the
// event upserts fed with parsed events — no network). The caller registers
// the calendar routes behind the auth gate and passes { app, q, auth, sync }.
// Used by test/calendar-routes.test.mjs (SQLite) and
// test/pg-calendar.integration.test.mjs (PostgreSQL).
import assert from 'node:assert/strict';

export function calendarScenario(test, getM, { tag, skip = false }) {
  const m = () => getM();
  const alice = `cal-alice-${tag}`;
  const bob = `cal-bob-${tag}`;
  const call = async (method, url, user, payload) => m().app.inject({ method, url, headers: m().auth(user), payload });
  let s1, s2, bobSource, ev;

  test('seed users', { skip }, async () => {
    for (const u of [alice, bob]) {
      await m().q.run(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', 'user', 'active')`, u, `${u}@example.test`, u);
    }
  });

  test('sources: create, validation, list; responses never carry the Google tokens', { skip }, async () => {
    const { q } = m();
    const r = await call('POST', '/api/calendar/sources', alice, { name: 'Work', type: 'manual' });
    assert.equal(r.statusCode, 200, r.body);
    s1 = r.json().source;
    assert.equal(s1.color, '#3b82f6');
    assert.equal('google_access_token' in s1, false);
    s2 = (await call('POST', '/api/calendar/sources', alice, { name: 'Home', type: 'manual' })).json().source;
    bobSource = (await call('POST', '/api/calendar/sources', bob, { name: 'Bob', type: 'manual' })).json().source;
    assert.equal((await call('POST', '/api/calendar/sources', alice, { name: 'x', type: 'ical' })).statusCode, 400);
    assert.equal((await call('POST', '/api/calendar/sources', alice, { name: 'x', type: 'ftp' })).statusCode, 400);
    await q.run(`UPDATE calendar_sources SET google_access_token = 'secret-at', google_refresh_token = 'secret-rt' WHERE id = ?`, s1.id);
    const u = await call('PUT', `/api/calendar/sources/${s1.id}`, alice, { color: '#000000' });
    assert.equal(u.statusCode, 200, u.body);
    assert.equal(u.json().source.color, '#000000');
    assert.equal(u.body.includes('secret-'), false, 'no token in the update answer');
    assert.equal(u.json().source.name, 'Work', 'COALESCE keeps unset fields');
    assert.match(u.json().source.updated_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    assert.deepEqual((await call('GET', '/api/calendar/sources', alice)).json().sources.map((x) => x.name).sort(), ['Home', 'Work']);
  });

  test('primary: one at a time per user; other users untouched; 404 for a foreign source', { skip }, async () => {
    const { q } = m();
    await call('PUT', `/api/calendar/sources/${bobSource.id}`, bob, { is_primary: true });
    await call('PUT', `/api/calendar/sources/${s1.id}`, alice, { is_primary: true });
    await call('PUT', `/api/calendar/sources/${s2.id}`, alice, { is_primary: true });
    const rows = await q.all('SELECT id, is_primary FROM calendar_sources WHERE user_id = ? ORDER BY name', alice);
    assert.deepEqual(rows.map((r) => [r.id, r.is_primary]), [[s2.id, 1], [s1.id, 0]]);
    assert.equal((await q.one('SELECT is_primary FROM calendar_sources WHERE id = ?', bobSource.id)).is_primary, 1);
    assert.equal((await call('PUT', `/api/calendar/sources/${bobSource.id}`, alice, { name: 'x' })).statusCode, 404);
  });

  test('events: create (primary default; foreign source refused), filter, get, update, scoping, delete', { skip }, async () => {
    const r = await call('POST', '/api/calendar/events', alice, { title: 'Standup', start_time: '2026-10-20T09:00:00Z', end_time: '2026-10-20T09:15:00Z', attendees: [{ email: 'a@x' }] });
    assert.equal(r.statusCode, 200, r.body);
    ev = r.json().event;
    assert.equal(ev.calendar_source_id, s2.id, 'primary source used');
    assert.equal((await call('POST', '/api/calendar/events', alice, { calendar_source_id: bobSource.id, title: 'x', start_time: 'a', end_time: 'b' })).statusCode, 404);
    await call('POST', '/api/calendar/events', alice, { calendar_source_id: s1.id, title: 'Late', start_time: '2026-11-01T09:00:00Z', end_time: '2026-11-01T10:00:00Z' });
    const list = (await call('GET', '/api/calendar/events?start=2026-10-01&end=2026-10-31', alice)).json().events;
    assert.deepEqual(list.map((e) => e.title), ['Standup']);
    assert.deepEqual(list[0].attendees, [{ email: 'a@x' }]);
    assert.equal(list[0].calendar_name, 'Home');
    const u = await call('PUT', `/api/calendar/events/${ev.id}`, alice, { location: 'Room 1' });
    assert.equal(u.json().event.title, 'Standup');
    assert.equal(u.json().event.location, 'Room 1');
    assert.equal((await call('GET', `/api/calendar/events/${ev.id}`, bob)).statusCode, 404);
    assert.equal((await call('PUT', `/api/calendar/events/${ev.id}`, bob, { title: 'x' })).statusCode, 404);
    assert.equal((await call('DELETE', `/api/calendar/events/${ev.id}`, bob)).statusCode, 404);
    assert.equal((await call('DELETE', `/api/calendar/events/${ev.id}`, alice)).statusCode, 200);
    assert.equal((await call('GET', `/api/calendar/events/${ev.id}`, alice)).statusCode, 404);
  });

  test('sync bookkeeping: an unsupported source logs the error on the source and the log', { skip }, async () => {
    const { q, sync } = m();
    await assert.rejects(sync.syncCalendarSource(s1.id), /Unsupported calendar type/);
    const src = await q.one('SELECT sync_status, sync_error FROM calendar_sources WHERE id = ?', s1.id);
    assert.equal(src.sync_status, 'error');
    const logs = (await call('GET', `/api/calendar/sources/${s1.id}/sync-log`, alice)).json().logs;
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, 'error');
    assert.match(logs[0].completed_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    assert.equal((await call('GET', `/api/calendar/sources/${s1.id}/sync-log`, bob)).statusCode, 404);
  });

  test('sync upserts: iCal add then update by UID; Google add with attendees', { skip }, async () => {
    const { q, sync } = m();
    const src = { id: s1.id, user_id: alice };
    const evs = [
      { uid: `u1-${tag}`, summary: 'One', dtstart: '2026-12-01T10:00:00Z', dtend: '2026-12-01T11:00:00Z' },
      { uid: `u2-${tag}`, summary: 'Two', dtstart: '2026-12-02', dtend: '2026-12-03', isAllDay: true },
    ];
    assert.deepEqual(await sync.applyICalEvents(src, evs), { added: 2, updated: 0, deleted: 0 });
    evs[0].summary = 'One (moved)';
    assert.deepEqual(await sync.applyICalEvents(src, evs), { added: 0, updated: 2, deleted: 0 });
    assert.equal((await q.one('SELECT title FROM calendar_events WHERE external_id = ?', `u1-${tag}`)).title, 'One (moved)');
    const g = await sync.applyGoogleEvents(src, [{ id: `g1-${tag}`, summary: 'G', start: { dateTime: '2026-12-05T10:00:00Z' }, end: { dateTime: '2026-12-05T11:00:00Z' }, attendees: [{ email: 'b@x', displayName: 'B', responseStatus: 'accepted' }] }]);
    assert.equal(g.added, 1);
    assert.deepEqual(JSON.parse((await q.one('SELECT attendees FROM calendar_events WHERE external_id = ?', `g1-${tag}`)).attendees), [{ email: 'b@x', name: 'B', status: 'accepted' }]);
  });

  test('delete a source removes its events (cascade); foreign delete 404', { skip }, async () => {
    const { q } = m();
    assert.equal((await call('DELETE', `/api/calendar/sources/${s1.id}`, bob)).statusCode, 404);
    assert.equal((await call('DELETE', `/api/calendar/sources/${s1.id}`, alice)).statusCode, 200);
    assert.equal((await q.one('SELECT COUNT(*) AS n FROM calendar_events WHERE calendar_source_id = ?', s1.id)).n, 0);
  });
}
