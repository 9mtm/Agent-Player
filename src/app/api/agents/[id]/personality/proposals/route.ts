/**
 * Personality Proposals API - Frontend proxy (FU-01)
 * GET /api/agents/:id/personality/proposals[?status=] -> { agentId, proposals }
 */

import { NextResponse } from 'next/server';
import { proxyProposalRequest } from '@/lib/evolution/proposal-proxy';
import { isAgentId, proposalPath, statusQuery } from '@/lib/evolution/proposal-review';

export const runtime = 'nodejs';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!isAgentId(id)) return NextResponse.json({ error: 'Invalid agent id' }, { status: 400 });
    const status = statusQuery(new URL(req.url).searchParams.get('status'));
    const path = proposalPath('personality', id) + (status ? `?status=${status}` : '');
    return proxyProposalRequest(path);
}
