// B2.2c (SQLite): notifications, notification settings and schedules through
// the driver-neutral notification service, with the SQLite row shapes; the
// cron store (cron_jobs / job_executions) round trip and the claim rule
// (no claim on SQLite). The PostgreSQL side: test/pg-platform.integration.test.mjs.
// Run: node --import tsx --test test/notifications-store.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-notifications-store-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
delete process.env.AGENT_PLAYER_DB;

const quiet = { log: console.log, warn: console.warn };
console.log = () => {};
const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const svc = await import(join(backendDir, 'src/services/notification-service.ts'));
const cron = await import(join(backendDir, 'src/scheduler/store.ts'));
db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES ('n-user', 'n@example.test', 'n', 'x', 'user', 'active')`).run();

test.after(() => {
  Object.assign(console, quiet);
  closeDatabase();
  process.chdir(backendDir);
  rmSync(dir, { recursive: true, force: true });
});

test('notify returns the row it wrote; list / unread / read / delete', async () => {
  const a = await svc.notify({ userId: 'n-user', title: 'A', body: 'x', source: 'ext-1', meta: { k: 1 } });
  const b = await svc.notify({ userId: 'n-user', title: 'B' });
  assert.equal(a.title, 'A');
  assert.equal(a.source, 'ext-1');
  assert.equal(a.isRead, false);
  assert.equal(a.meta, JSON.stringify({ k: 1 }));
  assert.match(a.createdAt, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, 'SQLite CURRENT_TIMESTAMP text');
  assert.notEqual(a.id, b.id);
  let list = await svc.listNotifications('n-user', { limit: 50, offset: 0 });
  assert.equal(list.rows.length, 2);
  assert.equal(list.unreadCount, 2);
  assert.deepEqual((await svc.listNotifications('n-user', { source: 'ext-1', limit: 50, offset: 0 })).rows.map((r) => r.id), [a.id]);
  await svc.markNotificationRead('n-user', a.id);
  list = await svc.listNotifications('n-user', { unread: true, limit: 50, offset: 0 });
  assert.deepEqual(list.rows.map((r) => r.id), [b.id]);
  assert.equal(list.unreadCount, 1);
  assert.deepEqual(await svc.notificationStatsBySource('ext-1'), { total: 1, unread: 0, byType: { info: 1 } });
  await svc.deleteReadNotifications('n-user');
  assert.equal((await svc.listNotifications('n-user', { limit: 50, offset: 0 })).rows.length, 1);
  await svc.markAllNotificationsRead('n-user');
  await svc.deleteNotification('n-user', b.id);
  assert.equal((await svc.listNotifications('n-user', { limit: 50, offset: 0 })).rows.length, 0);
});

test('notification settings: defaults created once, partial save', async () => {
  const s1 = await svc.getNotificationSettings('n-user');
  assert.equal(s1.channelInApp, true);
  assert.equal(s1.dndStart, '22:00');
  const s2 = await svc.saveNotificationSettings('n-user', { channelEmail: true, emailAddress: 'n@example.test' });
  assert.equal(s2.channelEmail, true);
  assert.equal(s2.emailAddress, 'n@example.test');
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM notification_settings WHERE user_id = ?').get('n-user').c, 1);
});

test('schedules: create (RETURNING), update under lock, fire once, deactivate a one-time schedule', async () => {
  const past = new Date(Date.now() - 60_000).toISOString();
  const daily = await svc.createSchedule({
    userId: 'n-user', title: 'Daily', body: '', type: 'reminder', scheduleType: 'daily', scheduleTime: '09:00',
    scheduleDays: null, scheduleDate: null, channels: JSON.stringify(['in_app']), nextFireAt: past,
  });
  assert.equal(daily.next_fire_at, past);
  const once = await svc.createSchedule({
    id: 'sched-once', userId: 'n-user', title: 'Once', body: 'b', type: 'reminder', scheduleType: 'once', scheduleTime: '09:00',
    scheduleDays: null, scheduleDate: '2000-01-01', channels: JSON.stringify(['in_app', 'email']), nextFireAt: past,
  });
  assert.equal(once.id, 'sched-once');
  assert.equal(await svc.updateSchedule('other-user', daily.id, () => ({ fields: [], vals: [] })), null, 'not the owner');
  const renamed = await svc.updateSchedule('n-user', daily.id, () => ({ fields: ['title = ?'], vals: ['Daily 2'] }));
  assert.equal(renamed.title, 'Daily 2');

  await svc.processScheduledNotifications();
  const fired = (await svc.listNotifications('n-user', { limit: 50, offset: 0 })).rows.map((r) => r.title).sort();
  assert.deepEqual(fired, ['Daily 2', 'Once', 'Once'], 'one per channel');
  const rows = await svc.listSchedules('n-user');
  const d = rows.find((r) => r.id === daily.id);
  assert.ok(d.next_fire_at > past, 'next fire moved forward');
  assert.equal(rows.find((r) => r.id === 'sched-once').is_active, 0);
  await svc.processScheduledNotifications();
  assert.equal((await svc.listNotifications('n-user', { limit: 50, offset: 0 })).rows.length, 3, 'not fired twice');
  await svc.deleteSchedule('n-user', daily.id);
  assert.equal((await svc.listSchedules('n-user')).length, 1);
});

test('cron store on SQLite: CRUD, history, no claim, named job once', async () => {
  const now = new Date();
  const job = { id: 'cj-1', name: 'job one', description: 'd', cronExpression: '*/5 * * * *', actionType: 'custom', actionData: { a: 1 }, enabled: true, createdAt: now, updatedAt: now };
  await cron.insertJob(job);
  let jobs = await cron.listEnabledJobs();
  assert.deepEqual(jobs.map((j) => j.id), ['cj-1']);
  assert.deepEqual(jobs[0].actionData, { a: 1 });
  assert.equal(jobs[0].createdAt.toISOString(), now.toISOString());
  await cron.updateJobDefinition({ ...job, name: 'job 1', updatedAt: new Date() });
  await cron.setJobEnabled('cj-1', false, new Date());
  assert.equal((await cron.listEnabledJobs()).length, 0);
  await cron.setJobEnabled('cj-1', true, new Date());
  const ran = new Date();
  await cron.recordRunTimes({ ...job, lastRun: ran });
  assert.equal((await cron.listEnabledJobs())[0].lastRun.toISOString(), ran.toISOString());
  await cron.saveExecution({ jobId: 'cj-1', success: true, output: '"ok"', executedAt: new Date(Date.now() - 1000), duration: 3 });
  await cron.saveExecution({ jobId: 'cj-1', success: false, error: 'boom', executedAt: new Date(), duration: 4 });
  const hist = await cron.jobHistory('cj-1');
  assert.deepEqual(hist.map((h) => h.success), [false, true], 'newest first');
  assert.match(hist[0].executedAt, /Z$/);
  // SQLite: one process, no claim and no write.
  assert.equal(await cron.claimRun('cj-1', cron.tickSlot('*/5 * * * *')), true);
  assert.equal(await cron.claimRun('cj-1', cron.tickSlot('*/5 * * * *')), true);
  assert.equal(cron.tickSlot('* * * * *', Date.UTC(2026, 0, 1, 10, 7, 42, 500)).toISOString(), '2026-01-01T10:07:00.000Z');
  assert.equal(cron.tickSlot('*/10 * * * * *', Date.UTC(2026, 0, 1, 10, 7, 42, 500)).toISOString(), '2026-01-01T10:07:42.000Z');
  const def = { name: 'named', description: null, cronExpression: '0 4 * * *', actionType: 'memory-job', actionData: { job: 'x' } };
  assert.equal(await cron.ensureNamedJob('nj-1', def), true);
  assert.equal(await cron.ensureNamedJob('nj-2', def), false);
  await cron.deleteJob('cj-1');
  assert.deepEqual((await cron.listEnabledJobs()).map((j) => j.id), ['nj-1']);
});
