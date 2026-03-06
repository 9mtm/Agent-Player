import { Router } from 'express';
import { execFile } from 'child_process';
import net from 'net';
import dns from 'dns';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readStore } from '../utils/datastore.js';
import { getCpanelServers, getServersByType, getServerById as getServerByIdFromStore, clearCache as clearServerStoreCache } from '../utils/serverStore.js';
import { testTcpConnect } from '../utils/network.js';

const dnsResolve4 = promisify(dns.resolve4);
const dnsResolveTxt = promisify(dns.resolveTxt);
const __dirname = dirname(fileURLToPath(import.meta.url));

const router = Router();

// ── Server Config (from serverStore) ──
async function loadServers() {
  return getCpanelServers();
}

async function getServerById(id) {
  const servers = await loadServers();
  return servers.find((s) => s.id === parseInt(id, 10));
}

export function clearWhmCache() {
  cache.clear();
  clearServerStoreCache();
}

// ── Cache with auto-cleanup ──
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

// Clean expired cache entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of cache) {
    if (now - val.ts > CACHE_TTL * 2) cache.delete(key);
  }
}, 300000);

// ── WHM API Client (uses undici for better header tolerance) ──
async function whmApiCall(server, func, params = {}) {
  const paramStr = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const cacheKey = `${server.id}:${func}${paramStr ? ':' + paramStr : ''}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const url = `https://${server.host}:${server.port}/json-api/${func}?api.version=1${paramStr ? '&' + paramStr : ''}`;

  // WHM sends broken HTTP headers (service status as headers), so we use curl
  // which tolerates non-standard responses that Node.js HTTP parsers reject
  return new Promise((resolve, reject) => {
    execFile(
      'curl',
      ['-sk', '--max-time', '15', '-H', `Authorization: whm ${server.user}:${server.token}`, url],
      { maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return reject(new Error(`WHM API error: ${server.host}/${func}: ${err.message}`));
        try {
          const parsed = JSON.parse(stdout);
          cache.set(cacheKey, { data: parsed, ts: Date.now() });
          resolve(parsed);
        } catch {
          reject(new Error(`Invalid JSON from WHM API: ${func}`));
        }
      }
    );
  });
}

// ── JetBackup 5 API Client ──
async function jetbackupApiCall(server, action, params = {}) {
  const cacheKey = `${server.id}:jetbackup:${action}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const queryString = new URLSearchParams({ function: action, ...params }).toString();
  const url = `https://${server.host}:${server.port}/cgi/addons/jetbackup5/api.cgi?${queryString}`;

  return new Promise((resolve, reject) => {
    execFile(
      'curl',
      ['-sk', '--max-time', '15', '-H', `Authorization: whm ${server.user}:${server.token}`, url],
      { maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return reject(new Error(`JetBackup API error: ${server.host}/${action}: ${err.message}`));
        try {
          const parsed = JSON.parse(stdout);
          cache.set(cacheKey, { data: parsed, ts: Date.now() });
          resolve(parsed);
        } catch {
          reject(new Error(`Invalid JSON from JetBackup API: ${action}`));
        }
      }
    );
  });
}

// ── Data Extractors ──
function extractDiskInfo(data) {
  // getdiskusage returns partition info
  const partitions = data?.data?.partition || data?.result || [];
  if (Array.isArray(partitions)) {
    return partitions.map((p) => ({
      partition: p.mount || p.partition || '/',
      total: p.total || p.blocks || '0',
      used: p.used || '0',
      available: p.available || '0',
      percentage: parseInt(p.percentage || p.usedpercent || '0'),
    }));
  }
  return [];
}

function extractServiceInfo(data) {
  const services = data?.data?.service || [];
  return services.map((s) => ({
    name: s.name || 'unknown',
    displayName: s.display_name || s.name || 'unknown',
    running: s.running === 1 || s.running === true,
    enabled: s.enabled === 1 || s.enabled === true,
    monitored: s.monitored === 1 || s.monitored === true,
  }));
}

function extractAccountInfo(data) {
  const accounts = data?.data?.acct || data?.acct || [];
  return accounts.map((a) => ({
    domain: a.domain || '',
    user: a.user || '',
    email: a.email || '',
    plan: a.plan || '',
    diskused: a.diskused || '0M',
    disklimit: a.disklimit || 'unlimited',
    suspended: a.suspended === 1 || a.suspended === '1' || a.suspendedStatus === 1,
    ip: a.ip || '',
    startdate: a.startdate || '',
    theme: a.theme || '',
  }));
}

function extractSslInfo(data) {
  // fetch_ssl_vhosts returns data.vhosts[], each with a crt object
  const vhosts = data?.data?.vhosts || [];
  if (!Array.isArray(vhosts)) return [];
  const now = Date.now();
  return vhosts
    .filter((v) => v.crt && v.crt.not_after)
    .map((v) => {
      const c = v.crt;
      const expiryDate = new Date(c.not_after * 1000);
      const daysRemaining = Math.floor((expiryDate.getTime() - now) / 86400000);
      let status = 'ok';
      if (daysRemaining < 0) status = 'expired';
      else if (daysRemaining < 7) status = 'critical';
      else if (daysRemaining <= 30) status = 'warning';
      return {
        domain: v.servername || c['subject.commonName'] || '',
        issuer: c['issuer.organizationName'] || c.issuer_text || 'Unknown',
        expiry: expiryDate.toISOString(),
        daysRemaining,
        status,
      };
    });
}

