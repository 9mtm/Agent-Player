/**
 * Evolution Proposals API - Frontend proxy (FU-01)
 * GET /api/evolution/:agentId/proposals[?status=] -> { agentId, proposals, total }
 */

import { NextResponse } from 'next/server';
import { proxyProposalRequest } from '@/lib/evolution/proposal-proxy';
import { isAgentId, proposalPath, statusQuery } from '@/lib/evolution/proposal-review';

export const runtime = 'nodejs';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ agentId: string }> }
) {
    const { agentId } = await params;
    if (!isAgentId(agentId)) return NextResponse.json({ error: 'Invalid agent id' }, { status: 400 });
    const status = statusQuery(new URL(req.url).searchParams.get('status'));
    const path = proposalPath('evolution', agentId) + (status ? `?status=${status}` : '');
    return proxyProposalRequest(path);
}
