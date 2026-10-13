import { channelSetup } from '@/lib/channel-setup';

export function ChannelSetupGuide({ channel, legacy = false }: { channel: string; legacy?: boolean }) {
  const guide = channelSetup.find(item => item.id === channel);
  if (!guide) return null;
  const native = channel === 'telegram' || channel === 'discord';
  return <details open className="rounded-lg border bg-card p-5">
    <summary className="cursor-pointer text-lg font-semibold">{guide.label} setup guide</summary>
    <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6">
      <li>{guide.prepare}</li>
      <li>{native
        ? 'Enable this channel extension. Restart the backend once, then reload this page.'
        : legacy ? 'This is the legacy integration screen. Use Agent Connect → this provider for the published package adapter and its Python setup.'
          : 'Enable Agent Connect, restart the backend and reload this page. Prepare the isolated Python runtime and the provider SDK or bridge before connecting.'}</li>
      <li>{native ? 'Paste the token into Bot token. Enter your own numeric user ID in Allowed sender IDs.'
        : legacy ? 'Enter credentials in the provider fields on this screen.'
          : 'Enter provider configuration in Provider settings JSON (token, api_key or extra as required). Put the variables listed below in Provider environment JSON. Leave Python executable blank to use the configured runtime.'}
        {channel === 'discord' && ' Enter a server text channel ID in Allowed channel IDs; Guild ID is optional.'}</li>
      <li>{native ? 'Save settings and wait for Connected. Keep automatic agent replies off for the first test.'
        : 'Allow only trusted sender IDs and permitted conversation IDs. Save settings, check status and reconnect if needed. Keep agent replies off for the first test.'}</li>
      <li>{channel === 'telegram' ? 'Open your bot in Telegram and send /start, then a unique test message. Check Recent messages. For a private chat, your numeric user ID is also the Chat ID for the outbound test.'
        : channel === 'discord' ? 'Send a unique message in the permitted server text channel. Check Recent messages, then send a message back using Send a test message and that Channel ID.'
          : 'Use a dedicated test conversation or endpoint. Send a unique inbound message where supported, send an outbound test and confirm actual receipt in the provider. One-way integrations should be tested only in their supported direction.'}</li>
      <li>After message delivery works, configure the primary agent and its model in Agent Player. Test the model in Chat first, then enable automatic replies and repeat the channel test.</li>
    </ol>
    {!native && <div className="mt-4 space-y-2 text-sm">
      <p><strong>Runtime requirements:</strong> {guide.prerequisites}</p>
      <p><strong>Provider variables:</strong> {guide.requiredEnv.length ? guide.requiredEnv.join(', ') : 'Provider-specific settings; see the detailed configuration guide.'}</p>
    </div>}
    <p className="mt-4 text-sm text-muted-foreground">Enter secrets in the application only. An empty allowlist blocks inbound processing. Credentials saved successfully do not prove a live connection.</p>
    <a className="mt-3 inline-block text-sm underline" href="https://github.com/Dpro-at/agent-connect/blob/main/docs/CHANNELS.md" target="_blank" rel="noreferrer">Detailed channel and runtime documentation</a>
  </details>;
}
