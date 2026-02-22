/**
 * Gateway Types
 *
 * Multi-interface gateway for unified agent access
 */

/**
 * Supported channel types
 */
export enum ChannelType {
  DESKTOP = 'desktop',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  WEB = 'web',
  MOBILE = 'mobile'
}

/**
 * Message envelope - wraps messages from any channel
 */
export interface MessageEnvelope {
  // Identity
  userId: string;
  sessionId: string;
  channelId: ChannelType;

  // Content
  message: string;
  messageId?: string;

  // Metadata
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Channel adapter interface
 * Each interface (Desktop, WhatsApp, etc.) implements this
 */
export interface IChannelAdapter {
  // Channel identity
  readonly id: ChannelType;
  readonly name: string;

  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  isConnected(): boolean;

  // Messaging
  send(userId: string, message: string, metadata?: Record<string, any>): Promise<void>;
  onMessage(handler: (envelope: MessageEnvelope) => void): void;

  // User resolution
  resolveUserId(channelUserId: string): Promise<string>;
}

/**
 * Shared session across all interfaces
 */
export interface SharedSession {
  // Identity
  userId: string;
  sessionId: string;

  // Active interfaces
  activeChannels: ChannelType[];
  lastActiveChannel: ChannelType;

  // Conversation context
  conversationHistory: Array<{
    role: 'user' | 'agent';
    content: string;
    channelId: ChannelType;
    timestamp: number;
  }>;

  // Agent context
  context: {
    userPreferences?: any;
    currentTopic?: string;
    lastSkillUsed?: string;
    variables?: Record<string, any>;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
}

/**
 * Gateway configuration
 */
export interface GatewayConfig {
  // Session management
  sessionTimeout: number; // ms
  maxHistorySize: number;

  // Sync settings
  syncAcrossChannels: boolean;
  notifyAllChannels: boolean;

  // Storage
  storageDir: string;
}

/**
 * Gateway interface
 */
export interface IGateway {
  // Channel management
  registerChannel(adapter: IChannelAdapter): Promise<void>;
  unregisterChannel(channelId: ChannelType): Promise<void>;
  getChannel(channelId: ChannelType): IChannelAdapter | undefined;

  // Message routing
  routeMessage(envelope: MessageEnvelope): Promise<void>;

  // Session management
  getSession(userId: string): Promise<SharedSession>;
  updateSession(session: SharedSession): Promise<void>;

  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Gateway event types
 */
export const GatewayEvent = {
  CHANNEL_REGISTERED: 'channel:registered',
  CHANNEL_UNREGISTERED: 'channel:unregistered',
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_SENT: 'message:sent',
  SESSION_CREATED: 'session:created',
  SESSION_UPDATED: 'session:updated'
} as const;

export type GatewayEventType = typeof GatewayEvent[keyof typeof GatewayEvent];

/**
 * Gateway event payload
 */
export interface GatewayEventPayload {
  event: GatewayEventType;
  channelId?: ChannelType;
  userId?: string;
  sessionId?: string;
  data?: any;
  timestamp: number;
}
