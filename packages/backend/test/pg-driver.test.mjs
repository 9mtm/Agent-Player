// B2.2a: pure unit tests for the PostgreSQL driver module (no database).
// Run: node --import tsx --test test/pg-driver.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

const { convertPlaceholders, toPgPlaceholders, PlaceholderError } = await import('../src/db/pg/placeholders.ts');
const dialect = await import('../src/db/pg/dialect.ts');
const { parseInt8, parseTimestamp, ownTypeParser, makePgTypes, Int8RangeError, OID } = await import('../src/db/pg/types.ts');
// Stand-in for pg's default parsers (this file needs no pg package).
const fallbackCalls = [];
const getTypeParser = makePgTypes((oid, format) => { fallbackCalls.push([oid, format]); return (v) => `pg-default:${v}`; }).getTypeParser;
const { dbDriver, parsePgUrl, readPgConfig, isLoopbackHost, describePgTarget, PgConfigError } = await import('../src/db/pg/config.ts');
const { listPgMigrations, STEADY_STATE } = await import('../src/db/pg/migrate.ts');

// ---------------------------------------------------------------------------
// Placeholders
// ---------------------------------------------------------------------------

test('placeholders: ? becomes $1..$n in order', () => {
  const r = convertPlaceholders('SELECT * FROM t WHERE a = ? AND b IN (?, ?) LIMIT ?');
  assert.equal(r.text, 'SELECT * FROM t WHERE a = $1 AND b IN ($2, $3) LIMIT $4');
  assert.equal(r.count, 4);
  assert.deepEqual(convertPlaceholders('SELECT 1'), { text: 'SELECT 1', count: 0 });
});

test('placeholders: ? inside string literals, identifiers and comments is kept', () => {
  assert.equal(toPgPlaceholders(`SELECT '?', 'it''s ?', x FROM t WHERE y = ?`), `SELECT '?', 'it''s ?', x FROM t WHERE y = $1`);
  assert.equal(toPgPlaceholders(`SELECT "we?ird", "a""?" FROM t WHERE c = ?`), `SELECT "we?ird", "a""?" FROM t WHERE c = $1`);
  assert.equal(toPgPlaceholders('SELECT `a?b` FROM t WHERE c = ?'), 'SELECT `a?b` FROM t WHERE c = $1');
  assert.equal(toPgPlaceholders('SELECT 1 -- why?\nWHERE a = ?'), 'SELECT 1 -- why?\nWHERE a = $1');
  assert.equal(toPgPlaceholders('SELECT /* a? /* nested? */ still? */ ? '), 'SELECT /* a? /* nested? */ still? */ $1 ');
  assert.equal(toPgPlaceholders(`SELECT E'\\'?' , ?`), `SELECT E'\\'?' , $1`);
  assert.equal(toPgPlaceholders("SELECT $$ ? $$, $fn$ '?' $fn$, ?"), "SELECT $$ ? $$, $fn$ '?' $fn$, $1");
});

test('placeholders: a backslash is a plain character in a standard string', () => {
  assert.equal(toPgPlaceholders(`SELECT 'a\\' , ?`), `SELECT 'a\\' , $1`);
});

test('placeholders: refuses ?NNN, mixed $n/?, and unterminated input', () => {
  assert.throws(() => convertPlaceholders('SELECT ?1'), PlaceholderError);
  assert.throws(() => convertPlaceholders('SELECT $1, ?'), PlaceholderError);
  assert.throws(() => convertPlaceholders(`SELECT 'open ?`), PlaceholderError);
  assert.throws(() => convertPlaceholders('SELECT "open'), PlaceholderError);
  assert.throws(() => convertPlaceholders('SELECT /* open'), PlaceholderError);
  assert.throws(() => convertPlaceholders('SELECT $x$ open'), PlaceholderError);
  // Plain $n SQL without ? passes through.
  assert.deepEqual(convertPlaceholders('SELECT $1::int'), { text: 'SELECT $1::int', count: 0 });
});

// ---------------------------------------------------------------------------
// Dialect helpers
// ---------------------------------------------------------------------------

test('dialect: timestamps per column kind', () => {
  assert.equal(dialect.nowTs('postgres'), 'CURRENT_TIMESTAMP');
  assert.equal(dialect.nowTs('sqlite'), 'CURRENT_TIMESTAMP');
  assert.equal(dialect.nowText('sqlite'), `datetime('now')`);
  assert.match(dialect.nowText('postgres'), /^to_char\(\(now\(\) AT TIME ZONE 'UTC'\), 'YYYY-MM-DD HH24:MI:SS'\)$/);
  assert.equal(dialect.tsParam('sqlite'), 'datetime(?)');
  assert.equal(dialect.tsParam('postgres'), '(?)::timestamptz');
  assert.equal(dialect.textTimestamp(Date.UTC(2026, 9, 14, 8, 5, 3, 999)), '2026-10-14 08:05:03');
  assert.throws(() => dialect.textTimestamp(NaN), dialect.DialectError);
});

