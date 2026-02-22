/**
 * Fix avatar ownership - transfer avatars from hardcoded user ID "1" to real owner
 */
import Database from 'better-sqlite3';

const db = new Database('.data/agent-player.db');

console.log('🔧 Fixing avatar ownership...\n');

// Get the real owner user ID
const owner = db.prepare("SELECT id FROM users WHERE email = 'owner@localhost'").get();

if (!owner) {
  console.log('❌ Owner user not found');
  process.exit(1);
}

console.log('Owner ID:', owner.id);
console.log('');

// Find avatars with hardcoded user_id = "1"
const orphanedAvatars = db.prepare(`
  SELECT id, name, local_glb_path, created_at
  FROM user_avatars
  WHERE user_id = '1'
`).all();

console.log('Found', orphanedAvatars.length, 'orphaned avatar(s)\n');

if (orphanedAvatars.length === 0) {
  console.log('✅ No orphaned avatars to fix');
  db.close();
  process.exit(0);
}

// Update ownership to real owner
const result = db.prepare(`
  UPDATE user_avatars
  SET user_id = ?
  WHERE user_id = '1'
`).run(owner.id);

console.log('✅ Updated', result.changes, 'avatar(s) to owner:', owner.id);
console.log('');

// Show updated avatars
const updated = db.prepare(`
  SELECT id, name, local_glb_path, is_active
  FROM user_avatars
  WHERE user_id = ?
  ORDER BY created_at DESC
`).all(owner.id);

console.log('Owner now has', updated.length, 'avatar(s):');
updated.forEach((a, i) => {
  console.log(`  ${i + 1}. ${a.name} ${a.is_active ? '(ACTIVE)' : ''}`);
  console.log(`     Path: ${a.local_glb_path}`);
});

db.close();