function extractEmailQueueInfo(data) {
  // Try fetch_mail_queue format first, then emailtrack_search format
  const queue = data?.data?.queue || data?.queue || [];
  const records = data?.data?.records || [];
  if (Array.isArray(queue) && queue.length > 0) {
    return {
      count: queue.length,
      messages: queue.slice(0, 100).map((m) => ({
        id: m.msgid || m.id || '',
        sender: m.sender || m.from || '',
        recipient: m.recipient || m.to || '',
        subject: m.subject || '',
        frozen: m.frozen === 1 || m.frozen === true,
        age: m.age || '',
        size: m.size || '',
      })),
    };
  }
  // emailtrack_search format
  return {
    count: records.length,
    messages: records.slice(0, 100).map((r) => ({
      id: r.msgid || r.id || '',
      sender: r.sender || r.from || '',
      recipient: r.recipient || r.to || '',
      subject: r.subject || '',
      frozen: false,
      age: r.sendunixtime ? new Date(r.sendunixtime * 1000).toLocaleString() : '',
      size: r.size || r.msgsize || '',
    })),
  };
}

function extractBackupInfo(data) {
  // JetBackup 5 returns data.jobs[] with ISO date strings
  const jobs = data?.data?.jobs || data?.data || data?.result || [];
  if (!Array.isArray(jobs)) return [];
  return jobs.map((j) => ({
    id: j._id || j.id || '',
    name: j.name || 'Unnamed',
    destination: j.destination_details?.[0]?.name || '',
    lastRun: j.last_run || null,
    lastCompleted: j.last_completed || null,
    nextRun: j.next_run || null,
    running: j.running === true || j.running === 1,
    disabled: j.disabled === 1 || j.disabled === true,
    state: j.state || 0,
  }));
}

// ── Routes ──

// List configured servers (no tokens exposed)
router.get('/servers', async (req, res) => {
  const servers = (await loadServers()).map(({ id, name, host, port }) => ({
    id,
    name,
    host,
    port,
    whmUrl: `https://${host}:${port}`,
  }));
  res.json({ servers });
});

// Overview: all servers aggregated
// Exported: collect overview data directly (used by server.js background task)
export async function collectOverviewData() {
  const servers = await loadServers();
  const results = await Promise.allSettled(
    servers.map(async (server) => {
      const [hostname, version, load, disk, services, accounts, sslData, emailData, backupData] =
        await Promise.all([
          whmApiCall(server, 'gethostname').catch(() => null),
          whmApiCall(server, 'version').catch(() => null),
          whmApiCall(server, 'loadavg').catch(() => null),
          whmApiCall(server, 'getdiskusage').catch(() => null),
          whmApiCall(server, 'servicestatus').catch(() => null),
          whmApiCall(server, 'listaccts').catch(() => null),
          whmApiCall(server, 'fetch_ssl_vhosts').catch(() => null),
          whmApiCall(server, 'emailtrack_search').catch(() => null),
          jetbackupApiCall(server, 'listBackupJobs').catch(() => null),
        ]);

      const accountList = extractAccountInfo(accounts);
      const serviceList = extractServiceInfo(services);

      // Calculate total disk usage from account data if getdiskusage is not available
      let diskInfo = extractDiskInfo(disk);
      let totalDiskUsedMB = 0;
      if (diskInfo.length === 0 && accountList.length > 0) {
        accountList.forEach((a) => {
          const used = parseFloat(a.diskused) || 0;
          totalDiskUsedMB += used;
        });
        diskInfo = [
          {
            partition: '/home',
            total: '(from accounts)',
            used: Math.round(totalDiskUsedMB) + 'M',
            available: '--',
            percentage: 0,
            totalMB: totalDiskUsedMB,
          },
        ];
      }

      // SSL summary
      const sslCerts = sslData ? extractSslInfo(sslData) : [];
      const sslWarnings = sslCerts.filter(
        (c) => c.status === 'warning' || c.status === 'critical' || c.status === 'expired'
      ).length;

      // Email queue summary
      const emailQueue = emailData ? extractEmailQueueInfo(emailData) : { count: 0 };

      // Backup summary
      const backupJobs = backupData ? extractBackupInfo(backupData) : [];
      const backupFailed = backupJobs.filter((j) => j.disabled).length;

      return {
        id: server.id,
        name: server.name,
        host: server.host,
        type: 'cpanel',
        hasSSH: !!server.sshUsername,
        accessLevel: server.accessLevel,
        whmUrl: `https://${server.host}:${server.port}`,
        hostname:
          hostname?.data?.hostname || hostname?.hostname || server.host,
        version:
          version?.data?.version || version?.version || 'Unknown',
        load: {
          one: load?.data?.one || load?.one || '0.00',
          five: load?.data?.five || load?.five || '0.00',
          fifteen: load?.data?.fifteen || load?.fifteen || '0.00',
        },
        disk: diskInfo,
        services: serviceList,
        accounts: accountList.length,
        suspendedAccounts: accountList.filter((a) => a.suspended).length,
        totalDiskUsedMB: Math.round(totalDiskUsedMB),
        sslTotal: sslCerts.length,
        sslWarnings,
        emailQueueSize: emailQueue.count,
        backupJobs: backupJobs.length,
        backupFailed,
        backupAvailable: backupData !== null,
        diskTotalGB: server.diskTotalGB,
        online: true,
      };
    })
  );

  const overview = results.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;
    return {
      id: servers[index].id,
      name: servers[index].name,
      host: servers[index].host,
      type: 'cpanel',
      hasSSH: !!servers[index].sshUsername,
      accessLevel: servers[index].accessLevel,
      whmUrl: `https://${servers[index].host}:${servers[index].port}`,
      online: false,
      error: result.reason?.message || 'Connection failed',
    };
  });

  // Include SSH servers with basic TCP health check
  const sshServers = await getServersByType('ssh');
  const sshResults = await Promise.allSettled(
    sshServers.map(async (server) => {
      const check = await testTcpConnect(server.host, server.port || 22);
      return {
        id: server.id,
        name: server.name,
        host: server.host,
        type: 'ssh',
        online: check.success,
        error: check.success ? null : check.message,
        accessLevel: server.accessLevel,
      };
    })
  );
  const sshOverview = sshResults.map((r, i) =>
    r.status === 'fulfilled' ? r.value : {
      id: sshServers[i].id, name: sshServers[i].name, host: sshServers[i].host,
      type: 'ssh', online: false, error: r.reason?.message || 'Check failed', accessLevel: sshServers[i].accessLevel,
    }
  );

  const allServers = [...overview, ...sshOverview];

  return {
    servers: allServers,
    totalServers: allServers.length,
    onlineServers: allServers.filter((s) => s.online).length,
    totalAccounts: overview.reduce((sum, s) => sum + (s.accounts || 0), 0),
    fetchedAt: new Date().toISOString(),
  };
}

