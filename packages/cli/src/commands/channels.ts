/**
 * Channels Command
 */

import ora from 'ora';
import { getApiClient } from '../utils/api-client.js';
import { success, error, header, createTable } from '../utils/formatting.js';

type ChannelAction = 'list' | 'connect' | 'disconnect' | 'status';

export async function channelsCommand(
  action: ChannelAction,
  channelId?: string
): Promise<void> {
  const client = getApiClient();

  const isRunning = await client.isBackendRunning();
  if (!isRunning) {
    error('Backend is not running');
    return;
  }

  switch (action) {
    case 'list':
    case 'status':
      await listChannels(client);
      break;

    case 'connect':
      if (!channelId) {
        error('Please provide channel ID');
        return;
      }
      await connectChannel(client, channelId);
      break;

    case 'disconnect':
      if (!channelId) {
        error('Please provide channel ID');
        return;
      }
      await disconnectChannel(client, channelId);
      break;
  }
}

async function listChannels(client: any): Promise<void> {
  const spinner = ora('Loading channels...').start();

  try {
    const channels = await client.getChannels();
    spinner.succeed(`Found ${channels.length} channels`);

    header('Channels');

    const table = createTable(['ID', 'Name', 'Status']);

    channels.forEach((channel: any) => {
      table.push([
        channel.id,
        channel.name,
        channel.connected ? '🟢 Connected' : '⚪ Disconnected'
      ]);
    });

    console.log(table.toString());
    console.log();

  } catch (err: any) {
    spinner.fail('Failed to load channels');
    error(err.message);
  }
}

async function connectChannel(client: any, id: string): Promise<void> {
  const spinner = ora(`Connecting ${id}...`).start();

  try {
    await client.connectChannel(id);
    spinner.succeed(`Connected ${id}`);
  } catch (err: any) {
    spinner.fail(`Failed to connect ${id}`);
    error(err.message);
  }
}

async function disconnectChannel(client: any, id: string): Promise<void> {
  const spinner = ora(`Disconnecting ${id}...`).start();

  try {
    await client.disconnectChannel(id);
    spinner.succeed(`Disconnected ${id}`);
  } catch (err: any) {
    spinner.fail(`Failed to disconnect ${id}`);
    error(err.message);
  }
}
