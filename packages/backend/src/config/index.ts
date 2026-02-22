/**
 * Backend Centralized Configuration
 * All backend routes and services should import from this file
 */

export const config = {
  /**
   * Server Configuration
   */
  port: parseInt(process.env.PORT || '41522', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  /**
   * Frontend URL - configured via NEXT_PUBLIC_APP_URL in .env
   * Used for CORS, OAuth redirects, and embed URLs
   */
  frontendUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:41521',

  /**
   * Database Configuration
   */
  databaseUrl: process.env.DATABASE_URL || 'file:./.data/agent-player.db',
  databasePath: process.env.DATABASE_PATH || './.data/agent-player.db',

  /**
   * OAuth Redirect URIs
   */
  gmailRedirectUri: process.env.GMAIL_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:41521'}/auth/gmail/callback`,
  outlookRedirectUri: process.env.OUTLOOK_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:41521'}/auth/outlook/callback`,

  /**
   * Encryption & Security
   */
  encryptionKey: process.env.ENCRYPTION_KEY || '',
  masterEncryptionKey: process.env.MASTER_ENCRYPTION_KEY || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  /**
   * AI Providers
   */
  ai: {
    openai: process.env.OPENAI_API_KEY || '',
    anthropic: process.env.ANTHROPIC_API_KEY || '',
    google: process.env.GOOGLE_API_KEY || '',
    ollama: {
      url: process.env.OLLAMA_URL || 'http://localhost:11434',
      apiUrl: process.env.LOCAL_MODEL_API_URL || 'http://localhost:11434/v1',
      modelName: process.env.LOCAL_MODEL_NAME || 'qwen2.5:7b',
      apiKey: process.env.LOCAL_MODEL_API_KEY || 'sk-dummy',
    },
  },

  /**
   * Storage Configuration
   */
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    dataDir: './.data',
  },

  /**
   * Optional Channels
   */
  channels: {
    whatsappSessionPath: process.env.WHATSAPP_SESSION_PATH || './.data/whatsapp-session',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    discordBotToken: process.env.DISCORD_BOT_TOKEN || '',
  },
} as const;
