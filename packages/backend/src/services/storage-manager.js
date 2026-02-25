/**
 * Storage Manager — unified Cache + CDN system
 *
 * Two zones:
 *   cache/ — temporary, TTL-based (audio, screenshots, web)
 *   cdn/   — persistent, agent-managed (avatars, images, files, data)
 *
 * Storage backend is selected via STORAGE_PROVIDER env var:
 *   local (default) → public/storage/  on disk
 *   s3              → AWS S3 + optional CloudFront
 *   r2              → Cloudflare R2
 *
 * All files are indexed in the `storage_files` SQLite table regardless of provider.
 */
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { getDatabase } from '../db/index.js';
import { getStorageProvider, LocalStorageProvider } from './storage-providers/index.js';
const TTL_MS = {
    session: 0,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    persistent: null,
};
function calcExpiresAt(ttl) {
    const ms = TTL_MS[ttl];
    if (ms === null)
        return null;
    if (ms === 0)
        return new Date(Date.now() + 60 * 1000).toISOString();
    return new Date(Date.now() + ms).toISOString();
}
function rowToFile(row) {
    return {
        id: row.id,
        zone: row.zone,
        category: row.category,
        filename: row.filename,
        filepath: row.filepath,
        originalName: row.original_name ?? undefined,
        mimeType: row.mime_type ?? undefined,
        sizeBytes: row.size_bytes ?? 0,
        description: row.description ?? undefined,
        tags: row.tags ? JSON.parse(row.tags) : [],
        ttl: row.ttl,
        expiresAt: row.expires_at ?? undefined,
        sourceUrl: row.source_url ?? undefined,
        createdBy: row.created_by ?? 'system',
        createdAt: row.created_at,
        lastAccessed: row.last_accessed ?? undefined,
        accessCount: row.access_count ?? 0,
    };
}
export class StorageManager {
    async initialize() {
        const provider = getStorageProvider();
        // For local provider: ensure all directories exist
        if (provider instanceof LocalStorageProvider) {
            const dirs = [
                'cache/audio', 'cache/screenshots', 'cache/web',
                'cdn/avatars', 'cdn/images', 'cdn/files', 'cdn/data',
            ];
            for (const dir of dirs) {
                const absPath = path.join(process.cwd(), 'public', 'storage', dir);
                if (!fs.existsSync(absPath))
                    fs.mkdirSync(absPath, { recursive: true });
            }
        }
        console.log(`[StorageManager] ✅ Ready (provider: ${provider.name})`);
    }
    async save(options) {
        const { zone, category, data, filename: givenFilename, mimeType, description, tags = [], ttl = 'persistent', sourceUrl, createdBy = 'system', } = options;
        const ext = mimeType ? mimeToExt(mimeType) : '';
        const filename = givenFilename ?? `${randomUUID()}${ext}`;
        const key = `${zone}/${category}/${filename}`;
        // Resolve data to Buffer
        let buffer;
        if (typeof data === 'string') {
            if (data.startsWith('data:') || data.startsWith('base64:')) {
                const b64 = data.includes(',') ? data.split(',')[1] : data.replace('base64:', '');
                buffer = Buffer.from(b64, 'base64');
            }
            else if (data.startsWith('http://') || data.startsWith('https://')) {
                buffer = await downloadUrl(data);
            }
            else {
                buffer = Buffer.from(data, 'utf-8');
            }
        }
        else {
            buffer = data;
        }
        const provider = getStorageProvider();
        await provider.put(key, buffer, mimeType);
        const id = randomUUID();
        const expiresAt = calcExpiresAt(ttl);
        const db = getDatabase();
        db.prepare(`
      INSERT INTO storage_files
        (id, zone, category, filename, filepath, mime_type, size_bytes, description,
         tags, ttl, expires_at, source_url, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, zone, category, filename, key, mimeType ?? null, buffer.length, description ?? null, JSON.stringify(tags), ttl, expiresAt ?? null, sourceUrl ?? null, createdBy);
        return this.getById(id);
    }
    /**
     * Index an existing file that lives outside the storage directory
     * (e.g. TTS audio in .data/audio/, browser screenshots).
     * Adds a manifest entry but does NOT move the file.
     */
    async indexExistingFile(options) {
        const { zone, category, filepath, filename: givenFilename, mimeType, description, tags = [], ttl = 'persistent', sourceUrl, createdBy = 'system', } = options;
        const filename = givenFilename ?? path.basename(filepath);
        let sizeBytes = 0;
        try {
            sizeBytes = fs.statSync(filepath).size;
        }
        catch { /* file may not exist yet */ }
        const id = randomUUID();
        const expiresAt = calcExpiresAt(ttl);
        const db = getDatabase();
        db.prepare(`
      INSERT OR IGNORE INTO storage_files
        (id, zone, category, filename, filepath, mime_type, size_bytes, description,
         tags, ttl, expires_at, source_url, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, zone, category, filename, filepath, // store absolute path for externally-managed files
        mimeType ?? null, sizeBytes, description ?? null, JSON.stringify(tags), ttl, expiresAt ?? null, sourceUrl ?? null, createdBy);
        return this.getById(id);
    }
    getById(id) {
        const db = getDatabase();
        const row = db.prepare('SELECT * FROM storage_files WHERE id = ?').get(id);
        if (!row)
            return null;
        db.prepare('UPDATE storage_files SET last_accessed = ?, access_count = access_count + 1 WHERE id = ?')
            .run(new Date().toISOString(), id);
        return rowToFile(row);
    }
    /**
     * Get a readable stream for serving via backend.
     * Returns null if the provider serves the file directly (cloud).
     */
    getStream(id) {
        const file = this.getById(id);
        if (!file)
            return null;
        const provider = getStorageProvider();
        const stream = provider.getReadStream(file.filepath);
        // If cloud provider returns null, check if it's an external file (absolute path)
        if (!stream) {
            if (path.isAbsolute(file.filepath) && fs.existsSync(file.filepath)) {
                return { stream: fs.createReadStream(file.filepath), file };
            }
            return null;
        }
        return { stream, file };
    }
    /**
     * Get the public URL for a file.
     * - Cloud providers return a direct URL (S3/R2/CloudFront)
     * - Local provider returns /api/storage/:id (served by backend)
     */
    getPublicUrl(id) {
        const file = this.getById(id);
        if (!file)
            return `/api/storage/${id}`;
        const provider = getStorageProvider();
        const direct = provider.getDirectUrl(file.filepath);
        return direct ?? `/api/storage/${id}`;
    }
    /** Shorthand — returns /api/storage/:id (used before file is saved) */
    getApiUrl(id) {
        return `/api/storage/${id}`;
    }
    search(query) {
        const db = getDatabase();
        const conditions = [];
        const params = [];
        if (query.zone) {
            conditions.push('zone = ?');
            params.push(query.zone);
        }
        if (query.category) {
            conditions.push('category = ?');
            params.push(query.category);
        }
        if (query.q) {
            conditions.push('(description LIKE ? OR filename LIKE ?)');
            params.push(`%${query.q}%`, `%${query.q}%`);
        }
        if (query.tags?.length) {
            conditions.push(`(${query.tags.map(() => 'tags LIKE ?').join(' OR ')})`);
            for (const t of query.tags)
                params.push(`%"${t}"%`);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = query.limit ?? 20;
        const offset = query.offset ?? 0;
        const rows = db.prepare(`
      SELECT * FROM storage_files ${where}
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
        return rows.map(rowToFile);
    }
    delete(id) {
        const file = this.getById(id);
        if (!file)
            return false;
        const provider = getStorageProvider();
        void provider.remove(file.filepath).catch(() => { });
        // Also try absolute path (for externally indexed files)
        if (path.isAbsolute(file.filepath)) {
            try {
                if (fs.existsSync(file.filepath))
                    fs.unlinkSync(file.filepath);
            }
            catch { /* ignore */ }
        }
        getDatabase().prepare('DELETE FROM storage_files WHERE id = ?').run(id);
        return true;
    }
    cleanup() {
        const db = getDatabase();
        const now = new Date().toISOString();
        const expired = db.prepare('SELECT * FROM storage_files WHERE expires_at IS NOT NULL AND expires_at < ?').all(now);
        let deleted = 0, freedBytes = 0;
        const provider = getStorageProvider();
        for (const row of expired) {
            const file = rowToFile(row);
            void provider.remove(file.filepath).catch(() => { });
            if (path.isAbsolute(file.filepath)) {
                try {
                    if (fs.existsSync(file.filepath))
                        fs.unlinkSync(file.filepath);
                }
                catch { /* ignore */ }
            }
            db.prepare('DELETE FROM storage_files WHERE id = ?').run(file.id);
            deleted++;
            freedBytes += file.sizeBytes;
        }
        if (deleted > 0) {
            console.log(`[StorageManager] 🧹 Cleaned ${deleted} expired files (${(freedBytes / 1024 / 1024).toFixed(1)} MB freed)`);
        }
        return { deleted, freedBytes };
    }
    stats() {
        const db = getDatabase();
        const total = db.prepare('SELECT COUNT(*) as count, SUM(size_bytes) as bytes FROM storage_files').get();
        const byZone = db.prepare('SELECT zone, COUNT(*) as count FROM storage_files GROUP BY zone').all();
        const byCat = db.prepare('SELECT category, COUNT(*) as count FROM storage_files GROUP BY category ORDER BY count DESC').all();
        return {
            totalFiles: total.count ?? 0,
            totalBytes: total.bytes ?? 0,
            byZone: Object.fromEntries(byZone.map(r => [r.zone, r.count])),
            byCategory: Object.fromEntries(byCat.map(r => [r.category, r.count])),
        };
    }
}
let instance = null;
export function getStorageManager() {
    if (!instance)
        instance = new StorageManager();
    return instance;
}
// --- Helpers ---
function mimeToExt(mime) {
    const map = {
        'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
        'image/webp': '.webp', 'image/svg+xml': '.svg',
        'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/ogg': '.ogg',
        'video/mp4': '.mp4', 'video/webm': '.webm',
        'application/pdf': '.pdf', 'application/json': '.json',
        'text/plain': '.txt', 'text/html': '.html', 'text/csv': '.csv',
        'model/gltf-binary': '.glb', 'model/gltf+json': '.gltf',
    };
    return map[mime] ?? '';
}
async function downloadUrl(url) {
    const { default: https } = await import('https');
    const { default: http } = await import('http');
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                downloadUrl(res.headers.location).then(resolve).catch(reject);
                return;
            }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}
