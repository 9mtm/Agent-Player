import { Router } from 'express';
import { Client } from 'ssh2';
import { WebSocketServer } from 'ws';
import { URL } from 'url';
import multer from 'multer';
import { getServerById } from '../utils/serverStore.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ── SSH Connection Pool for SFTP ──
const sftpPool = new Map();
const SFTP_IDLE_TIMEOUT = 300000; // 5 minutes

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of sftpPool) {
    if (entry.refCount === 0 && now - entry.lastUsed > SFTP_IDLE_TIMEOUT) {
      entry.conn.end();
      sftpPool.delete(id);
    }
  }
}, 60000);

// ── Security Middleware ──
// Allows any server type that has SSH credentials configured
async function requireSSHCapable(req, res, next) {
  const server = await getServerById(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });
  if (server.enabled === false) return res.status(400).json({ error: 'Server disabled' });
  // Accept dedicated SSH servers OR any server with sshUsername configured
  if (server.type !== 'ssh' && !server.sshUsername) {
    return res.status(400).json({ error: 'SSH not configured for this server' });
  }
  req.sshServer = server;
  next();
}

function requireWriteAccess(req, res, next) {
  if (req.sshServer.accessLevel !== 'readwrite') {
    return res.status(403).json({ error: 'Write access required' });
  }
  next();
}

// ── SFTP Connection Helper ──
// Supports both dedicated SSH servers (direct fields) and cross-type SSH (ssh-prefixed fields)
function buildSSHConfig(server) {
  const isDedicatedSSH = server.type === 'ssh';
  const config = {
    host: isDedicatedSSH ? server.host : (server.sshHost || server.host),
    port: isDedicatedSSH ? (server.port || 22) : (server.sshPort || 22),
    username: isDedicatedSSH ? server.username : server.sshUsername,
    readyTimeout: 10000,
  };
  if (isDedicatedSSH) {
    if (server.authType === 'key' && server.privateKey) {
      config.privateKey = server.privateKey;
      if (server.passphrase) config.passphrase = server.passphrase;
    } else if (server.password) {
      config.password = server.password;
    }
  } else {
    if (server.sshAuthType === 'key' && server.sshPrivateKey) {
      config.privateKey = server.sshPrivateKey;
      if (server.sshPassphrase) config.passphrase = server.sshPassphrase;
    } else if (server.sshPassword) {
      config.password = server.sshPassword;
    }
  }
  return config;
}

async function getSFTP(server) {
  if (sftpPool.has(server.id)) {
    const entry = sftpPool.get(server.id);
    entry.lastUsed = Date.now();
    entry.refCount++;
    return entry.sftp;
  }

  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) { conn.end(); return reject(err); }
        sftpPool.set(server.id, { conn, sftp, lastUsed: Date.now(), refCount: 1 });
        conn.on('end', () => sftpPool.delete(server.id));
        conn.on('error', () => { sftpPool.delete(server.id); });
        resolve(sftp);
      });
    });
    conn.on('error', reject);
    conn.connect(buildSSHConfig(server));
  });
}

function releaseSFTP(serverId) {
  const entry = sftpPool.get(serverId);
  if (entry) {
    entry.refCount = Math.max(0, entry.refCount - 1);
    entry.lastUsed = Date.now();
  }
}

// Permission string from mode
function modeToString(mode) {
  const types = { 0o120000: 'l', 0o100000: '-', 0o040000: 'd' };
  const type = types[mode & 0o170000] || '?';
  const rwx = (m) => [(m & 4) ? 'r' : '-', (m & 2) ? 'w' : '-', (m & 1) ? 'x' : '-'].join('');
  return type + rwx((mode >> 6) & 7) + rwx((mode >> 3) & 7) + rwx(mode & 7);
}

// ── SFTP REST Endpoints ──

// List directory
router.get('/:id/sftp/list', requireSSHCapable, async (req, res) => {
  try {
    const sftp = await getSFTP(req.sshServer);
    const dirPath = req.query.path || '/';

    const list = await new Promise((resolve, reject) => {
      sftp.readdir(dirPath, (err, entries) => {
        if (err) return reject(err);
        resolve(entries);
      });
    });

    const entries = list
      .filter((e) => e.filename !== '.' && e.filename !== '..')
      .map((e) => ({
        name: e.filename,
        type: (e.attrs.mode & 0o170000) === 0o040000 ? 'directory'
          : (e.attrs.mode & 0o170000) === 0o120000 ? 'symlink' : 'file',
        size: e.attrs.size,
        modifyTime: e.attrs.mtime,
        permissions: modeToString(e.attrs.mode),
        mode: '0' + (e.attrs.mode & 0o7777).toString(8),
        owner: e.attrs.uid,
        group: e.attrs.gid,
      }));

    releaseSFTP(req.sshServer.id);
    res.json({ path: dirPath, entries });
  } catch (err) {
    releaseSFTP(req.sshServer.id);
    res.status(500).json({ error: err.message });
  }
});

