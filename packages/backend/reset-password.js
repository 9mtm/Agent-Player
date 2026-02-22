/**
 * Reset password for a user
 * Usage: node reset-password.js <email> <newPassword>
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

async function resetPassword() {
  const email = process.argv[2] || 'owner@localhost';
  const newPassword = process.argv[3] || 'Password123!';

  const db = new Database('.data/agent-player.db');

  try {
    // Find user
    const user = db.prepare('SELECT id, email, username FROM users WHERE email = ?').get(email);

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      db.close();
      process.exit(1);
    }

    console.log(`\n🔄 Resetting password for: ${user.email} (${user.username})`);

    // Hash new password (12 rounds for security)
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password and increment token_version
    db.prepare(`
      UPDATE users
      SET password_hash = ?,
          token_version = COALESCE(token_version, 0) + 1,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(passwordHash, user.id);

    console.log(`\n✅ Password reset successfully!\n`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📧 Email:    ${user.email}`);
    console.log(`👤 Username: ${user.username}`);
    console.log(`🔑 Password: ${newPassword}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    db.close();
    process.exit(1);
  }
}

resetPassword();
