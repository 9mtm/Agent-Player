/**
 * Automatic random unique agent names (CORE-02, D-LANG, D-AGENT-RENAME).
 *
 * - Names come from per-language lists for the 12 D-LANG languages and are
 *   picked with crypto randomness.
 * - Every name an agent is created with or renamed to is reserved in
 *   used_agent_names for good: it is never suggested or accepted again for
 *   another agent, even after that agent is deleted.
 * - A suggestion does not reserve anything; creating or renaming does.
 * - The language follows the onboarding language (onboarding_state), then
 *   the owner's onboarding language, then English.
 */

import { randomInt } from 'node:crypto';
import { all, dialect, one, run, sql, type Step } from '../repositories/sql-steps.js';
import { insertOrIgnore } from '../db/pg/dialect.js';
import { LANGUAGES } from '../onboarding/web-wizard.js';

export type NameLanguage = (typeof LANGUAGES)[number];

/** AR, EN and DE are fully populated; the other nine have a starter list (D-LANG beta). */
export const AGENT_NAME_LISTS: Readonly<Record<NameLanguage, readonly string[]>> = Object.freeze({
  ar: [
    'سند', 'نور', 'رافد', 'ضياء', 'أمل', 'وفاء', 'صفاء', 'هدى', 'رشد', 'فرات',
    'بيان', 'إلهام', 'سراج', 'نبراس', 'مرام', 'رجاء', 'وسام', 'جود', 'ريان', 'يمان',
    'غيث', 'نجم', 'شهاب', 'بدر', 'سهيل', 'زين', 'ليث', 'فجر', 'شروق', 'أفق',
    'مدى', 'رؤى', 'سما', 'لمى', 'ندى', 'تالا', 'جنى', 'دانة', 'لين', 'ريم',
    'يارا', 'أريج', 'عبير', 'وئام', 'سلام', 'إياد', 'أنس', 'باسل', 'رامي', 'سامر',
    'فراس', 'مازن', 'نزار', 'هادي', 'يزن', 'كرم', 'منار', 'دجلة', 'سراب', 'حنين',
    'راية', 'نسيم', 'وضاح', 'بشرى', 'أثير',
  ],
  en: [
    'Atlas', 'Juniper', 'Rowan', 'Sage', 'Quinn', 'Harper', 'Ellis', 'Arden', 'Blake', 'Casey',
    'Dakota', 'Emery', 'Finley', 'Gray', 'Hollis', 'Indigo', 'Jules', 'Kai', 'Lane', 'Morgan',
    'Nova', 'Oakley', 'Parker', 'Reese', 'Riley', 'Rory', 'Skyler', 'Tatum', 'Wren', 'Avery',
    'Bailey', 'Cameron', 'Drew', 'Eden', 'Frankie', 'Hayden', 'Jordan', 'Kendall', 'Logan', 'Marlowe',
    'Noel', 'Peyton', 'Remy', 'Sawyer', 'Sloane', 'Taylor', 'Winter', 'Ash', 'Bryn', 'Charlie',
    'Darcy', 'Ember', 'Fern', 'Hazel', 'Iris', 'Jasper', 'Linden', 'Milo', 'Orion', 'Piper',
    'Robin', 'Sterling', 'Ellery', 'Shiloh', 'Tobin',
  ],
  de: [
    'Anton', 'Bruno', 'Clara', 'Dora', 'Emil', 'Frieda', 'Greta', 'Hanna', 'Ida', 'Jonas',
    'Karl', 'Lena', 'Mila', 'Nora', 'Otto', 'Paula', 'Quirin', 'Rosa', 'Simon', 'Thea',
    'Ulla', 'Vera', 'Wilma', 'Xaver', 'Zora', 'Alma', 'Ben', 'Carla', 'Elias', 'Finn',
    'Gustav', 'Hugo', 'Ilse', 'Jakob', 'Kurt', 'Leni', 'Moritz', 'Nele', 'Oskar', 'Pia',
    'Rudi', 'Smilla', 'Theo', 'Uwe', 'Viktor', 'Wanda', 'Arne', 'Bela', 'Erik', 'Fritz',
    'Henrike', 'Jule', 'Konrad', 'Linus', 'Malte', 'Ole', 'Philippa', 'Ronja', 'Till', 'Wiebke',
    'Anselm', 'Edda', 'Helmut', 'Liesel', 'Volker',
  ],
  fr: [
    'Adèle', 'Bastien', 'Camille', 'Dorian', 'Élise', 'Fabien', 'Gaëlle', 'Inès', 'Léon', 'Manon',
    'Noé', 'Océane', 'Pascal', 'Rémi', 'Solène', 'Tristan', 'Valentin', 'Yvette', 'Zoé', 'Amélie',
    'Corentin', 'Margaux', 'Lucien', 'Maëlys',
  ],
  es: [
    'Alba', 'Benicio', 'Carmen', 'Diego', 'Elena', 'Fermín', 'Gael', 'Julia', 'Lucía', 'Mateo',
    'Nerea', 'Óscar', 'Paloma', 'Rocío', 'Santiago', 'Telmo', 'Valeria', 'Ximena', 'Ainhoa', 'Iker',
    'Marina', 'Pablo', 'Sol', 'Triana',
  ],
  zh: [
    '安然', '明轩', '子涵', '思远', '若曦', '浩然', '雨桐', '嘉怡', '志远', '晨曦',
    '天佑', '欣然', '一诺', '书瑶', '景行', '清扬', '知远', '慕白', '星辰', '云舒',
  ],
  ja: [
    'はると', 'さくら', 'ひなた', 'ゆうき', 'あおい', 'そら', 'れん', 'みお', 'かえで', 'ひかり',
    'はるか', 'あかり', 'つばさ', 'ゆい', 'なぎ', 'こはる', 'いぶき', 'ほのか', 'りく', 'しずく',
  ],
  ko: [
    '하늘', '서준', '지아', '도윤', '하린', '시우', '서연', '예준', '수아', '은우',
    '지호', '나래', '한결', '다온', '가람', '새봄', '이안', '로운', '소율', '윤슬',
  ],
  'pt-BR': [
    'Antônio', 'Beatriz', 'Caio', 'Davi', 'Estela', 'Flávia', 'Gustavo', 'Helena', 'Iara', 'Joaquim',
    'Lívia', 'Murilo', 'Natália', 'Otávio', 'Pietra', 'Raul', 'Sofia', 'Tiago', 'Valentina', 'Yuri',
  ],
  ru: [
    'Алёна', 'Борис', 'Вера', 'Глеб', 'Дарья', 'Егор', 'Злата', 'Игорь', 'Кира', 'Лев',
    'Мирон', 'Ника', 'Олег', 'Полина', 'Руслан', 'Светлана', 'Тимур', 'Ульяна', 'Фёдор', 'Ярослава',
  ],
  tr: [
    'Ada', 'Barış', 'Cem', 'Defne', 'Ece', 'Deniz', 'Ela', 'Emre', 'Irmak', 'Kaan',
    'Mert', 'Nehir', 'Ozan', 'Pınar', 'Selin', 'Tuna', 'Umut', 'Yağmur', 'Zeynep', 'Arda',
  ],
  hi: [
    'आरव', 'अनन्या', 'ईशान', 'कविता', 'कबीर', 'दिया', 'नील', 'प्रिया', 'रोहन', 'सान्वी',
    'तारा', 'विहान', 'अद्विक', 'मीरा', 'आदित्य', 'इरा', 'ध्रुव', 'निशा', 'अर्जुन', 'सिया',
  ],
});

