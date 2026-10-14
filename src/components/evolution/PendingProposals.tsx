'use client';

/**
 * Pending proposals (FU-01): evolution proposals and personality proposals
 * for one agent. Everything a proposal says is shown as plain text (React
 * text nodes only; no HTML, no markdown). A decision sends back the
 * reviewHash of the detail on screen; on 409 the detail is fetched again.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Lightbulb, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
    buildDecisionBody,
    decisionNotice,
    formatDelta,
    proposalPath,
    shouldRefetchDetail,
    textList,
    type DecisionAction,
    type ProposalFamily,
    type SuggestedCapability,
} from '@/lib/evolution/proposal-review';

interface ProposalRow {
    id: string;
    title?: string;
    kind?: string;
    reason?: string;
    source?: string;
    status?: string;
    createdAt?: string | null;
    delta?: Record<string, number>;
}

interface Detail {
    family: ProposalFamily;
    proposal: Record<string, any>;
}

interface PendingProposalsProps {
    agentId: string;
    /** Bump to reload the lists (after an evolve cycle). */
    refreshKey?: number;
    /** From the last evolve result; information only. */
    suggestedCapabilities?: SuggestedCapability[];
}

async function getJson(url: string, init?: RequestInit): Promise<{ status: number; ok: boolean; data: any }> {
    const res = await fetch(url, init);
    let data: any = {};
    try { data = await res.json(); } catch { data = {}; }
    return { status: res.status, ok: res.ok, data };
}

const ACTION_LABEL: Record<DecisionAction, string> = { approve: 'Approve', reject: 'Reject', cancel: 'Cancel proposal' };
const DONE_LABEL: Record<DecisionAction, string> = { approve: 'Proposal approved', reject: 'Proposal rejected', cancel: 'Proposal cancelled' };

