/**
 * LocalStorageProvider — stores files on the local filesystem.
 * Default provider when STORAGE_PROVIDER=local (or not set).
 * Files are served by the backend via GET /api/storage/:id
 */
import fs from 'fs';
import path from 'path';
export class LocalStorageProvider {
    name = 'local';
    baseDir;
    constructor(baseDir) {
        this.baseDir = baseDir;
    }
    resolvePath(key) {
        return path.join(this.baseDir, key);
    }
    async put(key, data, _mimeType) {
        const filepath = this.resolvePath(key);
        fs.mkdirSync(path.dirname(filepath), { recursive: true });
        fs.writeFileSync(filepath, data);
    }
    async get(key) {
        const filepath = this.resolvePath(key);
        if (!fs.existsSync(filepath))
            return null;
        return fs.readFileSync(filepath);
    }
    getReadStream(key) {
        const filepath = this.resolvePath(key);
        if (!fs.existsSync(filepath))
            return null;
        return fs.createReadStream(filepath);
    }
    async remove(key) {
        const filepath = this.resolvePath(key);
        if (fs.existsSync(filepath))
            fs.unlinkSync(filepath);
    }
    /** Local files are served by backend — no direct URL */
    getDirectUrl(_key) {
        return null;
    }
    /** Full absolute path for a given key (used by indexExistingFile) */
    absolutePath(key) {
        return this.resolvePath(key);
    }
}
