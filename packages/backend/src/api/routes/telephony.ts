import type { FastifyInstance } from 'fastify';
import { handleError } from '../error-handler.js';
import { getDatabase } from '../../db/index.js';
import { getTelephonyService } from '../../services/telephony-service.js';
import {
  handleIncomingCall,
  handleOutboundTwiml,
  processSpeech,
  handleStatusWebhook,
  handleRecordingWebhook,
} from '../../telephony/voice-handler.js';
import { processIvrSelection } from '../../telephony/ivr-engine.js';
import { getCredentialStorage } from '../../credentials/index.js';
import { randomBytes } from 'crypto';

/**
 * Helper: Mask credential (show first 4 and last 4 characters)
 */
function maskCredential(value: string): string {
  if (!value || value.length < 8) return '••••••••';
  return `${value.substring(0, 4)}••••${value.substring(value.length - 4)}`;
}

/**
 * Telephony / Assistant Center API Routes
 * Complete call center functionality with Twilio/Google Voice integration
 */
export async function registerTelephonyRoutes(fastify: FastifyInstance) {
  const telephony = getTelephonyService();

  fastify.log.info('[Telephony API] ✅ Routes registered');

  // ════════════════════════════════════════════════════════════════════════════
  // PHONE NUMBERS MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  // GET /api/telephony/numbers - List all purchased phone numbers
  fastify.get('/api/telephony/numbers', async (request, reply) => {
    try {
      const db = getDatabase();
      const numbers = db.prepare(`
        SELECT
          id, phone_number as phoneNumber, friendly_name as friendlyName,
          country_code as countryCode, capabilities, provider, provider_sid as providerSid,
          status, monthly_cost as monthlyCost, purchased_at as purchasedAt,
          created_at as createdAt
        FROM phone_numbers
        WHERE status != 'released'
        ORDER BY purchased_at DESC
      `).all();

      // Parse JSON fields
      const parsed = numbers.map((n: any) => ({
        ...n,
        capabilities: n.capabilities ? JSON.parse(n.capabilities) : null,
      }));

      return reply.send({ success: true, numbers: parsed });
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Telephony] List numbers failed');
    }
  });

  // GET /api/telephony/numbers/search - Search available numbers to purchase
  fastify.get<{
    Querystring: { country: string; areaCode?: string; provider?: string };
  }>('/api/telephony/numbers/search', async (request, reply) => {
    try {
      const { country, areaCode, provider } = request.query;

      if (!country) {
        return reply.status(400).send({ error: 'country parameter is required' });
      }

      const numbers = await telephony.searchAvailableNumbers(country, areaCode, provider);

      return reply.send({ success: true, numbers });
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Telephony] Search numbers failed');
    }
  });

  // POST /api/telephony/numbers/purchase - Purchase a phone number
  fastify.post<{
    Body: { phoneNumber: string; friendlyName: string; provider?: string };
  }>('/api/telephony/numbers/purchase', async (request, reply) => {
    try {
      const { phoneNumber, friendlyName, provider } = request.body;

      if (!phoneNumber) {
        return reply.status(400).send({ error: 'phoneNumber is required' });
      }

      const numberId = await telephony.purchasePhoneNumber(
        phoneNumber,
        friendlyName || phoneNumber,
        provider
      );

      return reply.send({ success: true, numberId });
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Telephony] Purchase number failed');
    }
  });

  // DELETE /api/telephony/numbers/:id - Release a phone number
  fastify.delete<{ Params: { id: string } }>(
    '/api/telephony/numbers/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;

        await telephony.releasePhoneNumber(id);

        return reply.send({ success: true });
      } catch (error: any) {
        // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
        return handleError(reply, error, 'internal', '[Telephony] Release number failed');
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // CALL POINTS MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  // GET /api/telephony/call-points - List all call points
  fastify.get('/api/telephony/call-points', async (request, reply) => {
    try {
      const db = getDatabase();
      const callPoints = db.prepare(`
        SELECT
          cp.id, cp.name, cp.description,
          cp.phone_number_id as phoneNumberId,
          pn.phone_number as phoneNumber,
          pn.friendly_name as phoneNumberName,
          cp.agent_id as agentId,
          a.name as agentName,
          cp.workflow_id as workflowId,
          w.name as workflowName,
          cp.voice_provider as voiceProvider,
          cp.voice_id as voiceId,
          cp.language_preference as languagePreference,
          cp.greeting_message as greetingMessage,
          cp.ivr_menu as ivrMenu,
          cp.max_call_duration as maxCallDuration,
          cp.record_calls as recordCalls,
          cp.transcription_provider as transcriptionProvider,
          cp.business_hours as businessHours,
          cp.after_hours_message as afterHoursMessage,
          cp.transfer_number as transferNumber,
          cp.enabled,
          cp.created_at as createdAt
        FROM call_points cp
        LEFT JOIN phone_numbers pn ON pn.id = cp.phone_number_id
        LEFT JOIN agents_config a ON a.id = cp.agent_id
        LEFT JOIN workflows w ON w.id = cp.workflow_id
        ORDER BY cp.created_at DESC
      `).all();

      // Parse JSON fields
      const parsed = callPoints.map((cp: any) => ({
        ...cp,
        ivrMenu: cp.ivrMenu ? JSON.parse(cp.ivrMenu) : null,
        businessHours: cp.businessHours ? JSON.parse(cp.businessHours) : null,
        recordCalls: Boolean(cp.recordCalls),
        enabled: Boolean(cp.enabled),
      }));

      return reply.send({ success: true, callPoints: parsed });
    } catch (error: any) {
      fastify.log.error('List call points error:', error);
      return handleError(reply, error, 'internal', '[Telephony] List call points failed');
    }
  });

  // POST /api/telephony/call-points - Create new call point
  fastify.post<{
    Body: {
      name: string;
      description?: string;
      phoneNumberId: string;
      agentId?: string;
      workflowId?: string;
      voiceProvider?: string;
      voiceId?: string;
      languagePreference?: string;
      greetingMessage?: string;
      ivrMenu?: any;
      maxCallDuration?: number;
      recordCalls?: boolean;
      transcriptionProvider?: string;
      businessHours?: any;
      afterHoursMessage?: string;
      transferNumber?: string;
      enabled?: boolean;
    };
  }>('/api/telephony/call-points', async (request, reply) => {
    try {
      const db = getDatabase();
      const id = randomBytes(16).toString('hex');

      const {
        name,
        description,
        phoneNumberId,
        agentId,
        workflowId,
        voiceProvider,
        voiceId,
        languagePreference,
        greetingMessage,
        ivrMenu,
        maxCallDuration,
        recordCalls,
        transcriptionProvider,
        businessHours,
        afterHoursMessage,
        transferNumber,
        enabled,
      } = request.body;

      if (!name || !phoneNumberId) {
        return reply.status(400).send({ error: 'name and phoneNumberId are required' });
      }

      db.prepare(`
        INSERT INTO call_points (
          id, name, description, phone_number_id, agent_id, workflow_id,
          voice_provider, voice_id, language_preference,
          greeting_message, ivr_menu, max_call_duration, record_calls, transcription_provider,
          business_hours, after_hours_message, transfer_number, enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        name,
        description || null,
        phoneNumberId,
        agentId || null,
        workflowId || null,
        voiceProvider || 'openai',
        voiceId || 'alloy',
        languagePreference || 'auto',
        greetingMessage || 'Hello, how can I help you?',
        ivrMenu ? JSON.stringify(ivrMenu) : null,
        maxCallDuration || 600,
        recordCalls !== false ? 1 : 0,
        transcriptionProvider || 'whisper',
        businessHours ? JSON.stringify(businessHours) : null,
        afterHoursMessage || null,
        transferNumber || null,
        enabled !== false ? 1 : 0
      );

      return reply.send({ success: true, id });
    } catch (error: any) {
      fastify.log.error('Create call point error:', error);
      return handleError(reply, error, 'internal', '[Telephony] Create call point failed');
    }
  });

  // PUT /api/telephony/call-points/:id - Update call point
  fastify.put<{
    Params: { id: string };
    Body: Record<string, any>;
  }>('/api/telephony/call-points/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;

      const db = getDatabase();

      // Build dynamic UPDATE query
      const fields = [];
      const values = [];

      const allowedFields = [
        'name',
        'description',
        'phone_number_id',
        'agent_id',
        'workflow_id',
        'voice_provider',
        'voice_id',
        'language_preference',
        'greeting_message',
        'ivr_menu',
        'max_call_duration',
        'record_calls',
        'transcription_provider',
        'business_hours',
        'after_hours_message',
        'transfer_number',
        'enabled',
      ];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = ?`);

          // Stringify JSON fields
          if (key === 'ivr_menu' || key === 'business_hours') {
            values.push(value ? JSON.stringify(value) : null);
          } else if (key === 'record_calls' || key === 'enabled') {
            values.push(value ? 1 : 0);
          } else {
            values.push(value);
          }
        }
      }

      if (fields.length === 0) {
        return reply.status(400).send({ error: 'No valid fields to update' });
      }

      fields.push('updated_at = datetime(\'now\')');
      values.push(id);

      db.prepare(`
        UPDATE call_points SET ${fields.join(', ')} WHERE id = ?
      `).run(...values);

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error('Update call point error:', error);
      return handleError(reply, error, 'internal', '[Telephony] Update call point failed');
    }
  });

  // DELETE /api/telephony/call-points/:id - Delete call point
  fastify.delete<{ Params: { id: string } }>(
    '/api/telephony/call-points/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const db = getDatabase();

        db.prepare('DELETE FROM call_points WHERE id = ?').run(id);

        return reply.send({ success: true });
      } catch (error: any) {
        fastify.log.error('Delete call point error:', error);
        return handleError(reply, error, 'internal', '[Telephony] Delete call point failed');
      }
    }
  );

  // PATCH /api/telephony/call-points/:id/toggle - Enable/disable call point
  fastify.patch<{ Params: { id: string } }>(
    '/api/telephony/call-points/:id/toggle',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const db = getDatabase();

        // Toggle enabled status
        db.prepare(`
          UPDATE call_points
          SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(id);

        const updated = db.prepare<any>('SELECT enabled FROM call_points WHERE id = ?').get(id);

        return reply.send({ success: true, enabled: Boolean(updated?.enabled) });
      } catch (error: any) {
        fastify.log.error('Toggle call point error:', error);
        return handleError(reply, error, 'internal', '[Telephony] Toggle call point failed');
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ACTIVE CALLS
  // ════════════════════════════════════════════════════════════════════════════

  // POST /api/telephony/calls/make - Make outbound call
  fastify.post<{
    Body: { callPointId: string; toNumber: string };
  }>('/api/telephony/calls/make', async (request, reply) => {
    try {
      const { callPointId, toNumber } = request.body;

      if (!callPointId || !toNumber) {
        return reply.status(400).send({ error: 'callPointId and toNumber are required' });
      }

      const sessionId = await telephony.makeCall({ callPointId, toNumber });

      return reply.send({ success: true, sessionId });
    } catch (error: any) {
      fastify.log.error('Make call error:', error);
      return handleError(reply, error, 'internal', '[Telephony] Make call failed');
    }
  });

  // GET /api/telephony/calls/active - List active calls
  fastify.get('/api/telephony/calls/active', async (request, reply) => {
    try {
      const db = getDatabase();

      const activeCalls = db.prepare(`
        SELECT
          cs.id, cs.call_sid as callSid, cs.direction, cs.from_number as fromNumber,
          cs.to_number as toNumber, cs.caller_name as callerName, cs.status,
          cs.started_at as startedAt,
          (julianday(datetime('now')) - julianday(cs.started_at)) * 86400 as durationSeconds,
          cp.name as callPointName,
          a.name as agentName
        FROM call_sessions cs
        LEFT JOIN call_points cp ON cp.id = cs.call_point_id
        LEFT JOIN agents_config a ON a.id = cs.agent_id
        WHERE cs.status IN ('queued', 'ringing', 'in-progress')
        ORDER BY cs.started_at DESC
      `).all();

      return reply.send({ success: true, activeCalls });
    } catch (error: any) {
      fastify.log.error('List active calls error:', error);
      return handleError(reply, error, 'internal', '[Telephony] List active calls failed');
    }
  });

  // POST /api/telephony/calls/:callSid/hangup - Hangup call
  fastify.post<{ Params: { callSid: string } }>(
    '/api/telephony/calls/:callSid/hangup',
    async (request, reply) => {
      try {
        const { callSid } = request.params;

        await telephony.hangupCall(callSid);

        return reply.send({ success: true });
      } catch (error: any) {
        fastify.log.error('Hangup call error:', error);
        return handleError(reply, error, 'internal', '[Telephony] Hangup call failed');
      }
    }
  );

  // POST /api/telephony/calls/:callSid/transfer - Transfer call
  fastify.post<{
    Params: { callSid: string };
    Body: { toNumber: string };
  }>('/api/telephony/calls/:callSid/transfer', async (request, reply) => {
    try {
      const { callSid } = request.params;
      const { toNumber } = request.body;

      if (!toNumber) {
        return reply.status(400).send({ error: 'toNumber is required' });
      }

      await telephony.transferCall(callSid, toNumber);

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error('Transfer call error:', error);
      return handleError(reply, error, 'internal', '[Telephony] Transfer call failed');
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // TWILIO WEBHOOKS (PUBLIC - NO AUTH REQUIRED)
  // ════════════════════════════════════════════════════════════════════════════

  // POST /api/telephony/voice-webhook - Incoming call handler (returns TwiML)
  fastify.post('/api/telephony/voice-webhook', handleIncomingCall);

  // POST /api/telephony/outbound-twiml - Outbound call TwiML
  fastify.post('/api/telephony/outbound-twiml', handleOutboundTwiml);

  // POST /api/telephony/process-speech - Process speech input from caller
  fastify.post('/api/telephony/process-speech', processSpeech);

  // POST /api/telephony/process-ivr - Process IVR menu selection
  fastify.post('/api/telephony/process-ivr', processIvrSelection);

  // POST /api/telephony/status-webhook - Call status updates
  fastify.post('/api/telephony/status-webhook', handleStatusWebhook);

  // POST /api/telephony/recording-webhook - Recording ready notification
  fastify.post('/api/telephony/recording-webhook', handleRecordingWebhook);

  // ════════════════════════════════════════════════════════════════════════════
  // TELEPHONY SETTINGS / CREDENTIALS
  // ════════════════════════════════════════════════════════════════════════════

  // GET /api/telephony/settings/credentials - Get current credentials (masked)
  fastify.get('/api/telephony/settings/credentials', async (request, reply) => {
    try {
      const credStorage = getCredentialStorage();

      // Get credentials from database
      const twilioSid = await credStorage.get('telephony.twilio.account_sid');
      const twilioToken = await credStorage.get('telephony.twilio.auth_token');
      const googleProjectId = await credStorage.get('telephony.google.project_id');
      const googleCreds = await credStorage.get('telephony.google.credentials_json');
      const publicUrl = await credStorage.get('telephony.public_url');

      // Return masked credentials (only show if exists)
      return reply.send({
        success: true,
        credentials: {
          twilio: {
            accountSid: twilioSid ? maskCredential(twilioSid) : null,
            authToken: twilioToken ? '••••••••••••••••' : null,
            configured: !!(twilioSid && twilioToken),
          },
          google: {
            projectId: googleProjectId || null,
            credentialsJson: googleCreds ? '••••••••' : null,
            configured: !!(googleProjectId && googleCreds),
          },
          publicUrl: publicUrl || process.env.PUBLIC_URL || null,
        },
      });
    } catch (error: any) {
      fastify.log.error('Get telephony credentials error:', error);
      return handleError(reply, error, 'internal', '[Telephony] Get credentials failed');
    }
  });

  // PUT /api/telephony/settings/credentials - Save/update credentials
  fastify.put<{
    Body: {
      twilioAccountSid?: string;
      twilioAuthToken?: string;
      googleProjectId?: string;
      googleCredentialsJson?: string;
      publicUrl?: string;
    };
  }>('/api/telephony/settings/credentials', async (request, reply) => {
    try {
      const { twilioAccountSid, twilioAuthToken, googleProjectId, googleCredentialsJson, publicUrl } = request.body;

      const credStorage = getCredentialStorage();

      // Save Twilio credentials
      if (twilioAccountSid) {
        await credStorage.set('telephony.twilio.account_sid', twilioAccountSid);
      }
      if (twilioAuthToken) {
        await credStorage.set('telephony.twilio.auth_token', twilioAuthToken);
      }

      // Save Google credentials
      if (googleProjectId) {
        await credStorage.set('telephony.google.project_id', googleProjectId);
      }
      if (googleCredentialsJson) {
        await credStorage.set('telephony.google.credentials_json', googleCredentialsJson);
      }

      // Save public URL
      if (publicUrl) {
        await credStorage.set('telephony.public_url', publicUrl);
      }

      fastify.log.info('[Telephony] Credentials updated successfully');

      return reply.send({
        success: true,
        message: 'Credentials saved successfully. Please restart the backend for changes to take effect.',
        restartRequired: true,
      });
    } catch (error: any) {
      fastify.log.error('Save telephony credentials error:', error);
      return handleError(reply, error, 'internal', '[Telephony] Save credentials failed');
    }
  });

  // POST /api/telephony/settings/test-connection - Test provider connection
  fastify.post<{
    Body: { provider: 'twilio' | 'google' };
  }>('/api/telephony/settings/test-connection', async (request, reply) => {
    try {
      const { provider } = request.body;

      if (!provider) {
        return reply.status(400).send({ error: 'provider is required (twilio or google)' });
      }

      const credStorage = getCredentialStorage();

      if (provider === 'twilio') {
        // Test Twilio connection
        const accountSid = await credStorage.get('telephony.twilio.account_sid') || process.env.TWILIO_ACCOUNT_SID;
        const authToken = await credStorage.get('telephony.twilio.auth_token') || process.env.TWILIO_AUTH_TOKEN;

        if (!accountSid || !authToken) {
          return reply.status(400).send({
            success: false,
            error: 'Twilio credentials not configured',
          });
        }

        // Try to connect to Twilio API
        const twilio = (await import('twilio')).default;
        const client = twilio(accountSid, authToken);

        // Fetch account info to test connection
        const account = await client.api.accounts(accountSid).fetch();

        return reply.send({
          success: true,
          message: 'Twilio connection successful',
          details: {
            accountSid: account.sid,
            accountName: account.friendlyName,
            status: account.status,
          },
        });
      } else if (provider === 'google') {
        // Test Google Voice connection
        const projectId = await credStorage.get('telephony.google.project_id') || process.env.GOOGLE_CLOUD_PROJECT_ID;
        const credsJson = await credStorage.get('telephony.google.credentials_json') || process.env.GOOGLE_CLOUD_CREDENTIALS;

        if (!projectId || !credsJson) {
          return reply.status(400).send({
            success: false,
            error: 'Google Cloud credentials not configured',
          });
        }

        return reply.send({
          success: true,
          message: 'Google Cloud credentials found',
          details: {
            projectId,
            note: 'Full Google Voice integration not yet implemented',
          },
        });
      }

      return reply.status(400).send({ error: 'Invalid provider' });
    } catch (error: any) {
      fastify.log.error('Test connection error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Connection test failed', // SECURITY: H-09 - hide error details
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CALL HISTORY / SESSIONS
  // ════════════════════════════════════════════════════════════════════════════

  // GET /api/telephony/sessions - List call sessions (with filters)
  fastify.get<{
    Querystring: {
      direction?: 'inbound' | 'outbound';
      status?: string;
      callPointId?: string;
      fromDate?: string;
      toDate?: string;
      limit?: number;
      offset?: number;
    };
  }>('/api/telephony/sessions', async (request, reply) => {
    try {
      const db = getDatabase();
      const { direction, status, callPointId, fromDate, toDate, limit = 100, offset = 0 } = request.query;

      // Build dynamic WHERE clause
      const whereClauses = [];
      const values = [];

      if (direction) {
        whereClauses.push('cs.direction = ?');
        values.push(direction);
      }

      if (status) {
        whereClauses.push('cs.status = ?');
        values.push(status);
      }

      if (callPointId) {
        whereClauses.push('cs.call_point_id = ?');
        values.push(callPointId);
      }

      if (fromDate) {
        whereClauses.push('cs.created_at >= ?');
        values.push(fromDate);
      }

      if (toDate) {
        whereClauses.push('cs.created_at <= ?');
        values.push(toDate);
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const sessions = db.prepare(`
        SELECT
          cs.id, cs.call_sid as callSid, cs.direction, cs.from_number as fromNumber,
          cs.to_number as toNumber, cs.caller_name as callerName, cs.status,
          cs.started_at as startedAt, cs.answered_at as answeredAt, cs.ended_at as endedAt,
          cs.duration_seconds as durationSeconds, cs.recording_url as recordingUrl,
          cs.recording_file_id as recordingFileId, cs.conversation_summary as conversationSummary,
          cp.name as callPointName,
          a.name as agentName
        FROM call_sessions cs
        LEFT JOIN call_points cp ON cp.id = cs.call_point_id
        LEFT JOIN agents_config a ON a.id = cs.agent_id
        ${whereClause}
        ORDER BY cs.created_at DESC
        LIMIT ? OFFSET ?
      `).all(...values, limit, offset);

      return reply.send({ success: true, sessions, total: sessions.length });
    } catch (error: any) {
      fastify.log.error('List call sessions error:', error);
      return handleError(reply, error, 'internal', '[Telephony] List sessions failed');
    }
  });

  // GET /api/telephony/sessions/:id - Get single session with full transcript
  fastify.get<{ Params: { id: string } }>(
    '/api/telephony/sessions/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const db = getDatabase();

        // Get session details
        const session = db.prepare<any>(`
          SELECT
            cs.*,
            cp.name as callPointName,
            a.name as agentName
          FROM call_sessions cs
          LEFT JOIN call_points cp ON cp.id = cs.call_point_id
          LEFT JOIN agents_config a ON a.id = cs.agent_id
          WHERE cs.id = ?
        `).get(id);

        if (!session) {
          return reply.status(404).send({ error: 'Session not found' });
        }

        // Get call messages (transcript)
        const messages = db.prepare(`
          SELECT
            id, role, content, timestamp, audio_url as audioUrl
          FROM call_messages
          WHERE call_session_id = ?
          ORDER BY timestamp ASC
        `).all(id);

        return reply.send({ success: true, session, messages });
      } catch (error: any) {
        fastify.log.error('Get call session error:', error);
        return handleError(reply, error, 'internal', '[Telephony] Get session failed');
      }
    }
  );

  // DELETE /api/telephony/sessions/:id - Delete session
  fastify.delete<{ Params: { id: string } }>(
    '/api/telephony/sessions/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const db = getDatabase();

        // Delete messages first (cascade)
        db.prepare('DELETE FROM call_messages WHERE call_session_id = ?').run(id);

        // Delete session
        db.prepare('DELETE FROM call_sessions WHERE id = ?').run(id);

        return reply.send({ success: true });
      } catch (error: any) {
        fastify.log.error('Delete call session error:', error);
        return handleError(reply, error, 'internal', '[Telephony] Delete session failed');
      }
    }
  );
}