// Stat a path
router.get('/:id/sftp/stat', requireSSHCapable, async (req, res) => {
  try {
    const sftp = await getSFTP(req.sshServer);
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'path required' });

    const stats = await new Promise((resolve, reject) => {
      sftp.stat(filePath, (err, s) => err ? reject(err) : resolve(s));
    });

    releaseSFTP(req.sshServer.id);
    res.json({
      type: (stats.mode & 0o170000) === 0o040000 ? 'directory' : 'file',
      size: stats.size,
      modifyTime: stats.mtime,
      accessTime: stats.atime,
      permissions: modeToString(stats.mode),
      owner: stats.uid,
      group: stats.gid,
    });
  } catch (err) {
    releaseSFTP(req.sshServer.id);
    res.status(500).json({ error: err.message });
  }
});

// Read file content (for editor, max 2MB)
router.get('/:id/sftp/read', requireSSHCapable, async (req, res) => {
  try {
    const sftp = await getSFTP(req.sshServer);
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'path required' });

    // Check size first
    const stats = await new Promise((resolve, reject) => {
      sftp.stat(filePath, (err, s) => err ? reject(err) : resolve(s));
    });
    if (stats.size > 2 * 1024 * 1024) {
      releaseSFTP(req.sshServer.id);
      return res.status(400).json({ error: 'File too large (max 2MB)' });
    }

    const chunks = [];
    const stream = sftp.createReadStream(filePath);
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => {
      releaseSFTP(req.sshServer.id);
      const content = Buffer.concat(chunks).toString('utf-8');
      res.json({ content, size: stats.size, encoding: 'utf-8' });
    });
    stream.on('error', (err) => {
      releaseSFTP(req.sshServer.id);
      res.status(500).json({ error: err.message });
    });
  } catch (err) {
    releaseSFTP(req.sshServer.id);
    res.status(500).json({ error: err.message });
  }
});

// Download file (stream)
router.get('/:id/sftp/download', requireSSHCapable, async (req, res) => {
  try {
    const sftp = await getSFTP(req.sshServer);
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'path required' });

    const filename = filePath.split('/').pop();
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    const stream = sftp.createReadStream(filePath);
    stream.on('end', () => releaseSFTP(req.sshServer.id));
    stream.on('error', (err) => {
      releaseSFTP(req.sshServer.id);
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });
    stream.pipe(res);
  } catch (err) {
    releaseSFTP(req.sshServer.id);
    res.status(500).json({ error: err.message });
  }
});

// Write file content (from editor)
router.put('/:id/sftp/write', requireSSHCapable, requireWriteAccess, async (req, res) => {
  try {
    const sftp = await getSFTP(req.sshServer);
    const { path: filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: 'path required' });

    const stream = sftp.createWriteStream(filePath);
    stream.on('close', () => {
      releaseSFTP(req.sshServer.id);
      res.json({ success: true });
    });
    stream.on('error', (err) => {
      releaseSFTP(req.sshServer.id);
      res.status(500).json({ error: err.message });
    });
    stream.end(Buffer.from(content, 'utf-8'));
  } catch (err) {
    releaseSFTP(req.sshServer.id);
    res.status(500).json({ error: err.message });
  }
});

// Upload file
router.post('/:id/sftp/upload', requireSSHCapable, requireWriteAccess, upload.single('file'), async (req, res) => {
  try {
    const sftp = await getSFTP(req.sshServer);
    const destPath = req.query.destPath || '/';
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const remotePath = destPath.replace(/\/$/, '') + '/' + req.file.originalname;
    const stream = sftp.createWriteStream(remotePath);
    stream.on('close', () => {
      releaseSFTP(req.sshServer.id);
      res.json({ success: true, name: req.file.originalname, size: req.file.size });
    });
    stream.on('error', (err) => {
      releaseSFTP(req.sshServer.id);
      res.status(500).json({ error: err.message });
    });
    stream.end(req.file.buffer);
  } catch (err) {
    releaseSFTP(req.sshServer.id);
    res.status(500).json({ error: err.message });
  }
});

// Delete file/directory
router.delete('/:id/sftp/delete', requireSSHCapable, requireWriteAccess, async (req, res) => {
  try {
    const sftp = await getSFTP(req.sshServer);
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'path required' });

    // Check if it's a directory
    const stats = await new Promise((resolve, reject) => {
      sftp.stat(filePath, (err, s) => err ? reject(err) : resolve(s));
    });

    if ((stats.mode & 0o170000) === 0o040000) {
      await new Promise((resolve, reject) => {
        sftp.rmdir(filePath, (err) => err ? reject(err) : resolve());
      });
    } else {
      await new Promise((resolve, reject) => {
        sftp.unlink(filePath, (err) => err ? reject(err) : resolve());
      });
    }

    releaseSFTP(req.sshServer.id);
    res.json({ success: true });
  } catch (err) {
    releaseSFTP(req.sshServer.id);
    res.status(500).json({ error: err.message });
  }
});

