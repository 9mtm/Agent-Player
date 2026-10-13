/**
 * Tool policy for channel-originated chat turns (S0-Q.8).
 *
 * A Telegram / Discord / Agent Connect message is written by an outside
 * sender, but the agent runs it as the channel owner. Without a policy the
 * sender could make the agent use the owner's tools (files, memory,
 * credentials, desktop, browser, other channels) - a confused deputy.
 *
 * Rules for a channel turn:
 *  - Default tool set is EMPTY. Even memory_search is not on by default: the
 *    memories belong to the owner, not to the outside sender.
 *  - The server operator may add tools per channel with the server env
 *    CHANNEL_AGENT_TOOLS_<CHANNEL> (comma-separated tool names), e.g.
 *    CHANNEL_AGENT_TOOLS_TELEGRAM=memory_search. Nothing the sender or an
 *    HTTP caller sends can change this.
 *  - Some tools are never allowed in a channel turn, even when opted in:
 *    exec-class tools, extension tools marked exec-class, credentials and
 *    skill installation.
 *  - Channel send tools may only answer the inbound conversation (or a
 *    destination in that channel's allowed_channels), and only on the same
 *    channel. Send tools this module does not know are refused.
 *  - A turn is marked as a channel turn by a random per-turn token that only
 *    the server creates (header CHANNEL_TURN_HEADER). An unknown token still
 *    gets the restricted default set (fail closed).
 */

import { randomBytes } from 'node:crypto';
import type { Tool, ToolResult } from './types.js';
import { EXEC_CLASS_TOOLS, isToolExecClass } from './exec-policy.js';

export const CHANNEL_TURN_HEADER = 'x-agent-player-channel-turn';
export const CHANNEL_TOOLS_ENV_PREFIX = 'CHANNEL_AGENT_TOOLS_';

/** Tools a channel turn gets without any operator opt-in. Keep this tiny. */
export const CHANNEL_DEFAULT_TOOLS: ReadonlySet<string> = new Set<string>([]);

/** Tools that are never offered to or run in a channel turn. */
export const CHANNEL_NEVER_TOOLS: ReadonlySet<string> = new Set<string>([
  ...EXEC_CLASS_TOOLS,
  'credentials_save',
  'skill_install',
]);

/** Send tools that can be confined to the inbound conversation. */
export const CHANNEL_SEND_TOOLS: Readonly<Record<string, { channel: string; destinationParam: string }>> = {
  telegram_send: { channel: 'telegram', destinationParam: 'chatId' },
  discord_send: { channel: 'discord', destinationParam: 'channelId' },
};

export interface ChannelOrigin {
  /** Channel id, e.g. "telegram", "discord" or an Agent Connect channel id. */
  channel: string;
  /** Conversation the inbound message came from. */
  conversationId: string;
  /** Extra destinations configured server-side (allowed_channels). */
  allowedDestinations?: string[];
}

export interface ChannelToolPolicy {
  kind: 'channel';
  channel: string;
  conversationId: string;
  allowedDestinations: string[];
  allowedTools: ReadonlySet<string>;
}

const TOOL_NAME = /^[A-Za-z0-9_-]{1,64}$/;

export function channelToolsEnvName(channel: string): string {
  return CHANNEL_TOOLS_ENV_PREFIX + String(channel).toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

/** Tools the server operator added for this channel (server env only). */
export function channelOptInTools(channel: string): string[] {
  const raw = process.env[channelToolsEnvName(channel)];
  if (!raw) return [];
  return raw
    .split(',')
    .map((name) => name.trim())
    .filter((name) => TOOL_NAME.test(name) && !CHANNEL_NEVER_TOOLS.has(name));
}

export function createChannelToolPolicy(origin: Partial<ChannelOrigin> = {}): ChannelToolPolicy {
  const channel = typeof origin.channel === 'string' && origin.channel ? origin.channel : 'unknown';
  const conversationId = typeof origin.conversationId === 'string' ? origin.conversationId : '';
  const allowedDestinations = Array.isArray(origin.allowedDestinations)
    ? origin.allowedDestinations.filter((d): d is string => typeof d === 'string' && d.length > 0)
    : [];
  const allowedTools = new Set<string>([...CHANNEL_DEFAULT_TOOLS, ...channelOptInTools(channel)]);
  return { kind: 'channel', channel, conversationId, allowedDestinations, allowedTools };
}

function isSendToolName(name: string): boolean {
  return /_send$/.test(name) || Object.prototype.hasOwnProperty.call(CHANNEL_SEND_TOOLS, name);
}

/** True when the tool may be offered to the model in this channel turn. */
export function isToolAllowedInChannel(policy: ChannelToolPolicy, tool: Pick<Tool, 'name' | 'execClass'>): boolean {
  if (!policy.allowedTools.has(tool.name)) return false;
  if (CHANNEL_NEVER_TOOLS.has(tool.name) || isToolExecClass(tool)) return false;
  if (isSendToolName(tool.name)) {
    const send = CHANNEL_SEND_TOOLS[tool.name];
    if (!send || send.channel !== policy.channel) return false;
  }
  return true;
}

function refusal(name: string, reason: string): ToolResult {
  return {
    content: [{ type: 'text', text: `Tool "${name}" is not available in this channel conversation: ${reason}` }],
    error: 'Tool refused by channel policy',
  };
}

/**
 * Check a concrete tool call in a channel turn. Returns a refusal result, or
 * null when the call may run.
 */
export function channelToolCallRefusal(
  policy: ChannelToolPolicy,
  name: string,
  tool: Tool | undefined,
  params: Record<string, any> | undefined
): ToolResult | null {
  if (!tool || !isToolAllowedInChannel(policy, tool)) {
    return refusal(name, 'the server does not allow it for messages from this channel.');
  }
  const send = CHANNEL_SEND_TOOLS[name];
  if (send) {
    const destination = params?.[send.destinationParam];
    const allowed = typeof destination === 'string' && destination.length > 0
      && (destination === policy.conversationId || policy.allowedDestinations.includes(destination));
    if (!allowed) return refusal(name, 'it may only reply to the conversation the message came from.');
  }
  return null;
}

// ---------------------------------------------------------------------------
// Per-turn tokens: only server code (processChannelMessage) can create them.
// ---------------------------------------------------------------------------

const activeTurns = new Map<string, ChannelToolPolicy>();

export function beginChannelTurn(origin: Partial<ChannelOrigin>): { token: string; policy: ChannelToolPolicy; end: () => void } {
  const token = randomBytes(32).toString('hex');
  const policy = createChannelToolPolicy(origin);
  activeTurns.set(token, policy);
  return { token, policy, end: () => { activeTurns.delete(token); } };
}

/**
 * Policy for a request, from its headers. No header -> undefined (normal
 * owner chat). Header with an unknown token -> restricted default policy.
 */
export function channelPolicyFromHeaders(
  headers: Record<string, string | string[] | undefined>
): ChannelToolPolicy | undefined {
  const value = headers[CHANNEL_TURN_HEADER];
  if (value === undefined) return undefined;
  const token = Array.isArray(value) ? value[0] : value;
  return (token && activeTurns.get(token)) || createChannelToolPolicy({});
}
