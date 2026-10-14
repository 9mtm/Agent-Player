/**
 * Evolution Analyze API - Frontend proxy
 * POST /api/evolution/:agentId/analyze  body { periodDays? }. Owner only (backend).
 *
 * FU-02: Next 16 params are awaited, the id is checked and encoded, only
 * periodDays is forwarded, and the backend status code is kept (403 owner only).
 */

import { invalidEvolutionId, proxyProposalRequest, readJsonBody } from '@/lib/evolution/proposal-proxy';
import { isAgentId } from '@/lib/evolution/proposal-review';
import { evolutionPath, pickAnalyzeBody } from '@/lib/evolution/evolution-requests';

export const runtime = 'nodejs';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ agentId: string }> }
) {
    const { agentId } = await params;
    if (!isAgentId(agentId)) return invalidEvolutionId();
    const body = pickAnalyzeBody(await readJsonBody(req));
    return proxyProposalRequest(evolutionPath(agentId, 'analyze'), { method: 'POST', body: { ...body } });
}