router.get('/servers/overview', async (req, res) => {
  try {
    res.json(await collectOverviewData());
  } catch (err) {
    console.error('WHM overview error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Accounts for a single server
router.get('/server/:id/accounts', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  try {
    const data = await whmApiCall(server, 'listaccts');
    res.json({
      serverName: server.name,
      serverId: server.id,
      accounts: extractAccountInfo(data),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Services for a single server
router.get('/server/:id/services', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  try {
    const data = await whmApiCall(server, 'servicestatus');
    res.json({
      serverName: server.name,
      serverId: server.id,
      services: extractServiceInfo(data),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logs for a single server (per-account error logs via cPanel UAPI)
router.get('/server/:id/logs', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  try {
    const acctData = await whmApiCall(server, 'listaccts').catch(() => null);
    const accounts = extractAccountInfo(acctData);

    if (accounts.length === 0) {
      return res.json({ serverName: server.name, serverId: server.id, logs: [], totalErrors: 0, type: 'Error Logs', whmLogUrl: `https://${server.host}:${server.port}` });
    }

    // Fetch error logs for first 10 accounts via cPanel UAPI
    const logResults = await Promise.allSettled(
      accounts.slice(0, 10).map((acct) => {
        const url = `https://${server.host}:${server.port}/json-api/cpanel?cpanel_jsonapi_user=${encodeURIComponent(acct.user)}&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Errors&cpanel_jsonapi_func=listlatest`;
        return new Promise((resolve, reject) => {
          execFile('curl', ['-sk', '--max-time', '8', '-H', `Authorization: whm ${server.user}:${server.token}`, url], { maxBuffer: 2 * 1024 * 1024 }, (err, stdout) => {
            if (err) return reject(err);
            try {
              const parsed = JSON.parse(stdout);
              const entries = parsed?.result?.data || [];
              resolve({ user: acct.user, domain: acct.domain, errors: Array.isArray(entries) ? entries.slice(0, 20) : [] });
            } catch { resolve({ user: acct.user, domain: acct.domain, errors: [] }); }
          });
        });
      })
    );

    const logs = logResults.filter((r) => r.status === 'fulfilled').map((r) => r.value).filter((r) => r.errors.length > 0);
    const totalErrors = logs.reduce((sum, l) => sum + l.errors.length, 0);

    res.json({ serverName: server.name, serverId: server.id, logs, totalErrors, type: 'Account Error Logs', whmLogUrl: `https://${server.host}:${server.port}` });
  } catch {
    res.json({ serverName: server.name, serverId: server.id, logs: [], totalErrors: 0, error: 'Log access not available via API', whmLogUrl: `https://${server.host}:${server.port}` });
  }
});

// SSL certificates for a single server
router.get('/server/:id/ssl', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  try {
    const data = await whmApiCall(server, 'fetch_ssl_vhosts');
    const certs = extractSslInfo(data);
    const warningCount = certs.filter(
      (c) => c.status === 'warning' || c.status === 'critical' || c.status === 'expired'
    ).length;
    res.json({
      serverName: server.name,
      serverId: server.id,
      certificates: certs,
      totalCerts: certs.length,
      warningCount,
    });
  } catch {
    res.json({
      serverName: server.name,
      serverId: server.id,
      certificates: [],
      totalCerts: 0,
      warningCount: 0,
      error: 'SSL info not available via API',
    });
  }
});

// Email queue for a single server
router.get('/server/:id/email', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  try {
    // Try fetch_mail_queue first, fall back to emailtrack_search
    let data;
    try {
      data = await whmApiCall(server, 'fetch_mail_queue');
      if (data?.metadata?.result === 0) throw new Error('Permission denied');
    } catch {
      data = await whmApiCall(server, 'emailtrack_search');
    }
    const queueInfo = extractEmailQueueInfo(data);
    res.json({
      serverName: server.name,
      serverId: server.id,
      queueSize: queueInfo.count,
      messages: queueInfo.messages,
    });
  } catch {
    res.json({
      serverName: server.name,
      serverId: server.id,
      queueSize: 0,
      messages: [],
      error: 'Email queue not available via API',
    });
  }
});

// JetBackup 5 info for a single server
router.get('/server/:id/backups', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  try {
    const [jobsRes, destRes, schedRes, logsRes] = await Promise.allSettled([
      jetbackupApiCall(server, 'listBackupJobs'),
      jetbackupApiCall(server, 'listDestinations'),
      jetbackupApiCall(server, 'listSchedules'),
      jetbackupApiCall(server, 'listLogs'),
    ]);

    const jobs = jobsRes.status === 'fulfilled' ? extractBackupInfo(jobsRes.value) : [];
    const failedCount = jobs.filter((j) => j.disabled).length;

    // Destinations
    let destinations = [];
    if (destRes.status === 'fulfilled' && destRes.value?.data?.destinations) {
      destinations = destRes.value.data.destinations.map((d) => ({
        name: d.name || '',
        type: d.type_name || d.type || '',
        diskUsage: d.disk_usage?.usage || 0,
        diskTotal: d.disk_usage?.total || 0,
        diskFree: d.disk_usage?.free || 0,
        diskLimitPct: d.disk_limit || 0,
        running: d.running || false,
      }));
    }

    // Schedules
    let schedules = [];
    if (schedRes.status === 'fulfilled' && schedRes.value?.data?.schedules) {
      schedules = schedRes.value.data.schedules.map((s) => ({
        name: s.name || '',
        typeName: s.type_name || '',
        jobs: (s.jobs || []).map((j) => j.name || '').join(', '),
        nextRun: s.type_data || [],
      }));
    }

    // Recent logs (last 20)
    let logs = [];
    if (logsRes.status === 'fulfilled' && logsRes.value?.data?.logs) {
      logs = logsRes.value.data.logs.slice(0, 20).map((l) => ({
        startTime: l.start_time || '',
        endTime: l.end_time || '',
        executionTime: l.execution_time || 0,
        info: l.info || {},
        status: l.status, // 1=success, 4=warning, others=failed
      }));
    }

    res.json({
      serverName: server.name, serverId: server.id,
      jobs, totalJobs: jobs.length, failedCount, available: true,
      destinations, schedules, logs,
    });
  } catch {
    res.json({
      serverName: server.name, serverId: server.id,
      jobs: [], totalJobs: 0, failedCount: 0, available: false,
      destinations: [], schedules: [], logs: [],
      error: 'JetBackup 5 not available on this server',
    });
  }
});

// PHP versions for a single server (uses get_domain_info which includes php_version)
router.get('/server/:id/php', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });
  try {
    const data = await whmApiCall(server, 'get_domain_info');
    const allDomains = data?.data?.domains || [];
    const domains = allDomains
      .filter((d) => d.domain_type === 'main')
      .map((d) => ({
        domain: d.domain || '',
        phpVersion: d.php_version || 'unknown',
        user: d.user || '',
        docroot: d.docroot || '',
      }));
    const versionCounts = {};
    domains.forEach((d) => { versionCounts[d.phpVersion] = (versionCounts[d.phpVersion] || 0) + 1; });
    res.json({ serverName: server.name, serverId: server.id, domains, totalDomains: domains.length, versionCounts });
  } catch {
    res.json({ serverName: server.name, serverId: server.id, domains: [], totalDomains: 0, versionCounts: {}, error: 'PHP version info not available' });
  }
});

// MySQL databases for a single server
router.get('/server/:id/mysql', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });
  try {
    const accounts = await whmApiCall(server, 'listaccts').catch(() => null);
    const accountList = extractAccountInfo(accounts);
    const dbResults = await Promise.allSettled(
      accountList.slice(0, 50).map((acct) => {
        const url = `https://${server.host}:${server.port}/json-api/cpanel?cpanel_jsonapi_user=${encodeURIComponent(acct.user)}&cpanel_jsonapi_apiversion=2&cpanel_jsonapi_module=MysqlFE&cpanel_jsonapi_func=listdbs`;
        return new Promise((resolve, reject) => {
          execFile('curl', ['-sk', '--max-time', '10', '-H', `Authorization: whm ${server.user}:${server.token}`, url], { maxBuffer: 5 * 1024 * 1024 }, (err, stdout) => {
            if (err) return reject(err);
            try {
              const parsed = JSON.parse(stdout);
              const dbs = parsed?.cpanelresult?.data || [];
              resolve({ user: acct.user, domain: acct.domain, databases: dbs.map((d) => ({ name: d.db || d.name || '', size: d.size || d.disk_usage || 0 })) });
            } catch { resolve({ user: acct.user, domain: acct.domain, databases: [] }); }
          });
        });
      })
    );
    const userDbs = dbResults.filter((r) => r.status === 'fulfilled').map((r) => r.value).filter((r) => r.databases.length > 0);
    const totalDbs = userDbs.reduce((sum, u) => sum + u.databases.length, 0);
    res.json({ serverName: server.name, serverId: server.id, users: userDbs, totalDatabases: totalDbs, totalUsers: userDbs.length });
  } catch {
    res.json({ serverName: server.name, serverId: server.id, users: [], totalDatabases: 0, totalUsers: 0, error: 'MySQL info not available' });
  }
});

// DNS zones for a single server
router.get('/server/:id/dns', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const domain = req.query.domain;
  try {
    if (domain) {
      const data = await whmApiCall(server, 'dumpzone', { domain });
      const records = data?.data?.zone?.[0]?.record || [];
      res.json({ serverName: server.name, serverId: server.id, domain, records: Array.isArray(records) ? records : [] });
    } else {
      const data = await whmApiCall(server, 'listzones');
      const zones = data?.data?.zone || [];
      res.json({ serverName: server.name, serverId: server.id, zones: zones.map((z) => ({ domain: z.domain || '', type: z.zonetype || z.type || '' })), totalZones: zones.length });
    }
  } catch {
    res.json({ serverName: server.name, serverId: server.id, zones: [], totalZones: 0, error: 'DNS info not available via API' });
  }
});

// Bandwidth for a single server
router.get('/server/:id/bandwidth', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  try {
    const data = await whmApiCall(server, 'showbw');
    const raw = data?.data || {};
    const accts = raw.acct || data?.bandwidth || [];
    const totalUsed = parseInt(raw.totalused || '0', 10);
    const month = raw.month || new Date().getMonth() + 1;
    const year = raw.year || new Date().getFullYear();

    const list = Array.isArray(accts) ? accts.map((a) => ({
      user: a.user || a.acct || '',
      domain: a.maindomain || a.domain || '',
      owner: a.owner || '',
      bwUsed: parseInt(a.totalbytes || a.totalused || '0', 10),
      bwLimit: a.limit === 'unlimited' ? 0 : parseInt(a.limit || '0', 10),
      domains: Array.isArray(a.bwusage) ? a.bwusage.map((d) => ({
        domain: d.domain || '',
        usage: parseInt(d.usage || '0', 10),
      })).sort((x, y) => y.usage - x.usage) : [],
    })).sort((a, b) => b.bwUsed - a.bwUsed) : [];
    res.json({ serverName: server.name, serverId: server.id, totalUsed, month, year, accounts: list, totalAccounts: list.length });
  } catch {
    res.json({ serverName: server.name, serverId: server.id, totalUsed: 0, month: 0, year: 0, accounts: [], totalAccounts: 0, error: 'Bandwidth info not available via API' });
  }
});

