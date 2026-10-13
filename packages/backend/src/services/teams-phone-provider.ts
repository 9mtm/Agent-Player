import { Client } from '@microsoft/microsoft-graph-client';
import type {
  TelephonyProvider,
  AvailableNumber,
  PurchasedNumber,
  MakeCallParams,
  CallInfo,
} from './telephony-service.js';
import { TELEPHONY_KEYS, getTelephonySecret, setTelephonySecret } from '../telephony/credentials.js';

/**
 * Microsoft Teams Phone Provider Implementation
 * Uses Microsoft Graph API for calling functionality
 * Requires M365 E5 license + Teams Phone System
 */
export class TeamsPhoneProvider implements TelephonyProvider {
  name: 'twilio' | 'google' = 'twilio' as any; // Will be 'microsoft_teams' in future type update
  private client: Client | null = null;
  private accessToken: string = '';
  private tenantId: string = '';
  private clientId: string = '';
  private clientSecret: string = '';

  constructor() {
    // Load credentials from database
    this.loadCredentialsFromDatabase().catch(err => {
      console.warn('[Teams Phone] Could not load credentials from database:', err.message);
    });
  }

  /**
   * Load OAuth credentials from database
   */
  private async loadCredentialsFromDatabase() {
    try {
      this.tenantId = await getTelephonySecret(TELEPHONY_KEYS.teamsTenantId) || '';
      this.clientId = await getTelephonySecret(TELEPHONY_KEYS.teamsClientId) || '';
      this.clientSecret = await getTelephonySecret(TELEPHONY_KEYS.teamsClientSecret) || '';
      this.accessToken = await getTelephonySecret(TELEPHONY_KEYS.teamsAccessToken) || '';

      if (!this.tenantId || !this.clientId || !this.clientSecret) {
        throw new Error('Teams Phone credentials not configured');
      }

      // Initialize Graph client
      await this.initializeClient();

      console.log('[Teams Phone] ✅ Credentials loaded from database');
    } catch (error: any) {
      console.warn('[Teams Phone] Failed to load credentials:', error.message);
      throw error;
    }
  }

  /**
   * Initialize Microsoft Graph client with OAuth
   */
  private async initializeClient() {
    try {
      // If we have a valid access token, use it
      if (this.accessToken) {
        this.client = Client.init({
          authProvider: (done) => {
            done(null, this.accessToken);
          },
        });
        return;
      }

      // Otherwise, get new access token using client credentials flow
      const tokenEndpoint = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;

      const params = new URLSearchParams();
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('scope', 'https://graph.microsoft.com/.default');
      params.append('grant_type', 'client_credentials');

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });

