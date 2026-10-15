require('./load.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSuggestionAdapter, createNamingController, validatedDisplayName, namingKey, namingLanguages } = require('../src/naming.ts');
const context = { agentId: 'fixture-agent', language: 'en', savedName: 'Mira', access: 'owner' };
const reply = (name = 'Nova', language = 'en', exhausted = false) => ({ status: 200, body: { name, language, exhausted } });
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }

// Wire fixtures transcribed from CORE-02 agents-config and agent-names at 970b4a7f3.
// These tests exercise the client boundary, not a running or mocked backend router.
test('exact suggestion method/path/body: current unmodified draft in array; no save/reservation request', async () => {
  const calls = [];
  const controller = createNamingController(async request => { calls.push(request); return reply(); }, context);
  controller.edit(' Current draft ');
  await controller.generate();
  assert.deepEqual(calls, [{ method: 'POST', path: '/api/agents/name-suggestion', body: { language: 'en', exclude: [' Current draft '] } }]);
  assert.deepEqual(controller.snapshot(), { ...context, draft: 'Nova', status: 'suggested', error: null, exhausted: false });
  assert.equal(controller.save, undefined);
  controller.cancel();
  assert.equal(controller.snapshot().draft, 'Mira');
  assert.equal(calls.length, 1);
});
test('12 exact language codes and numbered exhaustion success, not a no-name failure', async () => {
  assert.deepEqual(namingLanguages, ['en','ar','de','fr','es','zh','ja','ko','pt-BR','ru','tr','hi']);
  for (const language of namingLanguages) {
    const adapter = createSuggestionAdapter(async req => { assert.equal(req.body.language, language); return reply('Nova 7', language, true); });
    assert.deepEqual(await adapter(language, 'Mira'), { ok: true, value: { name: 'Nova 7', language, exhausted: true } });
  }
});
test('display contract: 60 Unicode code points, normalized whitespace, punctuation allowed, banned controls', () => {
  for (const name of ['a'.repeat(60), '😀'.repeat(60), '<helper>', '-name']) assert.equal(validatedDisplayName(name), name);
  assert.equal(validatedDisplayName(' Ｎｏｖａ\n Helper '), 'Nova Helper');
  for (const name of ['', ' ', 'a'.repeat(61), '😀'.repeat(61), 'bad\0name', 'a\u200bb', 'a\u202eb', 'a\u2066b', 42]) assert.equal(validatedDisplayName(name), null);
  assert.equal(namingKey(' أمـــلٌ '), namingKey('امل'));
  assert.equal(namingKey(' ＮＯＶＡ   Helper '), namingKey('nova helper'));
  assert.equal(namingKey('هدى'), namingKey('هدي'));
});
test('exclude bound uses 200 UTF-16 units and rejects invalid input without calling transport', async () => {
  let calls = 0;
  const adapter = createSuggestionAdapter(async () => { calls++; return reply(); });
  assert.equal((await adapter('en', '😀'.repeat(100))).ok, true);
  assert.equal((await adapter('en', 'x'.repeat(200))).ok, true);
  for (const [language, draft] of [['en','😀'.repeat(101)], ['en','x'.repeat(201)], ['zh-Hans','Mira'], ['en',null]])
    assert.deepEqual(await adapter(language, draft), { ok: false, error: 'invalid-input' });
  assert.equal(calls, 2);
});
test('sanitized 400/401/403/409/500 errors and network failure, exactly one attempt', async () => {
  for (const [status,error] of [[400,'invalid-input'],[401,'unauthenticated'],[403,'forbidden'],[409,'conflict'],[500,'unavailable']]) {
    let calls = 0;
    const adapter = createSuggestionAdapter(async () => { calls++; return { status, body: { error: 'untrusted text', code: 'name_taken' } }; });
    assert.deepEqual(await adapter('en','Mira'), { ok: false, error }); assert.equal(calls,1);
  }
  let calls = 0;
  const adapter = createSuggestionAdapter(async () => { calls++; throw new Error('untrusted transport details'); });
  assert.deepEqual(await adapter('en','Mira'), { ok: false, error: 'unavailable' }); assert.equal(calls,1);
});
test('malformed success, wrong language, normalized excluded name and invalid name fail closed', async () => {
  const bodies = [null, [], {}, { name:'Nova',language:'en' }, { name:42,language:'en',exhausted:false },
    { name:'Nova',language:'de',exhausted:false }, { name:'Nova',language:'en',exhausted:'false' },
    { name:'nova\0',language:'en',exhausted:false }, { name:'a'.repeat(61),language:'en',exhausted:false },
    { name:' ＭＩＲＡ ',language:'en',exhausted:false }, { name:'MIRA',language:'en',exhausted:false }];
  for (const body of bodies) assert.deepEqual(await createSuggestionAdapter(async () => ({status:200,body}))('en','Mira'), {ok:false,error:'malformed-response'});
  for (const response of [null, { status: '200', body: reply().body }])
    assert.deepEqual(await createSuggestionAdapter(async () => response)('en','Mira'), {ok:false,error:'malformed-response'});
  assert.equal((await createSuggestionAdapter(async () => reply('امل','ar'))('ar',' أمـــلٌ ')).error, 'malformed-response');
});
for (const action of ['edit','cancel','agent','locale','access','dispose']) {
  test(`late success and failure ignored after ${action}`, async () => {
    for (const response of [reply(), {status:401,body:{error:'expired'}}]) {
      const pending = deferred();
      const controller = createNamingController(() => pending.promise, context);
      controller.edit('Unsaved');
      const run = controller.generate();
      assert.equal(controller.snapshot().status,'loading');
      if (action === 'edit') controller.edit('Manual');
      if (action === 'cancel') controller.cancel();
      if (action === 'agent') controller.setContext({...context,agentId:'fixture-other',savedName:'Other'});
      if (action === 'locale') controller.setContext({...context,language:'ar'});
      if (action === 'access') controller.setContext({...context,access:'unavailable'});
      if (action === 'dispose') controller.dispose();
      const expected = controller.snapshot();
      pending.resolve(response); await run;
      assert.deepEqual(controller.snapshot(),expected);
    }
  });
}
test('latest Generate wins even if older request finishes later; saved identity never changes', async () => {
  const first = deferred(), second = deferred(); let calls = 0;
  const controller = createNamingController(() => (++calls === 1 ? first : second).promise, context);
  const a = controller.generate(), b = controller.generate();
  second.resolve(reply('Atlas')); await b;
  first.resolve(reply('Nova')); await a;
  assert.equal(controller.snapshot().draft,'Atlas'); assert.equal(controller.snapshot().savedName,'Mira');
  assert.equal(calls,2);
});
test('owner UI boundary, disposal and detached snapshots; never grants API permission', async () => {
  let calls = 0;
  const controller = createNamingController(async () => { calls++; return reply(); }, {...context,access:'unavailable'});
  await controller.generate(); assert.equal(controller.snapshot().error,'forbidden'); assert.equal(calls,0);
  assert.ok(Object.isFrozen(controller.snapshot()));
  controller.dispose(); controller.setContext(context); await controller.generate(); assert.equal(calls,0);
});
test('failed suggestion preserves draft and saved name; exhausted suggestion remains draft-only', async () => {
  const controller = createNamingController(async () => ({status:403,body:{}}), context);
  controller.edit('Typed'); await controller.generate();
  assert.equal(controller.snapshot().draft,'Typed'); assert.equal(controller.snapshot().savedName,'Mira');
  const numbered = createNamingController(async () => reply('Nova 7','en',true), context);
  await numbered.generate(); assert.equal(numbered.snapshot().exhausted,true); assert.equal(numbered.snapshot().savedName,'Mira');
});
test('Generate excludes the last suggestion; returning to the same context never revives a stale result', async () => {
  const calls = [];
  const controller = createNamingController(async request => { calls.push(request); return reply(calls.length === 1 ? 'Nova' : 'Atlas'); }, context);
  await controller.generate(); await controller.generate();
  assert.deepEqual(calls.map(call => call.body.exclude), [['Mira'], ['Nova']]);
  const pending = deferred();
  const changing = createNamingController(() => pending.promise, context);
  const run = changing.generate();
  changing.setContext({...context,language:'ar'}); changing.setContext(context);
  pending.resolve(reply()); await run;
  assert.equal(changing.snapshot().draft,'Mira'); assert.equal(changing.snapshot().status,'idle');
});

test('adapter accepts a valid admin-authorized 200; owner-only controller is a UI choice', async () => {
  const adapter = createSuggestionAdapter(async () => reply('Admin suggestion'));
  assert.deepEqual(await adapter('en', 'Mira'), { ok: true, value: { name: 'Admin suggestion', language: 'en', exhausted: false } });
});
