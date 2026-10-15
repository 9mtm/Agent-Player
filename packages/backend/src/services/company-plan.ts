/**
 * Company plan for first-run setup (ONBOARD-TEAM-01, decision D-ONBOARD-TEAM).
 *
 * The owner gives a company size and picks departments; this module proposes
 * a team: per department a headcount from the size, and per hire a role, a
 * job title, a persona preset and an unused name. It only proposes. Nothing is
 * created here; the owner reviews every hire and creates them with
 * POST /api/agents, one by one.
 *
 * This file is the single reviewed source for the department catalogue and the
 * headcount rules, so the web UI and later installers share them.
 */

import { defaultPresetForRole, normalizeDepartment, type AgentRole } from './personality.js';
import { isNameLanguage, suggestAgentNames, DEFAULT_NAME_LANGUAGE, type NameLanguage } from './agent-names.js';

export const COMPANY_SIZES = ['solo', 'small', 'medium', 'large'] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

export const COMPANY_SIZE_LABELS: Readonly<Record<CompanySize, string>> = Object.freeze({
  solo: 'Just me',
  small: '2–10 people',
  medium: '11–50 people',
  large: 'More than 50 people',
});

/**
 * Roles per department by company size, in hiring order. A manager appears
 * once there is more than one agent in the department; a reviewer
 * (evaluator) is added for medium and large companies.
 */
const HEADCOUNT: Readonly<Record<CompanySize, readonly AgentRole[]>> = Object.freeze({
  solo: ['specialist'],
  small: ['manager', 'specialist'],
  medium: ['manager', 'specialist', 'specialist', 'evaluator'],
  large: ['manager', 'specialist', 'specialist', 'specialist', 'evaluator'],
});

export interface DepartmentInfo {
  id: string;
  label: string;
  /** What the department does, shown when choosing departments. */
  summary: string;
  /** Job title per role (falls back to a generic title). */
  titles: Partial<Record<AgentRole, string>>;
}

export const DEPARTMENTS: readonly DepartmentInfo[] = Object.freeze([
  { id: 'development', label: 'Development', summary: 'Builds and maintains your software.', titles: { manager: 'Engineering lead', specialist: 'Software developer', evaluator: 'Code reviewer' } },
  { id: 'marketing', label: 'Marketing', summary: 'Campaigns, content and social media.', titles: { manager: 'Marketing lead', specialist: 'Marketing specialist', evaluator: 'Brand reviewer' } },
  { id: 'sales', label: 'Sales', summary: 'Leads, offers and follow-ups.', titles: { manager: 'Sales lead', specialist: 'Sales representative', evaluator: 'Deal reviewer' } },
  { id: 'support', label: 'Customer support', summary: 'Answers customers and solves their problems.', titles: { manager: 'Support lead', specialist: 'Support agent', evaluator: 'Quality reviewer' } },
  { id: 'finance', label: 'Finance', summary: 'Invoices, budgets and reports.', titles: { manager: 'Finance lead', specialist: 'Accountant', evaluator: 'Financial auditor' } },
  { id: 'security', label: 'Security', summary: 'Checks risks, access and incidents.', titles: { manager: 'Security lead', specialist: 'Security analyst', evaluator: 'Security auditor' } },
  { id: 'operations', label: 'Operations', summary: 'Keeps daily work, tools and schedules running.', titles: { manager: 'Operations lead', specialist: 'Operations coordinator', evaluator: 'Process reviewer' } },
  { id: 'hr', label: 'People and hiring', summary: 'Hiring, onboarding and team questions.', titles: { manager: 'People lead', specialist: 'Recruiter', evaluator: 'Policy reviewer' } },
  { id: 'research', label: 'Research', summary: 'Finds and summarises information.', titles: { manager: 'Research lead', specialist: 'Researcher', evaluator: 'Fact checker' } },
  { id: 'design', label: 'Design', summary: 'Visuals, layouts and brand assets.', titles: { manager: 'Design lead', specialist: 'Designer', evaluator: 'Design reviewer' } },
  { id: 'legal', label: 'Legal', summary: 'Contracts and compliance questions.', titles: { manager: 'Legal lead', specialist: 'Legal assistant', evaluator: 'Compliance reviewer' } },
].map((d) => Object.freeze(d)));