// Packages for a single server
router.get('/server/:id/packages', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  try {
    const data = await whmApiCall(server, 'listpkgs');
    const pkgs = data?.data?.pkg || [];
    const list = Array.isArray(pkgs) ? pkgs.map((p) => ({
      name: p.name || '',
      quota: p.QUOTA || 'unlimited',
      bwLimit: p.BWLIMIT || 'unlimited',
      maxAddon: p.MAXADDON || '0',
      maxSql: p.MAXSQL || '0',
      maxPop: p.MAXPOP || '0',
      maxFtp: p.MAXFTP || '0',
      maxSub: p.MAXSUB || '0',
      maxPark: p.MAXPARK || '0',
      hasShell: p.HASSHELL === 'y',
      cgi: p.CGI === 'y',
      featureList: p.FEATURELIST || 'default',
    })).sort((a, b) => a.name.localeCompare(b.name)) : [];

    res.json({ serverName: server.name, serverId: server.id, packages: list, totalPackages: list.length });
  } catch {
    res.json({ serverName: server.name, serverId: server.id, packages: [], totalPackages: 0, error: 'Package info not available via API' });
  }
});

// Cron jobs for a single server (via cPanel API per account)
router.get('/server/:id/cron', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  try {
    const acctData = await whmApiCall(server, 'listaccts').catch(() => null);
    const accounts = extractAccountInfo(acctData);

    const cronResults = await Promise.allSettled(
      accounts.slice(0, 30).map((acct) => {
        const url = `https://${server.host}:${server.port}/json-api/cpanel?cpanel_jsonapi_user=${encodeURIComponent(acct.user)}&cpanel_jsonapi_apiversion=2&cpanel_jsonapi_module=Cron&cpanel_jsonapi_func=listcron`;
        return new Promise((resolve, reject) => {
          execFile('curl', ['-sk', '--max-time', '8', '-H', `Authorization: whm ${server.user}:${server.token}`, url], { maxBuffer: 2 * 1024 * 1024 }, (err, stdout) => {
            if (err) return reject(err);
            try {
              const parsed = JSON.parse(stdout);
              const jobs = parsed?.cpanelresult?.data || [];
              resolve({ user: acct.user, domain: acct.domain, crons: jobs.map((c) => ({ command: c.command || '', minute: c.minute || '*', hour: c.hour || '*', day: c.day || '*', month: c.month || '*', weekday: c.weekday || '*' })) });
            } catch { resolve({ user: acct.user, domain: acct.domain, crons: [] }); }
          });
        });
      })
    );

    const users = cronResults.filter((r) => r.status === 'fulfilled').map((r) => r.value).filter((r) => r.crons.length > 0);
    const totalCrons = users.reduce((sum, u) => sum + u.crons.length, 0);
    res.json({ serverName: server.name, serverId: server.id, users, totalCrons, totalUsers: users.length });
  } catch {
    res.json({ serverName: server.name, serverId: server.id, users: [], totalCrons: 0, totalUsers: 0, error: 'Cron info not available via API' });
  }
});

