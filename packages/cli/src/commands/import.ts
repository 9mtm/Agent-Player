/**
 * `agent-player import <files...>` (CLI-02): safe import of selected readable
 * text files (Markdown / plain text), e.g. assistant exports from Claude Code,
 * Codex or ChatGPT that the owner names explicitly.
 *
 *   1. read only the named files (folders only with --recursive, same filters)
 *   2. send them to the backend pipeline (the same API as the web UI), which
 *      redacts secrets and returns an immutable sanitized preview
 *   3. show the summary: files, redactions per type, items per drawer
 *   4. ask for confirmation (or --yes); --dry-run discards the preview
 *   5. commit: items land as memory proposals (quarantine) for owner approval
 *
 * Never prints file content or secret values (only counts and types).
 * `--rollback <batch>` undoes an import (removes its not-yet-approved proposals).
 */

import chalk from 'chalk';
import { randomBytes } from 'crypto';
import { ApiClient } from '../utils/api-client.js';
import { ask } from '../utils/prompt.js';
import { selectFiles } from '../utils/import-files.js';

export const IMPORT_SOURCES = ['claude-code', 'codex', 'chatgpt', 'text'] as const;

/** What to pass for each assistant export. Hints only: nothing is searched for or read automatically. */
export const SOURCE_HINTS: Record<string, string> = {
  'claude-code': 'Name the Markdown files to import, e.g. a CLAUDE.md or a memory .md file you exported. Settings, hooks, sessions and credentials are never imported.',
  codex: 'Name the Markdown files to import, e.g. an AGENTS.md you choose. config.toml, sessions and tokens are never imported.',
  chatgpt: 'Name readable export documents (.md / .txt). Structured conversations (conversations.json, .zip) come in a later release.',
  text: 'Name UTF-8 Markdown (.md) or plain text (.txt) files.',
};

export interface ImportOptions {
  from?: string;
  drawer?: string;
  dryRun?: boolean;
  recursive?: boolean;
  yes?: boolean;
  redactEmails?: boolean;
  redactPhones?: boolean;
  rollback?: string;
}

export interface ImportDeps {
  ask?: (q: string) => Promise<string>;
  log?: (msg: string) => void;
  client?: ApiClient;
  cwd?: string;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Text from the server or the file system is shown without control characters. */
function safe(s: unknown): string {
  return String(s ?? '').replace(/[\u0000-\u001f\u007f-\u009f]/g, '').slice(0, 300);
}

export async function importCommand(paths: string[], options: ImportOptions = {}, deps: ImportDeps = {}): Promise<number> {
  const log = deps.log ?? ((m: string) => console.log(m));
  const client = deps.client ?? new ApiClient();

  if (options.rollback) {
    try {
      const r = await client.importCancel(options.rollback);
      if (r?.status === 'cancelled') log(chalk.green('Import preview discarded. Nothing was imported.'));
      else {
        log(chalk.green(`Import rolled back: ${plural(r?.removedProposals ?? 0, 'pending proposal')} removed.`));
        const kept = Array.isArray(r?.approvedKept) ? r.approvedKept : [];
        if (kept.length) log(chalk.yellow(`${plural(kept.length, 'approved item')} stay in memory; forget them one by one if you want them gone.`));
      }
      return 0;
    } catch (err: any) {
      log(chalk.red(safe(err?.message || 'Rollback failed')));
      return 1;
    }
  }

  const source = options.from ?? 'text';
  if (!(IMPORT_SOURCES as readonly string[]).includes(source)) {
    log(chalk.red(`--from must be one of: ${IMPORT_SOURCES.join(', ')}`));
    return 1;
  }
  if (!paths.length) {
    log(chalk.red('Name the files to import.'));
    log(chalk.gray(SOURCE_HINTS[source]));
    return 1;
  }

  const selection = selectFiles(paths, { recursive: options.recursive, cwd: deps.cwd });
  for (const s of selection.skipped) log(chalk.yellow(`  skipped ${safe(s.path)}: ${safe(s.reason)}`));
  if (!selection.files.length) {
    log(chalk.red('No readable text files to import.'));
    log(chalk.gray(SOURCE_HINTS[source]));
    return 1;
  }
  log(chalk.gray(`Reading ${plural(selection.files.length, 'file')} (only the files you named). Sending to the backend for a redacted preview...`));

  let view: any;
  try {
    view = await client.importPreview({
      files: selection.files.map((f) => ({ name: f.name, contentBase64: f.bytes.toString('base64') })),
      source,
      ...(options.drawer ? { drawer: options.drawer } : {}),
      ...(options.redactEmails !== undefined ? { redactEmails: options.redactEmails } : {}),
      ...(options.redactPhones !== undefined ? { redactPhones: options.redactPhones } : {}),
    });
  } catch (err: any) {
    log(chalk.red(safe(err?.message || 'Preview failed')));
    return 1;
  }

  // Summary only: counts and types, never the text or a secret value.
  log('');
  log(chalk.bold(`Preview ${safe(view.batchId)} (version ${view.version})`));
  for (const f of view.files ?? []) {
    const label = f.outcome === 'eligible' ? chalk.green('ok') : f.outcome === 'blocked' ? chalk.red('blocked') : chalk.yellow('unsupported');
    log(`  ${label}  ${safe(f.name)}${f.outcome === 'eligible' ? `  ${plural(f.items, 'item')}` : `  ${safe(f.reason)}`}`);
  }
  const red = view.summary?.redactions ?? {};
  const redTypes = Object.keys(red).sort();
  log(redTypes.length
    ? `Redacted: ${redTypes.map((t) => `${safe(t)} ${red[t]}`).join(', ')}`
    : 'Redacted: nothing found (the scan is a precaution, not a guarantee)');
  const byDrawer = view.summary?.byDrawer ?? {};
  const drawers = Object.keys(byDrawer).sort();
  log(`Items: ${view.summary?.items?.included ?? 0} selected of ${view.summary?.items?.total ?? 0}` +
    `${view.summary?.items?.duplicates ? ` (${view.summary.items.duplicates} duplicates skipped)` : ''}`);
  for (const d of drawers) log(`  ${safe(d)}: ${byDrawer[d]}`);

  const included = view.summary?.items?.included ?? 0;
  const discard = async (msg: string) => {
    try { await client.importCancel(view.batchId); } catch { /* it expires on its own */ }
    log(msg);
  };
  if (options.dryRun) {
    await discard(chalk.gray('Dry run: preview discarded, nothing imported.'));
    return 0;
  }
  if (!included) {
    await discard(chalk.yellow('Nothing to import.'));
    return 1;
  }
  if (!options.yes) {
    const answer = (await (deps.ask ?? ask)(`Put ${plural(included, 'item')} in the review queue (memory proposals)? [y/N] `)).toLowerCase();
    if (answer !== 'y' && answer !== 'yes') {
      await discard(chalk.gray('Cancelled: preview discarded, nothing imported.'));
      return 1;
    }
  }
  try {
    const receipt = await client.importCommit(view.batchId, {
      version: view.version, contentHash: view.contentHash, operationKey: randomBytes(16).toString('hex'), confirm: true,
    });
    const n = Array.isArray(receipt?.proposals) ? receipt.proposals.length : 0;
    log(chalk.green(`Imported to quarantine: ${plural(n, 'proposal')} waiting for your approval (Memory > Proposals). Nothing is recalled until you approve.`));
    log(chalk.gray(`Undo: agent-player import --rollback ${safe(view.batchId)}`));
    return 0;
  } catch (err: any) {
    log(chalk.red(safe(err?.message || 'Import failed')));
    return 1;
  }
}
