/**
 * Web Channel Adapter
 *
 * Handles web-based chat (via WebSocket or HTTP)
 */

import type { IChannelAdapter, MessageEnvelope, ChannelType } from '../types.js';
import { EventEmitter } from 'events';

export class WebChannelAdapter extends EventEmitter implements IChannelAdapter {
  readonly id: ChannelType = 'web' as ChannelType;
  readonly name: string = 'Web Chat';

  private connected: boolean = false;
  private messageHandler?: (envelope: MessageEnvelope) => void;

  async initialize(): Promise<void> {
    this.connected = true;
    console.log('[WebAdapter] Initialized');
  }

  async shutdown(): Promise<void> {
    this.connected = false;
    console.log('[WebAdapter] Shutdown');
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Send message to web client
   * (Will be implemented via WebSocket in full version)
   */
  async send(
    userId: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // In full implementation, this would send via WebSocket
    // For now, we'll just emit an event
    this.emit('message:sent', {
      userId,
      message,
      metadata,
      timestamp: Date.now()
    });

    console.log(`[WebAdapter] Sent to ${userId}: ${message.slice(0, 50)}...`);
  }

  /**
   * Register message handler
   */
  onMessage(handler: (envelope: MessageEnvelope) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Receive message from web client
   * (Called by API route)
   */
  async receiveMessage(
    userId: string,
    sessionId: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.messageHandler) {
      throw new Error('No message handler registered');
    }

    const envelope: MessageEnvelope = {
      userId,
      sessionId,
      channelId: this.id,
      message,
      timestamp: Date.now(),
      metadata
    };

    this.messageHandler(envelope);
  }

  /**
   * Resolve user ID (for web, it's already a user ID)
   */
  async resolveUserId(channelUserId: string): Promise<string> {
    return channelUserId;
  }
}
