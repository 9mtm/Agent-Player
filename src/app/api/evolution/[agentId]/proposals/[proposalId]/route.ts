/**
 * Evolution Proposal detail API - Frontend proxy (FU-01)
 * GET /api/evolution/:agentId/proposals/:proposalId -> { proposal }
 */

import { invalidId, proxyProposalRequest } from '@/lib/evolution/proposal-proxy';
import { isAgentId, isProposalId, proposalPath } from '@/lib/evolution/proposal-review';

export const runtime = 'nodejs';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ agentId: string; proposalId: string }> }
) {
    const { agentId, proposalId } = await params;
    if (!isAgentId(agentId) || !isProposalId(proposalId)) return invalidId();
    return proxyProposalRequest(proposalPath('evolution', agentId, proposalId));
}