export const DEFAULT_NAME_LANGUAGE: NameLanguage = 'en';
export const MAX_AGENT_NAME_LENGTH = 60;

/** Thrown for invalid input; the message is safe to return to the client. */
export class AgentNameInputError extends Error {}
/** Thrown when a name is (or was) used by another agent. */
export class AgentNameTakenError extends Error {
  constructor() { super('This name is already used or was used before by another agent. Choose another.'); }
}

export function isNameLanguage(v: unknown): v is NameLanguage {
  return typeof v === 'string' && (LANGUAGES as readonly string[]).includes(v);
}

/**
 * Uniqueness key: Unicode NFKC, lower case, single spaces; Arabic diacritics
 * and tatweel removed and alef/yaa forms unified, so near-identical spellings
 * count as the same name.
 */
export function normalizeAgentName(name: string): string {
  return name
    .normalize('NFKC')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Validated display name (trimmed, 1-60 characters, no control characters). */
export function validateAgentName(value: unknown): string {
  if (typeof value !== 'string') throw new AgentNameInputError('name must be a string');
  const name = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!name) throw new AgentNameInputError('name is required');
  if ([...name].length > MAX_AGENT_NAME_LENGTH) throw new AgentNameInputError(`name must be at most ${MAX_AGENT_NAME_LENGTH} characters`);
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩]/.test(name)) {
    throw new AgentNameInputError('name contains invalid characters');
  }
  return name;
}

