/**
 * PostgreSQL configuration (B2.2a).
 *
 * SQLite stays the default. PostgreSQL is used only when both are set:
 *
 *   AGENT_PLAYER_DB=postgres
 *   AGENT_PLAYER_PG_URL=postgres://user:password@127.0.0.1:5432/dbname
 *
 * The URL alone never switches the driver, so a stray variable cannot move
 * the app to another database. Only loopback hosts (127.0.0.0/8, ::1,
 * localhost) and local Unix sockets are accepted, unless
 * AGENT_PLAYER_PG_ALLOW_REMOTE=1 is set as well.
 *
 * The URL holds the password: it is never logged and never put in an error
 * message. Errors name the problem (missing host, remote host refused, ...),
 * not the value; `describePgTarget` gives a safe label (host:port/db).
 */

export type DbDriver = 'sqlite' | 'postgres';

export class PgConfigError extends Error {}

export interface PgConfig {
  readonly host: string;
  readonly user: string | undefined;
  /** Non-enumerable (absent from JSON.stringify / console.log). Never log it. */
  readonly password: string | undefined;
  readonly port: number;
  readonly database: string;
  readonly max: number;
}

type Env = Record<string, string | undefined>;

/** The selected database driver: 'postgres' only for AGENT_PLAYER_DB=postgres. */
export function dbDriver(env: Env = process.env): DbDriver {
  const v = String(env.AGENT_PLAYER_DB ?? '').trim().toLowerCase();
  if (v === '' || v === 'sqlite') return 'sqlite';
  if (v === 'postgres' || v === 'postgresql' || v === 'pg') return 'postgres';
  throw new PgConfigError('AGENT_PLAYER_DB must be "sqlite" or "postgres"');
}

export function isPostgres(env: Env = process.env): boolean {
  return dbDriver(env) === 'postgres';
}

/** True for 127.0.0.0/8, ::1 and localhost (case-insensitive, brackets allowed). */
export function isLoopbackHost(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/^\[(.*)\]$/, '$1');
  if (h === 'localhost' || h === '::1' || h === '0:0:0:0:0:0:0:1') return true;
  const m = /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  return !!m && m.slice(1).every((p) => Number(p) <= 255);
}

/** A Unix socket directory (absolute path): local by definition. */
function isSocketPath(host: string): boolean {
  return host.startsWith('/');
}

/**
 * Parse and check a connection string. Throws PgConfigError with a message
 * that never contains the URL or the password.
 */
export function parsePgUrl(url: string, opts: { allowRemote?: boolean; max?: number } = {}): PgConfig {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new PgConfigError('AGENT_PLAYER_PG_URL is not a valid URL');
  }
  if (u.protocol !== 'postgres:' && u.protocol !== 'postgresql:') {
    throw new PgConfigError('AGENT_PLAYER_PG_URL must start with postgres:// or postgresql://');
  }
  // ?host=/path (socket) overrides the authority host in node-postgres.
  const queryHost = u.searchParams.get('host');
  const host = (queryHost ?? decodeURIComponent(u.hostname)).replace(/^\[(.*)\]$/, '$1');
  if (!host) throw new PgConfigError('AGENT_PLAYER_PG_URL must name a host (127.0.0.1)');
  if (host.includes(',')) throw new PgConfigError('AGENT_PLAYER_PG_URL: several hosts are not supported');
  for (const key of u.searchParams.keys()) {
    // Only ?host= (socket directory). Other options (sslmode, options, ...) are
    // refused so the pool runs with exactly the settings checked here.
    if (key !== 'host') throw new PgConfigError('AGENT_PLAYER_PG_URL: only the ?host= query parameter is supported');
  }
  if (!opts.allowRemote && !isLoopbackHost(host) && !isSocketPath(host)) {
    throw new PgConfigError('AGENT_PLAYER_PG_URL host is not loopback; set AGENT_PLAYER_PG_ALLOW_REMOTE=1 to allow it');
  }
  const port = u.port ? Number(u.port) : 5432;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new PgConfigError('AGENT_PLAYER_PG_URL has an invalid port');
  const database = decodeURIComponent(u.pathname.replace(/^\//, ''));
  if (!database) throw new PgConfigError('AGENT_PLAYER_PG_URL must name a database');
  const max = opts.max ?? 10;
  const user = u.username ? decodeURIComponent(u.username) : undefined;
  const cfg = { host, user, port, database, max } as PgConfig;
  Object.defineProperty(cfg, 'password', {
    value: u.password ? decodeURIComponent(u.password) : undefined,
    enumerable: false,
  });
  return Object.freeze(cfg);
}

/** PostgreSQL settings from the environment, or null when the driver is SQLite. */
export function readPgConfig(env: Env = process.env): PgConfig | null {
  if (dbDriver(env) !== 'postgres') return null;
  const url = env.AGENT_PLAYER_PG_URL;
  if (!url) throw new PgConfigError('AGENT_PLAYER_DB=postgres needs AGENT_PLAYER_PG_URL');
  const maxRaw = env.AGENT_PLAYER_PG_POOL_MAX;
  const max = maxRaw ? Number(maxRaw) : undefined;
  if (max !== undefined && (!Number.isInteger(max) || max < 1 || max > 100)) {
    throw new PgConfigError('AGENT_PLAYER_PG_POOL_MAX must be an integer from 1 to 100');
  }
  return parsePgUrl(url, { allowRemote: env.AGENT_PLAYER_PG_ALLOW_REMOTE === '1', max });
}

/** Safe label for logs: host:port/db (no user, no password). */
export function describePgTarget(cfg: Pick<PgConfig, 'host' | 'port' | 'database'>): string {
  return `${cfg.host}:${cfg.port}/${cfg.database}`;
}
