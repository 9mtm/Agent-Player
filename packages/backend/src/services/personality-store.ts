/**
 * Versioned agent personality storage (CORE-01).
 *
 * The database (agent_personality_versions, migration 056) is canonical.
 * Every change appends a version; the current personality is the highest
 * version. PERSONALITY.md keeps a generated, readable copy of the current
 * version between markers; hand-written text in that file is kept.
 *
 * Personality never grants tools or permissions (see services/personality.ts).
 */

import { getDatabase } from '../db/index.js';
import { readPersonality, writePersonality } from './agent-files.js';
import {
  DEFAULT_DIALECT,
  DEFAULT_TRAITS,
  PRESETS,
  PersonalityInputError,
  boundedDrift,
  isDialect,
  renderPersonalityExport,
  upsertPersonalityExport,
  validateLockedTraits,
  validateTraitPatch,
  validateTraits,
  type Dialect,
  type TraitName,
  type Traits,
} from './personality.js';

export type PersonalitySource = 'default' | 'seed' | 'owner' | 'rollback' | 'lock' | 'unlock' | 'evolution';

export interface PersonalityVersion {
  agentId: string;
  /** 0 = not stored yet (defaults). */
  version: number;
  traits: Traits;
  preset: string | null;
  dialect: Dialect;
  locked: boolean;
  lockedTraits: TraitName[];
  source: PersonalitySource;
  basedOnVersion: number | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string | null;
}

/** Thrown when a change is refused because the personality is locked. */
export class PersonalityLockedError extends Error {}
/** Thrown when the agent or version does not exist. */
export class PersonalityNotFoundError extends Error {}

interface Row {
  agent_id: string;
  version: number;
  traits: string;
  preset: string | null;
  dialect: string;
  locked: number;
  locked_traits: string;
  source: string;
  based_on_version: number | null;
  note: string | null;
  created_by: string;
  created_at: string;
}