test('dialect: offsets and now + offset', () => {
  assert.equal(dialect.offset(-60, 'minutes'), '-60 minutes');
  assert.equal(dialect.offset(7, 'days'), '+7 days');
  assert.equal(dialect.offset(0, 'seconds'), '+0 seconds');
  assert.throws(() => dialect.offset(1.5, 'days'), dialect.DialectError);
  assert.throws(() => dialect.offset(1, 'months'), dialect.DialectError);
  assert.equal(dialect.nowPlus('sqlite'), `datetime('now', ?)`);
  assert.equal(dialect.nowPlus('postgres'), '(now() + (?)::interval)');
});

test('dialect: strftime(%s) -> epoch seconds', () => {
  assert.equal(dialect.epochSeconds('sqlite', 'MAX(t)'), `CAST(strftime('%s', MAX(t)) AS INTEGER)`);
  assert.equal(dialect.epochSeconds('postgres', 'MAX(t)'), 'CAST(floor(extract(epoch FROM (MAX(t)))) AS bigint)');
  assert.equal(dialect.epochSeconds('postgres', 'x', 'text'), `CAST(floor(extract(epoch FROM ((x)::timestamp AT TIME ZONE 'UTC'))) AS bigint)`);
});

test('dialect: INSERT OR IGNORE and RETURNING id', () => {
  assert.equal(dialect.insertOrIgnore('postgres', 'INSERT INTO t (a) VALUES (?);'), 'INSERT INTO t (a) VALUES (?) ON CONFLICT DO NOTHING');
  assert.equal(dialect.insertOrIgnore('sqlite', 'insert into t (a) values (?)'), 'insert into t (a) values (?) ON CONFLICT DO NOTHING');
  assert.throws(() => dialect.insertOrIgnore('postgres', 'UPDATE t SET a = 1'), dialect.DialectError);
  assert.throws(() => dialect.insertOrIgnore('postgres', 'INSERT INTO t (a) VALUES (1) ON CONFLICT DO NOTHING'), dialect.DialectError);
  assert.equal(dialect.returningId('postgres', 'INSERT INTO t (a) VALUES (?)'), 'INSERT INTO t (a) VALUES (?) RETURNING id');
  assert.throws(() => dialect.returningId('postgres', 'INSERT INTO t (a) VALUES (?)', 'id; DROP'), dialect.DialectError);
});

test('dialect: rowCount -> changes, RETURNING id -> lastInsertRowid', () => {
  assert.deepEqual(dialect.runResult({ rowCount: 3 }), { changes: 3 });
  assert.deepEqual(dialect.runResult({ rowCount: null }), { changes: 0 });
  assert.deepEqual(dialect.runResult({ rowCount: 1, rows: [{ id: 42 }] }, 'id'), { changes: 1, lastInsertRowid: 42 });
  assert.deepEqual(dialect.runResult({ rowCount: 0, rows: [] }, 'id'), { changes: 0 });
});

// ---------------------------------------------------------------------------
// Type parsers
// ---------------------------------------------------------------------------

