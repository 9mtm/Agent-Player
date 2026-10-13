/**
 * One-time move of runtime uploads out of the repo `public/storage/` into
 * `.data/uploads/` (CL-05, Q-11). Not run at startup; run it explicitly:
 *
 *   cd packages/backend
 *   npx tsx scripts/move-public-uploads.ts            # dry run (default): counts only
 *   npx tsx scripts/move-public-uploads.ts --apply    # copy, verify, remove old copy
 *
 * Options: --from DIR (default <repo>/public/storage), --to DIR (default
 * UPLOADS_DIR or <repo>/.data/uploads). Idempotent; prints counts only.
 * Stop the servers first so no file is written during the move.
 */
import { getLegacyPublicStorageRoot, getUploadsRoot, moveLegacyPublicUploads } from '../src/services/uploads.js';

const args = process.argv.slice(2);
let apply = false;
let from = getLegacyPublicStorageRoot();
let to = getUploadsRoot();
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--apply') apply = true;
  else if (a === '--dry-run') apply = false;
  else if (a === '--from') from = args[++i];
  else if (a === '--to') to = args[++i];
  else {
    console.error(`Unknown argument: ${a}`);
    console.error('Usage: npx tsx scripts/move-public-uploads.ts [--dry-run | --apply] [--from DIR] [--to DIR]');
    process.exit(2);
  }
}

const r = moveLegacyPublicUploads({ from, to, dryRun: !apply, log: (line) => console.log(line) });
if (!apply) console.log('Dry run only; use --apply to move.');
process.exit(r.errors > 0 ? 1 : 0);
