// B2.2d-14: the TTS voice-message record on both drivers. The caller sets up
// the driver and passes { q, audio }. Used by test/voice-messages.test.mjs
// (SQLite) and test/pg-voice-messages.integration.test.mjs (PostgreSQL).
import assert from 'node:assert/strict';

export function voiceMessagesScenario(test, getM, { tag, skip = false }) {
  test('recordVoiceMessage writes one row; a database error answers false and never throws', { skip }, async () => {
    const { q, audio } = getM();
    const ok = await audio.recordVoiceMessage({ sessionId: `vs-${tag}`, messageId: `vm-${tag}`, audioUrl: '/api/audio/download/x', language: 'ar', transcript: 'مرحبا' });
    assert.equal(ok, true);
    const row = await q.one('SELECT message_id, language, transcript, duration_seconds FROM voice_messages WHERE session_id = ?', `vs-${tag}`);
    assert.deepEqual(row, { message_id: `vm-${tag}`, language: 'ar', transcript: 'مرحبا', duration_seconds: null });
    const quiet = console.error; console.error = () => {};
    try {
      assert.equal(await audio.recordVoiceMessage({ sessionId: null, messageId: `vm2-${tag}`, audioUrl: 'x', language: 'en', transcript: 't' }), false);
    } finally { console.error = quiet; }
  });
}
