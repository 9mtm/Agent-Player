/**
 * Channels System Types
 * Multi-channel messaging support
 */

/**
 * Channel Types
 */
export type ChannelType =
  | 'whatsapp'
  | 'telegram'
  | 'discord'
  | 'slack'
  | 'web'
  | 'custom';

/**
 * Channel Status
 */
export type ChannelStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'error';

/**
 * DM Policy
 */
export type DMPolicy = 'open' | 'pairing' | 'closed';

/**
 * Message Type
 */
export interface InboundMessage {
  id: string;
  channelId: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  media?: MediaFile[];
  metadata?: Record<string, any>;
}

export interface OutboundMessage {
  channelId: string;
  to: string;
  content: string;
  media?: MediaFile[];
  options?: MessageOptions;
}

/**
 * Media File
 */
export interface MediaFile {
  type: 'image' | 'video' | 'audio' | 'document';
  url?: string;
  path?: string;
  mimeType?: string;
  size?: number;
  caption?: string;
}

/**
 * Message Options
 */
export interface MessageOptions {
  silent?: boolean;
  replyTo?: string;
  mentions?: string[];
  buttons?: MessageButton[];
}

/**
 * Message Button
 */
export interface MessageButton {
  id: string;
  label: string;
  url?: string;
  callback?: string;
}

/**
 * Channel Configuration
 */
export interface ChannelConfig {
  enabled: boolean;
  allowlist: string[];
  dmPolicy: DMPolicy;
  [key: string]: any;
}

/**
 * Channel Adapter Interface
 * All channel adapters must implement this
 */
export interface ChannelAdapter {
  // Metadata
  id: string;
  name: string;
  type: ChannelType;

  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getStatus(): ChannelStatus;

  // Messaging
  sendMessage(to: string, content: string, options?: MessageOptions): Promise<void>;
  onMessage(handler: (message: InboundMessage) => void): void;

  // Media
  sendMedia?(to: string, media: MediaFile, caption?: string): Promise<void>;

  // Groups (optional)
  sendToGroup?(groupId: string, content: string): Promise<void>;

  // Configuration
  getConfig(): ChannelConfig;
  updateConfig(config: Partial<ChannelConfig>): void;

  // Health
  healthCheck?(): Promise<boolean>;
}

/**
 * Channel Registry Interface
 */
export interface IChannelRegistry {
  // Registration
  register(adapter: ChannelAdapter): void;
  unregister(channelId: string): void;

  // Query
  get(channelId: string): ChannelAdapter | undefined;
  getAll(): ChannelAdapter[];
  getByType(type: ChannelType): ChannelAdapter[];
  getConnected(): ChannelAdapter[];

  // Messaging
  sendMessage(channelId: string, message: OutboundMessage): Promise<void>;
  broadcast(message: OutboundMessage): Promise<void>;
}

/**
 * Pairing Request
 */
export interface PairingRequest {
  id: string;
  channelId: string;
  from: string;
  code: string;
  expiresAt: Date;
  approved: boolean;
}

/**
 * Allowlist Entry
 */
export interface AllowlistEntry {
  channelId: string;
  identifier: string; // Phone number, username, etc.
  addedAt: Date;
  note?: string;
}
