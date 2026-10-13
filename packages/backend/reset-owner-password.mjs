/**
 * Set a new password for the owner account (or any account by email).
 *
 * Usage (from packages/backend):
 *   node reset-owner-password.mjs                 # first owner/admin account
 *   node reset-owner-password.mjs you@example.com # a specific account
 *
 * The password is typed at a hidden prompt (or read from NEW_PASSWORD for scripts).
 * It is never printed. All existing sessions of the account are invalidated.
 */
import Database from 'better-sqlite3';
import bcryptjs from 'bcryptjs';
import readline from 'node:readline';

const PUBLISHED_DEFAULTS = new Set(['admin123', 'user123', 'system-user-not-for-login', 'demo-user-password']);
const dbPath = process.env.DATABASE_PATH || '.data/agent-player.db';

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => { if (text.includes(question)) rl.output.write(text); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

const db = new Database(dbPath);
const email = process.argv[2];
const user = email
  ? db.prepare('SELECT id, email FROM users WHERE email = ?').get(email)
  : db.prepare("SELECT id, email FROM users WHERE role IN ('owner', 'admin') AND id NOT IN ('mock-user', '1') ORDER BY created_at LIMIT 1").get();

if (!user) {
  console.error('No matching account found.');
  process.exit(1);
}

let password = process.env.NEW_PASSWORD;
if (!password) {
  password = await askHidden(`New password for ${user.email}: `);
  const again = await askHidden('Repeat the new password: ');
  if (password !== again) {
    console.error('Passwords do not match.');
    process.exit(1);
  }
}

if (password.length < 12 || PUBLISHED_DEFAULTS.has(password)) {
  console.error('Password must be at least 12 characters and must not be a published default.');
  process.exit(1);
}

const hash = await bcryptjs.hash(password, 12);
db.prepare(
  "UPDATE users SET password_hash = ?, token_version = COALESCE(token_version, 0) + 1, updated_at = datetime('now') WHERE id = ?"
).run(hash, user.id);
db.close();

console.log(`Password updated for ${user.email}. Existing sessions were signed out.`);
