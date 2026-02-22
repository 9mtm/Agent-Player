/**
 * Gateway Module
 *
 * Multi-interface gateway for unified agent access
 */

export * from './types.js';
export * from './session-manager.js';
export * from './unified-gateway.js';

// Adapters
export { WebChannelAdapter } from './adapters/web-adapter.js';
export { DesktopChannelAdapter } from './adapters/desktop-adapter.js';
export { WhatsAppChannelAdapter } from './adapters/whatsapp-adapter.js';