/** Add the names of agents that exist now (idempotent). */
export function* syncExistingAgentNamesStep(): Step<void> {
  const d = yield* dialect();
  const rows = yield* all<{ id: string; name: string }>('SELECT id, name FROM agents_config');
  const insert = insertOrIgnore(d, `INSERT INTO used_agent_names (name_key, name, agent_id, reason) VALUES (?, ?, ?, 'existing')`);
  for (const r of rows) {
    if (typeof r.name !== 'string') continue;
    const key = normalizeAgentName(r.name);
    if (key) yield* run(insert, key, r.name, r.id);
  }
}

export function syncExistingAgentNames(): Promise<void> {
  return sql().read(syncExistingAgentNamesStep());
}

function* holderOf(key: string): Step<string | null> {
  const row = yield* one<{ agent_id: string }>('SELECT agent_id FROM used_agent_names WHERE name_key = ?', key);
  return row ? row.agent_id : null;
}

/** True when nobody holds or ever held this name (or only `agentId` itself did). */
export async function isAgentNameAvailable(name: string, agentId?: string): Promise<boolean> {
  return sql().read((function* () {
    yield* syncExistingAgentNamesStep();
    const holder = yield* holderOf(normalizeAgentName(name));
    return holder === null || (agentId !== undefined && holder === agentId);
  })());
}

/**
 * Reserve a name for an agent for good. A step: run it inside the same
 * transaction as the insert/update of agents_config. A name the same agent
 * held before may be taken back (it is still that agent's identity);
 * another agent's name, current or past, is refused. The insert skips a
 * key that exists (also one a concurrent transaction just committed on
 * PostgreSQL), and the holder is read again, so a race ends in
 * AgentNameTakenError, never in a duplicate-key error.
 */
export function* reserveAgentName(
  name: string, agentId: string,
  opts: { reason: 'create' | 'rename' | 'duplicate'; language?: string | null; reservedBy?: string | null },
): Step<void> {
  const d = yield* dialect();
  yield* syncExistingAgentNamesStep();
  const key = normalizeAgentName(name);
  if (!key) throw new AgentNameInputError('name is required');
  let holder = yield* holderOf(key);
  if (holder !== null && holder !== agentId) throw new AgentNameTakenError();
  if (holder === null) {
    const res = yield* run(insertOrIgnore(d, `
      INSERT INTO used_agent_names (name_key, name, language, agent_id, reason, reserved_by) VALUES (?, ?, ?, ?, ?, ?)
    `), key, name, opts.language ?? null, agentId, opts.reason, opts.reservedBy ?? null);
    if (res.changes !== 1) {
      holder = yield* holderOf(key);
      if (holder !== agentId) throw new AgentNameTakenError();
    }
  }
}

function* onboardingLanguage(userId: string): Step<NameLanguage | null> {
  try {
    const row = yield* one<{ answers: string }>('SELECT answers FROM onboarding_state WHERE user_id = ?', userId);
    if (!row) return null;
    const lang = JSON.parse(row.answers)?.language;
    return isNameLanguage(lang) ? lang : null;
  } catch {
    return null;
  }
}

