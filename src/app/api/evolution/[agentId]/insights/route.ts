/**
 * Evolution Insights API - Frontend proxy
 * GET /api/evolution/:agentId/insights?limit=&applied=&type=&minConfidence=
 *
 * FU-02: Next 16 params are awaited, the id is checked and encoded, only the
 * documented query fields are forwarded, and the backend status code is kept.
 */

import { invalidEvolutionId, proxyProposalRequest } from '@/lib/evolution/proposal-proxy';
import { isAgentId } from '@/lib/evolution/proposal-review';
import { evolutionPath, insightsQuery } from '@/lib/evolution/evolution-requests';

export const runtime = 'nodejs';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ agentId: string }> }
) {
    const { agentId } = await params;
    if (!isAgentId(agentId)) return invalidEvolutionId();
    const q = insightsQuery(new URL(req.url).searchParams);
    return proxyProposalRequest(`${evolutionPath(agentId, 'insights')}${q}`);
}
