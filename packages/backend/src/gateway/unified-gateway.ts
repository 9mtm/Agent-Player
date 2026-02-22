/**
 * Unified Gateway
 *
 * Routes messages between channels and agent with shared context
 */

import { EventEmitter } from 'events';
import {
  GatewayEvent
} from './types.js';
import type {
  IGateway,
  IChannelAdapter,
  MessageEnvelope,
  SharedSession,
  ChannelType,
  GatewayConfig,
  GatewayEventPayload
} from './types.js';
import { SessionManager, getSessionManager } from './session-manager.js';
import { AgentRuntime } from '../agent/agent-runtime.js';

export class UnifiedGateway extends EventEmitter implements IGateway {
  private channels: Map<ChannelType, IChannelAdapter> = new Map();
  private sessionManager: SessionManager;
  private agent: AgentRuntime;
  private config: GatewayConfig;
  private running: boolean = false;

  constructor(
    agent: AgentRuntime,
    config: Partial<GatewayConfig> = {}
  ) {
    super();

    this.agent = agent;
    this.config = {
      sessionTimeout: config.sessionTimeout || 3600000, // 1 hour
      maxHistorySize: config.maxHistorySize || 100,
      syncAcrossChannels: config.syncAcrossChannels ?? true,
      notifyAllChannels: config.notifyAllChannels ?? false,
      storageDir: config.storageDir || './.data/gateway'
    };

    this.sessionManager = getSessionManager(
      this.config.storageDir,
      this.config.sessionTimeout
    );
  }

  /**
   * Start gateway
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log('[Gateway] Already running');
      return;
    }

    console.log('[Gateway] 🚀 Starting Unified Gateway...\n');

    // Initialize session manager
    await this.sessionManager.initialize();

    // Initialize all registered channels
    for (const [channelId, adapter] of this.channels.entries()) {
      try {
        await adapter.initialize();
        console.log(`[Gateway] ✅ Initialized ${channelId} channel`);
      } catch (err) {
        console.error(`[Gateway] ❌ Failed to initialize ${channelId}:`, err);
      }
    }

    this.running = true;

    console.log(`
╔═══════════════════════════════════════════╗
║     Unified Gateway Started               ║
╠═══════════════════════════════════════════╣
║  Channels:  ${this.channels.size} registered                  ║
║  Sessions:  Ready for sync                ║
║  Agent:     Connected                     ║
╚═══════════════════════════════════════════╝
    `);
  }

  /**
   * Stop gateway
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    console.log('[Gateway] Shutting down...');

    // Shutdown all channels
    for (const [channelId, adapter] of this.channels.entries()) {
      try {
        await adapter.shutdown();
      } catch (err) {
        console.error(`[Gateway] Error shutting down ${channelId}:`, err);
      }
    }

    // Shutdown session manager
    await this.sessionManager.shutdown();

    this.running = false;
    console.log('[Gateway] ✅ Shutdown complete');
  }

  /**
   * Register channel adapter
   */
  async registerChannel(adapter: IChannelAdapter): Promise<void> {
    if (this.channels.has(adapter.id)) {
      throw new Error(`Channel ${adapter.id} already registered`);
    }

    // Register message handler
    adapter.onMessage(async (envelope) => {
      await this.routeMessage(envelope);
    });

    this.channels.set(adapter.id, adapter);

    // Emit event
    this.emitEvent({
      event: GatewayEvent.CHANNEL_REGISTERED,
      channelId: adapter.id,
      timestamp: Date.now()
    });

    console.log(`[Gateway] Registered ${adapter.name} (${adapter.id})`);
  }

  /**
   * Unregister channel
   */
  async unregisterChannel(channelId: ChannelType): Promise<void> {
    const adapter = this.channels.get(channelId);
    if (!adapter) return;

    await adapter.shutdown();
    this.channels.delete(channelId);

    this.emitEvent({
      event: GatewayEvent.CHANNEL_UNREGISTERED,
      channelId,
      timestamp: Date.now()
    });

    console.log(`[Gateway] Unregistered ${channelId}`);
  }

