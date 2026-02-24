const Database = require('../packages/backend/node_modules/better-sqlite3');
const db = new Database('../packages/backend/.data/agent-player.db');

console.log('=== قاعدة البيانات - جميع الجداول ===\n');

// Get all tables
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();

console.log(`إجمالي الجداول: ${tables.length}\n`);

tables.forEach(table => {
  console.log(`\n📋 جدول: ${table.name}`);
  console.log('─'.repeat(80));

  // Get table schema
  const schema = db.prepare(`PRAGMA table_info(${table.name})`).all();

  schema.forEach(col => {
    const pk = col.pk ? ' 🔑 PRIMARY KEY' : '';
    const notNull = col.notnull ? ' NOT NULL' : '';
    const defVal = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
    console.log(`  ${col.cid + 1}. ${col.name.padEnd(30)} ${col.type.padEnd(15)}${pk}${notNull}${defVal}`);
  });

  // Get row count
  try {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`\n  📊 عدد السجلات: ${count.count}`);
  } catch (e) {
    console.log(`\n  ⚠️ لا يمكن حساب السجلات`);
  }
});

console.log('\n' + '='.repeat(80));

db.close();
