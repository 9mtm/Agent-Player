/**
 * Desktop Channel Adapter
 *
 * Handles desktop app connections (via IPC or WebSocket)
 */

import type { IChannelAdapter, MessageEnvelope, ChannelType } from '../types.js';
import { EventEmitter } from 'events';

export class DesktopChannelAdapter extends EventEmitter implements IChannelAdapter {
  readonly id: ChannelType = 'desktop' as ChannelType;
  readonly name: string = 'Desktop App';

  private connected: boolean = false;
  private messageHandler?: (envelope: MessageEnvelope) => void;
  private connections: Map<string, any> = new Map(); // userId -> connection

  async initialize(): Promise<void> {
    this.connected = true;
    console.log('[DesktopAdapter] Initialized');
  }

  async shutdown(): Promise<void> {
    this.connected = false;
    this.connections.clear();
    console.log('[DesktopAdapter] Shutdown');
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Send message to desktop client
   */
  async send(
    userId: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const connection = this.connections.get(userId);

    if (connection) {
      // In full implementation, send via IPC/WebSocket
      // connection.send({ type: 'message', content: message, metadata });
      this.emit('message:sent', { userId, message, metadata });
    }

    console.log(`[DesktopAdapter] Sent to ${userId}: ${message.slice(0, 50)}...`);
  }

  /**
   * Register message handler
   */
  onMessage(handler: (envelope: MessageEnvelope) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Register desktop connection
   */
  registerConnection(userId: string, connection: any): void {
    this.connections.set(userId, connection);
    console.log(`[DesktopAdapter] Registered connection for ${userId}`);
  }

  /**
   * Unregister desktop connection
   */
  unregisterConnection(userId: string): void {
    this.connections.delete(userId);
    console.log(`[DesktopAdapter] Unregistered connection for ${userId}`);
  }

  /**
   * Receive message from desktop client
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
   * Resolve user ID
   */
  async resolveUserId(channelUserId: string): Promise<string> {
    return channelUserId;
  }
}
