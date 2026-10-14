// FU-02: helpers for the older evolution proxies (ids, paths, query and body
// filters, config mapping, notices for 403 / 404 / 409 codes).
// Run from the repo root: node --import tsx --test src/lib/evolution/evolution-requests.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_PANEL_CONFIG,
    configFromStatus,
    configToBackend,
    evolutionNotice,
    evolutionPath,
    historyQuery,
    insightsQuery,
    isEvolutionId,
    pickAnalyzeBody,
    pickConfigBody,
} from './evolution-requests.ts';

const UUID = '123e4567-e89b-42d3-a456-426614174000';

test('evolution ids: safe shapes only', () => {
    for (const ok of [UUID, 'evo_1', 'a.b:c-d']) assert.equal(isEvolutionId(ok), true, ok);
    for (const bad of ['', '.', '..', '../x', 'a/b', 'a b', 'a?b', 'x'.repeat(129), 7, null, undefined]) {
        assert.equal(isEvolutionId(bad), false, String(bad));
    }
});

test('evolutionPath encodes every segment', () => {
    assert.equal(evolutionPath('a1', 'status'), '/api/evolution/a1/status');
    assert.equal(evolutionPath('a1', 'rollback', UUID), `/api/evolution/a1/rollback/${UUID}`);
    assert.equal(evolutionPath('a:1', 'measure', 'e/1'), '/api/evolution/a%3A1/measure/e%2F1');
});

test('history query: limit bounded, status/type plain words, nothing else', () => {
    assert.equal(historyQuery(new URLSearchParams('')), '?limit=20');
    assert.equal(historyQuery(new URLSearchParams('limit=5&status=active&type=prompt_update&x=1')), '?limit=5&status=active&type=prompt_update');
    assert.equal(historyQuery(new URLSearchParams('limit=5%26admin%3D1')), '?limit=20');
    assert.equal(historyQuery(new URLSearchParams('limit=0')), '?limit=20');
    assert.equal(historyQuery(new URLSearchParams('limit=999')), '?limit=20');
    assert.equal(historyQuery(new URLSearchParams('status=a%26b')), '?limit=20');
});

test('insights query: applied true|false, minConfidence 0..1', () => {
    assert.equal(insightsQuery(new URLSearchParams('applied=false&limit=10')), '?limit=10&applied=false');
    assert.equal(insightsQuery(new URLSearchParams('applied=yes')), '?limit=20');
    assert.equal(insightsQuery(new URLSearchParams('minConfidence=0.75&type=pattern')), '?limit=20&type=pattern&minConfidence=0.75');
    assert.equal(insightsQuery(new URLSearchParams('minConfidence=2')), '?limit=20');
    assert.equal(insightsQuery(new URLSearchParams('minConfidence=1')), '?limit=20&minConfidence=1');
});

test('analyze body: only periodDays (integer 1..365)', () => {
    assert.deepEqual(pickAnalyzeBody({ periodDays: 7, agentId: 'other', userId: 'u' }), { periodDays: 7 });
    for (const bad of [0, 366, 1.5, '7', null]) assert.deepEqual(pickAnalyzeBody({ periodDays: bad }), {}, String(bad));
    assert.deepEqual(pickAnalyzeBody(null), {});
    assert.deepEqual(pickAnalyzeBody([7]), {});
});

test('config body: documented snake_case fields only, each type-checked', () => {
    const raw = {
        enabled: true, min_confidence_threshold: 0.8, min_sample_size: 20, evolution_frequency: 'weekly',
        allowed_evolutions: ['prompt_update', 'prompt_update', 'drop_table', 3], max_evolutions_per_cycle: 2,
        rollback_on_degradation: false, degradation_threshold: 0.2,
        agent_id: 'other', updated_at: 'x', enabledX: true,
    };
    assert.deepEqual(pickConfigBody(raw), {
        enabled: true, min_confidence_threshold: 0.8, min_sample_size: 20, evolution_frequency: 'weekly',
        allowed_evolutions: ['prompt_update'], max_evolutions_per_cycle: 2,
        rollback_on_degradation: false, degradation_threshold: 0.2,
    });
    assert.deepEqual(pickConfigBody({ enabled: 'true', min_confidence_threshold: 3, evolution_frequency: 'always', min_sample_size: -1 }), {});
    assert.deepEqual(pickConfigBody('x'), {});
});

test('panel config <-> backend config', () => {
    const panel = { ...DEFAULT_PANEL_CONFIG, enabled: true, evolutionFrequency: 'hourly', allowedEvolutions: ['config_change'] };
    const backend = configToBackend(panel);
    assert.deepEqual(backend, {
        enabled: true, min_confidence_threshold: 0.7, min_sample_size: 10, evolution_frequency: 'hourly',
        allowed_evolutions: ['config_change'], max_evolutions_per_cycle: 3, rollback_on_degradation: true, degradation_threshold: 0.1,
    });
    // The status row uses 0/1 for booleans and carries extra columns.
    const row = { ...backend, enabled: 1, rollback_on_degradation: 0, agent_id: 'a1', created_at: 'x' };
    assert.deepEqual(configFromStatus(row), { ...panel, rollbackOnDegradation: false });
    assert.deepEqual(configFromStatus(undefined), DEFAULT_PANEL_CONFIG);
    assert.deepEqual(configFromStatus({ min_sample_size: 'lots' }), DEFAULT_PANEL_CONFIG);
});

test('notices: 403 owner only, rollback 409 codes, 404, fallbacks', () => {
    for (const a of ['status', 'analyze', 'config', 'measure', 'rollback']) {
        assert.equal(evolutionNotice(a, 403, 'forbidden'), 'Owner only', a);
        assert.equal(evolutionNotice(a, 401), 'Sign in again.', a);
        assert.equal(evolutionNotice(a, 502), 'Backend unavailable', a);
    }
    assert.match(evolutionNotice('rollback', 409, 'stale'), /changed after this evolution/);
    assert.match(evolutionNotice('rollback', 409, 'rollback_unsupported'), /Only prompt and PERSONALITY\.md/);
    assert.equal(evolutionNotice('rollback', 409, 'already_rolled_back'), 'This evolution was already rolled back.');
    assert.equal(evolutionNotice('rollback', 409, 'toString'), 'Failed to rollback', 'no prototype keys');
    assert.equal(evolutionNotice('rollback', 409, 'unknown'), 'Failed to rollback');
    assert.equal(evolutionNotice('rollback', 404, 'not_found'), 'Evolution not found for this agent.');
    assert.equal(evolutionNotice('status', 404), 'Evolution is not set up for this agent.');
    assert.equal(evolutionNotice('config', 400), 'No valid configuration fields to save.');
    assert.equal(evolutionNotice('analyze', 500), 'Failed to analyze performance');
});