// Port scan for a single server
const COMMON_PORTS = [
  { port: 21, name: 'FTP', protocol: 'tcp', category: 'file' },
  { port: 22, name: 'SSH', protocol: 'tcp', category: 'admin' },
  { port: 25, name: 'SMTP', protocol: 'tcp', category: 'email' },
  { port: 53, name: 'DNS', protocol: 'tcp', category: 'dns' },
  { port: 80, name: 'HTTP', protocol: 'tcp', category: 'web' },
  { port: 110, name: 'POP3', protocol: 'tcp', category: 'email' },
  { port: 143, name: 'IMAP', protocol: 'tcp', category: 'email' },
  { port: 443, name: 'HTTPS', protocol: 'tcp', category: 'web' },
  { port: 465, name: 'SMTPS', protocol: 'tcp', category: 'email' },
  { port: 587, name: 'Submission', protocol: 'tcp', category: 'email' },
  { port: 993, name: 'IMAPS', protocol: 'tcp', category: 'email' },
  { port: 995, name: 'POP3S', protocol: 'tcp', category: 'email' },
  { port: 2077, name: 'WebDAV SSL', protocol: 'tcp', category: 'cpanel' },
  { port: 2078, name: 'WebDAV', protocol: 'tcp', category: 'cpanel' },
  { port: 2082, name: 'cPanel', protocol: 'tcp', category: 'cpanel' },
  { port: 2083, name: 'cPanel SSL', protocol: 'tcp', category: 'cpanel' },
  { port: 2086, name: 'WHM', protocol: 'tcp', category: 'cpanel' },
  { port: 2087, name: 'WHM SSL', protocol: 'tcp', category: 'cpanel' },
  { port: 2095, name: 'Webmail', protocol: 'tcp', category: 'cpanel' },
  { port: 2096, name: 'Webmail SSL', protocol: 'tcp', category: 'cpanel' },
  { port: 3306, name: 'MySQL', protocol: 'tcp', category: 'database' },
  { port: 8080, name: 'HTTP Alt', protocol: 'tcp', category: 'web' },
  { port: 8443, name: 'HTTPS Alt', protocol: 'tcp', category: 'web' },
];

