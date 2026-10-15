// ONBOARD-TEAM-02: the role split inside one department, the same rule as
// the backend (services/company-plan.ts departmentRoles), so the review
// screen can show it while the owner edits a count. The server recomputes it.
export type TeamRole = 'manager' | 'specialist' | 'evaluator';
export type RoleCounts = Readonly<Record<TeamRole, number>>;

/** One lead per 20 people (at least one); from 4 people one reviewer per 10 (at least one); the rest specialists. */
export function rolesFor(count: number): RoleCounts {
  if (!Number.isSafeInteger(count) || count < 1) return { manager: 0, specialist: 0, evaluator: 0 };
  const manager = Math.max(1, Math.round(count / 20));
  const evaluator = count >= 4 ? Math.max(1, Math.round(count / 10)) : 0;
  return { manager, specialist: count - manager - evaluator, evaluator };
}

/** "1 lead · 85 specialists · 10 reviewers" */
export function rolesSummary(r: RoleCounts): string {
  const part = (n: number, one: string, many: string) => n ? `${n} ${n === 1 ? one : many}` : '';
  return [part(r.manager, 'lead', 'leads'), part(r.specialist, 'specialist', 'specialists'), part(r.evaluator, 'reviewer', 'reviewers')].filter(Boolean).join(' · ');
}
