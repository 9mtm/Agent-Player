/**
 * Check Database Tables
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', '.data', 'database.db');
const db = new Database(dbPath);

interface TableInfo {
  name: string;
}

interface RowCount {
  count: number;
}

interface ColumnInfo {
  name: string;
}

console.log('📊 Database Tables:\n');

const tables = db.prepare(`
  SELECT name FROM sqlite_master
  WHERE type='table'
  ORDER BY name
`).all() as TableInfo[];

for (const table of tables) {
  console.log(`  ✓ ${table.name}`);

  // Get row count
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as RowCount;
  console.log(`    Rows: ${count.count}`);

  // Get columns
  const columns = db.prepare(`PRAGMA table_info(${table.name})`).all() as ColumnInfo[];
  console.log(`    Columns: ${columns.map(c => c.name).join(', ')}\n`);
}

db.close();
