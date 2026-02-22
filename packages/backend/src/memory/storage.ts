/**
 * Memory Storage
 *
 * Stores memories in markdown files + SQLite database
 * Markdown files for human readability, SQLite for vector search
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/index.js';
import { getEmbeddingService } from './embedding.js';
import type {
  Memory,
  MemoryType,
  MemorySearchQuery,
  MemorySearchResult,
  IMemoryStorage
} from './types.js';

export class MemoryStorage implements IMemoryStorage {
  private memoryDir: string;
  private db: ReturnType<typeof getDatabase>;
  private embeddingService: ReturnType<typeof getEmbeddingService>;

  constructor(memoryDir = './memory') {
    this.memoryDir = memoryDir;
    this.db = getDatabase();
    this.embeddingService = getEmbeddingService();
  }

  /**
   * Initialize storage (create directories and tables)
   */
  async initialize(): Promise<void> {
    // Create memory directory
    await fs.mkdir(this.memoryDir, { recursive: true });

    const db = this.db.getDb();

    // Create database table (using getDb() to access raw SQLite instance)
    db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT,
        layer TEXT DEFAULT 'daily',
        status TEXT DEFAULT 'active',
        metadata TEXT,
        importance INTEGER DEFAULT 5,
        tags TEXT,
        created_at TEXT NOT NULL,
        last_accessed TEXT,
        access_count INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
    `);

    // Migration: Add new columns if they don't exist
    try {
      // Check if layer column exists
      const tableInfo = db.prepare("PRAGMA table_info(memories)").all() as any[];
      const columns = tableInfo.map((col: any) => col.name);

      if (!columns.includes('layer')) {
        db.exec("ALTER TABLE memories ADD COLUMN layer TEXT DEFAULT 'daily'");
      }
      if (!columns.includes('status')) {
        db.exec("ALTER TABLE memories ADD COLUMN status TEXT DEFAULT 'active'");
      }
      if (!columns.includes('tags')) {
        db.exec("ALTER TABLE memories ADD COLUMN tags TEXT");
      }

      // Create indexes for new columns (ignore if exists)
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_memories_layer ON memories(layer);
        CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status);
      `);
    } catch (err) {
      // Columns already exist or other error, continue
      console.log('[Memory] Migration check completed');
    }
  }

  /**
   * Save a memory to both markdown file and database
   */
  async save(memory: Memory): Promise<void> {
    // Generate embedding if not provided
    if (!memory.embedding) {
      memory.embedding = await this.embeddingService.embed(memory.content);
    }

    // Save to database
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories (
        id, user_id, type, content, embedding, layer, status,
        metadata, importance, tags, created_at, last_accessed, access_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      memory.id,
      memory.userId,
      memory.type,
      memory.content,
      JSON.stringify(memory.embedding),
      memory.layer || 'daily',
      memory.status || 'active',
      JSON.stringify(memory.metadata),
      memory.importance,
      memory.tags ? JSON.stringify(memory.tags) : null,
      memory.createdAt.toISOString(),
      memory.lastAccessed?.toISOString() || null,
      memory.accessCount
    );

    // Save to markdown file
    await this.saveToMarkdown(memory);
  }

  /**
   * Get a memory by ID
   */
  async get(id: string): Promise<Memory | null> {
    const stmt = this.db.prepare('SELECT * FROM memories WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    // Update access tracking
    this.db.getDb().prepare(`
      UPDATE memories
      SET last_accessed = ?, access_count = access_count + 1
      WHERE id = ?
    `).run(new Date().toISOString(), id);

    return this.rowToMemory(row);
  }

  /**
   * Get all memories for a user
   */
  async getByUser(userId: string): Promise<Memory[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM memories
      WHERE user_id = ?
      ORDER BY importance DESC, created_at DESC
    `);

    const rows = stmt.all(userId) as any[];
    return rows.map(row => this.rowToMemory(row));
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<void> {
    const memory = await this.get(id);
    if (!memory) return;

    // Delete from database
    this.db.getDb().prepare('DELETE FROM memories WHERE id = ?').run(id);

    // Delete markdown file
    const filePath = this.getMarkdownPath(memory);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      // File might not exist, ignore
    }
  }

  /**
   * Update a memory
   */
  async update(id: string, updates: Partial<Memory>): Promise<void> {
    const memory = await this.get(id);
    if (!memory) throw new Error(`Memory ${id} not found`);

    const updated = { ...memory, ...updates };

    // Regenerate embedding if content changed
    if (updates.content) {
      updated.embedding = await this.embeddingService.embed(updated.content);
    }

    await this.save(updated);
  }

  /**
   * Search memories using vector similarity
   */
  async search(query: MemorySearchQuery): Promise<MemorySearchResult[]> {
    // Get query embedding
    const queryEmbedding = await this.embeddingService.embed(query.query);

    // Get all memories for user
    let sql = 'SELECT * FROM memories WHERE user_id = ?';
    const params: any[] = [query.userId];

    if (query.type) {
      sql += ' AND type = ?';
      params.push(query.type);
    }

    if (query.minImportance) {
      sql += ' AND importance >= ?';
      params.push(query.minImportance);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    // Calculate similarities
    const results: MemorySearchResult[] = rows
      .map(row => {
        const memory = this.rowToMemory(row);
        const similarity = memory.embedding
          ? this.embeddingService.similarity(queryEmbedding, memory.embedding)
          : 0;

        return { memory, similarity };
      })
      .filter(result => result.similarity > 0.1) // Minimum threshold
      .sort((a, b) => b.similarity - a.similarity);

    // Return top N results
    const limit = query.limit || 10;
    return results.slice(0, limit);
  }

  /**
   * Save memory to markdown file
   */
  private async saveToMarkdown(memory: Memory): Promise<void> {
    const filePath = this.getMarkdownPath(memory);

    // Create directory for user if needed
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Generate markdown content
    const content = `---
id: ${memory.id}
type: ${memory.type}
importance: ${memory.importance}
created: ${memory.createdAt.toISOString()}
accessed: ${memory.lastAccessed?.toISOString() || 'never'}
access_count: ${memory.accessCount}
---

# ${this.getMemoryTitle(memory)}

${memory.content}

## Metadata

\`\`\`json
${JSON.stringify(memory.metadata, null, 2)}
\`\`\`
`;

    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Get markdown file path for a memory
   */
  private getMarkdownPath(memory: Memory): string {
    const userDir = path.join(this.memoryDir, memory.userId);
    const filename = `${memory.type}-${memory.id}.md`;
    return path.join(userDir, filename);
  }

  /**
   * Get title for memory
   */
  private getMemoryTitle(memory: Memory): string {
    const preview = memory.content.slice(0, 50);
    return preview + (memory.content.length > 50 ? '...' : '');
  }

  /**
   * Convert database row to Memory object
   */
  private rowToMemory(row: any): Memory {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as MemoryType,
      content: row.content,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      layer: row.layer || 'daily',
      importance: row.importance as any,
      status: row.status || 'active',
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: new Date(row.created_at),
      lastAccessed: row.last_accessed ? new Date(row.last_accessed) : undefined,
      accessCount: row.access_count,
      tags: row.tags ? JSON.parse(row.tags) : [],
    };
  }
}

// Singleton instance
let memoryStorage: MemoryStorage | null = null;

export function getMemoryStorage(): MemoryStorage {
  if (!memoryStorage) {
    memoryStorage = new MemoryStorage();
  }
  return memoryStorage;
}
