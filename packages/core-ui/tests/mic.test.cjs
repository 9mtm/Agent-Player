require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SessionClient } = require('../src/session.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const { MicController } = require('../src/mic.ts');
const { allowedConversation, conversationResponse } = require('../src/conversation-contract.js');
const { allowed } = require('../scripts/application-server.cjs');

test('microphone route: base64 audio only, reviewed answers', () => {
  for (const [b, ok] of [[{ audio: 'GkXfow==' }, true], [{ audio: 'GkXfow==', language: 'ar' }, true], [{ audio: 'x y' }, false], [{ audio: 'GkXf', language: 'fr' }, false], [{ audio: 'GkXf', model: 'x' }, false]]) {
    assert.equal(allowedConversation('POST', '/api/chat/transcribe', b), ok, JSON.stringify(b));
    assert.equal(allowed('POST', '/api/chat/transcribe', b), ok, `bridge ${JSON.stringify(b)}`);
  }
  assert.deepEqual(conversationResponse('/api/chat/transcribe', 200, { text: 'hi', ms: 5, extra: 1 }), { text: 'hi', ms: 5 });
  assert.deepEqual(conversationResponse('/api/chat/transcribe', 200, { available: false, missing: ['ffmpeg'] }), { available: false, missing: ['ffmpeg'] });
  assert.deepEqual(conversationResponse('/api/chat/transcribe', 503, { code: 'stt_unavailable', error: 'detail' }), { code: 'stt_unavailable' });
});

test('dictation: records, transcribes on the server, puts the words in the draft; nothing is sent to the agent', async t => {
  const base = createLoginMock(); const calls = [];
  const transport = async r => {
    if (r.path !== '/api/chat/transcribe') return base(r);
    calls.push(r);
    return r.method === 'GET' ? { status: 200, body: { available: true, missing: [] } } : { status: 200, body: { text: 'افتح اللوحة', ms: 900 } };
  };
  const client = new SessionClient({ live: transport }); client.selectMode('live'); await client.login('demo@example.invalid', 'mock-only');
  let stopped = false;
  const device = { async open() { return { async stop() { stopped = true; return new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3])], { type: 'audio/webm' }); } }; } };
  const texts = [];
  const mic = new MicController(client, x => texts.push(x), device); t.after(() => mic.dispose());
  await mic.check();
  assert.equal(mic.getSnapshot().phase, 'idle');
  await mic.start();
  assert.equal(mic.getSnapshot().phase, 'recording');
  await mic.stop();
  assert.ok(stopped);
  assert.deepEqual(texts, ['افتح اللوحة']);
  assert.equal(calls[1].body.audio, Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3]).toString('base64'));
  assert.equal(mic.getSnapshot().phase, 'idle');
});

test('dictation: a blocked microphone explains itself; an unavailable server hides nothing silently', async t => {
  const base = createLoginMock();
  const client = new SessionClient({ live: async r => r.path === '/api/chat/transcribe' ? { status: 200, body: { available: false, missing: ['ffmpeg'] } } : base(r) });
  client.selectMode('live'); await client.login('demo@example.invalid', 'mock-only');
  const mic = new MicController(client, () => {}, { async open() { throw new Error('NotAllowedError'); } }); t.after(() => mic.dispose());
  await mic.check();
  assert.equal(mic.getSnapshot().phase, 'off');
  assert.deepEqual(mic.getSnapshot().missing, ['ffmpeg']);
  const mic2 = new MicController(new SessionClient({ live: async r => r.path === '/api/chat/transcribe' ? { status: 200, body: { available: true, missing: [] } } : base(r) }), () => {}, { async open() { throw new Error('NotAllowedError'); } });
  t.after(() => mic2.dispose());
});
