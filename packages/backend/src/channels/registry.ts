/**
 * Channels Registry
 * Manages all channel adapters
 */

import EventEmitter from 'events';
import type {
  ChannelAdapter,
  ChannelType,
  OutboundMessage,
  IChannelRegistry,
} from './types.js';

export class ChannelRegistry extends EventEmitter implements IChannelRegistry {
  private channels: Map<string, ChannelAdapter> = new Map();

  constructor() {
    super();
  }

  /**
   * Register a channel adapter
   */
  register(adapter: ChannelAdapter): void {
    if (this.channels.has(adapter.id)) {
      throw new Error(`Channel ${adapter.id} is already registered`);
    }

    this.channels.set(adapter.id, adapter);
    console.log(
      `[ChannelRegistry] ✅ Registered channel: ${adapter.name} (${adapter.type})`
    );

    this.emit('channel:registered', adapter);
  }

  /**
   * Unregister a channel adapter
   */
  unregister(channelId: string): void {
    const adapter = this.channels.get(channelId);
    if (!adapter) {
      console.warn(`[ChannelRegistry] Channel ${channelId} not found`);
      return;
    }

    this.channels.delete(channelId);
    console.log(`[ChannelRegistry] ❌ Unregistered channel: ${adapter.name}`);

    this.emit('channel:unregistered', adapter);
  }

  /**
   * Get a channel by ID
   */
  get(channelId: string): ChannelAdapter | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Get all channels
   */
  getAll(): ChannelAdapter[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get channels by type
   */
  getByType(type: ChannelType): ChannelAdapter[] {
    return this.getAll().filter((c) => c.type === type);
  }

  /**
   * Get connected channels only
   */
  getConnected(): ChannelAdapter[] {
    return this.getAll().filter((c) => c.isConnected());
  }

  /**
   * Send message through specific channel
   */
  async sendMessage(channelId: string, message: OutboundMessage): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    if (!channel.isConnected()) {
      throw new Error(`Channel ${channel.name} is not connected`);
    }

    const config = channel.getConfig();
    if (!config.enabled) {
      throw new Error(`Channel ${channel.name} is disabled`);
    }

    await channel.sendMessage(message.to, message.content, message.options);

    this.emit('message:sent', channelId, message);
  }

  /**
   * Broadcast message to all connected channels
   */
  async broadcast(message: OutboundMessage): Promise<void> {
    const connected = this.getConnected();

    if (connected.length === 0) {
      console.warn('[ChannelRegistry] No connected channels to broadcast to');
      return;
    }

    const promises = connected.map((channel) =>
      this.sendMessage(channel.id, message).catch((err) => {
        console.error(
          `[ChannelRegistry] Failed to broadcast to ${channel.name}:`,
          err
        );
      })
    );

    await Promise.all(promises);
    console.log(`[ChannelRegistry] 📣 Broadcasted to ${connected.length} channels`);
  }

  /**
   * Check if channel exists
   */
  has(channelId: string): boolean {
    return this.channels.has(channelId);
  }

  /**
   * Get channel count
   */
  count(): number {
    return this.channels.size;
  }

  /**
   * Get connected channel count
   */
  countConnected(): number {
    return this.getConnected().length;
  }

  /**
   * Clear all channels
   */
  clear(): void {
    this.channels.clear();
    console.log('[ChannelRegistry] 🗑️  Cleared all channels');
  }

  /**
   * Get channels as array for serialization
   */
  toJSON() {
    return {
      total: this.count(),
      connected: this.countConnected(),
      channels: this.getAll().map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.getStatus(),
        connected: c.isConnected(),
      })),
    };
  }
}

// Singleton instance
let registryInstance: ChannelRegistry | null = null;

export function getChannelRegistry(): ChannelRegistry {
  if (!registryInstance) {
    registryInstance = new ChannelRegistry();
  }
  return registryInstance;
}
