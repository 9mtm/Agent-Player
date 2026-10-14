#!/usr/bin/env node
/**
 * B2.2a: apply src/db/migrations-pg/ to the PostgreSQL database named by
 * AGENT_PLAYER_PG_URL (loopback only unless AGENT_PLAYER_PG_ALLOW_REMOTE=1).
 *
 * Usage: AGENT_PLAYER_PG_URL=postgres://127.0.0.1:5432/<db> node --import tsx scripts/pg/migrate-pg.mjs
 * Prints host:port/db and the applied files; never the URL or password.
 */

const { parsePgUrl, describePgTarget } = await import('../../src/db/pg/config.ts');
const { createPgPool } = await import('../../src/db/pg/pool.ts');
const { runPgMigrations } = await import('../../src/db/pg/migrate.ts');

const url = process.env.AGENT_PLAYER_PG_URL;
if (!url) {
  console.error('AGENT_PLAYER_PG_URL is not set');
  process.exit(2);
}
let cfg;
try {
  cfg = parsePgUrl(url, { allowRemote: process.env.AGENT_PLAYER_PG_ALLOW_REMOTE === '1', max: 2 });
} catch (err) {
  console.error(err.message);
  process.exit(2);
}
const pool = createPgPool(cfg);
try {
  const started = Date.now();
  const report = await runPgMigrations(pool, { log: (line) => console.log(`  ${line}`) });
  console.log(`${describePgTarget(cfg)}: schema ${report.schemaApplied ? 'applied' : 'present'}, `
    + `${report.applied.length} migration(s) applied, ${report.alreadyApplied} already applied (${Date.now() - started} ms)`);
} catch (err) {
  console.error(`migration failed: ${err?.message ?? 'unknown error'}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
