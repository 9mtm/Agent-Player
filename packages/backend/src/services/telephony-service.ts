import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../db/index.js';
import { randomBytes } from 'crypto';
import { config } from '../config/index.js';

/**
 * Unified Telephony Service
 * Supports multiple providers (Twilio, Google Voice)
 * Provides abstraction layer for phone number management, calling, etc.
 */

export interface TelephonyProvider {
  name: 'twilio' | 'google';

  // Phone Number Management
  searchAvailableNumbers(countryCode: string, areaCode?: string): Promise<AvailableNumber[]>;
  purchasePhoneNumber(phoneNumber: string, friendlyName: string, webhookBaseUrl: string): Promise<PurchasedNumber>;
  releasePhoneNumber(providerSid: string): Promise<void>;

  // Call Management
  makeCall(params: MakeCallParams): Promise<CallInfo>;
  hangupCall(callSid: string): Promise<void>;
  transferCall(callSid: string, toNumber: string): Promise<void>;

  // Utility
  validateWebhookSignature(signature: string, url: string, params: any): boolean;
}

export interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  region: string;
  capabilities: {
    voice: boolean;
    SMS: boolean;
    MMS: boolean;
  };
  monthlyCost: number;
}

export interface PurchasedNumber {
  providerSid: string;
  phoneNumber: string;
  friendlyName: string;
  capabilities: {
    voice: boolean;
    SMS: boolean;
    MMS: boolean;
  };
}

export interface MakeCallParams {
  from: string;
  to: string;
  callPointId: string;
  webhookBaseUrl: string;
}

export interface CallInfo {
  callSid: string;
  status: string;
  from: string;
  to: string;
  direction: 'inbound' | 'outbound';
}

/**
 * Telephony Service - Unified interface for all providers
 */
export class TelephonyService {
  private providers: Map<string, TelephonyProvider> = new Map();
  private defaultProvider: string;

  constructor() {
    this.defaultProvider = process.env.DEFAULT_TELEPHONY_PROVIDER || 'twilio';
  }

  /**
   * Register a provider (Twilio, Google, etc.)
   */
  registerProvider(provider: TelephonyProvider) {
    this.providers.set(provider.name, provider);
  }

  /**
   * Get provider by name
   */
  getProvider(name?: string): TelephonyProvider {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Telephony provider "${providerName}" not registered or configured`);
    }

    return provider;
  }

  /**
   * Search available phone numbers
   */
  async searchAvailableNumbers(
    countryCode: string,
    areaCode?: string,
    provider?: string
  ): Promise<AvailableNumber[]> {
    return this.getProvider(provider).searchAvailableNumbers(countryCode, areaCode);
  }

  /**
   * Purchase a phone number
   */
  async purchasePhoneNumber(
    phoneNumber: string,
    friendlyName: string,
    provider?: string
  ): Promise<string> {
    const webhookBaseUrl = process.env.PUBLIC_URL || `http://${config.host}:${config.port}`;
    const selectedProvider = provider || this.defaultProvider;

    // Purchase from provider
    const purchased = await this.getProvider(selectedProvider).purchasePhoneNumber(
      phoneNumber,
      friendlyName,
      webhookBaseUrl
    );

    // Store in database
    const db = getDatabase();
    const id = randomBytes(16).toString('hex');

    db.prepare(`
      INSERT INTO phone_numbers (
        id, phone_number, friendly_name, country_code, capabilities,
        provider, provider_sid, status, purchased_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))
    `).run(
      id,
      purchased.phoneNumber,
      purchased.friendlyName,
      phoneNumber.substring(1, 3), // Extract country code from +1234...
      JSON.stringify(purchased.capabilities),
      selectedProvider,
      purchased.providerSid
    );

    return id;
  }

  /**
   * Release a phone number
   */
  async releasePhoneNumber(numberId: string): Promise<void> {
    const db = getDatabase();

    const number = db.prepare<any>(`
      SELECT provider_sid, provider FROM phone_numbers WHERE id = ?
    `).get(numberId);

    if (!number) {
      throw new Error(`Phone number ${numberId} not found`);
    }

    // Release from provider
    if (number.provider_sid) {
      await this.getProvider(number.provider).releasePhoneNumber(number.provider_sid);
    }

    // Mark as released in database
    db.prepare(`
      UPDATE phone_numbers SET status = 'released', updated_at = datetime('now')
      WHERE id = ?
    `).run(numberId);
  }

