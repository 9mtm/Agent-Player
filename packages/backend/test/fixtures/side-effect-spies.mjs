// Side-effect spies for request-level audits (ISO-RO-1).
//
// Install BEFORE any app module is imported. While armed (`arm()` ...
// `disarm()`), the spies record:
//  - sql:   SQLite statements that write (INSERT / UPDATE / DELETE / REPLACE /
//           CREATE / DROP / ALTER, non-reader statements, pragma assignments,
//           backups) on every better-sqlite3 database;
//  - net:   fetch, http(s).request/get, net/tls connect and DNS lookups;
//  - child: child_process spawn / exec / execFile / fork (+ sync forms);
//  - fs:    file-system writes (write/append/mkdir/rm/unlink/rename/copy/
//           link/chmod/chown/truncate/utimes, write streams, open for write);
//  - exit:  process.exit / process.kill.
// While armed, child processes, fs writes, process exit/kill and every
// network attempt are BLOCKED (they throw or are no-ops); SQL writes run
// (they only touch the throwaway test database). Outside the armed window,
// only non-loopback network is blocked; everything else passes through.
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';

const LOOPBACK = /^(127\.\d+\.\d+\.\d+|localhost|::1|\[::1\])$/i;
const WRITE_SQL = /^\s*(?:WITH\b[\s\S]*?\)\s*)?(INSERT|UPDATE|DELETE|REPLACE|UPSERT|CREATE|DROP|ALTER|VACUUM|REINDEX|ATTACH|DETACH)\b/i;
const TX_SQL = /^\s*(BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE)\b/i;

function hostOf(target) {
  try {
    if (target instanceof URL) return target.hostname;
    if (typeof target === 'string') return new URL(target).hostname;
    if (target && typeof target === 'object') {
      if (typeof target.url === 'string') return new URL(target.url).hostname;
      return String(target.hostname ?? target.host ?? 'localhost').replace(/:\d+$/, '');
    }
  } catch { /* fall through */ }
  return String(target);
}

