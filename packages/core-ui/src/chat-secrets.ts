// CHAT-SECRETS-01: a key, token or password typed in the chat is moved by the
// backend into the encrypted key store; the message keeps `[SECRET:<type>:<id>]`.
// This module splits a message into text and those references (shown as a
// "saved securely" chip) and talks to the saved-keys routes.
import { CLEANUP_PATH, SECRETS_PATH, secretPath } from './chat-secrets-contract.js';
import type { ChatSecret, CleanupReport } from './chat-secrets-contract.js';
import type { SessionClient } from './session';

export type MessagePiece = { kind: 'text'; text: string } | { kind: 'secret'; type: string; id: string };

const REF = /\[SECRET:([a-z_]{2,40}):([a-z0-9]{6,32})\]/g;

/** Text and key-store references of a message, in order. */
export function splitSecrets(text: string): MessagePiece[] {
  const out: MessagePiece[] = [];
  let at = 0;
  for (const m of text.matchAll(REF)) {
    if (m.index! > at) out.push({ kind: 'text', text: text.slice(at, m.index) });
    out.push({ kind: 'secret', type: m[1], id: m[2] });
    at = m.index! + m[0].length;
  }
  if (at < text.length) out.push({ kind: 'text', text: text.slice(at) });
  return out;
}

const NAMES: Record<string, string> = {
  password: 'Password', url_credentials: 'Password in a link', basic_auth: 'Login', private_key: 'Private key', jwt: 'Sign-in token',
  bearer_token: 'Access token', github_token: 'GitHub token', gitlab_token: 'GitLab token', openai_key: 'OpenAI key', anthropic_key: 'Anthropic key',
  aws_access_key: 'AWS key', aws_secret_key: 'AWS secret', gcp_api_key: 'Google API key', gcp_oauth_token: 'Google token', gcp_client_secret: 'Google client secret',
  slack_token: 'Slack token', slack_webhook: 'Slack webhook', discord_webhook: 'Discord webhook', stripe_key: 'Stripe key', huggingface_token: 'Hugging Face token',
  npm_token: 'npm token', sendgrid_key: 'SendGrid key', twilio_key: 'Twilio key', telegram_bot_token: 'Telegram bot token',
  azure_storage_key: 'Azure key', azure_sas_signature: 'Azure signature', azure_connection_string: 'Azure connection',
  generic_api_key: 'API key', secret_assignment: 'Secret',
};
/** A readable name for a secret type. */
export const secretLabel = (type: string): string => NAMES[type] ?? 'Secret';

const record = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x);

export async function listSecrets(client: SessionClient): Promise<ChatSecret[] | null> {
  try {
    const r = await client.request({ method: 'GET', path: SECRETS_PATH } as never);
    return r.status === 200 && record(r.body) && Array.isArray(r.body.secrets) ? r.body.secrets as ChatSecret[] : null;
  } catch { return null; }
}

export async function deleteSecret(client: SessionClient, id: string): Promise<boolean> {
  try { return (await client.request({ method: 'DELETE', path: secretPath(id) } as never)).status === 200; } catch { return false; }
}

/** Owner: count (apply false) or move (apply true) the secrets of older saved messages. */
export async function cleanupSecrets(client: SessionClient, apply: boolean): Promise<CleanupReport | null> {
  try {
    const r = await client.request({ method: 'POST', path: CLEANUP_PATH, body: { apply } } as never);
    return r.status === 200 && record(r.body) && record(r.body.report) ? r.body.report as CleanupReport : null;
  } catch { return null; }
}