  /**
   * Make an outbound call
   */
  async makeCall(params: {
    callPointId: string;
    toNumber: string;
  }): Promise<string> {
    const db = getDatabase();

    // Get call point details
    const callPoint = db.prepare<any>(`
      SELECT cp.*, pn.phone_number, pn.provider
      FROM call_points cp
      JOIN phone_numbers pn ON pn.id = cp.phone_number_id
      WHERE cp.id = ?
    `).get(params.callPointId);

    if (!callPoint) {
      throw new Error(`Call point ${params.callPointId} not found`);
    }

    if (!callPoint.enabled) {
      throw new Error(`Call point ${params.callPointId} is disabled`);
    }

    const webhookBaseUrl = process.env.PUBLIC_URL || `http://${config.host}:${config.port}`;

    // Make call via provider
    const callInfo = await this.getProvider(callPoint.provider).makeCall({
      from: callPoint.phone_number,
      to: params.toNumber,
      callPointId: params.callPointId,
      webhookBaseUrl,
    });

    // Create call session in database
    const sessionId = randomBytes(16).toString('hex');

    db.prepare(`
      INSERT INTO call_sessions (
        id, call_point_id, direction, from_number, to_number,
        call_sid, provider, status, started_at, agent_id
      ) VALUES (?, ?, 'outbound', ?, ?, ?, ?, ?, datetime('now'), ?)
    `).run(
      sessionId,
      params.callPointId,
      callInfo.from,
      callInfo.to,
      callInfo.callSid,
      callPoint.provider,
      callInfo.status,
      callPoint.agent_id
    );

    return sessionId;
  }

  /**
   * Hangup a call
   */
  async hangupCall(callSid: string): Promise<void> {
    const db = getDatabase();

    const session = db.prepare<any>(`
      SELECT provider FROM call_sessions WHERE call_sid = ?
    `).get(callSid);

    if (!session) {
      throw new Error(`Call session with SID ${callSid} not found`);
    }

    await this.getProvider(session.provider).hangupCall(callSid);

    // Update session status
    db.prepare(`
      UPDATE call_sessions
      SET status = 'completed', ended_at = datetime('now'),
          duration_seconds = (julianday(datetime('now')) - julianday(started_at)) * 86400
      WHERE call_sid = ?
    `).run(callSid);
  }

  /**
   * Transfer a call to another number
   */
  async transferCall(callSid: string, toNumber: string): Promise<void> {
    const db = getDatabase();

    const session = db.prepare<any>(`
      SELECT provider FROM call_sessions WHERE call_sid = ?
    `).get(callSid);

    if (!session) {
      throw new Error(`Call session with SID ${callSid} not found`);
    }

    await this.getProvider(session.provider).transferCall(callSid, toNumber);

    // Log transfer in call messages
    const messageId = randomBytes(16).toString('hex');
    const sessionRecord = db.prepare<any>(`
      SELECT id FROM call_sessions WHERE call_sid = ?
    `).get(callSid);

    if (sessionRecord) {
      db.prepare(`
        INSERT INTO call_messages (id, call_session_id, role, content, timestamp)
        VALUES (?, ?, 'system', ?, datetime('now'))
      `).run(messageId, sessionRecord.id, `Call transferred to ${toNumber}`);
    }
  }

  /**
   * Validate webhook signature (provider-specific)
   */
  validateWebhookSignature(
    signature: string,
    url: string,
    params: any,
    provider?: string
  ): boolean {
    return this.getProvider(provider).validateWebhookSignature(signature, url, params);
  }

  /**
   * Get list of registered providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

// Singleton instance
let telephonyServiceInstance: TelephonyService | null = null;

export function getTelephonyService(): TelephonyService {
  if (!telephonyServiceInstance) {
    telephonyServiceInstance = new TelephonyService();
  }
  return telephonyServiceInstance;
}

/**
 * Initialize telephony service with available providers
 */
export async function initializeTelephonyService() {
  const service = getTelephonyService();

  // Dynamically import and register available providers
  try {
    const { TwilioProvider } = await import('./twilio-provider.js');
    const twilioProvider = new TwilioProvider();
    service.registerProvider(twilioProvider);
    console.log('[Telephony] ✅ Twilio provider registered');
  } catch (error) {
    console.warn('[Telephony] ⚠️  Twilio provider not available:', (error as Error).message);
  }

  try {
    const { GoogleVoiceProvider } = await import('./google-voice-provider.js');
    const googleProvider = new GoogleVoiceProvider();
    service.registerProvider(googleProvider);
    console.log('[Telephony] ✅ Google Voice provider registered');
  } catch (error) {
    console.warn('[Telephony] ⚠️  Google Voice provider not available:', (error as Error).message);
  }

  const providers = service.getAvailableProviders();
  if (providers.length === 0) {
    console.warn('[Telephony] ⚠️  No telephony providers configured');
  } else {
    console.log(`[Telephony] Configured providers: ${providers.join(', ')}`);
  }

  return service;
}