export function PendingProposals({ agentId, refreshKey = 0, suggestedCapabilities = [] }: PendingProposalsProps) {
    const [evolution, setEvolution] = useState<ProposalRow[]>([]);
    const [personality, setPersonality] = useState<ProposalRow[]>([]);
    const [listNotice, setListNotice] = useState<{ evolution?: string; personality?: string }>({});
    const [detail, setDetail] = useState<Detail | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const loadLists = useCallback(async () => {
        const [e, p] = await Promise.all([
            getJson(`${proposalPath('evolution', agentId)}?status=pending`).catch(() => null),
            getJson(`${proposalPath('personality', agentId)}?status=pending`).catch(() => null),
        ]);
        const next: { evolution?: string; personality?: string } = {};
        if (e?.ok) setEvolution(Array.isArray(e.data.proposals) ? e.data.proposals : []);
        else { setEvolution([]); next.evolution = decisionNotice(e?.status ?? 0, e?.data?.code); }
        if (p?.ok) setPersonality(Array.isArray(p.data.proposals) ? p.data.proposals : []);
        else { setPersonality([]); next.personality = decisionNotice(p?.status ?? 0, p?.data?.code); }
        setListNotice(next);
    }, [agentId]);

    const loadDetail = useCallback(async (family: ProposalFamily, id: string) => {
        const r = await getJson(proposalPath(family, agentId, id)).catch(() => null);
        if (!r?.ok) {
            setDetail(null);
            setNotice(decisionNotice(r?.status ?? 0, r?.data?.code));
            return;
        }
        // Evolution detail is { proposal }; personality detail is the proposal itself.
        const proposal = r.data?.proposal ?? r.data;
        setDetail({ family, proposal });
    }, [agentId]);

    useEffect(() => {
        if (agentId) loadLists();
    }, [agentId, refreshKey, loadLists]);

    const open = async (family: ProposalFamily, id: string) => {
        setNotice(null);
        await loadDetail(family, id);
    };

    const decide = async (action: DecisionAction) => {
        if (!detail) return;
        const { family, proposal } = detail;
        setBusy(true);
        try {
            const r = await getJson(proposalPath(family, agentId, proposal.id, action), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildDecisionBody(family, action, String(proposal.reviewHash ?? ''))),
            });
            if (r.ok) {
                toast.success(DONE_LABEL[action]);
                setDetail(null);
                setNotice(null);
            } else {
                setNotice(decisionNotice(r.status, r.data?.code));
                if (shouldRefetchDetail(r.status)) await loadDetail(family, proposal.id);
            }
            await loadLists();
        } catch {
            setNotice(decisionNotice(0));
        } finally {
            setBusy(false);
        }
    };

    const checkDrift = async () => {
        setBusy(true);
        try {
            const r = await getJson(`/api/evolution/${encodeURIComponent(agentId)}/personality-proposal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            if (!r.ok) setNotice(decisionNotice(r.status, r.data?.code));
            else if (r.data?.status === 'proposed') { setNotice(null); toast.success('Personality proposal filed for review'); }
            else setNotice(`No personality proposal: ${String(r.data?.reason ?? 'skipped')}`);
            await loadLists();
        } catch {
            setNotice(decisionNotice(0));
        } finally {
            setBusy(false);
        }
    };

    const rows: Array<{ family: ProposalFamily; row: ProposalRow }> = [
        ...evolution.map((row) => ({ family: 'evolution' as const, row })),
        ...personality.map((row) => ({ family: 'personality' as const, row })),
    ];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardCheck className="w-5 h-5" />
                                Pending proposals ({rows.length})
                            </CardTitle>
                            <CardDescription>
                                Evolution never changes the agent by itself. Review each proposal and decide.
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={checkDrift} disabled={busy}>
                                Check personality drift
                            </Button>
                            <Button variant="outline" onClick={() => loadLists()} disabled={busy}>
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {notice && (
                        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">
                            {notice}
                        </div>
                    )}
                    {listNotice.evolution && (
                        <p className="text-sm text-gray-500">Evolution proposals: {listNotice.evolution}</p>
                    )}
                    {listNotice.personality && (
                        <p className="text-sm text-gray-500">Personality proposals: {listNotice.personality}</p>
                    )}
                    {rows.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">No pending proposals.</div>
                    ) : (
                        <ul className="divide-y">
                            {rows.map(({ family, row }) => (
                                <li key={`${family}:${row.id}`} className="flex items-center justify-between gap-4 py-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{family === 'evolution' ? (row.kind ?? 'evolution') : 'personality'}</Badge>
                                            <span className="truncate font-medium">
                                                {family === 'evolution' ? (row.title || 'Untitled proposal') : formatDelta(row.delta).join(', ') || 'Personality change'}
                                            </span>
                                        </div>
                                        {row.createdAt && <p className="text-xs text-gray-500">{new Date(row.createdAt).toLocaleString()}</p>}
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => open(family, row.id)} disabled={busy}>
                                        Review
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {detail && <ProposalDetail detail={detail} busy={busy} onDecide={decide} onClose={() => setDetail(null)} />}
                </CardContent>
            </Card>

            {suggestedCapabilities.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lightbulb className="w-5 h-5" />
                            Suggested capabilities
                        </CardTitle>
                        <CardDescription>
                            Information only. Evolution does not change capabilities; change them in the agent settings.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {suggestedCapabilities.map((s, i) => (
                                <li key={`${s.capability}:${i}`} className="text-sm">
                                    <span className="font-medium">{s.title || s.capability}</span>
                                    {s.capability && <span className="text-gray-500"> ({s.capability})</span>}
                                    {s.confidence !== null && <span className="text-gray-500"> {Math.round(s.confidence * 100)}%</span>}
                                    {s.description && <p className="whitespace-pre-wrap break-words text-gray-600">{s.description}</p>}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <div className="text-xs font-semibold uppercase text-gray-500">{label}</div>
            <div className="text-sm">{children}</div>
        </div>
    );
}

function ProposalDetail({ detail, busy, onDecide, onClose }: {
    detail: Detail;
    busy: boolean;
    onDecide: (action: DecisionAction) => void;
    onClose: () => void;
}) {
    const { family, proposal: p } = detail;
    const pending = p.status === 'pending';
    const delta = formatDelta(p.delta);
    const evidence = textList(p.evidence);
    return (
        <div className="rounded border p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge variant="outline">{family === 'evolution' ? String(p.kind ?? 'evolution') : 'personality'}</Badge>
                    <Badge variant="secondary">{String(p.status ?? '')}</Badge>
                </div>
                <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
            </div>
            {family === 'evolution' && (
                <>
                    <Field label="Title">{String(p.title ?? '')}</Field>
                    <Field label="Proposed text">
                        <pre className="whitespace-pre-wrap break-words rounded bg-gray-50 p-2 font-mono text-xs">{String(p.proposedText ?? '')}</pre>
                    </Field>
                    {p.insightType && (
                        <Field label="Insight">
                            {String(p.insightType)}
                            {typeof p.confidence === 'number' && ` (${Math.round(p.confidence * 100)}% confidence)`}
                        </Field>
                    )}
                </>
            )}
            {family === 'personality' && (
                <Field label="Change">
                    {delta.length === 0 ? 'No change listed' : (
                        <ul className="list-disc pl-5">{delta.map((d) => <li key={d}>{d}</li>)}</ul>
                    )}
                </Field>
            )}
            <Field label="Reason">
                <p className="whitespace-pre-wrap break-words">{String(p.reason ?? '')}</p>
            </Field>
            {family === 'personality' && (
                <Field label="Evidence">
                    {evidence.length === 0 ? 'None' : (
                        <ul className="list-disc pl-5">{evidence.map((e, i) => <li key={i} className="whitespace-pre-wrap break-words">{e}</li>)}</ul>
                    )}
                </Field>
            )}
            {p.source && <Field label="Source">{String(p.source)}</Field>}
            {pending ? (
                <div className="flex gap-2">
                    <Button onClick={() => onDecide('approve')} disabled={busy}>{ACTION_LABEL.approve}</Button>
                    <Button variant="outline" onClick={() => onDecide('reject')} disabled={busy}>{ACTION_LABEL.reject}</Button>
                    <Button variant="ghost" onClick={() => onDecide('cancel')} disabled={busy}>{ACTION_LABEL.cancel}</Button>
                </div>
            ) : (
                <p className="text-sm text-gray-500">This proposal is no longer pending.</p>
            )}
        </div>
    );
}