function checkPort(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      resolved = true;
      socket.destroy();
      resolve({ port, open: true });
    });
    socket.on('timeout', () => {
      if (!resolved) { resolved = true; socket.destroy(); resolve({ port, open: false }); }
    });
    socket.on('error', () => {
      if (!resolved) { resolved = true; socket.destroy(); resolve({ port, open: false }); }
    });
    socket.connect(port, host);
  });
}

router.get('/server/:id/ports', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  try {
    const results = await Promise.all(
      COMMON_PORTS.map(async (p) => {
        const result = await checkPort(server.host, p.port);
        return { ...p, open: result.open };
      })
    );

    const openPorts = results.filter((p) => p.open);
    const closedPorts = results.filter((p) => !p.open);

    res.json({
      serverName: server.name,
      serverId: server.id,
      host: server.host,
      ports: results,
      openCount: openPorts.length,
      closedCount: closedPorts.length,
      totalScanned: results.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── IP Blacklist (RBL) Check ──
const RBL_PROVIDERS = [
  { name: 'Spamhaus ZEN', host: 'zen.spamhaus.org' },
  { name: 'Barracuda', host: 'b.barracudacentral.org' },
  { name: 'SpamCop', host: 'bl.spamcop.net' },
  { name: 'SORBS', host: 'dnsbl.sorbs.net' },
  { name: 'UCEPROTECT L1', host: 'dnsbl-1.uceprotect.net' },
  { name: 'Spamhaus SBL', host: 'sbl.spamhaus.org' },
  { name: 'CBL', host: 'cbl.abuseat.org' },
  { name: 'PSBL', host: 'psbl.surriel.com' },
];

async function checkRbl(ip, rblHost) {
  const reversed = ip.split('.').reverse().join('.');
  try {
    const result = await dnsResolve4(`${reversed}.${rblHost}`);
    return { listed: true, result: result[0] };
  } catch {
    return { listed: false };
  }
}

router.get('/server/:id/blacklist', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const cacheKey = `${server.id}:blacklist`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 300000) return res.json(cached.data);

  try {
    // Resolve hostname to IP first
    let ip = server.host;
    try {
      const ips = await dnsResolve4(server.host);
      if (ips.length > 0) ip = ips[0];
    } catch { /* use hostname as-is if already an IP */ }

    const results = await Promise.allSettled(
      RBL_PROVIDERS.map(async (provider) => {
        const check = await checkRbl(ip, provider.host);
        return { provider: provider.name, host: provider.host, listed: check.listed, result: check.result || null };
      })
    );

    const checks = results.map((r) => r.status === 'fulfilled' ? r.value : { provider: 'Unknown', host: '', listed: false, error: true });
    const listedCount = checks.filter((c) => c.listed).length;
    const data = { serverName: server.name, serverId: server.id, ip, checks, listedCount, totalProviders: checks.length };
    cache.set(cacheKey, { data, ts: Date.now() });
    res.json(data);
  } catch (err) {
    res.json({ serverName: server.name, serverId: server.id, ip: server.host, checks: [], listedCount: 0, totalProviders: 0, error: err.message });
  }
});

// ── SPF/DKIM/DMARC Check ──
async function checkDnsRecord(domain, type) {
  try {
    let queryDomain = domain;
    if (type === 'dkim') queryDomain = `default._domainkey.${domain}`;
    else if (type === 'dmarc') queryDomain = `_dmarc.${domain}`;

    const records = await dnsResolveTxt(queryDomain);
    if (type === 'spf') {
      const spfRecord = records.find((r) => r.join('').startsWith('v=spf1'));
      return { found: !!spfRecord, record: spfRecord ? spfRecord.join('') : null };
    }
    if (type === 'dkim') {
      const dkimRecord = records.find((r) => r.join('').includes('v=DKIM1'));
      return { found: !!dkimRecord, record: dkimRecord ? dkimRecord.join('').substring(0, 80) + '...' : null };
    }
    if (type === 'dmarc') {
      const dmarcRecord = records.find((r) => r.join('').startsWith('v=DMARC1'));
      return { found: !!dmarcRecord, record: dmarcRecord ? dmarcRecord.join('') : null };
    }
    return { found: false };
  } catch {
    return { found: false };
  }
}

router.get('/server/:id/emailauth', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const cacheKey = `${server.id}:emailauth`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 300000) return res.json(cached.data);

  try {
    const domainData = await whmApiCall(server, 'get_domain_info').catch(() => null);
    const allDomains = domainData?.data?.domains || [];
    const mainDomains = allDomains.filter((d) => d.domain_type === 'main').slice(0, 30);

    const results = await Promise.allSettled(
      mainDomains.map(async (d) => {
        const [spf, dkim, dmarc] = await Promise.all([
          checkDnsRecord(d.domain, 'spf'),
          checkDnsRecord(d.domain, 'dkim'),
          checkDnsRecord(d.domain, 'dmarc'),
        ]);
        return { domain: d.domain, user: d.user || '', spf, dkim, dmarc };
      })
    );

    const domains = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    const spfCount = domains.filter((d) => d.spf.found).length;
    const dkimCount = domains.filter((d) => d.dkim.found).length;
    const dmarcCount = domains.filter((d) => d.dmarc.found).length;

    const data = { serverName: server.name, serverId: server.id, domains, totalDomains: domains.length, spfCount, dkimCount, dmarcCount };
    cache.set(cacheKey, { data, ts: Date.now() });
    res.json(data);
  } catch (err) {
    res.json({ serverName: server.name, serverId: server.id, domains: [], totalDomains: 0, spfCount: 0, dkimCount: 0, dmarcCount: 0, error: err.message });
  }
});

