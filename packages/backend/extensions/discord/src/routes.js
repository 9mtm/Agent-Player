import { registerChannelRoutes } from '../../shared/channel-host.js';

export async function registerDiscordRoutes(fastify, api) {
  await registerChannelRoutes(fastify, api, 'discord');
}
