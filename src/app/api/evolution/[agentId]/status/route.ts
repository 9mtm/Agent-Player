/**
 * Evolution Status API - Frontend proxy
 * GET /api/evolution/:agentId/status - evolution status, config, performance and insights
 *
 * FU-02: Next 16 params are awaited, the id is checked and encoded, and the
 * backend status code is kept (404 not set up, 403 not allowed).
 */

import { invalidEvolutionId, proxyProposalRequest } from '@/lib/evolution/proposal-proxy';
import { isAgentId } from '@/lib/evolution/proposal-review';
import { evolutionPath } from '@/lib/evolution/evolution-requests';

export const runtime = 'nodejs';

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ agentId: string }> }
) {
    const { agentId } = await params;
    if (!isAgentId(agentId)) return invalidEvolutionId();
    return proxyProposalRequest(evolutionPath(agentId, 'status'));
}