// ── Security (Services + 2FA) ──
const SECURITY_SERVICES = [
  { name: 'cphulkd', label: 'cPHulk Brute Force', icon: 'shield' },
  { name: 'clamd', label: 'ClamAV Antivirus', icon: 'bug' },
  { name: 'spamd', label: 'SpamAssassin', icon: 'mail' },
  { name: 'lfd', label: 'CSF/LFD Firewall', icon: 'firewall' },
  { name: 'sshd', label: 'SSH Daemon', icon: 'terminal' },
  { name: 'ftpd', label: 'FTP Server', icon: 'folder' },
  { name: 'exim', label: 'Exim Mail Server', icon: 'mail' },
  { name: 'named', label: 'DNS Server', icon: 'globe' },
  { name: 'httpd', label: 'Apache HTTP', icon: 'server' },
  { name: 'nginx', label: 'Nginx', icon: 'server' },
  { name: 'mysql', label: 'MySQL Database', icon: 'database' },
  { name: 'cpanel_php_fpm', label: 'PHP-FPM', icon: 'code' },
];

router.get('/server/:id/security', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  try {
    const [serviceData, tfaData] = await Promise.allSettled([
      whmApiCall(server, 'servicestatus'),
      whmApiCall(server, 'twofactorauth_policy_status'),
    ]);

    // Parse services
    let services = [];
    if (serviceData.status === 'fulfilled' && serviceData.value?.data?.service) {
      const allSvcs = serviceData.value.data.service;
      for (const def of SECURITY_SERVICES) {
        const svc = allSvcs.find((s) => s.name === def.name);
        if (svc) {
          services.push({
            name: def.name,
            label: def.label,
            icon: def.icon,
            running: svc.running === 1 || svc.running === '1',
            enabled: svc.enabled === 1 || svc.enabled === '1',
            monitored: svc.monitored === 1 || svc.monitored === '1',
          });
        }
      }
    }

    // Parse 2FA
    let twoFactor = { available: false, enabled: false };
    if (tfaData.status === 'fulfilled' && tfaData.value?.data) {
      twoFactor = { available: true, enabled: tfaData.value.data.is_enabled === '1' || tfaData.value.data.is_enabled === 1 };
    }

    const runningCount = services.filter((s) => s.running).length;
    const stoppedCount = services.filter((s) => s.enabled && !s.running).length;

    res.json({
      serverName: server.name, serverId: server.id,
      services, totalServices: services.length, runningCount, stoppedCount,
      twoFactor,
    });
  } catch {
    res.json({
      serverName: server.name, serverId: server.id,
      services: [], totalServices: 0, runningCount: 0, stoppedCount: 0,
      twoFactor: { available: false, enabled: false },
      error: 'Security info not available',
    });
  }
});

