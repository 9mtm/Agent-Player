const Database = require('../packages/backend/node_modules/better-sqlite3');
const db = new Database('../packages/backend/.data/agent-player.db');

console.log('╔════════════════════════════════════════════════════════════════════════╗');
console.log('║           🔍 تحليل الجداول غير المستخدمة والمكررة                    ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

// Get all tables
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();

// Categorize tables
const usedTables = [];
const emptyTables = [];
const systemTables = ['migrations', 'sqlite_sequence'];

tables.forEach(table => {
  if (systemTables.includes(table.name)) return;

  try {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    if (count.count > 0) {
      usedTables.push({ name: table.name, count: count.count });
    } else {
      emptyTables.push(table.name);
    }
  } catch (e) {
    emptyTables.push(table.name);
  }
});

// Group empty tables by feature
const groups = {
  'Agent System': [],
  'Memory System': [],
  'Calendar': [],
  'Notifications': [],
  'Extensions': [],
  'Voice/Call': [],
  'Workflow': [],
  'Team/Collaboration': [],
  'Security/Approval': [],
  'Other': []
};

emptyTables.forEach(table => {
  if (table.includes('agent_') || table.includes('agents_')) groups['Agent System'].push(table);
  else if (table.includes('memory') || table.includes('memories')) groups['Memory System'].push(table);
  else if (table.includes('calendar')) groups['Calendar'].push(table);
  else if (table.includes('notification')) groups['Notifications'].push(table);
  else if (table.includes('extension')) groups['Extensions'].push(table);
  else if (table.includes('voice') || table.includes('call') || table.includes('phone')) groups['Voice/Call'].push(table);
  else if (table.includes('workflow')) groups['Workflow'].push(table);
  else if (table.includes('team') || table.includes('invitation')) groups['Team/Collaboration'].push(table);
  else if (table.includes('approval') || table.includes('inbox') || table.includes('audit')) groups['Security/Approval'].push(table);
  else groups['Other'].push(table);
});

console.log('\n📊 الإحصائيات:\n');
console.log(`  ✅ جداول مستخدمة (بها بيانات): ${usedTables.length}`);
console.log(`  ⚪ جداول فارغة (بدون بيانات): ${emptyTables.length}`);
console.log(`  📈 نسبة الجداول المستخدمة: ${Math.round((usedTables.length / (usedTables.length + emptyTables.length)) * 100)}%`);

console.log('\n\n🟢 الجداول المستخدمة (${usedTables.length}):');
console.log('─'.repeat(80));
usedTables.forEach(t => {
  console.log(`  ✅ ${t.name.padEnd(40)} (${t.count} سجل)`);
});

console.log('\n\n🔴 الجداول الفارغة حسب الميزة:');
console.log('─'.repeat(80));

for (const [feature, tableList] of Object.entries(groups)) {
  if (tableList.length > 0) {
    console.log(`\n  📁 ${feature} (${tableList.length} جداول):`);
    tableList.forEach(t => {
      console.log(`     ⚪ ${t}`);
    });
  }
}

// Potential duplicates analysis
console.log('\n\n⚠️  جداول محتمل تكون مكررة:\n');
console.log('─'.repeat(80));

const potentialDuplicates = [
  { group: 'Memory', tables: ['memories', 'memory_entries'] },
  { group: 'Settings', tables: ['settings', 'app_settings', 'notification_settings', 'skill_settings'] },
  { group: 'Jobs', tables: ['scheduled_jobs', 'cron_jobs', 'job_executions'] },
  { group: 'Workflow', tables: ['workflows', 'workflow_executions'] },
];

potentialDuplicates.forEach(dup => {
  console.log(`\n  📋 ${dup.group}:`);
  dup.tables.forEach(t => {
    const used = usedTables.find(ut => ut.name === t);
    const status = used ? `✅ مستخدم (${used.count} سجل)` : '⚪ فارغ';
    console.log(`     ${status.padEnd(30)} ${t}`);
  });
});

console.log('\n\n💡 التوصيات:\n');
console.log('─'.repeat(80));
console.log(`
  1. 🗑️  يمكن حذف الجداول الفارغة بأمان (${emptyTables.length} جدول)
  2. 🔄 دمج الجداول المكررة إذا كانت تؤدي نفس الوظيفة
  3. 📝 توثيق استخدام كل جدول في MEMORY.md
  4. ⚡ تقليل عدد الجداول سيحسن الأداء
  5. 🎯 الاحتفاظ فقط بالميزات المستخدمة فعلياً

  الحجم الأمثل للقاعدة: 20-30 جدول (حالياً: ${tables.length})
`);

console.log('\n' + '═'.repeat(80) + '\n');

db.close();
