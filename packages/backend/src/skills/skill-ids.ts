/**
 * Validation for skill identifiers that reach the file system or the
 * marketplace source path. Anything that could escape the skills directory
 * (separators, "..", control characters, absolute paths) is rejected.
 */

/** Skill name / registry id / local file stem: letters, digits, '.', '_', '-'. */
const SKILL_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

/** Marketplace row id, e.g. `skill_<32 hex>`. */
const INSTALLED_SKILL_ID_RE = /^skill_[a-f0-9]{32}$/;

/** One path segment of a marketplace source path. */
const PATH_SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

export function isValidSkillName(value: unknown): value is string {
  return typeof value === 'string' && SKILL_NAME_RE.test(value) && !value.includes('..');
}

export function isValidInstalledSkillId(value: unknown): value is string {
  return typeof value === 'string' && INSTALLED_SKILL_ID_RE.test(value);
}

/**
 * A repository-relative source path such as `skills/document/pdf`.
 * Must start with `skills/`, use only safe segments and contain no `..`.
 */
export function isValidSkillSourcePath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 300) return false;
  const parts = value.split('/');
  if (parts.length < 2 || parts.length > 6 || parts[0] !== 'skills') return false;
  return parts.every((p) => PATH_SEGMENT_RE.test(p) && !p.includes('..'));
}
