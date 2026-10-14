/**
 * Personality Proposal detail API - Frontend proxy (FU-01)
 * GET /api/agents/:id/personality/proposals/:pid -> proposal
 */

import { invalidId, proxyProposalRequest } from '@/lib/evolution/proposal-proxy';
import { isAgentId, isProposalId, proposalPath } from '@/lib/evolution/proposal-review';

export const runtime = 'nodejs';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string; pid: string }> }
) {
    const { id, pid } = await params;
    if (!isAgentId(id) || !isProposalId(pid)) return invalidId();
    return proxyProposalRequest(proposalPath('personality', id, pid));
}