export function installSideEffectSpies(backendDir) {
  const require = createRequire(join(backendDir, 'package.json'));
  const records = { sql: [], net: [], child: [], fs: [], exit: [] };
  let armed = false;
  const note = (kind, what) => { if (armed) records[kind].push(what); };

  // ── SQLite ────────────────────────────────────────────────────────────
  const Database = require('better-sqlite3');
  const probe = new Database(':memory:');
  const Statement = Object.getPrototypeOf(probe.prepare('select 1'));
  probe.close();
  const sqlWrites = (src) => String(src).split(';').map((s) => s.trim()).filter(Boolean)
    .filter((s) => WRITE_SQL.test(s));
  for (const m of ['run', 'get', 'all', 'iterate']) {
    const real = Statement[m];
    Statement[m] = function (...a) {
      if (armed) {
        const src = String(this.source ?? '');
        if (WRITE_SQL.test(src) || (!this.reader && !TX_SQL.test(src))) records.sql.push(src.replace(/\s+/g, ' ').slice(0, 160));
      }
      return real.apply(this, a);
    };
  }
  const realExec = Database.prototype.exec;
  Database.prototype.exec = function (src) {
    if (armed) for (const s of sqlWrites(src)) records.sql.push(`exec: ${s.replace(/\s+/g, ' ').slice(0, 150)}`);
    return realExec.call(this, src);
  };
  const realPragma = Database.prototype.pragma;
  Database.prototype.pragma = function (src, ...a) {
    if (armed && String(src).includes('=')) records.sql.push(`pragma ${src}`);
    return realPragma.call(this, src, ...a);
  };
  const realBackup = Database.prototype.backup;
  Database.prototype.backup = function (...a) {
    if (armed) { records.sql.push(`backup ${a[0]}`); throw new Error('backup blocked by side-effect spy'); }
    return realBackup.apply(this, a);
  };

  // ── Network ───────────────────────────────────────────────────────────
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : String(input?.url);
    note('net', `fetch ${url}`);
    throw new Error('network disabled in test');
  };
  const guardNet = (label, host) => {
    const h = String(host ?? '');
    if (armed) records.net.push(`${label} ${h}`);
    if (armed || !LOOPBACK.test(h)) throw new Error(`network blocked by side-effect spy (${label} ${h})`);
  };
  for (const modName of ['node:http', 'node:https']) {
    const mod = require(modName);
    for (const m of ['request', 'get']) {
      const real = mod[m];
      mod[m] = function (...a) { guardNet(`${modName.slice(5)}.${m}`, hostOf(a[0])); return real.apply(this, a); };
    }
  }
  const net = require('node:net');
  for (const m of ['connect', 'createConnection']) {
    const real = net[m];
    net[m] = function (...a) {
      const o = a[0];
      if (typeof o === 'object' && o && !o.path) guardNet(`net.${m}`, o.host ?? 'localhost');
      else if (typeof o === 'number') guardNet(`net.${m}`, typeof a[1] === 'string' ? a[1] : 'localhost');
      return real.apply(this, a);
    };
  }
  const tls = require('node:tls');
  const realTls = tls.connect;
  tls.connect = function (...a) {
    const o = a[0];
    guardNet('tls.connect', typeof o === 'object' && o ? (o.host ?? o.servername ?? 'localhost') : (typeof a[1] === 'string' ? a[1] : 'localhost'));
    return realTls.apply(this, a);
  };
  const dns = require('node:dns');
  for (const m of ['lookup', 'resolve', 'resolve4', 'resolve6', 'resolveAny']) {
    const real = dns[m];
    dns[m] = function (...a) { guardNet(`dns.${m}`, a[0]); return real.apply(this, a); };
    const realP = dns.promises[m];
    if (realP) dns.promises[m] = function (...a) { guardNet(`dns.promises.${m}`, a[0]); return realP.apply(this, a); };
  }

  // ── Child processes ───────────────────────────────────────────────────
  const cp = require('node:child_process');
  for (const m of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) {
    const real = cp[m];
    cp[m] = function (...a) {
      if (armed) { records.child.push(`${m} ${String(a[0]).split(' ')[0]}`); throw new Error('child process blocked by side-effect spy'); }
      return real.apply(this, a);
    };
  }

  // ── File system writes ────────────────────────────────────────────────
  const fs = require('node:fs');
  const { O_WRONLY, O_RDWR, O_CREAT, O_APPEND, O_TRUNC } = fs.constants;
  const writesFlags = (f) => {
    if (f === undefined || f === null) return false;
    if (typeof f === 'number') return (f & (O_WRONLY | O_RDWR | O_CREAT | O_APPEND | O_TRUNC)) !== 0;
    return !/^(r|rs|sr)$/.test(String(f));
  };
  const blockFs = (label, p) => {
    records.fs.push(`${label} ${String(p)}`);
    const err = new Error(`fs write blocked by side-effect spy (${label})`);
    err.code = 'EACCES';
    return err;
  };
  const FS_WRITES = ['writeFile', 'appendFile', 'mkdir', 'mkdtemp', 'rm', 'rmdir', 'unlink', 'rename', 'copyFile', 'cp',
    'symlink', 'link', 'chmod', 'lchmod', 'chown', 'lchown', 'truncate', 'utimes', 'lutimes', 'write', 'writev', 'ftruncate', 'fchmod', 'fchown'];
  for (const m of FS_WRITES) {
    for (const name of [m, `${m}Sync`]) {
      const real = fs[name];
      if (typeof real !== 'function') continue;
      fs[name] = function (...a) {
        if (armed && !(typeof a[0] === 'number' && a[0] <= 2)) {
          const err = blockFs(name, a[0]);
          if (name.endsWith('Sync')) throw err;
          const cb = a[a.length - 1];
          if (typeof cb === 'function') { process.nextTick(cb, err); return undefined; }
          throw err;
        }
        return real.apply(this, a);
      };
    }
    const realP = fs.promises[m];
    if (typeof realP === 'function') {
      fs.promises[m] = function (...a) { if (armed) return Promise.reject(blockFs(`promises.${m}`, a[0])); return realP.apply(this, a); };
    }
  }
  for (const name of ['open', 'openSync']) {
    const real = fs[name];
    fs[name] = function (...a) {
      if (armed && writesFlags(a[1])) {
        const err = blockFs(name, a[0]);
        if (name === 'openSync') throw err;
        const cb = a[a.length - 1];
        if (typeof cb === 'function') { process.nextTick(cb, err); return undefined; }
        throw err;
      }
      return real.apply(this, a);
    };
  }
  const realPOpen = fs.promises.open;
  fs.promises.open = function (...a) {
    if (armed && writesFlags(a[1])) return Promise.reject(blockFs('promises.open', a[0]));
    return realPOpen.apply(this, a);
  };
  const realWS = fs.createWriteStream;
  fs.createWriteStream = function (...a) {
    if (armed) throw blockFs('createWriteStream', a[0]);
    return realWS.apply(this, a);
  };

  // ── Process exit / kill ───────────────────────────────────────────────
  const realExit = process.exit;
  process.exit = function (code) { if (armed) { records.exit.push(`exit ${code}`); return undefined; } return realExit.call(process, code); };
  const realKill = process.kill;
  process.kill = function (pid, sig) { if (armed) { records.exit.push(`kill ${pid} ${sig ?? ''}`); return true; } return realKill.call(process, pid, sig); };

  syncBuiltinESMExports();

  return {
    records,
    arm() { for (const k of Object.keys(records)) records[k].length = 0; armed = true; },
    disarm() { armed = false; return { sql: [...records.sql], net: [...records.net], child: [...records.child], fs: [...records.fs], exit: [...records.exit] }; },
    realFetch,
    restoreFetch() { globalThis.fetch = realFetch; },
  };
}

/** True when a disarm() snapshot saw no side effect at all. */
export function noSideEffects(seen) {
  return Object.values(seen).every((list) => list.length === 0);
}
