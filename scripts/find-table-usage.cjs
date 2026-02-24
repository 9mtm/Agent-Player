const Database = require('../packages/backend/node_modules/better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('./packages/backend/.data/agent-player.db');

console.log('╔════════════════════════════════════════════════════════════════════════╗');
console.log('║           🔍 تحليل استخدام الجداول في الكود الفعلي                   ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

// Get all tables
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();
const systemTables = ['migrations', 'sqlite_sequence'];
const userTables = tables.filter(t => !systemTables.includes(t.name));

console.log(`📊 إجمالي الجداول (غير النظام): ${userTables.length}\n`);

// Directories to search
const searchDirs = [
  path.join(__dirname, '../packages/backend/src'),
  path.join(__dirname, '../src'),
  path.join(__dirname, '../packages/backend/extensions'),
];

// Function to recursively search files
function searchInFiles(dir, tableName) {
  const references = [];

  function searchDir(currentDir) {
    if (!fs.existsSync(currentDir)) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and .git
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') {
          continue;
        }
        searchDir(fullPath);
      } else if (entry.isFile()) {
        // Only search code files
        const ext = path.extname(entry.name);
        if (['.ts', '.js', '.tsx', '.jsx', '.sql'].includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');

            // Search for table name references (case-insensitive)
            const patterns = [
              new RegExp(`FROM\\s+${tableName}\\b`, 'gi'),
              new RegExp(`INTO\\s+${tableName}\\b`, 'gi'),
              new RegExp(`UPDATE\\s+${tableName}\\b`, 'gi'),
              new RegExp(`TABLE\\s+${tableName}\\b`, 'gi'),
              new RegExp(`['"\`]${tableName}['"\`]`, 'gi'),
            ];

            const matches = patterns.some(pattern => pattern.test(content));

            if (matches) {
              const relativePath = path.relative(path.join(__dirname, '..'), fullPath);
              references.push(relativePath);
            }
          } catch (e) {
            // Skip unreadable files
          }
        }
      }
    }
  }

  for (const dir of searchDirs) {
    searchDir(dir);
  }

  return references;
}

// Analyze each table
const usedInCode = [];
const notUsedInCode = [];

console.log('🔎 جاري البحث في الكود...\n');

for (const table of userTables) {
  const references = searchInFiles(process.cwd(), table.name);

  // Get record count
  let count = 0;
  try {
    const result = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    count = result.count;
  } catch (e) {
    // Skip if can't count
  }

  if (references.length > 0) {
    usedInCode.push({
      name: table.name,
      count,
      files: references.length,
      references: references.slice(0, 3) // Keep first 3 references
    });
  } else {
    notUsedInCode.push({ name: table.name, count });
  }
}

// Sort by usage
usedInCode.sort((a, b) => b.files - a.files);
notUsedInCode.sort((a, b) => b.count - a.count);

console.log('\n✅ جداول مستخدمة في الكود (' + usedInCode.length + '):');
console.log('─'.repeat(80));

usedInCode.forEach(t => {
  const status = t.count > 0 ? `✅ ${t.count} سجل` : '⚪ فارغ';
  console.log(`\n  📋 ${t.name}`);
  console.log(`     الحالة: ${status}`);
  console.log(`     مستخدم في: ${t.files} ملف`);
  if (t.references.length > 0) {
    console.log(`     أمثلة:`);
    t.references.forEach(ref => {
      console.log(`       • ${ref}`);
    });
  }
});

console.log('\n\n❌ جداول غير مستخدمة في الكود (' + notUsedInCode.length + '):');
console.log('─'.repeat(80));

if (notUsedInCode.length > 0) {
  notUsedInCode.forEach(t => {
    const status = t.count > 0 ? `⚠️ ${t.count} سجل (بيانات موجودة!)` : '⚪ فارغ';
    console.log(`  ❌ ${t.name.padEnd(40)} ${status}`);
  });
} else {
  console.log('  🎉 جميع الجداول مستخدمة في الكود!');
}

console.log('\n\n📊 الإحصائيات:');
console.log('─'.repeat(80));
console.log(`  ✅ جداول مستخدمة في الكود: ${usedInCode.length} (${Math.round((usedInCode.length / userTables.length) * 100)}%)`);
console.log(`  ❌ جداول غير مستخدمة: ${notUsedInCode.length} (${Math.round((notUsedInCode.length / userTables.length) * 100)}%)`);

const usedWithData = usedInCode.filter(t => t.count > 0).length;
const usedEmpty = usedInCode.filter(t => t.count === 0).length;
const unusedWithData = notUsedInCode.filter(t => t.count > 0).length;

console.log(`\n  📈 تفصيل إضافي:`);
console.log(`     • مستخدمة + بها بيانات: ${usedWithData}`);
console.log(`     • مستخدمة + فارغة: ${usedEmpty}`);
console.log(`     • غير مستخدمة + بها بيانات: ${unusedWithData} ⚠️`);
console.log(`     • غير مستخدمة + فارغة: ${notUsedInCode.length - unusedWithData}`);

console.log('\n\n💡 التوصيات:');
console.log('─'.repeat(80));
if (notUsedInCode.length > 0) {
  console.log(`
  1. 🗑️  يمكن حذف ${notUsedInCode.length} جدول غير مستخدم بأمان
  2. ⚠️  راجع الجداول غير المستخدمة لكن بها بيانات (${unusedWithData})
  3. 📝 الجداول المستخدمة لكن فارغة (${usedEmpty}) جاهزة للاستخدام عند الحاجة
  4. ✅ الجداول المستخدمة والفعالة: ${usedWithData}
`);
} else {
  console.log(`
  ✅ جميع الجداول مستخدمة في الكود
  📊 ${usedWithData} جدول نشط (بها بيانات)
  ⚪ ${usedEmpty} جدول جاهز للاستخدام (فارغة حالياً)
`);
}

console.log('═'.repeat(80) + '\n');

db.close();