const GENERIC_TITLE: Readonly<Record<AgentRole, string>> = Object.freeze({
  main: 'Company lead', manager: 'Team lead', specialist: 'Specialist', evaluator: 'Reviewer',
});

export const MAX_DEPARTMENTS = 12;
export const MAX_CUSTOM_DEPARTMENTS = 4;
export const MAX_PLANNED_HIRES = 60;

export class CompanyPlanInputError extends Error {}

export interface PlannedHire {
  department: string;
  departmentLabel: string;
  role: AgentRole;
  title: string;
  description: string;
  preset: string;
  name: string;
}

export interface CompanyPlan {
  size: CompanySize;
  language: NameLanguage;
  hires: PlannedHire[];
}

export interface CompanyPlanInput {
  size?: unknown;
  departments?: unknown;
  language?: unknown;
}

function catalogueEntry(id: string): DepartmentInfo | undefined {
  return DEPARTMENTS.find((d) => d.id === id);
}

/** Validated, de-duplicated department ids (catalogue ids or custom names). */
export function parseDepartments(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) throw new CompanyPlanInputError('Pick at least one department');
  if (value.length > MAX_DEPARTMENTS) throw new CompanyPlanInputError(`At most ${MAX_DEPARTMENTS} departments`);
  const out: string[] = [];
  let custom = 0;
  for (const raw of value) {
    let dep: string | null;
    try { dep = normalizeDepartment(raw); } catch { throw new CompanyPlanInputError('Each department must be a name of at most 64 characters'); }
    if (!dep) throw new CompanyPlanInputError('Department names cannot be empty');
    if (!/^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u.test(dep)) throw new CompanyPlanInputError('Department names may use letters, numbers, spaces, - and _');
    if (out.includes(dep)) continue;
    if (!catalogueEntry(dep) && ++custom > MAX_CUSTOM_DEPARTMENTS) throw new CompanyPlanInputError(`At most ${MAX_CUSTOM_DEPARTMENTS} custom departments`);
    out.push(dep);
  }
  return out;
}

export function parseSize(value: unknown): CompanySize {
  if (typeof value !== 'string' || !(COMPANY_SIZES as readonly string[]).includes(value)) {
    throw new CompanyPlanInputError(`size must be one of ${COMPANY_SIZES.join(', ')}`);
  }
  return value as CompanySize;
}

/** Roles, titles and presets for a plan, without names (pure). */
export function planRoles(size: CompanySize, departments: readonly string[]): Omit<PlannedHire, 'name'>[] {
  const hires: Omit<PlannedHire, 'name'>[] = [];
  for (const dep of departments) {
    const info = catalogueEntry(dep);
    const label = info?.label ?? dep.replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase());
    for (const role of HEADCOUNT[size]) {
      const title = info?.titles[role] ?? `${label} ${GENERIC_TITLE[role].toLowerCase()}`;
      hires.push({
        department: dep,
        departmentLabel: label,
        role,
        title,
        description: `${title} in ${label}.`,
        preset: defaultPresetForRole({ role, department: dep }) ?? 'balanced-assistant',
      });
    }
  }
  if (hires.length > MAX_PLANNED_HIRES) throw new CompanyPlanInputError(`A plan can hold at most ${MAX_PLANNED_HIRES} hires`);
  return hires;
}

/** The proposed team with unused names. Reads only; reserves nothing. */
export async function planCompany(input: CompanyPlanInput): Promise<CompanyPlan> {
  const size = parseSize(input.size);
  const departments = parseDepartments(input.departments);
  if (input.language !== undefined && !isNameLanguage(input.language)) throw new CompanyPlanInputError('Unsupported language');
  const language: NameLanguage = input.language === undefined ? DEFAULT_NAME_LANGUAGE : (input.language as NameLanguage);
  const roles = planRoles(size, departments);
  const names = await suggestAgentNames(language, roles.length);
  return { size, language, hires: roles.map((h, i) => ({ ...h, name: names[i].name })) };
}
