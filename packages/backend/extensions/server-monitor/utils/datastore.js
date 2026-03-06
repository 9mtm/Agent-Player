import { readFile, writeFile, rename } from 'fs/promises';
import { existsSync } from 'fs';

function emptyStore() {
  return { servers: {}, lastCleanup: Date.now() };
}

export async function readStore(filePath) {
  try {
    if (!existsSync(filePath)) return emptyStore();
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return emptyStore();
  }
}

export async function writeStore(filePath, data) {
  const tmp = filePath + '.tmp';
  await writeFile(tmp, JSON.stringify(data), 'utf8');
  await rename(tmp, filePath);
}

export async function appendSample(filePath, serverId, sample) {
  const store = await readStore(filePath);
  if (!store.servers[serverId]) store.servers[serverId] = { samples: [] };
  store.servers[serverId].samples.push(sample);

  // Keep max 43200 samples per server (~30 days at 1/min)
  if (store.servers[serverId].samples.length > 43200) {
    store.servers[serverId].samples = store.servers[serverId].samples.slice(-43200);
  }

  await writeStore(filePath, store);
}

export async function cleanupOldEntries(filePath, maxAgeDays) {
  const store = await readStore(filePath);
  // Only cleanup once per day
  if (Date.now() - (store.lastCleanup || 0) < 86400000) return;

  const cutoff = Date.now() - maxAgeDays * 86400000;
  for (const sid of Object.keys(store.servers)) {
    store.servers[sid].samples = (store.servers[sid].samples || []).filter((s) => s.ts > cutoff);
  }
  store.lastCleanup = Date.now();
  await writeStore(filePath, store);
}
