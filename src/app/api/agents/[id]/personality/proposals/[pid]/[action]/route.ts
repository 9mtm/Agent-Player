/**
 * Personality Proposal decision API - Frontend proxy (FU-01)
 * POST /api/agents/:id/personality/proposals/:pid/{approve|reject|cancel}
 * body { expectedReviewHash }. Approve/reject owner only (backend).
 */

import { readJsonBody, invalidId, proxyProposalRequest } from '@/lib/evolution/proposal-proxy';
import { isAgentId, isDecisionAction, isProposalId, pickDecisionBody, proposalPath } from '@/lib/evolution/proposal-review';

export const runtime = 'nodejs';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string; pid: string; action: string }> }
) {
    const { id, pid, action } = await params;
    if (!isAgentId(id) || !isProposalId(pid) || !isDecisionAction(action)) return invalidId();
    const body = pickDecisionBody('personality', action, await readJsonBody(req));
    return proxyProposalRequest(proposalPath('personality', id, pid, action), { method: 'POST', body: { ...body } });
}
