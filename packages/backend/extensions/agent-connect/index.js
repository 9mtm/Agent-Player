import { CHANNEL_CATALOG, PythonTransport } from 'agent-connect-dpro';
import { registerChannelRoutes, stopChannel } from '../shared/channel-host.js';

const channels = CHANNEL_CATALOG.filter(channel => !['telegram', 'discord'].includes(channel.id));
const object = value => value && typeof value === 'object' && !Array.isArray(value);

export default {
  id: 'agent-connect', name: 'Agent Connect', version: '0.2.0',
  async register(api) {
    api.registerRoutes(async scope => {
      scope.addHook('preHandler', async (request, reply) => {
        try { api.authorizeChannelRequest(request); }
        catch { return reply.code(403).send({ error: 'Channel administration requires an active owner or admin account' }); }
      });
      scope.get('/catalog', async request => {
        api.authorizeChannelRequest(request);
        return { channels: CHANNEL_CATALOG };
      });
      for (const channel of channels) {
        const channelApi = {
          ...api,
          getConfig: () => api.getConfig()?.channels?.[channel.id] || {},
          setConfig: config => {
            const root = api.getConfig() || {};
            api.setConfig({ ...root, channels: { ...root.channels, [channel.id]: config } });
          },
        };
        await scope.register(async child => registerChannelRoutes(child, channelApi, channel.id, {
          extensionId: 'agent-connect', requireChannels: true,
          isConfigured: config => config.configured === true,
          configKeys: ['configured', 'settings', 'environment', 'python_executable', 'state_directory', 'allowed_users', 'allowed_channels', 'auto_reply'],
          validateConfig: config => config.configured === true && object(config.settings || {}) && object(config.environment || {})
            && Object.entries(config.environment || {}).every(([key, value]) => /^[A-Z][A-Z0-9_]*$/.test(key) && typeof value === 'string'
              && !['PATH', 'PYTHONPATH', 'PYTHONHOME', 'HERMES_HOME'].includes(key))
            && ['python_executable', 'state_directory'].every(key => config[key] === undefined || typeof config[key] === 'string'),
          redactConfig: config => ({ config: {
            configured: config.configured === true, allowed_users: config.allowed_users || [],
            allowed_channels: config.allowed_channels || [], auto_reply: config.auto_reply === true,
          }, hasToken: config.configured === true, hasProviderSettings: !!config.settings, hasEnvironment: !!config.environment }),
          createTransport: (id, config) => new PythonTransport(id, {
            pythonExecutable: config.python_executable || process.env.AGENT_CONNECT_PYTHON || 'python',
            stateDirectory: config.state_directory,
            settings: config.settings || {}, environment: config.environment || {},
          }),
        }), { prefix: '/' + channel.id });
      }
    });
  },
  async onDisable() { await Promise.allSettled(channels.map(channel => stopChannel(channel.id))); },
};
