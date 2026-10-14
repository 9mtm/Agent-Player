// FU-01: pending-proposal review helpers (request bodies, paths, notices).
// Run from the repo root: node --import tsx --test src/lib/evolution/proposal-review.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildDecisionBody,
    decisionNotice,
    formatDelta,
    isAgentId,
    isDecisionAction,
    isProposalId,
    pickDecisionBody,
    pickPersonalityTriggerBody,
    proposalPath,
    shouldRefetchDetail,
    statusQuery,
    suggestedCapabilities,
    textList,
} from './proposal-review.ts';

const HASH = 'a'.repeat(64);
const PID = '123e4567-e89b-42d3-a456-426614174000';

test('decision bodies carry only the documented fields', () => {
    const raw = { expectedReviewHash: HASH, note: '  too broad  ', status: 'approved', proposedText: 'x', cookie: 'c', userId: 'u' };
    assert.deepEqual(pickDecisionBody('evolution', 'approve', raw), { expectedReviewHash: HASH });
    assert.deepEqual(pickDecisionBody('evolution', 'cancel', raw), { expectedReviewHash: HASH });
    assert.deepEqual(pickDecisionBody('evolution', 'reject', raw), { expectedReviewHash: HASH, note: 'too broad' });
    for (const a of ['approve', 'reject', 'cancel']) {
        assert.deepEqual(pickDecisionBody('personality', a, raw), { expectedReviewHash: HASH }, `personality ${a}`);
    }
    // Wrong types, arrays and non-objects give an empty body (the backend answers 400).
    assert.deepEqual(pickDecisionBody('evolution', 'approve', { expectedReviewHash: 42 }), {});
    assert.deepEqual(pickDecisionBody('evolution', 'approve', [HASH]), {});
    assert.deepEqual(pickDecisionBody('evolution', 'approve', null), {});
    assert.deepEqual(pickDecisionBody('evolution', 'approve', 'x'), {});
    // Note is bounded and dropped when blank.
    assert.equal(pickDecisionBody('evolution', 'reject', { expectedReviewHash: HASH, note: 'n'.repeat(900) }).note.length, 500);
    assert.deepEqual(pickDecisionBody('evolution', 'reject', { expectedReviewHash: HASH, note: '   ' }), { expectedReviewHash: HASH });
});

test('buildDecisionBody sends the reviewHash of the detail on screen', () => {
    assert.deepEqual(buildDecisionBody('evolution', 'approve', HASH), { expectedReviewHash: HASH });
    assert.deepEqual(buildDecisionBody('evolution', 'reject', HASH, 'no'), { expectedReviewHash: HASH, note: 'no' });
    assert.deepEqual(buildDecisionBody('personality', 'reject', HASH, 'no'), { expectedReviewHash: HASH });
});

test('personality trigger body: only an integer windowDays from 1 to 90', () => {
    assert.deepEqual(pickPersonalityTriggerBody({ windowDays: 30, force: true }), { windowDays: 30 });
    for (const w of [0, 91, 1.5, '30', null]) assert.deepEqual(pickPersonalityTriggerBody({ windowDays: w }), {}, String(w));
    assert.deepEqual(pickPersonalityTriggerBody(undefined), {});
});

test('ids, actions and status filters are checked; paths are encoded', () => {
    assert.ok(isAgentId('agent-1') && isAgentId('a.b:c_d'));
    for (const bad of ['', '..', '.', 'a/b', 'a?b', 'a b', 'x'.repeat(129), 7]) assert.equal(isAgentId(bad), false, String(bad));
    assert.ok(isProposalId(PID));
    for (const bad of ['../x', PID.toUpperCase(), `${PID}0`, 'x']) assert.equal(isProposalId(bad), false, bad);
    assert.ok(['approve', 'reject', 'cancel'].every(isDecisionAction));
    for (const bad of ['rollback', 'APPROVE', '', 'approve/../x']) assert.equal(isDecisionAction(bad), false, bad);
    assert.equal(statusQuery('pending'), 'pending');
    assert.equal(statusQuery('pending&x=1'), null);
    assert.equal(statusQuery(null), null);

    assert.equal(proposalPath('evolution', 'a1'), '/api/evolution/a1/proposals');
    assert.equal(proposalPath('evolution', 'a1', PID), `/api/evolution/a1/proposals/${PID}`);
    assert.equal(proposalPath('evolution', 'a1', PID, 'approve'), `/api/evolution/a1/proposals/${PID}/approve`);
    assert.equal(proposalPath('personality', 'a1', PID, 'cancel'), `/api/agents/a1/personality/proposals/${PID}/cancel`);
    assert.equal(proposalPath('personality', 'a:1'), '/api/agents/a%3A1/personality/proposals');
});

test('notices by status and code; 409 re-fetches the detail', () => {
    assert.equal(decisionNotice(403), 'Owner only');
    assert.equal(decisionNotice(403, 'review_changed'), 'Owner only', '403 wins');
    assert.match(decisionNotice(409, 'review_changed'), /changed since you opened it/);
    assert.match(decisionNotice(409, 'already_decided'), /already decided/);
    assert.match(decisionNotice(409, 'stale'), /stale/);
    assert.match(decisionNotice(409, 'already_rolled_back'), /already rolled back/);
    assert.match(decisionNotice(409, 'rollback_unsupported'), /cannot be rolled back/);
    assert.match(decisionNotice(409, 'something_new'), /changed/);
    assert.match(decisionNotice(400, 'review_hash_required'), /Open the proposal again/);
    assert.match(decisionNotice(400, 'invalid_input'), /not valid/);
    assert.match(decisionNotice(404), /not found/);
    assert.equal(decisionNotice(500, '__proto__'), 'Request failed', 'no prototype lookups');
    assert.equal(decisionNotice(0), 'Request failed');
    assert.equal(shouldRefetchDetail(409), true);
    for (const s of [200, 400, 403, 404, 500]) assert.equal(shouldRefetchDetail(s), false);
});

test('delta, evidence and suggested capabilities are plain values', () => {
    assert.deepEqual(formatDelta({ warmth: 2, humor: -1, bad: 'x', nan: Number.NaN }), ['warmth +2', 'humor -1']);
    assert.deepEqual(formatDelta(null), []);
    assert.deepEqual(formatDelta([1]), []);
    assert.deepEqual(textList(['a', 1, '<b>x</b>', null]), ['a', '<b>x</b>'], 'markup stays text; the UI renders it escaped');
    assert.deepEqual(textList('a'), []);
    assert.deepEqual(suggestedCapabilities({
        suggestedCapabilities: [
            { capability: 'web_search', title: 'Search', description: 'd', confidence: 0.8, applied: false },
            { capability: 5, title: null },
            null,
        ],
    }), [
        { capability: 'web_search', title: 'Search', description: 'd', confidence: 0.8 },
        { capability: '', title: '', description: '', confidence: null },
    ]);
    assert.deepEqual(suggestedCapabilities({}), []);
    assert.deepEqual(suggestedCapabilities(null), []);
});
