import { registerChannelRoutes } from '../../shared/channel-host.js';

export async function registerTelegramRoutes(fastify, api) {
  await registerChannelRoutes(fastify, api, 'telegram');
}
