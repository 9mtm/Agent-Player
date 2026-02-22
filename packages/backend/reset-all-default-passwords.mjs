/**
 * Reset all default account passwords
 */
import Database from 'better-sqlite3';
import bcryptjs from 'bcryptjs';

const db = new Database('.data/agent-player.db');

console.log('🔐 Resetting all default passwords...\n');

const accounts = [
  { email: 'owner@localhost', password: 'admin123' },
  { email: 'admin@localhost', password: 'admin123' },
  { email: 'user@localhost', password: 'user123' }
];

for (const account of accounts) {
  console.log(`Processing ${account.email}...`);

  // Hash the password
  const passwordHash = await bcryptjs.hash(account.password, 12);

  // Update the password
  const result = db.prepare(`
    UPDATE users
    SET password_hash = ?, token_version = token_version + 1
    WHERE email = ?
  `).run(passwordHash, account.email);

  if (result.changes > 0) {
    console.log(`✅ ${account.email} → ${account.password}\n`);
  } else {
    console.log(`❌ ${account.email} not found\n`);
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ All default passwords reset!\n');
console.log('📋 Default Accounts:');
console.log('   Owner: owner@localhost / admin123');
console.log('   Admin: admin@localhost / admin123');
console.log('   User:  user@localhost / user123');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

db.close();