// Exported: collect pulse data directly (used by server.js background task)
export async function collectPulseData() {
  const servers = await loadServers();
  const results = await Promise.allSettled(
    servers.map(async (server) => {
      const start = Date.now();
      try {
        await new Promise((resolve, reject) => {
          execFile(
            'curl',
            ['-sk', '--max-time', '5', '-H', `Authorization: whm ${server.user}:${server.token}`, `https://${server.host}:${server.port}/json-api/version?api.version=1`],
            { maxBuffer: 1024 * 1024 },
            (err, stdout) => {
              if (err) return reject(err);
              resolve(stdout);
            }
          );
        });
        const responseTime = Date.now() - start;
        return { id: server.id, name: server.name, responseTime, online: true };
      } catch {
        return { id: server.id, name: server.name, responseTime: Date.now() - start, online: false };
      }
    })
  );

  const pulse = results.map((r) => r.status === 'fulfilled' ? r.value : { id: 0, name: 'Unknown', responseTime: 5000, online: false });
  return { servers: pulse, timestamp: Date.now() };
}

// Pulse: lightweight ping to measure server response time
router.get('/servers/pulse', async (req, res) => {
  res.json(await collectPulseData());
});

// All accounts across all servers
router.get('/accounts/all', async (req, res) => {
  const servers = await loadServers();
  const results = await Promise.allSettled(
    servers.map(async (server) => {
      const data = await whmApiCall(server, 'listaccts');
      return extractAccountInfo(data).map((a) => ({
        ...a,
        serverName: server.name,
        serverId: server.id,
      }));
    })
  );
  const allAccounts = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);
  res.json({ accounts: allAccounts, total: allAccounts.length });
});

// Create cPanel login session for a user
router.get('/server/:id/login/:user', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });
  try {
    const data = await whmApiCall(server, 'create_user_session', {
      user: req.params.user,
      service: 'cpaneld',
    });
    const url = data?.data?.url;
    if (url) {
      res.json({ url });
    } else {
      res.status(500).json({ error: 'Could not create session' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search accounts across all servers
router.get('/accounts/search', async (req, res) => {
  const query = (req.query.q || '').toLowerCase().trim();
  if (!query || query.length < 2) {
    return res.json({ results: [], query: '', totalMatches: 0 });
  }

  const servers = await loadServers();
  const results = await Promise.allSettled(
    servers.map(async (server) => {
      const data = await whmApiCall(server, 'listaccts');
      const accounts = extractAccountInfo(data);
      return accounts
        .filter(
          (a) =>
            a.domain.toLowerCase().includes(query) ||
            a.user.toLowerCase().includes(query) ||
            a.email.toLowerCase().includes(query)
        )
        .map((a) => ({
          ...a,
          serverName: server.name,
          serverId: server.id,
          serverHost: server.host,
          serverPort: server.port,
        }));
    })
  );

  const allMatches = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  res.json({
    results: allMatches,
    query,
    totalMatches: allMatches.length,
  });
});

// ── Uptime & Load History (reads from persistent JSON files) ──
const UPTIME_FILE = join(__dirname, '..', 'data', 'uptime.json');
const LOAD_FILE = join(__dirname, '..', 'data', 'loadhistory.json');

function computeUptimePercent(samples, hoursBack) {
  const cutoff = Date.now() - hoursBack * 3600000;
  const recent = samples.filter((s) => s.ts > cutoff);
  if (recent.length === 0) return null;
  const onlineCount = recent.filter((s) => s.online).length;
  return (onlineCount / recent.length) * 100;
}

router.get('/servers/uptime', async (req, res) => {
  try {
    const store = await readStore(UPTIME_FILE);
    const servers = await loadServers();
    const result = servers.map((s) => {
      const data = store.servers?.[s.id];
      const samples = data?.samples || [];
      return {
        id: s.id,
        name: s.name,
        uptime24h: computeUptimePercent(samples, 24),
        uptime7d: computeUptimePercent(samples, 168),
        uptime30d: computeUptimePercent(samples, 720),
        totalSamples: samples.length,
      };
    });
    res.json({ servers: result });
  } catch {
    res.json({ servers: [] });
  }
});

// Bandwidth overview across all servers
router.get('/servers/bandwidth', async (req, res) => {
  try {
    const servers = await loadServers();
    const results = await Promise.allSettled(
      servers.map(async (server) => {
        const data = await whmApiCall(server, 'showbw');
        const raw = data?.data || {};
        return {
          id: server.id,
          name: server.name,
          totalUsed: parseInt(raw.totalused || '0', 10),
          month: raw.month || new Date().getMonth() + 1,
          year: raw.year || new Date().getFullYear(),
          accountCount: Array.isArray(raw.acct) ? raw.acct.length : 0,
        };
      })
    );
    const serverBw = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return { id: servers[i].id, name: servers[i].name, totalUsed: 0, month: 0, year: 0, accountCount: 0 };
    });
    const grandTotal = serverBw.reduce((sum, s) => sum + s.totalUsed, 0);
    res.json({ servers: serverBw, grandTotal });
  } catch (err) {
    res.json({ servers: [], grandTotal: 0, error: err.message });
  }
});

router.get('/server/:id/loadhistory', async (req, res) => {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  try {
    const store = await readStore(LOAD_FILE);
    const data = store.servers?.[server.id];
    const samples = data?.samples || [];
    res.json({ serverName: server.name, serverId: server.id, samples });
  } catch {
    res.json({ serverName: server.name, serverId: server.id, samples: [] });
  }
});

// Helper for future write endpoints: ensures server has readwrite access level
export async function requireWriteAccess(serverId) {
  const server = await getServerByIdFromStore(serverId);
  if (!server) throw new Error('Server not found');
  if ((server.accessLevel || 'readonly') !== 'readwrite')
    throw new Error('Server is read-only. Change access level in Settings.');
  return server;
}

export default router;
