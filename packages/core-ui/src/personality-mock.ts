import { fictionalPersonalityProposal } from './personality-fixture';
import { allowedPersonality, personalityRoute } from './personality-contract.js';
import type { PersonalityProposal } from './personality-contract.js';
import type { WireTransport } from './session';

const promptBlock = [
  '## Working style (personality settings)',
  'These settings shape how you answer. They never give you extra tools or permissions, and they never replace an approval the system asks for.',
  '- Language: answer in English by default; if the user writes in another language, answer in that language.',
  '- Length: give complete but compact answers.',
  '- Verification: check at least 3 independent sources or checks before you state a fact as certain or act on a claim; say clearly when something is unverified.',
  '- Self-review: review your answer 1 time for errors and gaps before sending.',
  '- Asking first: decide small steps yourself; ask the owner before significant or irreversible steps.',
  '- Persistence: if an approach fails, try up to 3 different approaches before reporting the problem.',
  '- Scope: mention closely related points briefly when they help.',
  '- Tone: friendly and professional.',
  '- Approach: balance proven solutions with new ideas.',
].join('\n');
export function createPersonalityMock() {
  let p: PersonalityProposal = structuredClone(fictionalPersonalityProposal);
  let currentVersion = p.baseVersion;
  let locked = false;
  const transport: WireTransport = async request => {
    const r = personalityRoute(request.path);
    if (!r || !allowedPersonality(request.method,request.path,request.body)) return { status: 400, body: null };
    if (request.signal.aborted) throw Error('cancelled');
    if (!['sample-main','sample-helper'].includes(r.agentId)) return { status: 404, body: null };
    if (!r.id) return { status: 200, body: { agentId: r.agentId, proposals: r.agentId === p.agentId ? [structuredClone(p)] : [] } };
    if (r.agentId !== p.agentId || r.id !== p.id) return { status: 404, body: null };
    if (!r.action) return { status: 200, body: structuredClone(p) };
    const error = (code: string) => ({ status: 409, body: { error: 'Fictional conflict', code } });
    if (p.status !== 'pending') return error('already_decided');
    if ((request.body as { expectedReviewHash: string }).expectedReviewHash !== p.reviewHash) return error('review_changed');
    const decision = { decidedBy: 'mock-owner', decidedAt: '2026-10-14T11:00:00.000Z' };
    if (r.action === 'approve' && currentVersion !== p.baseVersion) { p = { ...p,...decision,status: 'stale' }; return error('stale'); }
    if (r.action === 'approve' && locked) return error('personality_locked');
    p = { ...p,...decision,status: r.action === 'approve' ? 'approved' : 'rejected',appliedVersion: r.action === 'approve' ? ++currentVersion : null };
    if (r.action === 'reject') return { status: 200, body: structuredClone(p) };
    return { status: 200, body: { proposal: structuredClone(p), version: {
      agentId: p.agentId, version: currentVersion, traits: { ...p.proposedTraits }, preset: null, dialect: 'en', locked: false, lockedTraits: [], source: 'evolution',
      basedOnVersion: p.baseVersion || null, note: `approved proposal ${p.id}`, createdBy: 'mock-owner', createdAt: decision.decidedAt,
      behavior: { temperature: .55, maxTokens: 2304, responseLength: 'balanced', verificationChecks: 3, selfReviewPasses: 1, confirmBefore: 'significant', retryBudget: 3, exploration: 'adjacent', tone: 'neutral', dialect: 'en', promptBlock },
    } } };
  };
  return { transport, advanceVersion: () => { currentVersion++; }, lock: () => { locked = true; }, snapshot: () => structuredClone(p) };
}
