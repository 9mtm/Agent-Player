/**
 * Agent memory for outsiders (S0-A.14, safe default while Q-14 is open).
 *
 * An agent's MEMORY.md (and any recalled memory context) is the owner's
 * private data. Replies that go to an outsider - a channel sender
 * (Telegram, Discord, Agent Connect, telephony) or an anonymous / non-owner
 * visitor of a public chat room - are built WITHOUT it. PERSONALITY.md is
 * still used.
 *
 * Opt-in (server side only): OUTSIDER_AGENT_MEMORY=true restores the old
 * behaviour (memory also sent to outsiders).
 */

export const OUTSIDER_AGENT_MEMORY_ENV = 'OUTSIDER_AGENT_MEMORY';

export function outsiderAgentMemoryEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return /^(1|true|yes|on)$/i.test(String(env[OUTSIDER_AGENT_MEMORY_ENV] || '').trim());
}
