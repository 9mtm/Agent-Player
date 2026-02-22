#!/usr/bin/env node
/**
 * Storage Migration Script
 * Migrates files from old scattered structure to unified public/storage/
 *
 * Run: node migrate-storage.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const projectRoot = __dirname;

console.log('🚀 Starting Storage Migration...');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will move files)'}\n`);

let stats = {
  moved: 0,
  skipped: 0,
  errors: 0
};

/**
 * Move file or directory from old path to new path
 */
function migrateFile(oldPath, newPath, description) {
  const absOld = path.join(projectRoot, oldPath);
  const absNew = path.join(projectRoot, newPath);

  if (!fs.existsSync(absOld)) {
    console.log(`⏭️  Skip: ${description} (source doesn't exist)`);
    stats.skipped++;
    return;
  }

  try {
    if (DRY_RUN) {
      console.log(`📋 Would move: ${oldPath} → ${newPath}`);
      stats.moved++;
    } else {
      // Ensure destination directory exists
      const destDir = path.dirname(absNew);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Move file/directory
      fs.renameSync(absOld, absNew);
      console.log(`✅ Moved: ${oldPath} → ${newPath}`);
      stats.moved++;
    }
  } catch (error) {
    console.error(`❌ Error moving ${oldPath}:`, error.message);
    stats.errors++;
  }
}

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;

  if (!DRY_RUN) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      if (DRY_RUN) {
        console.log(`📋 Would copy: ${srcPath} → ${destPath}`);
      } else {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Copied: ${srcPath} → ${destPath}`);
      }
      stats.moved++;
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Migration Steps
// ──────────────────────────────────────────────────────────────────────────────

console.log('📦 Step 1: Migrate Avatars\n');
// Avatars: public/avatars/ → public/storage/avatars/
const avatarsOld = path.join(projectRoot, 'public', 'avatars');
const avatarsNew = path.join(projectRoot, 'public', 'storage', 'avatars');

if (fs.existsSync(avatarsOld)) {
  // Move system avatars
  const systemOld = path.join(avatarsOld, 'system');
  const systemNew = path.join(avatarsNew, 'system');
  if (fs.existsSync(systemOld)) {
    copyDir(systemOld, systemNew);
  }

  // Move user avatars
  const userOld = path.join(avatarsOld, 'user');
  const userNew = path.join(avatarsNew, 'user');
  if (fs.existsSync(userOld)) {
    copyDir(userOld, userNew);
  }
}

console.log('\n📦 Step 2: Migrate Backgrounds\n');
// Backgrounds: public/backgrounds/ → public/storage/backgrounds/
copyDir(
  path.join(projectRoot, 'public', 'backgrounds'),
  path.join(projectRoot, 'public', 'storage', 'backgrounds')
);

console.log('\n📦 Step 3: Migrate Profile Pictures\n');
// Profile pictures: public/profile-pictures/ → public/storage/profiles/
copyDir(
  path.join(projectRoot, 'public', 'profile-pictures'),
  path.join(projectRoot, 'public', 'storage', 'profiles')
);

console.log('\n📦 Step 4: Migrate Logos\n');
// Logos: .data/logos/ → public/storage/logos/
copyDir(
  path.join(projectRoot, 'packages', 'backend', '.data', 'logos'),
  path.join(projectRoot, 'public', 'storage', 'logos')
);

console.log('\n📦 Step 5: Migrate Storage Files\n');
// CDN files: .data/storage/cdn/files/ → public/storage/files/
copyDir(
  path.join(projectRoot, 'packages', 'backend', '.data', 'storage', 'cdn', 'files'),
  path.join(projectRoot, 'public', 'storage', 'files')
);

console.log('\n📦 Step 6: Migrate Worlds\n');
// Worlds: .data/storage/cdn/worlds/ → public/storage/worlds/user/
copyDir(
  path.join(projectRoot, 'packages', 'backend', '.data', 'storage', 'cdn', 'worlds'),
  path.join(projectRoot, 'public', 'storage', 'worlds', 'user')
);

console.log('\n📦 Step 7: Migrate Audio (to temp)\n');
// Audio: .data/audio/ → public/storage/temp/audio/
copyDir(
  path.join(projectRoot, 'packages', 'backend', '.data', 'audio'),
  path.join(projectRoot, 'public', 'storage', 'temp', 'audio')
);

// ──────────────────────────────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log('📊 Migration Summary:');
console.log('='.repeat(60));
console.log(`✅ Moved/Copied: ${stats.moved} files`);
console.log(`⏭️  Skipped: ${stats.skipped} files`);
console.log(`❌ Errors: ${stats.errors} files`);
console.log('='.repeat(60));

if (DRY_RUN) {
  console.log('\n⚠️  This was a DRY RUN - no files were actually moved.');
  console.log('Run without --dry-run to perform the migration.');
} else {
  console.log('\n✅ Migration completed!');
  console.log('\nNext steps:');
  console.log('1. Update backend routes to use new paths');
  console.log('2. Test file uploads');
  console.log('3. Once verified, delete old directories:');
  console.log('   - public/avatars/');
  console.log('   - public/backgrounds/');
  console.log('   - public/profile-pictures/');
  console.log('   - packages/backend/.data/logos/');
  console.log('   - packages/backend/.data/storage/cdn/');
}

process.exit(stats.errors > 0 ? 1 : 0);
