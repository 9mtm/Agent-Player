/**
 * Evolution Proposal decision API - Frontend proxy (FU-01)
 * POST /api/evolution/:agentId/proposals/:proposalId/{approve|reject|cancel}
 * body { expectedReviewHash, note? (reject only) }. Owner only (backend).
 */

import { readJsonBody, invalidId, proxyProposalRequest } from '@/lib/evolution/proposal-proxy';
import { isAgentId, isDecisionAction, isProposalId, pickDecisionBody, proposalPath } from '@/lib/evolution/proposal-review';

export const runtime = 'nodejs';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ agentId: string; proposalId: string; action: string }> }
) {
    const { agentId, proposalId, action } = await params;
    if (!isAgentId(agentId) || !isProposalId(proposalId) || !isDecisionAction(action)) return invalidId();
    const body = pickDecisionBody('evolution', action, await readJsonBody(req));
    return proxyProposalRequest(proposalPath('evolution', agentId, proposalId, action), { method: 'POST', body: { ...body } });
}
