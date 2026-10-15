/**
 * Company setup: team catalogue and team proposal (ONBOARD-TEAM-01). Owner
 * only (auth gate owner tier + handler check). Both routes only read: the plan
 * proposes names without reserving them, and nothing is created here. The UI
 * hires each reviewed proposal with POST /api/agents.
 *
 *   GET  /api/onboarding/team-catalogue  -> { sizes: [{id,label}], departments: [{id,label,summary}], maxDepartments, maxCustomDepartments }
 *   POST /api/onboarding/team-plan       { size, departments: string[], language? }
 *                                        -> { size, language, hires: [{department, departmentLabel, role, title, description, preset, name}] }
 *                                        400 { error, code: 'invalid_plan' }
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authorizeActiveRole } from '../../auth/route-guards.js';
import {
  COMPANY_SIZES, COMPANY_SIZE_LABELS, CompanyPlanInputError, DEPARTMENTS, MAX_CUSTOM_DEPARTMENTS, MAX_DEPARTMENTS, planCompany,
} from '../../services/company-plan.js';

const OWNER_ONLY = ['owner'] as const;
const owner = (request: FastifyRequest, reply: FastifyReply) => authorizeActiveRole(request, reply, OWNER_ONLY);

export async function teamPlanRoutes(fastify: FastifyInstance) {
  const config = { access: 'owner' as const };

  fastify.get('/api/onboarding/team-catalogue', { config }, async (request, reply) => {
    if (owner(request, reply) === null) return reply;
    return {
      sizes: COMPANY_SIZES.map((id) => ({ id, label: COMPANY_SIZE_LABELS[id] })),
      departments: DEPARTMENTS.map(({ id, label, summary }) => ({ id, label, summary })),
      maxDepartments: MAX_DEPARTMENTS,
      maxCustomDepartments: MAX_CUSTOM_DEPARTMENTS,
    };
  });

  fastify.post<{ Body: unknown }>('/api/onboarding/team-plan', { config }, async (request, reply) => {
    if (owner(request, reply) === null) return reply;
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply.code(400).send({ error: 'Invalid body', code: 'invalid_plan' });
    const unknown = Object.keys(body).find((k) => !['size', 'departments', 'language'].includes(k));
    if (unknown) return reply.code(400).send({ error: `Unknown field "${unknown.slice(0, 40)}"`, code: 'invalid_plan' });
    try {
      return await planCompany(body as Record<string, unknown>);
    } catch (err) {
      if (err instanceof CompanyPlanInputError) return reply.code(400).send({ error: err.message, code: 'invalid_plan' });
      throw err;
    }
  });
}
