/**
 * Evolution Measure API - Frontend proxy
 * POST /api/evolution/:agentId/measure/:evolutionId - measure an evolution's impact. Owner only (backend).
 *
 * FU-02: Next 16 params are awaited, both ids are checked and encoded, no
 * body is forwarded, and the backend status code is kept (403, 404).
 */

import { invalidEvolutionId, proxyProposalRequest } from '@/lib/evolution/proposal-proxy';
import { isAgentId } from '@/lib/evolution/proposal-review';
import { evolutionPath, isEvolutionId } from '@/lib/evolution/evolution-requests';

export const runtime = 'nodejs';

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ agentId: string; evolutionId: string }> }
) {
    const { agentId, evolutionId } = await params;
    if (!isAgentId(agentId) || !isEvolutionId(evolutionId)) return invalidEvolutionId();
    return proxyProposalRequest(evolutionPath(agentId, 'measure', evolutionId), { method: 'POST', body: {} });
}