test('types: int8 -> number, refusing values beyond MAX_SAFE_INTEGER', () => {
  assert.equal(parseInt8('0'), 0);
  assert.equal(parseInt8('-12'), -12);
  assert.equal(parseInt8(String(Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER);
  assert.throws(() => parseInt8('9007199254740992'), Int8RangeError);
  assert.throws(() => parseInt8('-9007199254740993'), Int8RangeError);
  assert.throws(() => parseInt8('1.5'), Int8RangeError);
  assert.equal(getTypeParser(OID.INT8)('7'), 7);
});

test('types: timestamps keep the SQLite string format in UTC', () => {
  assert.equal(parseTimestamp('2026-10-14 08:05:03+00'), '2026-10-14 08:05:03');
  assert.equal(parseTimestamp('2026-10-14 08:05:03.123456+00'), '2026-10-14 08:05:03.123456');
  assert.equal(parseTimestamp('2026-10-14 08:05:03'), '2026-10-14 08:05:03'); // timestamp without time zone
  assert.equal(parseTimestamp('2026-10-14 10:05:03+02'), '2026-10-14 08:05:03');
  assert.equal(parseTimestamp('2026-10-14 03:35:03.5-04:30'), '2026-10-14 08:05:03.500');
  assert.equal(parseTimestamp('infinity'), 'infinity');
  assert.equal(parseTimestamp('-infinity'), '-infinity');
  assert.equal(getTypeParser(OID.TIMESTAMPTZ)('2026-01-02 03:04:05+00'), '2026-01-02 03:04:05');
  assert.equal(getTypeParser(OID.DATE)('2026-01-02'), '2026-01-02');
  // Other types (and binary format) fall back to pg's own parsers.
  assert.equal(ownTypeParser(23), null);
  assert.equal(ownTypeParser(OID.INT8, 'binary'), null);
  assert.equal(getTypeParser(23)('5'), 'pg-default:5');
  assert.deepEqual(fallbackCalls, [[23, 'text']]);
});

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

test('config: SQLite is the default; postgres only when asked for', () => {
  assert.equal(dbDriver({}), 'sqlite');
  assert.equal(dbDriver({ AGENT_PLAYER_DB: 'sqlite' }), 'sqlite');
  assert.equal(dbDriver({ AGENT_PLAYER_DB: 'postgres' }), 'postgres');
  // The URL alone never switches the driver.
  assert.equal(readPgConfig({ AGENT_PLAYER_PG_URL: 'postgres://127.0.0.1/x' }), null);
  assert.throws(() => dbDriver({ AGENT_PLAYER_DB: 'mysql' }), PgConfigError);
  assert.throws(() => readPgConfig({ AGENT_PLAYER_DB: 'postgres' }), PgConfigError);
});

test('config: loopback only, unless explicitly allowed', () => {
  for (const h of ['127.0.0.1', '127.1.2.3', 'localhost', '::1', '[::1]', 'LOCALHOST']) assert.equal(isLoopbackHost(h), true, h);
  for (const h of ['10.0.0.1', 'db.example.com', '0.0.0.0', '127.0.0.256', '128.0.0.1', '']) assert.equal(isLoopbackHost(h), false, h);
  assert.equal(parsePgUrl('postgres://u:p@127.0.0.1:5433/db').port, 5433);
  assert.equal(parsePgUrl('postgres://[::1]/db').host, '::1');
  assert.equal(parsePgUrl('postgres:///db?host=%2Ftmp').host, '/tmp');
  assert.throws(() => parsePgUrl('postgres://u:p@db.example.com/db'), PgConfigError);
  assert.throws(() => parsePgUrl('postgres://127.0.0.1/db?host=db.example.com'), PgConfigError);
  assert.equal(parsePgUrl('postgres://db.example.com/db', { allowRemote: true }).host, 'db.example.com');
  assert.equal(readPgConfig({ AGENT_PLAYER_DB: 'postgres', AGENT_PLAYER_PG_URL: 'postgres://db.example.com/db', AGENT_PLAYER_PG_ALLOW_REMOTE: '1' }).host, 'db.example.com');
  assert.throws(() => readPgConfig({ AGENT_PLAYER_DB: 'postgres', AGENT_PLAYER_PG_URL: 'postgres://db.example.com/db', AGENT_PLAYER_PG_ALLOW_REMOTE: 'yes' }), PgConfigError);
  assert.throws(() => parsePgUrl('postgres://127.0.0.1/db?sslmode=disable'), PgConfigError);
  assert.throws(() => parsePgUrl('postgres://127.0.0.1/'), PgConfigError);
  assert.throws(() => parsePgUrl('mysql://127.0.0.1/db'), PgConfigError);
});

test('config: the password never shows up in errors, logs or JSON', () => {
  const secret = 'S3cr3t-pa55word';
  const cfg = parsePgUrl(`postgres://ap:${secret}@127.0.0.1:5432/db`);
  assert.equal(cfg.password, secret);
  assert.equal(cfg.user, 'ap');
  assert.doesNotMatch(JSON.stringify(cfg), new RegExp(secret));
  assert.doesNotMatch(describePgTarget(cfg), new RegExp(secret));
  assert.equal(describePgTarget(cfg), '127.0.0.1:5432/db');
  for (const bad of [`postgres://ap:${secret}@db.example.com/db`, `postgres://ap:${secret}@127.0.0.1/db?options=x`, `postgres://ap:${secret}@127.0.0.1/`, `not a url ${secret}`]) {
    try { parsePgUrl(bad); assert.fail('should throw'); } catch (err) {
      assert.ok(err instanceof PgConfigError);
      assert.doesNotMatch(err.message, new RegExp(secret));
    }
  }
});

// ---------------------------------------------------------------------------
// Migration list
// ---------------------------------------------------------------------------

test('migrations-pg: ids like the SQLite runner (040b is its own id), schema file separate', () => {
  const list = listPgMigrations();
  const ids = list.map((m) => m.id);
  assert.ok(ids.includes('040') && ids.includes('040b'));
  assert.ok(!ids.includes('000'));
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids], [...ids].sort());
  assert.equal(list.find((m) => m.id === '040b').name, '040b_memories_base_table');
  assert.ok(STEADY_STATE.every((s) => /^CREATE INDEX IF NOT EXISTS idx_audit_logs_(user|created) ON audit_logs/.test(s)));
});
