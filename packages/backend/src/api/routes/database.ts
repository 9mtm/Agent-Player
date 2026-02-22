/**
 * Database Management API Routes
 * Stats, backups, vacuum, optimization
 */

import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { existsSync, readdirSync, statSync, copyFileSync, unlinkSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import { validateTableName } from '../../db/sql-utils.js';
import { handleError } from '../error-handler.js';

export async function databaseRoutes(fastify: FastifyInstance) {
  const dbPath = resolve('./.data/database.db');
  const backupDir = resolve('./.data/backups');

  // Ensure backup directory exists
  import('fs').then(fs => {
    if (!existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
  });

  /**
   * GET /api/database/stats - Get database statistics
   */
  fastify.get('/api/database/stats', {
    schema: {
      tags: ['Database'],
      description: 'Get database statistics (size, tables, records)',
    },
  }, async (request, reply) => {
    try {
      // SECURITY: Require authentication
      getUserIdFromRequest(request);

      const db = getDatabase();

      // Get database file size
      const dbStats = statSync(dbPath);
      const totalSize = dbStats.size;
      const lastModified = dbStats.mtime.toISOString();

      // Get all tables
      const tablesQuery = db.prepare(`
        SELECT name, sql
        FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all() as Array<{ name: string; sql: string }>;

      const tables = [];
      let totalRecords = 0;

      for (const table of tablesQuery) {
        try {
          // SECURITY: Validate table name before using in SQL
          const safeName = validateTableName(table.name);

          // Get record count
          const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${safeName}`).get() as { count: number };
          const records = countResult.count;
          totalRecords += records;

          // Estimate table size (rough approximation)
          const pageCountResult = db.prepare(`SELECT * FROM dbstat WHERE name = ?`).get(table.name) as any;
          const estimatedSize = pageCountResult ? pageCountResult.pageno * 4096 : 0;

          // Generate description from table name
          const description = table.name
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          tables.push({
            name: table.name,
            description,
            records,
            size: estimatedSize || Math.floor(totalSize / tablesQuery.length), // Fallback to average
          });
        } catch (err) {
          console.error(`Error getting stats for table ${table.name}:`, err);
        }
      }

      // Sort tables by record count (descending)
      tables.sort((a, b) => b.records - a.records);

      return {
        totalSize,
        totalRecords,
        tables,
        lastModified,
      };
    } catch (error: any) {
      console.error('[Database API] ❌ Stats failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Database]');
    }
  });

  /**
   * GET /api/database/backups - List all backups
   */
  fastify.get('/api/database/backups', {
    schema: {
      tags: ['Database'],
      description: 'List all database backups',
    },
  }, async (request, reply) => {
    try {
      // SECURITY: Require authentication
      getUserIdFromRequest(request);

      if (!existsSync(backupDir)) {
        return { backups: [] };
      }

      const files = readdirSync(backupDir)
        .filter(f => f.endsWith('.db'))
        .map(filename => {
          const filePath = join(backupDir, filename);
          const stats = statSync(filePath);
          return {
            filename,
            size: stats.size,
            created: stats.ctime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

      return { backups: files };
    } catch (error: any) {
      console.error('[Database API] ❌ List backups failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Database]');
    }
  });

  /**
   * POST /api/database/backup - Create a new backup
   */
  fastify.post('/api/database/backup', {
    schema: {
      tags: ['Database'],
      description: 'Create a database backup',
    },
  }, async (request, reply) => {
    try {
      // SECURITY: Require authentication
      getUserIdFromRequest(request);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                        new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
      const filename = `database_${timestamp}.db`;
      const backupPath = join(backupDir, filename);

      // Copy database file
      copyFileSync(dbPath, backupPath);

      const stats = statSync(backupPath);

      console.log(`[Database API] ✅ Backup created: ${filename}`);

      return {
        success: true,
        backup: {
          filename,
          size: stats.size,
          created: stats.ctime.toISOString(),
        },
      };
    } catch (error: any) {
      console.error('[Database API] ❌ Backup failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Database]');
    }
  });

  /**
   * GET /api/database/backups/:filename - Download a backup
   */
  fastify.get<{ Params: { filename: string } }>('/api/database/backups/:filename', {
    schema: {
      tags: ['Database'],
      params: {
        type: 'object',
        properties: {
          filename: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      // SECURITY: Require authentication - prevents data breach
      getUserIdFromRequest(request);

      const { filename } = request.params;
      const backupPath = join(backupDir, filename);

      if (!existsSync(backupPath) || !filename.endsWith('.db')) {
        return reply.status(404).send({
          error: 'Backup not found',
        });
      }

      const fileStream = readFileSync(backupPath);
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      reply.header('Content-Type', 'application/octet-stream');
      return reply.send(fileStream);
    } catch (error: any) {
      console.error('[Database API] ❌ Download backup failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Database]');
    }
  });

  /**
   * DELETE /api/database/backups/:filename - Delete a backup
   */
  fastify.delete<{ Params: { filename: string } }>('/api/database/backups/:filename', {
    schema: {
      tags: ['Database'],
      params: {
        type: 'object',
        properties: {
          filename: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      // SECURITY: Require authentication
      getUserIdFromRequest(request);

      const { filename } = request.params;
      const backupPath = join(backupDir, filename);

      if (!existsSync(backupPath) || !filename.endsWith('.db')) {
        return reply.status(404).send({
          error: 'Backup not found',
        });
      }

      unlinkSync(backupPath);
      console.log(`[Database API] ✅ Backup deleted: ${filename}`);

      return {
        success: true,
        message: `Backup "${filename}" deleted`,
      };
    } catch (error: any) {
      console.error('[Database API] ❌ Delete backup failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Database]');
    }
  });

  /**
   * POST /api/database/vacuum - Run VACUUM command
   */
  fastify.post('/api/database/vacuum', {
    schema: {
      tags: ['Database'],
      description: 'Compact database and reclaim space',
    },
  }, async (request, reply) => {
    try {
      // SECURITY: Require authentication
      getUserIdFromRequest(request);

      const db = getDatabase();

      const sizeBefore = statSync(dbPath).size;
      db.exec('VACUUM');
      const sizeAfter = statSync(dbPath).size;
      const savedSpace = sizeBefore - sizeAfter;

      console.log(`[Database API] ✅ VACUUM completed: saved ${savedSpace} bytes`);

      return {
        success: true,
        sizeBefore,
        sizeAfter,
        savedSpace,
      };
    } catch (error: any) {
      console.error('[Database API] ❌ VACUUM failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Database]');
    }
  });

  /**
   * POST /api/database/restore - Restore from backup
   */
  fastify.post<{ Body: { filename: string } }>('/api/database/restore', {
    schema: {
      tags: ['Database'],
      description: 'Restore database from backup file',
      body: {
        type: 'object',
        properties: {
          filename: { type: 'string' },
        },
        required: ['filename'],
      },
    },
  }, async (request, reply) => {
    try {
      // SECURITY: Require authentication - critical destructive operation
      getUserIdFromRequest(request);

      const { filename } = request.body;
      const backupPath = join(backupDir, filename);

      if (!existsSync(backupPath) || !filename.endsWith('.db')) {
        return reply.status(404).send({
          error: 'Backup not found',
        });
      }

      // Create a backup of current database before restoring
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                        new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
      const preRestoreBackup = `database_pre-restore_${timestamp}.db`;
      copyFileSync(dbPath, join(backupDir, preRestoreBackup));

      // Restore from backup
      copyFileSync(backupPath, dbPath);

      console.log(`[Database API] ✅ Database restored from: ${filename}`);

      return {
        success: true,
        message: `Database restored from "${filename}"`,
        preRestoreBackup,
      };
    } catch (error: any) {
      console.error('[Database API] ❌ Restore failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Database]');
    }
  });

  /**
   * POST /api/database/optimize - Run ANALYZE command
   */
  fastify.post('/api/database/optimize', {
    schema: {
      tags: ['Database'],
      description: 'Analyze and optimize database performance',
    },
  }, async (request, reply) => {
    try {
      // SECURITY: Require authentication
      getUserIdFromRequest(request);

      const db = getDatabase();

      // Run ANALYZE to update query planner statistics
      db.exec('ANALYZE');

      // Get all tables
      const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as Array<{ name: string }>;

      console.log(`[Database API] ✅ ANALYZE completed for ${tables.length} tables`);

      return {
        success: true,
        tablesAnalyzed: tables.length,
        message: 'Database optimized successfully',
      };
    } catch (error: any) {
      console.error('[Database API] ❌ Optimize failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Database]');
    }
  });

  /**
   * POST /api/database/clean - Clean old records
   */
  fastify.post<{ Body: { daysOld?: number } }>('/api/database/clean', {
    schema: {
      tags: ['Database'],
      description: 'Remove records older than specified days',
      body: {
        type: 'object',
        properties: {
          daysOld: { type: 'number', default: 90 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      // SECURITY: Require authentication
      getUserIdFromRequest(request);

      const db = getDatabase();
      const daysOld = request.body?.daysOld || 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffISO = cutoffDate.toISOString();

      let deletedCount = 0;

      // Clean chat_messages
      const chatMsgs = db.prepare('DELETE FROM chat_messages WHERE created_at < ?').run(cutoffISO);
      deletedCount += chatMsgs.changes;

      // Clean agent_activity
      const activity = db.prepare('DELETE FROM agent_activity WHERE timestamp < ?').run(cutoffISO);
      deletedCount += activity.changes;

      // Clean storage_files (cache only)
      const storage = db.prepare('DELETE FROM storage_files WHERE zone = ? AND created_at < ?').run('cache', cutoffISO);
      deletedCount += storage.changes;

      // Clean waf_scans if table exists
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='waf_scans'
      `).get();
      if (tableExists) {
        const wafScans = db.prepare('DELETE FROM waf_scans WHERE created_at < ?').run(cutoffISO);
        deletedCount += wafScans.changes;
      }

      console.log(`[Database API] ✅ Cleaned ${deletedCount} old records (>${daysOld} days)`);

      return {
        success: true,
        deletedCount,
        daysOld,
        message: `Removed ${deletedCount} records older than ${daysOld} days`,
      };
    } catch (error: any) {
      console.error('[Database API] ❌ Clean failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Database]');
    }
  });

  /**
   * POST /api/database/clear - Clear all data (danger zone)
   */
  fastify.post('/api/database/clear', {
    schema: {
      tags: ['Database'],
      description: 'Delete all records from database (keeps structure)',
    },
  }, async (request, reply) => {
    try {
      // SECURITY: Require authentication - CRITICAL destructive operation
      getUserIdFromRequest(request);

      const db = getDatabase();

      // Get all tables except migrations and users
      const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table'
          AND name NOT LIKE 'sqlite_%'
          AND name NOT IN ('migrations', 'users', 'agents_config')
      `).all() as Array<{ name: string }>;

      let totalDeleted = 0;

      for (const table of tables) {
        try {
          // SECURITY: Validate table name before using in SQL
          const safeName = validateTableName(table.name);
          const result = db.prepare(`DELETE FROM ${safeName}`).run();
          totalDeleted += result.changes;
        } catch (err) {
          console.error(`Error clearing table ${table.name}:`, err);
        }
      }

      // Run VACUUM to reclaim space
      db.exec('VACUUM');

      console.log(`[Database API] ⚠️ CLEAR ALL: ${totalDeleted} records deleted from ${tables.length} tables`);

      return {
        success: true,
        deletedCount: totalDeleted,
        tablesCleared: tables.length,
        message: `Cleared ${totalDeleted} records from ${tables.length} tables`,
      };
    } catch (error: any) {
      console.error('[Database API] ❌ Clear all failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Database]');
    }
  });

  console.log('[Database API] ✅ Routes registered');
}
