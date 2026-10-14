/**
 * Evolution Rollback API - Frontend proxy
 * POST /api/evolution/:agentId/rollback/:evolutionId. Owner only (backend).
 *
 * FU-02: Next 16 params are awaited, both ids are checked and encoded, no
 * body is forwarded, and the backend status code is kept: 403 owner only,
 * 404 not found, 409 `stale` / `rollback_unsupported` / `already_rolled_back`.
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
    return proxyProposalRequest(evolutionPath(agentId, 'rollback', evolutionId), { method: 'POST', body: {} });
}
