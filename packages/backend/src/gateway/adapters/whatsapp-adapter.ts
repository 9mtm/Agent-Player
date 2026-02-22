/**
 * WhatsApp Channel Adapter
 *
 * Integrates with existing WhatsApp channel from channels system
 */

import type { IChannelAdapter, MessageEnvelope, ChannelType } from '../types.js';
import { EventEmitter } from 'events';

export class WhatsAppChannelAdapter extends EventEmitter implements IChannelAdapter {
  readonly id: ChannelType = 'whatsapp' as ChannelType;
  readonly name: string = 'WhatsApp';

  private connected: boolean = false;
  private messageHandler?: (envelope: MessageEnvelope) => void;
  private whatsappChannel: any; // Reference to existing WhatsApp channel

  constructor(whatsappChannel?: any) {
    super();
    this.whatsappChannel = whatsappChannel;
  }

  async initialize(): Promise<void> {
    // Connect to existing WhatsApp channel
    if (this.whatsappChannel) {
      // Set up message forwarding
      this.whatsappChannel.on('message', this.handleWhatsAppMessage.bind(this));
      this.connected = true;
      console.log('[WhatsAppAdapter] Initialized with existing channel');
    } else {
      console.log('[WhatsAppAdapter] Initialized (no channel connected yet)');
    }
  }

  async shutdown(): Promise<void> {
    if (this.whatsappChannel) {
      this.whatsappChannel.removeAllListeners('message');
    }
    this.connected = false;
    console.log('[WhatsAppAdapter] Shutdown');
  }

  isConnected(): boolean {
    return this.connected && this.whatsappChannel?.isConnected();
  }

  /**
   * Send message via WhatsApp
   */
  async send(
    userId: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.whatsappChannel) {
      console.warn('[WhatsAppAdapter] No WhatsApp channel available');
      return;
    }

    // Resolve WhatsApp phone number from userId
    const phoneNumber = await this.getUserPhoneNumber(userId);

    if (phoneNumber) {
      await this.whatsappChannel.sendMessage(phoneNumber, message);
      console.log(`[WhatsAppAdapter] Sent to ${phoneNumber}: ${message.slice(0, 50)}...`);
    }
  }

  /**
   * Register message handler
   */
  onMessage(handler: (envelope: MessageEnvelope) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Handle incoming WhatsApp message
   */
  private async handleWhatsAppMessage(waMessage: any): Promise<void> {
    if (!this.messageHandler) return;

    // Extract message details
    const phoneNumber = waMessage.from; // WhatsApp phone number
    const message = waMessage.body;

    // Resolve to internal userId
    const userId = await this.resolveUserId(phoneNumber);

    // Create session ID (use phone number as base)
    const sessionId = `wa-${phoneNumber}`;

    const envelope: MessageEnvelope = {
      userId,
      sessionId,
      channelId: this.id,
      message,
      timestamp: Date.now(),
      metadata: {
        phoneNumber,
        whatsappId: waMessage.id
      }
    };

    this.messageHandler(envelope);
  }

  /**
   * Resolve user ID from WhatsApp phone number
   */
  async resolveUserId(phoneNumber: string): Promise<string> {
    // In full implementation, look up user in database
    // For now, use phone number as userId
    return `whatsapp:${phoneNumber}`;
  }

  /**
   * Get WhatsApp phone number for user
   */
  private async getUserPhoneNumber(userId: string): Promise<string | null> {
    // In full implementation, look up in database
    // For now, extract from userId if it's in format "whatsapp:+1234567890"
    if (userId.startsWith('whatsapp:')) {
      return userId.replace('whatsapp:', '');
    }
    return null;
  }

  /**
   * Set WhatsApp channel instance
   */
  setWhatsAppChannel(channel: any): void {
    this.whatsappChannel = channel;
    if (this.connected) {
      // Re-initialize with new channel
      this.initialize();
    }
  }
}
