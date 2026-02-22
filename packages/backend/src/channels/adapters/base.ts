/**
 * Base Channel Adapter
 * Abstract class that all channel adapters extend
 */

import type {
  ChannelAdapter,
  ChannelType,
  ChannelStatus,
  ChannelConfig,
  InboundMessage,
  MessageOptions,
} from '../types.js';

export abstract class BaseChannelAdapter implements ChannelAdapter {
  // Metadata
  abstract id: string;
  abstract name: string;
  abstract type: ChannelType;

  // State
  protected status: ChannelStatus = 'disconnected';
  protected config: ChannelConfig = {
    enabled: true,
    allowlist: [],
    dmPolicy: 'pairing',
  };

  // Message handler
  protected messageHandler?: (message: InboundMessage) => void;

  /**
   * Connect to channel
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from channel
   */
  abstract disconnect(): Promise<void>;

  /**
   * Send message
   */
  abstract sendMessage(
    to: string,
    content: string,
    options?: MessageOptions
  ): Promise<void>;

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === 'connected';
  }

  /**
   * Get current status
   */
  getStatus(): ChannelStatus {
    return this.status;
  }

  /**
   * Set message handler
   */
  onMessage(handler: (message: InboundMessage) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Get configuration
   */
  getConfig(): ChannelConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ChannelConfig>): void {
    this.config = { ...this.config, ...config };
    console.log(`[${this.name}] Configuration updated`);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return this.isConnected();
  }

  /**
   * Check if sender is allowed (based on allowlist and DM policy)
   */
  protected isAllowed(from: string): boolean {
    const { allowlist, dmPolicy } = this.config;

    // If DM policy is open, allow everyone
    if (dmPolicy === 'open') {
      return true;
    }

    // If DM policy is closed, deny everyone
    if (dmPolicy === 'closed') {
      return false;
    }

    // If DM policy is pairing, check allowlist
    return allowlist.includes(from) || allowlist.includes('*');
  }

  /**
   * Emit message to handler (if allowed)
   */
  protected emitMessage(message: InboundMessage): void {
    if (!this.messageHandler) {
      console.warn(`[${this.name}] No message handler registered`);
      return;
    }

    // Check if sender is allowed
    if (!this.isAllowed(message.from)) {
      console.log(
        `[${this.name}] ⛔ Message from ${message.from} blocked (not in allowlist)`
      );

      // TODO: Send pairing code if DM policy is pairing
      return;
    }

    // Pass message to handler
    this.messageHandler(message);
  }
}