function fromRow(row: Row): PersonalityVersion {
  let traits: Traits;
  try { traits = validateTraits(JSON.parse(row.traits)); } catch { traits = { ...DEFAULT_TRAITS }; }
  let lockedTraits: TraitName[] = [];
  try { lockedTraits = validateLockedTraits(JSON.parse(row.locked_traits)); } catch { lockedTraits = []; }
  return {
    agentId: row.agent_id,
    version: row.version,
    traits,
    preset: row.preset,
    dialect: isDialect(row.dialect) ? row.dialect : DEFAULT_DIALECT,
    locked: row.locked === 1,
    lockedTraits,
    source: row.source as PersonalitySource,
    basedOnVersion: row.based_on_version,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function defaults(agentId: string): PersonalityVersion {
  return {
    agentId, version: 0, traits: { ...DEFAULT_TRAITS }, preset: null, dialect: DEFAULT_DIALECT,
    locked: false, lockedTraits: [], source: 'default', basedOnVersion: null, note: null, createdBy: null, createdAt: null,
  };
}

export function agentExists(agentId: string): boolean {
  return !!getDatabase().prepare('SELECT 1 FROM agents_config WHERE id = ?').get(agentId);
}

/** Current personality, or defaults (version 0) when nothing is stored. Null if the agent does not exist. */
export function getCurrentPersonality(agentId: string): PersonalityVersion | null {
  if (!agentExists(agentId)) return null;
  const row = getDatabase()
    .prepare('SELECT * FROM agent_personality_versions WHERE agent_id = ? ORDER BY version DESC LIMIT 1')
    .get(agentId) as Row | undefined;
  return row ? fromRow(row) : defaults(agentId);
}

export function listPersonalityVersions(agentId: string): PersonalityVersion[] | null {
  if (!agentExists(agentId)) return null;
  const rows = getDatabase()
    .prepare('SELECT * FROM agent_personality_versions WHERE agent_id = ? ORDER BY version DESC')
    .all(agentId) as Row[];
  return rows.map(fromRow);
}

interface NewVersion {
  traits: Traits;
  preset: string | null;
  dialect: Dialect;
  locked: boolean;
  lockedTraits: TraitName[];
  source: Exclude<PersonalitySource, 'default'>;
  basedOnVersion: number | null;
  note: string | null;
}

/** Append a version atomically (next number computed inside the transaction). */
function appendVersion(agentId: string, createdBy: string, v: NewVersion): PersonalityVersion {
  const db = getDatabase();
  // DatabaseManager.transaction runs the function at once inside a transaction.
  const version = db.transaction(() => {
    const max = (db.prepare('SELECT MAX(version) AS v FROM agent_personality_versions WHERE agent_id = ?').get(agentId) as { v: number | null }).v ?? 0;
    const version = max + 1;
    db.prepare(`
      INSERT INTO agent_personality_versions
        (agent_id, version, traits, preset, dialect, locked, locked_traits, source, based_on_version, note, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(agentId, version, JSON.stringify(v.traits), v.preset, v.dialect, v.locked ? 1 : 0,
      JSON.stringify(v.lockedTraits), v.source, v.basedOnVersion, v.note, createdBy);
    return version;
  });
  const row = db.prepare('SELECT * FROM agent_personality_versions WHERE agent_id = ? AND version = ?').get(agentId, version) as Row;
  return fromRow(row);
}

function validNote(note: unknown): string | null {
  if (note === undefined || note === null) return null;
  if (typeof note !== 'string' || note.length > 500) throw new PersonalityInputError('note must be a string of at most 500 characters');
  return note.trim() || null;
}

export interface SaveInput {
  traits?: unknown;
  preset?: unknown;
  dialect?: unknown;
  lockedTraits?: unknown;
  note?: unknown;
}

/**
 * Owner saves a new version. Start values: the chosen preset, else the
 * current traits; then the given traits override. Refused while locked.
 */
export function savePersonalityVersion(agentId: string, input: SaveInput, createdBy: string): PersonalityVersion {
  const allowed = new Set(['traits', 'preset', 'dialect', 'lockedTraits', 'note']);
  for (const k of Object.keys(input || {})) {
    if (!allowed.has(k)) throw new PersonalityInputError(`Unknown field: ${k.slice(0, 40)}`);
  }
  const current = getCurrentPersonality(agentId);
  if (!current) throw new PersonalityNotFoundError('Agent not found');
  if (current.locked) throw new PersonalityLockedError('Personality is locked; unlock it first');

  let preset: string | null = current.preset;
  let base: Traits = current.traits;
  if (input.preset !== undefined) {
    if (input.preset === null) {
      preset = null;
    } else if (typeof input.preset === 'string' && Object.prototype.hasOwnProperty.call(PRESETS, input.preset)) {
      preset = input.preset;
      base = { ...PRESETS[input.preset].traits };
    } else {
      throw new PersonalityInputError('Unknown preset');
    }
  }
  if (input.traits === undefined && input.preset === undefined && input.dialect === undefined && input.lockedTraits === undefined) {
    throw new PersonalityInputError('Nothing to save');
  }
  // The preset is the starting point; traits given here override it.
  const traits = validateTraits({ ...base, ...validateTraitPatch(input.traits) });

  let dialect: Dialect = current.dialect;
  if (input.dialect !== undefined) {
    if (!isDialect(input.dialect)) throw new PersonalityInputError('Unsupported dialect');
    dialect = input.dialect;
  }
  const lockedTraits = input.lockedTraits === undefined ? current.lockedTraits : validateLockedTraits(input.lockedTraits);

  return appendVersion(agentId, createdBy, {
    traits, preset, dialect, locked: false, lockedTraits, source: 'owner',
    basedOnVersion: current.version || null, note: validNote(input.note),
  });
}

/** Lock or unlock the whole personality. Adds a version (history stays complete). */
export function setPersonalityLocked(agentId: string, locked: boolean, createdBy: string): PersonalityVersion {
  const current = getCurrentPersonality(agentId);
  if (!current) throw new PersonalityNotFoundError('Agent not found');
  if (current.locked === locked) return current;
  return appendVersion(agentId, createdBy, {
    traits: current.traits, preset: current.preset, dialect: current.dialect, locked,
    lockedTraits: current.lockedTraits, source: locked ? 'lock' : 'unlock',
    basedOnVersion: current.version || null, note: null,
  });
}

/** Roll back: a new version with the traits, preset and dialect of an older one. Refused while locked. */
export function rollbackPersonality(agentId: string, toVersion: unknown, createdBy: string): PersonalityVersion {
  if (typeof toVersion !== 'number' || !Number.isInteger(toVersion) || toVersion < 1) {
    throw new PersonalityInputError('version must be a positive integer');
  }
  const current = getCurrentPersonality(agentId);
  if (!current) throw new PersonalityNotFoundError('Agent not found');
  if (current.locked) throw new PersonalityLockedError('Personality is locked; unlock it first');
  const row = getDatabase()
    .prepare('SELECT * FROM agent_personality_versions WHERE agent_id = ? AND version = ?')
    .get(agentId, toVersion) as Row | undefined;
  if (!row) throw new PersonalityNotFoundError('Version not found');
  const target = fromRow(row);
  return appendVersion(agentId, createdBy, {
    traits: target.traits, preset: target.preset, dialect: target.dialect, locked: false,
    lockedTraits: target.lockedTraits, source: 'rollback', basedOnVersion: target.version,
    note: `rollback to version ${target.version}`,
  });
}

/**
 * Slow drift from verified outcomes (for Evolution). Bounded per step,
 * never touches locked traits, refused while the personality is locked.
 */
export function applyPersonalityDrift(agentId: string, proposed: unknown, createdBy: string, maxStep = 5): PersonalityVersion {
  const current = getCurrentPersonality(agentId);
  if (!current) throw new PersonalityNotFoundError('Agent not found');
  if (current.locked) throw new PersonalityLockedError('Personality is locked; unlock it first');
  const step = Math.max(1, Math.min(10, Math.floor(maxStep)));
  const traits = boundedDrift(current.traits, validateTraitPatch(proposed), current.lockedTraits, step);
  return appendVersion(agentId, createdBy, {
    traits, preset: current.preset, dialect: current.dialect, locked: false,
    lockedTraits: current.lockedTraits, source: 'evolution', basedOnVersion: current.version || null, note: null,
  });
}

/** Write the readable copy of the current version into PERSONALITY.md. */
export async function exportPersonalityFile(p: PersonalityVersion): Promise<void> {
  const existing = await readPersonality(p.agentId);
  await writePersonality(p.agentId, upsertPersonalityExport(existing, renderPersonalityExport(p)));
}
