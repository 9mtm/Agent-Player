// B2.2d-15: one orchestrator store scenario for both drivers
// (test/orchestrator-store.test.mjs on SQLite,
// test/pg-orchestrator.integration.test.mjs on PostgreSQL).
// `open()` returns a freshly initialized AgentOrchestrator on the same store,
// so the second half checks what a restart loads back.
import assert from 'node:assert/strict';

export async function orchestratorScenario(open) {
  const first = await open();
  const agent = (id, name) => ({
    id, name, role: 'specialist', capabilities: ['search', 'summarize'],
    maxConcurrentTasks: 2, metadata: { note: 'x' },
  });
  first.registerAgent(agent('ag-1', 'Before'));
  first.registerAgent(agent('ag-1', 'After')); // same id: replaced, not duplicated
  first.registerAgent(agent('ag-2', 'Gone'));
  assert.equal(first.removeAgent('ag-2'), true);

  const team = first.createTeam({ name: 'Team A', objective: 'test', agentIds: ['ag-1'], communicationStyle: 'flat', sharedMemory: true });
  const team2 = first.createTeam({ name: 'Team B', objective: 'test', agentIds: [], communicationStyle: 'hierarchical', sharedMemory: false });
  assert.equal(first.disbandTeam(team2.definition.id), true);

  const done = first.createTask({ title: 'done', description: 'd', origin: 'owner', requiredCapabilities: ['search'] });
  assert.equal(first.assignTask(done.id, 'ag-1'), true);
  assert.equal(first.startTask(done.id), true);
  first.updateTaskProgress(done.id, 40);
  assert.equal(first.completeTask(done.id, { answer: 42 }), true);

  const open1 = first.createTask({ title: 'open', description: 'o', priority: 'high', teamId: team.definition.id, origin: 'agent', spawnedBy: 'ag-1', dependencies: [done.id] });
  assert.equal(first.assignTask(open1.id, 'ag-1'), true);
  first.updateTaskProgress(open1.id, 25, { partial: true });
  await first.flush();
  first.close();

  const second = await open();
  assert.deepEqual(second.listAgents().map((a) => a.definition.name), ['After']);
  const a1 = second.getAgent('ag-1').definition;
  assert.deepEqual(a1.capabilities, ['search', 'summarize']);
  assert.equal(a1.maxConcurrentTasks, 2);
  assert.deepEqual(a1.metadata, { note: 'x' });

  const teams = new Map(second.listTeams().map((t) => [t.definition.name, t]));
  assert.equal(teams.get('Team A').status, 'active');
  assert.equal(teams.get('Team A').definition.sharedMemory, true);
  assert.deepEqual(teams.get('Team A').definition.agentIds, ['ag-1']);
  assert.equal(teams.get('Team B').status, 'disbanded');
  assert.equal(teams.get('Team B').definition.sharedMemory, false);

  // Finished tasks are not loaded back; the open one is, with every field.
  assert.equal(second.getTask(done.id), undefined);
  const t = second.getTask(open1.id);
  assert.ok(t, 'open task loaded after restart');
  assert.equal(t.status, 'assigned');
  assert.equal(t.priority, 'high');
  assert.equal(t.assignedTo, 'ag-1');
  assert.equal(t.teamId, team.definition.id);
  assert.equal(t.progress, 25);
  assert.deepEqual(t.output, { partial: true });
  assert.deepEqual(t.dependencies, [done.id]);
  assert.equal(t.origin, 'agent');
  assert.equal(t.spawnedBy, 'ag-1');
  assert.equal(t.maxRetries, 2);
  assert.ok(t.createdAt instanceof Date && !Number.isNaN(t.createdAt.getTime()));
  await second.flush();
  second.close();
  return { doneId: done.id, openId: open1.id };
}

// B2.2d-15c: a parent task completes after a restart. One subtask finishes
// before the restart, the other after it; the parent's subtasks list is
// saved and the finished subtask is loaded back, so the parent completes
// with both outputs.
export async function subtaskRestartScenario(open) {
  const first = await open();
  const parent = first.createTask({ title: 'parent', description: 'p' });
  const a = first.createTask({ title: 'sub a', description: 'a', parentId: parent.id });
  const b = first.createTask({ title: 'sub b', description: 'b', parentId: parent.id });
  assert.equal(first.completeTask(a.id, { part: 'a' }), true);
  assert.equal(first.getTask(parent.id).status, 'pending', 'parent waits for sub b');
  await first.flush();
  first.close();

  const second = await open();
  assert.deepEqual(second.getTask(parent.id).subtasks, [a.id, b.id], 'subtasks list saved');
  assert.equal(second.getTask(a.id)?.status, 'completed', 'finished subtask of an open parent is loaded');
  assert.equal(second.completeTask(b.id, { part: 'b' }), true);
  const p = second.getTask(parent.id);
  assert.equal(p.status, 'completed', 'parent completes after the restart');
  assert.deepEqual(p.output, { subtaskResults: { [a.id]: { part: 'a' }, [b.id]: { part: 'b' } } });
  await second.flush();
  second.close();

  // A third start: the parent is finished, so neither it nor its subtasks load.
  const third = await open();
  assert.equal(third.getTask(parent.id), undefined);
  assert.equal(third.getTask(a.id), undefined);
  third.close();
}
