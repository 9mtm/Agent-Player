/**
 * User worlds and their JSON world files (B2.2d-10) on the process driver,
 * shared by the world builder and the AI world generator.
 *
 * A world row points at a storage_files row (glb_file_id) whose filepath is
 * the key "/cdn/worlds/<file>" under the storage directory. The two rows are
 * written in one transaction. File paths read back from the database are
 * resolved under the storage directory and refused when they leave it.
 */

import path from 'node:path';
import { dataPath } from '../config/data-root.js';
import { nowText } from '../db/pg/dialect.js';
import { dialect, q, run, sql } from './sql-steps.js';

/** Directory that holds world files ("<storage>/cdn/worlds"). */
export function worldsDir(): string {
  return dataPath('storage', 'cdn', 'worlds');
}

/**
 * Absolute path of a stored world file key, or null when the key is not a
 * plain relative key under the storage directory (absolute after the
 * leading "/", "..", or anything that resolves outside).
 */
export function storageFilePath(storedKey: unknown): string | null {
  if (typeof storedKey !== 'string' || storedKey === '') return null;
  const root = path.resolve(dataPath('storage'));
  const full = path.resolve(root, storedKey.replace(/^\/+/, ''));
  return full.startsWith(root + path.sep) ? full : null;
}

export interface NewWorld {
  worldId: string;
  userId: string;
  name: string;
  description: string;
  isPublic: number;
  maxPlayers: number;
  file: { id: string; filename: string; sizeBytes: number; description: string };
}

/** Inserts the world file record and the world row together (all or nothing). */
export async function createWorldWithFile(w: NewWorld): Promise<void> {
  await sql().tx(function* () {
    const d = yield* dialect();
    yield* run(`
      INSERT INTO storage_files (id, zone, category, filename, filepath, mime_type, size_bytes, description, created_by)
      VALUES (?, 'cdn', 'worlds', ?, ?, 'application/json', ?, ?, ?)`,
      w.file.id, w.file.filename, `/cdn/worlds/${w.file.filename}`, w.file.sizeBytes, w.file.description, w.userId);
    yield* run(`
      INSERT INTO user_worlds (
        id, user_id, name, description, glb_file_id,
        is_public, max_players,
        spawn_position_x, spawn_position_y, spawn_position_z,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ${nowText(d)}, ${nowText(d)})`,
      w.worldId, w.userId, w.name, w.description, w.file.id, w.isPublic, w.maxPlayers);
  });
}

export interface OwnedWorld {
  id: string;
  name: string;
  description: string | null;
  glb_file_id: string | null;
  created_at: string;
  updated_at: string;
}

export function findOwnedWorld(id: string, userId: string): Promise<OwnedWorld | undefined> {
  return q.one<OwnedWorld>(`
    SELECT id, name, description, glb_file_id, created_at, updated_at
    FROM user_worlds
    WHERE id = ? AND user_id = ?`,
    id, userId);
}

/** Absolute, contained path of a world's file, or null (no row, no key, or outside the storage dir). */
export async function worldFilePath(fileId: string | null): Promise<string | null> {
  if (!fileId) return null;
  const row = await q.one<{ filepath: string }>('SELECT filepath FROM storage_files WHERE id = ?', fileId);
  return row ? storageFilePath(row.filepath) : null;
}

export async function updateWorldMeta(id: string, userId: string, name: string, description: string): Promise<void> {
  await q.run(`
    UPDATE user_worlds
    SET name = ?, description = ?, updated_at = ${nowText(q.dialect)}
    WHERE id = ? AND user_id = ?`,
    name, description, id, userId);
}
