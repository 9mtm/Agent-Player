/**
 * Telegram Channel Adapter
 * Using grammY
 */

import { BaseChannelAdapter } from './base.js';
import type { MessageOptions, InboundMessage, MediaFile } from '../types.js';

// TODO: Install grammy
// npm install grammy

/**
 * Telegram Adapter
 * Connects to Telegram using Bot API via grammY
 */
export class TelegramAdapter extends BaseChannelAdapter {
  id = 'telegram';
  name = 'Telegram';
  type = 'telegram' as const;

  private bot: any = null;
  private botToken: string = '';

  constructor(botToken?: string) {
    super();
    if (botToken) {
      this.botToken = botToken;
    }
  }

  /**
   * Connect to Telegram
   */
  async connect(): Promise<void> {
    try {
      if (!this.botToken) {
        throw new Error('Telegram bot token not configured');
      }

      this.status = 'connecting';
      console.log(`[${this.name}] 🔌 Connecting to Telegram...`);

      // TODO: Initialize grammY bot
      // const { Bot } = await import('grammy');
      //
      // this.bot = new Bot(this.botToken);
      //
      // this.bot.on('message', this.handleMessage.bind(this));
      // this.bot.on('callback_query', this.handleCallbackQuery.bind(this));
      //
      // await this.bot.start();

      // For now, mark as connected (placeholder)
      this.status = 'connected';
      console.log(`[${this.name}] ✅ Connected (placeholder - install grammY)`);
    } catch (error) {
      this.status = 'error';
      console.error(`[${this.name}] ❌ Connection failed:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from Telegram
   */
  async disconnect(): Promise<void> {
    if (this.bot) {
      // TODO: await this.bot.stop();
      this.bot = null;
    }

    this.status = 'disconnected';
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
      throw new Error('Telegram is not connected');
    }

    if (!this.bot) {
      throw new Error('Telegram bot not initialized');
    }

    try {
      // TODO: Send message using grammY
      // const keyboard = options?.buttons
      //   ? {
      //       inline_keyboard: options.buttons.map((btn) => [
      //         { text: btn.label, callback_data: btn.callback || btn.id },
      //       ]),
      //     }
      //   : undefined;
      //
      // await this.bot.api.sendMessage(to, content, {
      //   reply_to_message_id: options?.replyTo,
      //   reply_markup: keyboard,
      //   parse_mode: 'Markdown',
      // });

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
      throw new Error('Telegram is not connected');
    }

    if (!this.bot) {
      throw new Error('Telegram bot not initialized');
    }

    try {
      // TODO: Send media using grammY
      // const inputFile = media.url || media.path;
      //
      // if (media.type === 'image') {
      //   await this.bot.api.sendPhoto(to, inputFile!, { caption });
      // } else if (media.type === 'video') {
      //   await this.bot.api.sendVideo(to, inputFile!, { caption });
      // } else if (media.type === 'audio') {
      //   await this.bot.api.sendAudio(to, inputFile!, { caption });
      // } else if (media.type === 'document') {
      //   await this.bot.api.sendDocument(to, inputFile!, { caption });
      // }

      console.log(`[${this.name}] 📤 Sent media to ${to}`);
    } catch (error) {
      console.error(`[${this.name}] ❌ Failed to send media:`, error);
      throw error;
    }
  }

  /**
   * Send to group
   */
  async sendToGroup(groupId: string, content: string): Promise<void> {
    // Same as sendMessage for Telegram
    await this.sendMessage(groupId, content);
  }

  /**
   * Set bot token
   */
  setBotToken(token: string): void {
    this.botToken = token;
  }

  /**
   * Handle incoming message
   */
  private handleMessage(ctx: any): void {
    const msg = ctx.message;

    const message: InboundMessage = {
      id: msg.message_id.toString(),
      channelId: this.id,
      from: msg.from.id.toString(),
      to: 'agent',
      content: msg.text || msg.caption || '',
      timestamp: new Date(msg.date * 1000),
      metadata: {
        username: msg.from.username,
        firstName: msg.from.first_name,
        chatType: msg.chat.type,
      },
    };

    // Handle media
    // TODO: Add media handling for photos, videos, documents, etc.

    this.emitMessage(message);
  }

  /**
   * Handle callback query (button clicks)
   */
  private handleCallbackQuery(ctx: any): void {
    const query = ctx.callbackQuery;

    console.log(
      `[${this.name}] 🔘 Button clicked: ${query.data} by ${query.from.id}`
    );

    // TODO: Emit button click event
    // this.emit('button:click', {
    //   channelId: this.id,
    //   from: query.from.id.toString(),
    //   data: query.data,
    // });
  }
}

/**
 * Create Telegram adapter
 */
export function createTelegramAdapter(botToken?: string): TelegramAdapter {
  return new TelegramAdapter(botToken);
}
