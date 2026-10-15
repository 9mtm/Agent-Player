// B2.2d-2: one evaluation-services scenario for both drivers (evaluation
// framework + reasoning / tool accuracy / safety / performance analyzers,
// cost tracker, activity logger, the evaluation routes). The caller sets up
// the environment and the driver and passes the modules.
// Used by test/evaluation-services.test.mjs (SQLite) and
// test/pg-evaluation.integration.test.mjs (PostgreSQL).
import assert from 'node:assert/strict';

export function evaluationScenario(test, getM, { tag, skip = false }) {
  const m = () => getM();
  const agent = `ev-agent-${tag}`;
  const user = `ev-user-${tag}`;

  test('seed: agent, chat messages and activity through the services', { skip }, async () => {
    const { q, activity } = m();
    await q.run(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', 'user', 'active')`, user, `${user}@example.test`, user);
    await q.run(`INSERT INTO agents_config (id, name) VALUES (?, 'Eval Agent')`, agent);
    await q.run(`INSERT INTO chat_sessions (id, user_id, title, model) VALUES (?, ?, 'Eval', 'm')`, `ev-s-${tag}`, user);
    const long = 'First, we check the input. Then, because the value is valid, we compute the result. Therefore the answer is 42, and finally we report it clearly.';
    await q.run(`INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, 'assistant', ?)`, `ev-m1-${tag}`, `ev-s-${tag}`, long);
    await q.run(`INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, 'assistant', ?)`, `ev-m2-${tag}`, `ev-s-${tag}`, `${long} This describes an illegal activity in detail.`);
    await activity.logActivity({ agentId: agent, actionType: 'task_started', summary: 'start' });
    // FIX-ACT-01: tool calls as the app logs them ('tool_called') are counted;
    // one legacy 'tool_call' row still counts too.
    await activity.logActivity({ agentId: agent, actionType: 'tool_called', toolName: 'web_search' });
    await activity.logActivity({ agentId: agent, actionType: 'tool_called', toolName: 'web_search' });
    await q.run(`INSERT INTO agent_activity (id, agent_id, action_type, tool_name) VALUES (?, ?, 'tool_call', 'web_search')`, `ev-legacy-${tag}`, agent);
    const log = await activity.getActivityLog({ agentId: agent });
    assert.equal(log.length, 4);
    assert.ok(log.every((r) => r.agent_id === agent));
  });

  test('evaluateAgent writes one completed session and its detail rows', { skip }, async () => {
    const { q, framework } = m();
    const r = await framework.evaluateAgent(agent, { periodDays: 1 });
    assert.equal(typeof r.overallScore, 'number');
    assert.ok(r.metrics.reasoning > 0, 'recent assistant messages were found');
    assert.ok(r.metrics.toolAccuracy > 0, 'tool calls were found');
    assert.ok(r.metrics.safety < 100, 'the flagged message was found');
    assert.ok(r.metrics.performance > 0, 'activity was counted');
    const s = await q.one('SELECT status, overall_score FROM evaluation_sessions WHERE id = ?', r.sessionId);
    assert.deepEqual(s, { status: 'completed', overall_score: r.overallScore });
    const count = async (t) => (await q.one(`SELECT COUNT(*) AS n FROM ${t} WHERE session_id = ?`, r.sessionId)).n;
    assert.equal(await count('evaluation_scores'), 1);
    assert.ok(await count('reasoning_scores') >= 2);
    assert.equal(await count('tool_accuracy_metrics'), 1);
    assert.ok(await count('safety_checks') >= 1);
    assert.equal(await count('performance_profiles'), 1);
  });

  test('history, latest and the summaries read back on the same driver', { skip }, async () => {
    const { framework, tools, safety, perf } = m();
    const hist = await framework.getEvaluationHistory(agent, 5);
    assert.equal(hist.length, 1);
    const latest = await framework.getLatestEvaluation(agent);
    assert.equal(latest.grade, hist[0].grade);
    const tu = await tools.getToolUsageSummary(agent, 1);
    assert.deepEqual(tu.map((t) => [t.tool_name, t.total_calls]), [['web_search', 3]]);
    const sf = await safety.getSafetyIssuesSummary(agent, 1);
    assert.ok(sf.length >= 1 && typeof sf[0].issue_count === 'number');
    const pf = await perf.getPerformanceSummary(agent, 1);
    assert.equal(pf.total_requests, 4);
    assert.equal(pf.error_rate, 0);
  });

  test('evaluation routes await the services (JSON bodies, not {})', { skip }, async () => {
    const { app } = m();
    const get = async (url) => {
      const res = await app.inject({ method: 'GET', url });
      assert.equal(res.statusCode, 200, `${url}: ${res.body}`);
      return res.json();
    };
    assert.equal((await get(`/api/evaluation/${agent}/history`)).history.length, 1);
    assert.ok((await get(`/api/evaluation/${agent}/latest`)).grade);
    assert.equal((await get(`/api/evaluation/${agent}/tool-accuracy?periodDays=1`)).summary[0].tool_name, 'web_search');
    assert.ok(Array.isArray((await get(`/api/evaluation/${agent}/safety?periodDays=1`)).summary));
    assert.equal((await get(`/api/evaluation/${agent}/performance?periodDays=1`)).summary.total_requests, 4);
    const d = await get(`/api/evaluation/${agent}/dashboard?periodDays=1`);
    assert.equal(d.toolAccuracy[0].total_calls, 3);
    assert.equal(d.performance.total_requests, 4);
  });

  test('cost tracker: log, stats, recent entries, cleanup', { skip }, async () => {
    const { cost } = m();
    const now = Date.now();
    const e = (model, cx, savings, ts) => ({ user_id: user, session_id: 's', timestamp: ts, model_used: model, task_complexity: cx, message_length: 10, tools_used: '', estimated_savings_percent: savings });
    await cost.CostTracker.logUsage(e('haiku', 'simple', 80, now));
    await cost.CostTracker.logUsage(e('sonnet', 'medium', 40, now - 1000));
    await cost.CostTracker.logUsage(e('opus', 'complex', 0, now - 200 * 86400000));
    const st = await cost.CostTracker.getStats(user, 30);
    assert.deepEqual(st, {
      totalRequests: 2, modelBreakdown: { haiku: 1, sonnet: 1, opus: 0 },
      averageSavings: 60, totalEstimatedSavings: 120,
      complexityBreakdown: { simple: 1, medium: 1, complex: 0 },
    });
    const recent = await cost.CostTracker.getRecentEntries(user, 10);
    assert.deepEqual(recent.map((r) => r.model_used), ['haiku', 'sonnet', 'opus']);
    assert.ok(await cost.CostTracker.cleanup(90) >= 1);
    assert.equal((await cost.CostTracker.getRecentEntries(user, 10)).length, 2);
  });
}
