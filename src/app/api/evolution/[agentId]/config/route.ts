/**
 * Evolution Config API - Frontend proxy
 * PUT /api/evolution/:agentId/config  body: the documented snake_case config
 * fields only (enabled, min_confidence_threshold, min_sample_size,
 * evolution_frequency, allowed_evolutions, max_evolutions_per_cycle,
 * rollback_on_degradation, degradation_threshold). Owner only (backend).
 *
 * FU-02: Next 16 params are awaited, the id is checked and encoded, and the
 * backend status code is kept (400 no fields, 403 owner only).
 */

import { invalidEvolutionId, proxyProposalRequest, readJsonBody } from '@/lib/evolution/proposal-proxy';
import { isAgentId } from '@/lib/evolution/proposal-review';
import { evolutionPath, pickConfigBody } from '@/lib/evolution/evolution-requests';

export const runtime = 'nodejs';

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ agentId: string }> }
) {
    const { agentId } = await params;
    if (!isAgentId(agentId)) return invalidEvolutionId();
    const body = pickConfigBody(await readJsonBody(req));
    return proxyProposalRequest(evolutionPath(agentId, 'config'), { method: 'PUT', body: { ...body } });
}