// Rename/move
router.post('/:id/sftp/rename', requireSSHCapable, requireWriteAccess, async (req, res) => {
  try {
    const sftp = await getSFTP(req.sshServer);
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) return res.status(400).json({ error: 'oldPath and newPath required' });

    await new Promise((resolve, reject) => {
      sftp.rename(oldPath, newPath, (err) => err ? reject(err) : resolve());
    });

    releaseSFTP(req.sshServer.id);
    res.json({ success: true });
  } catch (err) {
    releaseSFTP(req.sshServer.id);
    res.status(500).json({ error: err.message });
  }
});

// Create file
router.post('/:id/sftp/mkfile', requireSSHCapable, requireWriteAccess, async (req, res) => {
  try {
    const sftp = await getSFTP(req.sshServer);
    const { path: filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'path required' });

    await new Promise((resolve, reject) => {
      const stream = sftp.createWriteStream(filePath);
      stream.on('close', resolve);
      stream.on('error', reject);
      stream.end('');
    });

    releaseSFTP(req.sshServer.id);
    res.json({ success: true });
  } catch (err) {
    releaseSFTP(req.sshServer.id);
    res.status(500).json({ error: err.message });
  }
});

// Change permissions
router.post('/:id/sftp/chmod', requireSSHCapable, requireWriteAccess, async (req, res) => {
  try {
    const sftp = await getSFTP(req.sshServer);
    const { path: targetPath, mode } = req.body;
    if (!targetPath || mode === undefined) return res.status(400).json({ error: 'path and mode required' });

    const numMode = parseInt(mode, 8);
    if (isNaN(numMode) || numMode < 0 || numMode > 0o7777) {
      return res.status(400).json({ error: 'Invalid permission mode' });
    }

    await new Promise((resolve, reject) => {
      sftp.chmod(targetPath, numMode, (err) => err ? reject(err) : resolve());
    });

    releaseSFTP(req.sshServer.id);
    res.json({ success: true });
  } catch (err) {
    releaseSFTP(req.sshServer.id);
    res.status(500).json({ error: err.message });
  }
});

// Create directory
router.post('/:id/sftp/mkdir', requireSSHCapable, requireWriteAccess, async (req, res) => {
  try {
    const sftp = await getSFTP(req.sshServer);
    const { path: dirPath } = req.body;
    if (!dirPath) return res.status(400).json({ error: 'path required' });

    await new Promise((resolve, reject) => {
      sftp.mkdir(dirPath, (err) => err ? reject(err) : resolve());
    });

    releaseSFTP(req.sshServer.id);
    res.json({ success: true });
  } catch (err) {
    releaseSFTP(req.sshServer.id);
    res.status(500).json({ error: err.message });
  }
});

