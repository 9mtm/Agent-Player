/**
 * Reset owner password to admin123
 */
import Database from 'better-sqlite3';
import bcryptjs from 'bcryptjs';

const db = new Database('.data/agent-player.db');

console.log('🔐 Resetting owner password...');

// Hash the new password
const newPasswordHash = await bcryptjs.hash('admin123', 12);

// Update the password
const result = db.prepare(`
  UPDATE users
  SET password_hash = ?, token_version = token_version + 1
  WHERE email = ?
`).run(newPasswordHash, 'owner@localhost');

if (result.changes > 0) {
  console.log('✅ Password reset successfully!');
  console.log('');
  console.log('📧 Email: owner@localhost');
  console.log('🔑 Password: admin123');
  console.log('');
} else {
  console.log('❌ User not found');
}

db.close();
