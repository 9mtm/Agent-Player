/**
 * Web Channel Adapter
 * For web-based chat (already implemented in chat routes)
 */

import { BaseChannelAdapter } from './base.js';
import type { MessageOptions, InboundMessage } from '../types.js';

export class WebChannelAdapter extends BaseChannelAdapter {
  id = 'web';
  name = 'Web Chat';
  type = 'web' as const;

  private sessions: Map<string, any> = new Map();

  /**
   * Connect (always connected for web)
   */
  async connect(): Promise<void> {
    this.status = 'connected';
    console.log(`[${this.name}] ✅ Connected`);
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    this.status = 'disconnected';
    this.sessions.clear();
    console.log(`[${this.name}] ⏹️  Disconnected`);
  }

  /**
   * Send message (handled by chat routes via SSE)
   */
  async sendMessage(
    to: string,
    content: string,
    options?: MessageOptions
  ): Promise<void> {
    // For web channel, messages are sent via Server-Sent Events
    // This is just a placeholder - actual sending happens in chat routes
    console.log(`[${this.name}] 📤 Message to ${to}: ${content}`);
  }

  /**
   * Receive message from web client
   * Called by chat routes when user sends message
   */
  receiveMessage(sessionId: string, content: string, from: string = 'user'): void {
    const message: InboundMessage = {
      id: `web_${Date.now()}`,
      channelId: this.id,
      from,
      to: 'agent',
      content,
      timestamp: new Date(),
    };

    this.emitMessage(message);
  }

  /**
   * Register session (called when user opens chat)
   */
  registerSession(sessionId: string, metadata?: any): void {
    this.sessions.set(sessionId, { ...metadata, connectedAt: new Date() });
    console.log(`[${this.name}] 🔌 Session registered: ${sessionId}`);
  }

  /**
   * Unregister session (called when user closes chat)
   */
  unregisterSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    console.log(`[${this.name}] 🔌 Session unregistered: ${sessionId}`);
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }
}