// Recursive mkdir (mkdir -p) for sync
router.post('/:id/sftp/mkdirp', requireSSHCapable, requireWriteAccess, async (req, res) => {
  try {
    const { path: dirPath } = req.body;
    if (!dirPath) return res.status(400).json({ error: 'path required' });
    const config = buildSSHConfig(req.sshServer);
    const conn = new Client();
    await new Promise((resolve, reject) => {
      conn.on('ready', () => {
        conn.exec(`mkdir -p "${dirPath}"`, (err, stream) => {
          if (err) { conn.end(); return reject(err); }
          let stderr = '';
          stream.stderr.on('data', (d) => { stderr += d; });
          stream.on('close', (code) => {
            conn.end();
            if (code !== 0) reject(new Error(stderr || `Exit code ${code}`));
            else resolve();
          });
        });
      }).on('error', reject).connect(config);
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Compress files/folders
router.post('/:id/sftp/compress', requireSSHCapable, requireWriteAccess, async (req, res) => {
  try {
    const { paths, destPath } = req.body;
    if (!paths || !Array.isArray(paths) || paths.length === 0 || !destPath) {
      return res.status(400).json({ error: 'paths (array) and destPath required' });
    }
    const config = buildSSHConfig(req.sshServer);
    const conn = new Client();
    await new Promise((resolve, reject) => {
      conn.on('ready', () => {
        const items = paths.map((p) => `"${p}"`).join(' ');
        const cmd = destPath.endsWith('.zip')
          ? `cd / && zip -r "${destPath}" ${items}`
          : `cd / && tar -czf "${destPath}" ${items}`;
        conn.exec(cmd, (err, stream) => {
          if (err) { conn.end(); return reject(err); }
          let stderr = '';
          stream.stderr.on('data', (d) => { stderr += d; });
          stream.on('close', (code) => {
            conn.end();
            if (code !== 0) reject(new Error(stderr || `Exit code ${code}`));
            else resolve();
          });
        });
      }).on('error', reject).connect(config);
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Extract archive
router.post('/:id/sftp/extract', requireSSHCapable, requireWriteAccess, async (req, res) => {
  try {
    const { archivePath, destDir } = req.body;
    if (!archivePath || !destDir) {
      return res.status(400).json({ error: 'archivePath and destDir required' });
    }
    const config = buildSSHConfig(req.sshServer);
    const conn = new Client();
    await new Promise((resolve, reject) => {
      conn.on('ready', () => {
        let cmd;
        if (archivePath.endsWith('.zip')) cmd = `unzip -o "${archivePath}" -d "${destDir}"`;
        else if (archivePath.endsWith('.tar.gz') || archivePath.endsWith('.tgz')) cmd = `tar -xzf "${archivePath}" -C "${destDir}"`;
        else if (archivePath.endsWith('.tar.bz2')) cmd = `tar -xjf "${archivePath}" -C "${destDir}"`;
        else if (archivePath.endsWith('.tar')) cmd = `tar -xf "${archivePath}" -C "${destDir}"`;
        else { conn.end(); return reject(new Error('Unsupported format. Use .zip, .tar.gz, .tar.bz2, or .tar')); }
        conn.exec(cmd, (err, stream) => {
          if (err) { conn.end(); return reject(err); }
          let stderr = '';
          stream.stderr.on('data', (d) => { stderr += d; });
          stream.on('close', (code) => {
            conn.end();
            if (code !== 0) reject(new Error(stderr || `Exit code ${code}`));
            else resolve();
          });
        });
      }).on('error', reject).connect(config);
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Copy files/folders
router.post('/:id/sftp/copy', requireSSHCapable, requireWriteAccess, async (req, res) => {
  try {
    const { paths, destDir } = req.body;
    if (!paths || !Array.isArray(paths) || paths.length === 0 || !destDir) {
      return res.status(400).json({ error: 'paths (array) and destDir required' });
    }
    const config = buildSSHConfig(req.sshServer);
    const conn = new Client();
    await new Promise((resolve, reject) => {
      conn.on('ready', () => {
        const cmds = paths.map((p) => `cp -r "${p}" "${destDir}/"`).join(' && ');
        conn.exec(cmds, (err, stream) => {
          if (err) { conn.end(); return reject(err); }
          let stderr = '';
          stream.stderr.on('data', (d) => { stderr += d; });
          stream.on('close', (code) => {
            conn.end();
            if (code !== 0) reject(new Error(stderr || `Exit code ${code}`));
            else resolve();
          });
        });
      }).on('error', reject).connect(config);
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── WebSocket Terminal Handler ──
export function setupSSHWebSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const match = url.pathname.match(/^\/ws\/ssh\/(\d+)$/);
    if (!match) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.serverId = parseInt(match[1], 10);
      handleSSHTerminal(ws);
    });
  });
}

async function handleSSHTerminal(ws) {
  try {
    const server = await getServerById(ws.serverId);
    const hasSSH = server && (server.type === 'ssh' || server.sshUsername);
    if (!hasSSH || server.accessLevel !== 'readwrite') {
      ws.send(JSON.stringify({ type: 'error', message: 'Access denied or server not found' }));
      ws.close();
      return;
    }

    const conn = new Client();

    conn.on('ready', () => {
      ws.send(JSON.stringify({ type: 'status', status: 'connected' }));

      conn.shell({ term: 'xterm-256color', cols: 80, rows: 24, env: { LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' } }, (err, stream) => {
        if (err) {
          ws.send(JSON.stringify({ type: 'error', message: err.message }));
          ws.close();
          return;
        }

        // SSH stream -> WebSocket
        stream.on('data', (data) => {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'data', data: data.toString('base64') }));
          }
        });

        stream.on('close', () => {
          ws.send(JSON.stringify({ type: 'status', status: 'disconnected' }));
          ws.close();
        });

        // WebSocket -> SSH stream
        ws.on('message', (msg) => {
          try {
            const parsed = JSON.parse(msg);
            if (parsed.type === 'data') {
              stream.write(Buffer.from(parsed.data, 'base64'));
            } else if (parsed.type === 'resize') {
              stream.setWindow(parsed.rows, parsed.cols, 0, 0);
            }
          } catch {
            stream.write(msg);
          }
        });

        ws.on('close', () => {
          stream.close();
          conn.end();
        });
      });
    });

    conn.on('error', (err) => {
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
      ws.close();
    });

    conn.connect(buildSSHConfig(server));
  } catch (err) {
    ws.send(JSON.stringify({ type: 'error', message: err.message }));
    ws.close();
  }
}

export default router;
