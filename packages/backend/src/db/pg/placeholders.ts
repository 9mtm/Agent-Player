/**
 * `?` -> `$n` placeholder conversion (B2.2a).
 *
 * The repositories write SQL with SQLite-style `?` placeholders; node-postgres
 * wants `$1, $2, ...`. This scanner converts every `?` that is a placeholder
 * and leaves alone every `?` inside:
 *
 *   'string literals'            ('' escapes a quote)
 *   E'escape strings'            (backslash escapes, E or e prefix)
 *   "quoted identifiers"         ("" escapes a quote)
 *   `backtick identifiers`       (SQLite style)
 *   $tag$ dollar-quoted bodies $tag$   ($$ ... $$ too)
 *   -- line comments
 *   /* block comments *\/        (nested, as PostgreSQL allows)
 *
 * Refused (PlaceholderError): numbered `?NNN` (SQLite only), SQL that mixes
 * `?` with `$n`, and unterminated quotes/comments. It is a lexer, not a
 * parser: it never rewrites anything but placeholders.
 */

export class PlaceholderError extends Error {}

export interface ConvertedSql {
  text: string;
  /** Number of placeholders found (the number of parameters the SQL needs). */
  count: number;
}

const IDENT_START = /[A-Za-z_\u0080-￿]/;
const IDENT_CHAR = /[A-Za-z0-9_\u0080-￿]/;

function endOfSimpleQuoted(sql: string, start: number, quote: string): number {
  // Returns the index just after the closing quote; doubled quote = escaped.
  for (let i = start + 1; i < sql.length; i++) {
    if (sql[i] === quote) {
      if (sql[i + 1] === quote) { i++; continue; }
      return i + 1;
    }
  }
  throw new PlaceholderError(`unterminated ${quote === "'" ? 'string literal' : 'quoted identifier'}`);
}

function endOfEscapeString(sql: string, start: number): number {
  // start points at the opening quote of E'...'.
  for (let i = start + 1; i < sql.length; i++) {
    const c = sql[i];
    if (c === '\\') { i++; continue; }
    if (c === "'") {
      if (sql[i + 1] === "'") { i++; continue; }
      return i + 1;
    }
  }
  throw new PlaceholderError('unterminated escape string literal');
}

function endOfBlockComment(sql: string, start: number): number {
  let depth = 0;
  for (let i = start; i < sql.length; i++) {
    if (sql[i] === '/' && sql[i + 1] === '*') { depth++; i++; continue; }
    if (sql[i] === '*' && sql[i + 1] === '/') {
      depth--; i++;
      if (depth === 0) return i + 1;
    }
  }
  throw new PlaceholderError('unterminated block comment');
}

/** `$tag$` at i (tag may be empty); returns the tag delimiter or null. */
function dollarTagAt(sql: string, i: number): string | null {
  if (sql[i] !== '$') return null;
  let j = i + 1;
  if (sql[j] === '$') return '$$';
  if (!IDENT_START.test(sql[j] ?? '')) return null;
  while (j < sql.length && IDENT_CHAR.test(sql[j]) && sql[j] !== '$') j++;
  return sql[j] === '$' ? sql.slice(i, j + 1) : null;
}

export function convertPlaceholders(sql: string): ConvertedSql {
  let out = '';
  let count = 0;
  let sawDollarParam = false;
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const prev = i > 0 ? sql[i - 1] : '';

    if (c === "'") {
      const isEscape = (prev === 'E' || prev === 'e') && !(i >= 2 && IDENT_CHAR.test(sql[i - 2]));
      const j = isEscape ? endOfEscapeString(sql, i) : endOfSimpleQuoted(sql, i, "'");
      out += sql.slice(i, j); i = j; continue;
    }
    if (c === '"' || c === '`') {
      const j = endOfSimpleQuoted(sql, i, c);
      out += sql.slice(i, j); i = j; continue;
    }
    if (c === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      const j = nl < 0 ? sql.length : nl;
      out += sql.slice(i, j); i = j; continue;
    }
    if (c === '/' && sql[i + 1] === '*') {
      const j = endOfBlockComment(sql, i);
      out += sql.slice(i, j); i = j; continue;
    }
    if (c === '$') {
      if (/\d/.test(sql[i + 1] ?? '') && !IDENT_CHAR.test(prev)) {
        sawDollarParam = true;
        out += c; i++; continue;
      }
      const tag = IDENT_CHAR.test(prev) ? null : dollarTagAt(sql, i);
      if (tag) {
        const close = sql.indexOf(tag, i + tag.length);
        if (close < 0) throw new PlaceholderError('unterminated dollar-quoted string');
        const j = close + tag.length;
        out += sql.slice(i, j); i = j; continue;
      }
    }
    if (c === '?') {
      if (/\d/.test(sql[i + 1] ?? '')) throw new PlaceholderError('numbered ?NNN placeholders are not supported; use ?');
      count++;
      out += `$${count}`;
      i++; continue;
    }
    out += c; i++;
  }
  if (count > 0 && sawDollarParam) throw new PlaceholderError('SQL mixes ? and $n placeholders');
  return { text: out, count };
}

/** Just the converted text. */
export function toPgPlaceholders(sql: string): string {
  return convertPlaceholders(sql).text;
}