      if (!response.ok) {
        throw new Error(`OAuth failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;

      // Store token in database
      await setTelephonySecret(TELEPHONY_KEYS.teamsAccessToken, this.accessToken);

      // Initialize client
      this.client = Client.init({
        authProvider: (done) => {
          done(null, this.accessToken);
        },
      });

      console.log('[Teams Phone] ✅ OAuth token obtained');
    } catch (error: any) {
      throw new Error(`Teams Phone initialization failed: ${error.message}`);
    }
  }

  /**
   * Ensure client is initialized
   */
  private ensureClient(): Client {
    if (!this.client) {
      throw new Error('Teams Phone client not initialized. Call loadCredentialsFromDatabase() first.');
    }
    return this.client;
  }

  /**
   * Search available phone numbers (Teams Phone uses Calling Plans)
   * Note: This is a simplified version - actual implementation would use
   * Teams Admin Center API or partner APIs
   */
  async searchAvailableNumbers(
    countryCode: string,
    areaCode?: string
  ): Promise<AvailableNumber[]> {
    try {
      // NOTE: Microsoft Graph doesn't have a direct API for searching available numbers
      // This would typically be done through:
      // 1. Teams Admin Center UI
      // 2. Partner APIs (Operator Connect)
      // 3. Direct Routing (bring your own numbers)

      // For now, return empty array with instruction
      console.warn('[Teams Phone] Number search requires Teams Admin Center or Operator Connect');

      return [];
    } catch (error: any) {
      throw new Error(`Teams Phone search failed: ${error.message}`);
    }
  }

  /**
   * Purchase phone number
   * Note: This requires Teams Admin Center or Operator Connect partner
   */
  async purchasePhoneNumber(
    phoneNumber: string,
    friendlyName: string,
    webhookBaseUrl: string
  ): Promise<PurchasedNumber> {
    try {
      // NOTE: Purchasing numbers via API is not directly supported in Graph API
      // Numbers are typically purchased through:
      // 1. Teams Admin Center → Voice → Phone Numbers → Get Numbers
      // 2. Operator Connect partner portals
      // 3. Direct Routing setup

      throw new Error('Teams Phone number purchase must be done via Teams Admin Center or Operator Connect');
    } catch (error: any) {
      throw new Error(`Teams Phone purchase failed: ${error.message}`);
    }
  }

  /**
   * Release phone number
   */
  async releasePhoneNumber(providerSid: string): Promise<void> {
    try {
      // Similar to purchase, releasing numbers is done via Teams Admin Center
      throw new Error('Teams Phone number release must be done via Teams Admin Center');
    } catch (error: any) {
      throw new Error(`Teams Phone release failed: ${error.message}`);
    }
  }

  /**
   * Make outbound call via Microsoft Graph API
   */
  async makeCall(params: MakeCallParams): Promise<CallInfo> {
    try {
      const client = this.ensureClient();

      // Create call via Graph API
      const call = await client.api('/communications/calls').post({
        '@odata.type': '#microsoft.graph.call',
        callbackUri: `${params.webhookBaseUrl}/api/telephony/teams-webhook`,

        // Source (caller) - Teams user or resource account
        source: {
          '@odata.type': '#microsoft.graph.participantInfo',
          identity: {
            '@odata.type': '#microsoft.graph.identitySet',
            // This would be the Teams user ID or resource account ID
            // For now, we'll use a placeholder
            application: {
              '@odata.type': '#microsoft.graph.identity',
              id: params.from, // This should be a Teams user/resource account ID
            },
          },
        },

        // Target (recipient)
        targets: [
          {
            '@odata.type': '#microsoft.graph.invitationParticipantInfo',
            identity: {
              '@odata.type': '#microsoft.graph.identitySet',
              phone: {
                '@odata.type': '#microsoft.graph.identity',
                id: params.to, // E.164 phone number
              },
            },
          },
        ],

        // Requested modalities (audio, video)
        requestedModalities: ['audio'],

        // Media config (service-hosted by Microsoft)
        mediaConfig: {
          '@odata.type': '#microsoft.graph.serviceHostedMediaConfig',
        },
      });

      return {
        callSid: call.id,
        status: call.state || 'establishing',
        from: params.from,
        to: params.to,
        direction: 'outbound',
      };
    } catch (error: any) {
      throw new Error(`Teams Phone makeCall failed: ${error.message}`);
    }
  }

  /**
   * Hangup call
   */
  async hangupCall(callSid: string): Promise<void> {
    try {
      const client = this.ensureClient();

      // Delete call (hangup)
      await client.api(`/communications/calls/${callSid}`).delete();
    } catch (error: any) {
      throw new Error(`Teams Phone hangup failed: ${error.message}`);
    }
  }

  /**
   * Transfer call to another participant
   */
  async transferCall(callSid: string, toNumber: string): Promise<void> {
    try {
      const client = this.ensureClient();

      // Transfer call via Graph API
      await client.api(`/communications/calls/${callSid}/transfer`).post({
        transferTarget: {
          '@odata.type': '#microsoft.graph.invitationParticipantInfo',
          identity: {
            '@odata.type': '#microsoft.graph.identitySet',
            phone: {
              '@odata.type': '#microsoft.graph.identity',
              id: toNumber,
            },
          },
        },
      });
    } catch (error: any) {
      throw new Error(`Teams Phone transfer failed: ${error.message}`);
    }
  }

  /**
   * Validate webhook signature
   * Teams uses different validation mechanism than Twilio
   */
  validateWebhookSignature(signature: string, url: string, params: any): boolean {
    try {
      // TODO: Implement Microsoft Graph webhook validation
      // This typically involves validating a client state token
      // For now, return true (insecure - needs implementation)
      console.warn('[Teams Phone] Webhook validation not implemented yet');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Additional Teams-specific methods
   */

  /**
   * List Teams users with phone numbers assigned
   */
  async listTeamsUsers(): Promise<any[]> {
    try {
      const client = this.ensureClient();

      const users = await client
        .api('/users')
        .filter('assignedLicenses/any(x:x/skuId eq <Teams Phone SKU ID>)')
        .select('id,displayName,userPrincipalName,businessPhones')
        .get();

      return users.value || [];
    } catch (error: any) {
      throw new Error(`Failed to list Teams users: ${error.message}`);
    }
  }

  /**
   * Get call details
   */
  async getCallDetails(callId: string): Promise<any> {
    try {
      const client = this.ensureClient();

      const call = await client.api(`/communications/calls/${callId}`).get();
      return call;
    } catch (error: any) {
      throw new Error(`Failed to get call details: ${error.message}`);
    }
  }

  /**
   * Mute/unmute call participant
   */
  async muteParticipant(callId: string, participantId: string, muted: boolean): Promise<void> {
    try {
      const client = this.ensureClient();

      if (muted) {
        await client.api(`/communications/calls/${callId}/participants/${participantId}/mute`).post({});
      } else {
        await client.api(`/communications/calls/${callId}/participants/${participantId}/unmute`).post({});
      }
    } catch (error: any) {
      throw new Error(`Failed to ${muted ? 'mute' : 'unmute'} participant: ${error.message}`);
    }
  }

  /**
   * Get call recordings (only available for meetings)
   */
  async getCallRecordings(meetingId: string): Promise<any[]> {
    try {
      const client = this.ensureClient();

      // Note: Recording is only available for Teams meetings, not P2P calls
      const recordings = await client
        .api(`/users/{userId}/onlineMeetings/${meetingId}/recordings`)
        .get();

      return recordings.value || [];
    } catch (error: any) {
      throw new Error(`Failed to get recordings: ${error.message}`);
    }
  }
}
