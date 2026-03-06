import { Router } from 'express';
import { readFile, writeFile } from 'fs/promises';
import { execFile } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  getServersPublic, getServerById, addServer, updateServer,
  deleteServer, clearCache,
} from '../utils/serverStore.js';
import { clearWhmCache } from './whm.js';
import { testTcpConnect } from '../utils/network.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

const REQUIRED_FIELDS = {
  cpanel:      ['name', 'host', 'token'],
  ssh:         ['name', 'host', 'username', 'authType'],
  plesk:       ['name', 'host', 'apiKey'],
  directadmin: ['name', 'host', 'username', 'password'],
  cyberpanel:  ['name', 'host', 'apiKey'],
  hestiacp:    ['name', 'host', 'username', 'password'],
  proxmox:     ['name', 'host', 'username', 'password'],
  uptime:      ['name', 'url'],
};

const VALID_TYPES = Object.keys(REQUIRED_FIELDS);

// ── GET /api/settings ──
router.get('/', async (req, res) => {
  try {
    const servers = await getServersPublic();
    res.json({
      site: { name: process.env.SITE_NAME || '' },
      servers,
      serverTypes: VALID_TYPES,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/settings/site ──
router.put('/site', async (req, res) => {
  try {
    const { name } = req.body;
    if (typeof name !== 'string') return res.status(400).json({ error: 'name required' });

    const envPath = join(__dirname, '..', '.env');
    let envContent = await readFile(envPath, 'utf8');

    if (envContent.match(/^SITE_NAME=.*/m)) {
      envContent = envContent.replace(/^SITE_NAME=.*/m, `SITE_NAME=${name}`);
    } else {
      envContent = `SITE_NAME=${name}\n${envContent}`;
    }

    await writeFile(envPath, envContent, 'utf8');
    process.env.SITE_NAME = name;

    res.json({ success: true, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/settings/servers ──
router.get('/servers', async (req, res) => {
  try {
    res.json(await getServersPublic());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/settings/servers ──
router.post('/servers', async (req, res) => {
  try {
    const { type } = req.body;
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Valid: ${VALID_TYPES.join(', ')}` });
    }

    const required = REQUIRED_FIELDS[type];
    for (const field of required) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    // Validate accessLevel
    if (req.body.accessLevel && !['readonly', 'readwrite'].includes(req.body.accessLevel)) {
      return res.status(400).json({ error: 'Invalid accessLevel' });
    }
    if (!req.body.accessLevel) req.body.accessLevel = 'readonly';

    // Set defaults
    if (type === 'cpanel' && !req.body.port) req.body.port = 2087;
    if (type === 'cpanel' && !req.body.user) req.body.user = 'root';
    if (type === 'ssh' && !req.body.port) req.body.port = 22;
    if (type === 'plesk' && !req.body.port) req.body.port = 8443;
    if (type === 'directadmin' && !req.body.port) req.body.port = 2222;
    if (type === 'cyberpanel' && !req.body.port) req.body.port = 8090;
    if (type === 'hestiacp' && !req.body.port) req.body.port = 8083;
    if (type === 'proxmox' && !req.body.port) req.body.port = 8006;
    if (type === 'uptime' && !req.body.method) req.body.method = 'GET';
    if (type === 'uptime' && !req.body.expectedStatus) req.body.expectedStatus = 200;
    if (type === 'uptime' && !req.body.interval) req.body.interval = 60;

    // Optional SSH fields — set defaults if sshUsername is provided (cross-type SSH)
    if (req.body.sshUsername) {
      if (!req.body.sshPort) req.body.sshPort = 22;
      if (!req.body.sshAuthType) req.body.sshAuthType = 'password';
    }

    const server = await addServer(req.body);
    clearWhmCache();

    // Return without credentials
    const pub = { ...server };
    ['token', 'password', 'privateKey', 'apiKey', 'sshPassword', 'sshPrivateKey', 'passphrase', 'sshPassphrase'].forEach((k) => {
      if (pub[k]) { pub[`has_${k}`] = true; delete pub[k]; }
    });
    res.json(pub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/settings/servers/:id ──
router.put('/servers/:id', async (req, res) => {
  try {
    const updated = await updateServer(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Server not found' });
    clearWhmCache();

    const pub = { ...updated };
    ['token', 'password', 'privateKey', 'apiKey', 'sshPassword', 'sshPrivateKey', 'passphrase', 'sshPassphrase'].forEach((k) => {
      if (pub[k]) { pub[`has_${k}`] = true; delete pub[k]; }
    });
    res.json(pub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/settings/servers/:id ──
router.delete('/servers/:id', async (req, res) => {
  try {
    const deleted = await deleteServer(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Server not found' });
    clearWhmCache();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/settings/servers/:id/test ──
router.post('/servers/:id/test', async (req, res) => {
  try {
    const server = await getServerById(req.params.id);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const start = Date.now();
    const result = await testServer(server);
    result.responseTime = Date.now() - start;
    res.json(result);
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

async function testServer(server) {
  switch (server.type) {
    case 'cpanel':
      return testCpanel(server);
    case 'uptime':
      return testUptime(server);
    default:
      return testTcpConnect(server.host, server.port || 22);
  }
}

function testCpanel(server) {
  const url = `https://${server.host}:${server.port || 2087}/json-api/version?api.version=1`;
  return new Promise((resolve) => {
    execFile('curl', ['-sk', '--max-time', '8', '-H', `Authorization: whm ${server.user || 'root'}:${server.token}`, url],
      { maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (err) return resolve({ success: false, message: err.message });
        try {
          const data = JSON.parse(stdout);
          if (data.data?.version) {
            resolve({ success: true, message: `cPanel ${data.data.version}` });
          } else {
            resolve({ success: false, message: data.metadata?.reason || 'Unknown error' });
          }
        } catch {
          resolve({ success: false, message: 'Invalid response' });
        }
      }
    );
  });
}

async function testUptime(server) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(server.url, {
      method: server.method || 'GET',
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    const ok = resp.status === (server.expectedStatus || 200);
    return { success: ok, message: `HTTP ${resp.status}` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

export default router;
