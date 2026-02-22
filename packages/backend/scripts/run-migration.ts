/**
 * Run database migration script
 * Usage: npx tsx scripts/run-migration.ts migrations/005_inbox_system.sql
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: npx tsx scripts/run-migration.ts <migration-file>');
  process.exit(1);
}

const migrationPath = path.join(__dirname, '..', 'src', 'db', migrationFile);

if (!fs.existsSync(migrationPath)) {
  console.error(`Migration file not found: ${migrationPath}`);
  process.exit(1);
}

const dbPath = path.join(__dirname, '..', '.data', 'database.db');

console.log(`📦 Opening database: ${dbPath}`);
const db = new Database(dbPath);

console.log(`📄 Reading migration: ${migrationPath}`);
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

console.log('🚀 Running migration...');

try {
  db.exec(migrationSQL);
  console.log('✅ Migration completed successfully!');
} catch (error: any) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
