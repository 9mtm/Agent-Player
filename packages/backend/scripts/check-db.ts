/**
 * Check database tables
 */

import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', '.data', 'database.db');

console.log(`📦 Opening database: ${dbPath}`);
const db = new Database(dbPath);

// List all tables
const tables = db.prepare(`
  SELECT name FROM sqlite_master
  WHERE type='table'
  ORDER BY name
`).all();

console.log('\n📋 Tables in database:');
tables.forEach((t: any) => {
  console.log(`  - ${t.name}`);
});

console.log(`\n✅ Total: ${tables.length} tables`);

db.close();