  /**
   * Get channel adapter
   */
  getChannel(channelId: ChannelType): IChannelAdapter | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Route message to agent and handle response
   */
  async routeMessage(envelope: MessageEnvelope): Promise<void> {
    const { userId, sessionId, channelId, message } = envelope;

    console.log(`[Gateway] 📨 Message from ${channelId} (${userId})`);

    this.emitEvent({
      event: GatewayEvent.MESSAGE_RECEIVED,
      channelId,
      userId,
      sessionId,
      data: { message },
      timestamp: Date.now()
    });

    try {
      // 1. Get or create shared session
      const session = await this.getSession(userId);

      // 2. Register channel activity
      await this.sessionManager.registerChannelActivity(session.sessionId, channelId);

      // 3. Add user message to history
      await this.sessionManager.addMessage(
        session.sessionId,
        'user',
        message,
        channelId
      );

      // 4. Get conversation history
      const history = this.sessionManager.getHistory(session.sessionId, 20);

      // 5. Process with agent (with full context!)
      const agentResponse = await this.agent.process({
        message,
        sessionId: session.sessionId,
        history: history.map((h) => ({
          role: h.role,
          content: h.content
        })),
        context: session.context
      });

      // 6. Add agent response to history
      await this.sessionManager.addMessage(
        session.sessionId,
        'agent',
        agentResponse.content,
        channelId
      );

      // 7. Send response back to original channel
      const channel = this.channels.get(channelId);
      if (channel && channel.isConnected()) {
        await channel.send(userId, agentResponse.content);
      }

      // 8. Optionally notify other active channels
      if (this.config.notifyAllChannels && session.activeChannels.length > 1) {
        await this.notifyOtherChannels(session, channelId, agentResponse.content);
      }

      this.emitEvent({
        event: GatewayEvent.MESSAGE_SENT,
        channelId,
        userId,
        sessionId: session.sessionId,
        data: { response: agentResponse.content },
        timestamp: Date.now()
      });

    } catch (err: any) {
      console.error('[Gateway] Error routing message:', err);

      // Send error message back to user
      const channel = this.channels.get(channelId);
      if (channel && channel.isConnected()) {
        await channel.send(
          userId,
          `❌ Sorry, I encountered an error: ${err.message}`
        );
      }
    }
  }

  /**
   * Get shared session for user
   */
  async getSession(userId: string): Promise<SharedSession> {
    return await this.sessionManager.getSession(userId);
  }

  /**
   * Update session
   */
  async updateSession(session: SharedSession): Promise<void> {
    await this.sessionManager.updateSession(session);

    this.emitEvent({
      event: GatewayEvent.SESSION_UPDATED,
      userId: session.userId,
      sessionId: session.sessionId,
      timestamp: Date.now()
    });
  }

  /**
   * Notify other active channels about message
   */
  private async notifyOtherChannels(
    session: SharedSession,
    excludeChannel: ChannelType,
    message: string
  ): Promise<void> {
    for (const channelId of session.activeChannels) {
      if (channelId === excludeChannel) continue;

      const channel = this.channels.get(channelId);
      if (channel && channel.isConnected()) {
        try {
          await channel.send(
            session.userId,
            `[From ${excludeChannel}] ${message}`
          );
        } catch (err) {
          console.error(`[Gateway] Failed to notify ${channelId}:`, err);
        }
      }
    }
  }

  /**
   * Emit gateway event
   */
  private emitEvent(payload: GatewayEventPayload): void {
    this.emit('gateway:event', payload);
  }

  /**
   * Get gateway statistics
   */
  getStats() {
    return {
      channels: Array.from(this.channels.keys()),
      channelCount: this.channels.size,
      running: this.running,
      config: this.config
    };
  }
}

// Singleton instance
let gateway: UnifiedGateway | null = null;

export function getGateway(
  agent?: AgentRuntime,
  config?: Partial<GatewayConfig>
): UnifiedGateway {
  if (!gateway && agent) {
    gateway = new UnifiedGateway(agent, config);
  }

  if (!gateway) {
    throw new Error('Gateway not initialized. Provide agent on first call.');
  }

  return gateway;
}
