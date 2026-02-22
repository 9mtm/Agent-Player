/**
 * WhatsApp Channel Adapter
 * Using @whiskeysockets/baileys
 */

import { BaseChannelAdapter } from './base.js';
import type { MessageOptions, InboundMessage, MediaFile } from '../types.js';

// TODO: Install @whiskeysockets/baileys
// npm install @whiskeysockets/baileys

/**
 * WhatsApp Adapter
 * Connects to WhatsApp Web using Baileys library
 */
export class WhatsAppAdapter extends BaseChannelAdapter {
  id = 'whatsapp';
  name = 'WhatsApp';
  type = 'whatsapp' as const;

  private client: any = null;
  private qrCode: string | null = null;

  /**
   * Connect to WhatsApp
   */
  async connect(): Promise<void> {
    try {
      this.status = 'connecting';
      console.log(`[${this.name}] 🔌 Connecting to WhatsApp...`);

      // TODO: Initialize Baileys client
      // const { default: makeWASocket } = await import('@whiskeysockets/baileys');
      //
      // this.client = makeWASocket({
      //   printQRInTerminal: true,
      //   auth: authState,
      // });
      //
      // this.client.ev.on('connection.update', this.handleConnectionUpdate.bind(this));
      // this.client.ev.on('messages.upsert', this.handleMessages.bind(this));
      // this.client.ev.on('qr', this.handleQR.bind(this));

      // For now, mark as connected (placeholder)
      this.status = 'connected';
      console.log(`[${this.name}] ✅ Connected (placeholder - install Baileys)`);
    } catch (error) {
      this.status = 'error';
      console.error(`[${this.name}] ❌ Connection failed:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from WhatsApp
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      // TODO: await this.client.logout();
      this.client = null;
    }

    this.status = 'disconnected';
    this.qrCode = null;
    console.log(`[${this.name}] ⏹️  Disconnected`);
  }

  /**
   * Send message
   */
  async sendMessage(
    to: string,
    content: string,
    options?: MessageOptions
  ): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WhatsApp is not connected');
    }

    if (!this.client) {
      throw new Error('WhatsApp client not initialized');
    }

    try {
      // Format phone number (add @s.whatsapp.net if needed)
      const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

      // TODO: Send message using Baileys
      // await this.client.sendMessage(jid, { text: content });

      console.log(`[${this.name}] 📤 Sent to ${to}: ${content}`);
    } catch (error) {
      console.error(`[${this.name}] ❌ Failed to send message:`, error);
      throw error;
    }
  }

  /**
   * Send media
   */
  async sendMedia(to: string, media: MediaFile, caption?: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WhatsApp is not connected');
    }

    if (!this.client) {
      throw new Error('WhatsApp client not initialized');
    }

    try {
      const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

      // TODO: Send media using Baileys
      // const messageContent: any = { caption };
      //
      // if (media.type === 'image') {
      //   messageContent.image = { url: media.url || media.path };
      // } else if (media.type === 'video') {
      //   messageContent.video = { url: media.url || media.path };
      // } else if (media.type === 'audio') {
      //   messageContent.audio = { url: media.url || media.path };
      // } else if (media.type === 'document') {
      //   messageContent.document = { url: media.url || media.path };
      // }
      //
      // await this.client.sendMessage(jid, messageContent);

      console.log(`[${this.name}] 📤 Sent media to ${to}`);
    } catch (error) {
      console.error(`[${this.name}] ❌ Failed to send media:`, error);
      throw error;
    }
  }

  /**
   * Get QR code for pairing
   */
  getQRCode(): string | null {
    return this.qrCode;
  }

  /**
   * Handle connection updates
   */
  private handleConnectionUpdate(update: any): void {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      this.qrCode = qr;
      console.log(`[${this.name}] 📱 QR Code updated`);
    }

    if (connection === 'close') {
      console.log(`[${this.name}] ⚠️  Connection closed`);
      this.status = 'disconnected';
    } else if (connection === 'open') {
      console.log(`[${this.name}] ✅ Connected`);
      this.status = 'connected';
      this.qrCode = null;
    }
  }

  /**
   * Handle QR code
   */
  private handleQR(qr: string): void {
    this.qrCode = qr;
    console.log(`[${this.name}] 📱 New QR Code received`);
    // TODO: Emit event to show QR in UI
  }

  /**
   * Handle incoming messages
   */
  private handleMessages(msgUpdate: any): void {
    const { messages, type } = msgUpdate;

    if (type !== 'notify') return;

    for (const msg of messages) {
      // Skip if message is from ourselves
      if (msg.key.fromMe) continue;

      const message: InboundMessage = {
        id: msg.key.id!,
        channelId: this.id,
        from: msg.key.remoteJid!,
        to: 'agent',
        content: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '',
        timestamp: new Date(msg.messageTimestamp! * 1000),
      };

      // Handle media messages
      // TODO: Add media handling

      this.emitMessage(message);
    }
  }
}

/**
 * Create WhatsApp adapter
 */
export function createWhatsAppAdapter(): WhatsAppAdapter {
  return new WhatsAppAdapter();
}