function* namingLanguage(userId: string | null | undefined, requested?: unknown): Step<NameLanguage> {
  if (requested !== undefined && requested !== null) {
    if (!isNameLanguage(requested)) throw new AgentNameInputError('Unsupported language');
    return requested;
  }
  if (userId) {
    const own = yield* onboardingLanguage(userId);
    if (own) return own;
  }
  const owner = yield* one<{ id: string }>(`SELECT id FROM users WHERE role = 'owner' AND status = 'active' ORDER BY created_at ASC LIMIT 1`);
  return (owner && (yield* onboardingLanguage(owner.id))) || DEFAULT_NAME_LANGUAGE;
}

/** Requested language > the user's onboarding language > the owner's > English. */
export function resolveNamingLanguage(userId: string | null | undefined, requested?: unknown): Promise<NameLanguage> {
  return sql().read(namingLanguage(userId, requested));
}

export interface NameSuggestion {
  name: string;
  language: NameLanguage;
  /** True when every listed name is used and a numbered variant was returned. */
  exhausted: boolean;
}

/** Fisher-Yates with crypto randomness. */
function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A random name in `language` that no agent holds or ever held. Does not
 * reserve it. `exclude` skips names the caller already showed (e.g. the
 * current draft), so "Generate" gives a different one.
 */
export function suggestAgentName(language: NameLanguage, exclude: readonly string[] = []): Promise<NameSuggestion> {
  return sql().read(suggestAgentNameStep(language, exclude));
}

function* suggestAgentNameStep(language: NameLanguage, exclude: readonly string[]): Step<NameSuggestion> {
  yield* syncExistingAgentNamesStep();
  const used = new Set((yield* all<{ name_key: string }>('SELECT name_key FROM used_agent_names')).map((r) => r.name_key));
  return pickName(language, used, exclude);
}

/**
 * `count` different unused names in `language` (none reserved), for a team
 * proposal. One read of the used names; each pick is excluded from the next.
 */
export function suggestAgentNames(language: NameLanguage, count: number, exclude: readonly string[] = []): Promise<NameSuggestion[]> {
  return sql().read((function* () {
    yield* syncExistingAgentNamesStep();
    const used = new Set((yield* all<{ name_key: string }>('SELECT name_key FROM used_agent_names')).map((r) => r.name_key));
    const taken = [...exclude];
    const out: NameSuggestion[] = [];
    for (let i = 0; i < count; i++) {
      const next = pickName(language, used, taken);
      taken.push(next.name);
      out.push(next);
    }
    return out;
  })());
}

function pickName(language: NameLanguage, used: ReadonlySet<string>, exclude: readonly string[]): NameSuggestion {
  const skip = new Set(exclude.map(normalizeAgentName));
  const list = AGENT_NAME_LISTS[language];
  const free = list.filter((n) => !used.has(normalizeAgentName(n)) && !skip.has(normalizeAgentName(n)));
  if (free.length > 0) return { name: free[randomInt(free.length)], language, exhausted: false };

  // Every listed name is used: a listed name with a number, still never repeated.
  const sep = language === 'zh' || language === 'ja' ? '' : ' ';
  for (let attempt = 0; attempt < 200; attempt++) {
    const base = list[randomInt(list.length)];
    const candidate = `${base}${sep}${randomInt(2, attempt < 100 ? 100 : 100000)}`;
    const key = normalizeAgentName(candidate);
    if (!used.has(key) && !skip.has(key)) return { name: candidate, language, exhausted: true };
  }
  for (const base of shuffled(list)) {
    for (let n = 2; n < 1_000_000; n++) {
      const candidate = `${base}${sep}${n}`;
      const key = normalizeAgentName(candidate);
      if (!used.has(key) && !skip.has(key)) return { name: candidate, language, exhausted: true };
    }
  }
  throw new Error('No agent name available');
}

/** Validate the optional `exclude` list of a suggestion request. */
export function validateExclude(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 100 || !value.every((v) => typeof v === 'string' && v.length <= 200)) {
    throw new AgentNameInputError('exclude must be a list of at most 100 names');
  }
  return value as string[];
}
