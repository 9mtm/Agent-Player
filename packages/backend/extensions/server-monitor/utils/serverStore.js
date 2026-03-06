import { readFile, writeFile, rename } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { encrypt, decrypt, isEncrypted } from './encryption.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVERS_FILE = join(__dirname, '..', 'data', 'servers.json');

// Fields that contain secrets (used for masking in public API responses)
const CREDENTIAL_KEYS = ['token', 'password', 'privateKey', 'apiKey', 'sshPassword', 'sshPrivateKey', 'passphrase', 'sshPassphrase'];

// Only 'id' stays unencrypted (it's a number so encrypt() skips it anyway).
// All string fields — including type, name, host, etc. — are encrypted on disk.
const UNENCRYPTED_KEYS = new Set(['id']);

function getKey() {
  return process.env.ENCRYPTION_KEY || '';
}

let _cache = null;

// Decrypt ALL string fields in a server object (except structural ones)
function decryptServer(server) {
  const key = getKey();
  if (!key) return server;
  const dec = { ...server };
  for (const k of Object.keys(dec)) {
    if (!UNENCRYPTED_KEYS.has(k) && typeof dec[k] === 'string' && isEncrypted(dec[k])) {
      dec[k] = decrypt(dec[k], key);
    }
  }
  return dec;
}

// Encrypt ALL string fields for writing to disk (except structural ones)
function encryptServer(server) {
  const key = getKey();
  if (!key) return server;
  const enc = { ...server };
  for (const k of Object.keys(enc)) {
    if (!UNENCRYPTED_KEYS.has(k) && typeof enc[k] === 'string' && enc[k] && !isEncrypted(enc[k])) {
      enc[k] = encrypt(enc[k], key);
    }
  }
  return enc;
}

async function read() {
  if (_cache) return _cache;
  try {
    if (!existsSync(SERVERS_FILE)) return { nextId: 1, servers: [] };
    const raw = await readFile(SERVERS_FILE, 'utf8');
    const store = JSON.parse(raw);
    // Decrypt sensitive fields into cache
    store.servers = store.servers.map(decryptServer);
    _cache = store;
    return _cache;
  } catch {
    return { nextId: 1, servers: [] };
  }
}

async function write(data) {
  // Encrypt sensitive fields before writing to disk
  const toWrite = {
    ...data,
    servers: data.servers.map(encryptServer),
  };
  const tmp = SERVERS_FILE + '.tmp';
  await writeFile(tmp, JSON.stringify(toWrite, null, 2), 'utf8');
  await rename(tmp, SERVERS_FILE);
  _cache = data; // cache holds decrypted data
}

// Re-encrypt all servers (used after generating a new key or to encrypt existing plaintext)
export async function reEncryptAll() {
  const key = getKey();
  if (!key) return;
  if (!existsSync(SERVERS_FILE)) return;
  const raw = await readFile(SERVERS_FILE, 'utf8');
  const store = JSON.parse(raw);
  // Decrypt any already-encrypted fields, then re-encrypt all
  store.servers = store.servers.map((s) => {
    const dec = decryptServer(s);
    return encryptServer(dec);
  });
  const tmp = SERVERS_FILE + '.tmp';
  await writeFile(tmp, JSON.stringify(store, null, 2), 'utf8');
  await rename(tmp, SERVERS_FILE);
  _cache = null; // clear cache so next read decrypts fresh
}

export function clearCache() {
  _cache = null;
}

export async function getAllServers() {
  const store = await read();
  return store.servers;
}

export async function getServerById(id) {
  const servers = await getAllServers();
  return servers.find((s) => s.id === parseInt(id, 10));
}

export async function addServer(data) {
  const store = await read();
  const server = { ...data, id: store.nextId++, createdAt: new Date().toISOString() };
  if (server.enabled === undefined) server.enabled = true;
  if (!server.accessLevel) server.accessLevel = 'readonly';
  store.servers.push(server);
  await write(store);
  return server;
}

export async function updateServer(id, data) {
  const store = await read();
  const idx = store.servers.findIndex((s) => s.id === parseInt(id, 10));
  if (idx === -1) return null;
  const existing = store.servers[idx];
  // Preserve credential fields if not provided
  for (const key of CREDENTIAL_KEYS) {
    if (existing[key] && (!data[key] || data[key] === '')) {
      data[key] = existing[key];
    }
  }
  store.servers[idx] = { ...existing, ...data, id: existing.id, createdAt: existing.createdAt };
  await write(store);
  return store.servers[idx];
}

export async function deleteServer(id) {
  const store = await read();
  const len = store.servers.length;
  store.servers = store.servers.filter((s) => s.id !== parseInt(id, 10));
  if (store.servers.length === len) return false;
  await write(store);
  return true;
}

// Returns servers with credentials masked (for frontend)
export async function getServersPublic() {
  const servers = await getAllServers();
  return servers.map((s) => {
    const pub = { ...s };
    for (const key of CREDENTIAL_KEYS) {
      if (pub[key]) {
        pub[`has_${key}`] = true;
        delete pub[key];
      }
    }
    return pub;
  });
}

// Returns only cpanel servers with full credentials (for whm.js)
export async function getCpanelServers() {
  const servers = await getAllServers();
  return servers.filter((s) => s.type === 'cpanel' && s.enabled !== false);
}

// Returns servers of a specific type with full credentials
export async function getServersByType(type) {
  const servers = await getAllServers();
  return servers.filter((s) => s.type === type && s.enabled !== false);
}

// Returns all enabled servers that have SSH credentials configured (any type)
export async function getSSHCapableServers() {
  const servers = await getAllServers();
  return servers.filter((s) => s.enabled !== false && (s.type === 'ssh' || s.sshUsername));
}

// Check if a server has SSH capability
export function serverHasSSH(server) {
  return server.type === 'ssh' || !!server.sshUsername;
}

// One-time migration from .env WHM_SERVER_* entries to servers.json
export async function migrateFromEnv() {
  if (existsSync(SERVERS_FILE)) return; // Already migrated
  const servers = [];
  let nextId = 1;
  for (let i = 1; ; i++) {
    const host = process.env[`WHM_SERVER_${i}_HOST`];
    if (!host) break;
    servers.push({
      id: nextId++,
      type: 'cpanel',
      name: process.env[`WHM_SERVER_${i}_NAME`] || `Server ${i}`,
      host,
      port: parseInt(process.env[`WHM_SERVER_${i}_PORT`] || '2087', 10),
      token: process.env[`WHM_SERVER_${i}_TOKEN`] || '',
      user: process.env[`WHM_SERVER_${i}_USER`] || 'root',
      diskTotalGB: parseInt(process.env[`WHM_SERVER_${i}_DISK_GB`] || '0', 10) || 0,
      enabled: true,
      createdAt: new Date().toISOString(),
    });
  }
  await write({ nextId, servers });
  console.log(`Migrated ${servers.length} servers from .env to servers.json`);
}
