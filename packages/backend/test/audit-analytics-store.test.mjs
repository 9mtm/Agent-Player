// B2.2c (SQLite): the audit_logs read side (queryAuditLogs, cleanupAuditLogs)
// and extension analytics through the driver-neutral SQL steps, with the
// SQLite row shapes. The PostgreSQL side: test/pg-platform.integration.test.mjs.
// Run: node --import tsx --test test/audit-analytics-store.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-audit-analytics-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
delete process.env.AGENT_PLAYER_DB;

const quiet = { log: console.log };
console.log = () => {};
const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const audit = await import(join(backendDir, 'src/services/audit-logger.ts'));
const analytics = await import(join(backendDir, 'src/services/extension-analytics.ts'));

test.after(() => {
  Object.assign(console, quiet);
  closeDatabase();
  process.chdir(backendDir);
  rmSync(dir, { recursive: true, force: true });
});

test('logAudit -> queryAuditLogs (filters, newest first) -> cleanupAuditLogs', async () => {
  audit.logAudit({ event_type: 'data.create', event_category: 'data_modification', success: true, resource_id: 'r1', action: 'a1' });
  audit.logAudit({ event_type: 'data.delete', event_category: 'data_modification', severity: 'warning', success: false, resource_id: 'r2', action: 'a2' });
  db.prepare(`INSERT INTO audit_logs (event_type, event_category, severity, success, action, created_at) VALUES ('data.read', 'data_access', 'info', 1, 'old', '2000-01-01 00:00:00')`).run();
  const allRows = await audit.queryAuditLogs();
  assert.equal(allRows.length, 3);
  assert.deepEqual(allRows.map((r) => r.action), ['a2', 'a1', 'old'], 'newest first, id breaks the tie');
  assert.deepEqual((await audit.queryAuditLogs({ severity: 'warning' })).map((r) => r.action), ['a2']);
  assert.deepEqual((await audit.queryAuditLogs({ start_date: '2001-01-01' })).map((r) => r.action), ['a2', 'a1']);
  assert.equal((await audit.queryAuditLogs({ limit: 1 })).length, 1);
  assert.equal(await audit.cleanupAuditLogs(30), 1);
  assert.equal((await audit.queryAuditLogs()).length, 2);
});

test('extension analytics: counts every call (upsert), periods, breakdown, top errors, overview', async () => {
  db.prepare(`INSERT INTO extension_configs (extension_id, enabled) VALUES ('ext-a', 1)`).run();
  analytics.recordApiCall('ext-a');
  analytics.recordApiCall('ext-a', { success: false });
  analytics.recordApiCall('ext-a');
  const row = db.prepare('SELECT api_calls, error_count FROM extension_usage_stats WHERE extension_id = ?').get('ext-a');
  assert.deepEqual({ ...row }, { api_calls: 3, error_count: 1 }, 'written synchronously on SQLite');
  audit.logAudit({ event_type: 'extension.api.call', event_category: 'extension', success: false, resource_id: 'ext-a', error_message: 'boom' });
  audit.logAudit({ event_type: 'extension.api.call', event_category: 'extension', success: false, resource_id: 'ext-a', error_message: 'boom' });
  const a = await analytics.getExtensionAnalytics('ext-a');
  assert.deepEqual(a.today, { apiCalls: 3, errorCount: 1, errorRate: 33.33 });
  assert.equal(a.last30Days.apiCalls, 3);
  assert.equal(a.dailyBreakdown.length, 1);
  assert.equal(a.topErrors[0].errorType, 'boom');
  assert.equal(a.topErrors[0].count, 2);
  const o = await analytics.getOverviewAnalytics();
  assert.equal(o.totalExtensions, 1);
  assert.equal(o.enabledExtensions, 1);
  assert.equal(o.totalApiCalls, 3);
  assert.equal(o.totalErrors, 1);
});
