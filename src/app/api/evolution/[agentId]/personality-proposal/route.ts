/**
 * Evolution personality-proposal trigger - Frontend proxy (FU-01)
 * POST /api/evolution/:agentId/personality-proposal  body { windowDays? 1..90 }
 * Files at most one pending personality proposal. Owner only (backend).
 */

import { NextResponse } from 'next/server';
import { readJsonBody, proxyProposalRequest } from '@/lib/evolution/proposal-proxy';
import { isAgentId, pickPersonalityTriggerBody } from '@/lib/evolution/proposal-review';

export const runtime = 'nodejs';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ agentId: string }> }
) {
    const { agentId } = await params;
    if (!isAgentId(agentId)) return NextResponse.json({ error: 'Invalid agent id' }, { status: 400 });
    const body = pickPersonalityTriggerBody(await readJsonBody(req));
    return proxyProposalRequest(`/api/evolution/${encodeURIComponent(agentId)}/personality-proposal`, { method: 'POST', body: { ...body } });
}
