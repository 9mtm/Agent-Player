/**
 * Calendar Sync Service
 * Handles syncing with Google Calendar and importing from iCal/WebCal URLs
 */

import { getDatabase } from '../db/index.js';
import { randomUUID } from 'crypto';
import https from 'https';
import http from 'http';

interface CalendarSource {
  id: string;
  user_id: string;
  type: string;
  url: string | null;
  google_calendar_id: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expiry: string | null;
}

/**
 * Sync a calendar source (Google, iCal, WebCal)
 */
export async function syncCalendarSource(sourceId: string): Promise<void> {
  const db = getDatabase();

  try {
    const source = db.prepare('SELECT * FROM calendar_sources WHERE id = ?').get(sourceId) as CalendarSource | undefined;
    if (!source) {
      throw new Error('Calendar source not found');
    }

    // Create sync log entry
    const logId = randomUUID();
    db.prepare(`
      INSERT INTO calendar_sync_log (id, calendar_source_id, status)
      VALUES (?, ?, 'running')
    `).run(logId, sourceId);

    let eventsAdded = 0;
    let eventsUpdated = 0;
    let eventsDeleted = 0;

    try {
      if (source.type === 'google') {
        const result = await syncGoogleCalendar(source);
        eventsAdded = result.added;
        eventsUpdated = result.updated;
        eventsDeleted = result.deleted;
      } else if (source.type === 'ical' || source.type === 'webcal') {
        const result = await syncICalCalendar(source);
        eventsAdded = result.added;
        eventsUpdated = result.updated;
        eventsDeleted = result.deleted;
      } else {
        throw new Error(`Unsupported calendar type: ${source.type}`);
      }

      // Update sync log
      db.prepare(`
        UPDATE calendar_sync_log
        SET
          status = 'success',
          completed_at = datetime('now'),
          events_added = ?,
          events_updated = ?,
          events_deleted = ?
        WHERE id = ?
      `).run(eventsAdded, eventsUpdated, eventsDeleted, logId);

      // Update source
      db.prepare(`
        UPDATE calendar_sources
        SET
          sync_status = 'success',
          last_synced_at = datetime('now'),
          sync_error = NULL,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(sourceId);

    } catch (error: any) {
      // Update sync log with error
      db.prepare(`
        UPDATE calendar_sync_log
        SET
          status = 'error',
          completed_at = datetime('now'),
          error_message = ?
        WHERE id = ?
      `).run(error.message, logId);

      // Update source with error
      db.prepare(`
        UPDATE calendar_sources
        SET
          sync_status = 'error',
          sync_error = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(error.message, sourceId);

      throw error;
    }
  } catch (error) {
    console.error(`[CalendarSync] Failed to sync source ${sourceId}:`, error);
    throw error;
  }
}

/**
 * Sync Google Calendar
 */
async function syncGoogleCalendar(source: CalendarSource): Promise<{ added: number; updated: number; deleted: number }> {
  const db = getDatabase();

  // Check if access token is expired
  if (source.google_token_expiry && new Date(source.google_token_expiry) < new Date()) {
    // TODO: Refresh token using google_refresh_token
    console.warn('[CalendarSync] Google access token expired, refresh not implemented yet');
  }

  if (!source.google_access_token || !source.google_calendar_id) {
    throw new Error('Google Calendar not authenticated');
  }

  // Fetch events from Google Calendar API
  const now = new Date();
  const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
  const timeMax = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year ahead

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(source.google_calendar_id)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

  const response = await fetchWithAuth(url, {
    headers: {
      'Authorization': `Bearer ${source.google_access_token}`,
    },
  });

  const data = JSON.parse(response);

  if (!data.items) {
    return { added: 0, updated: 0, deleted: 0 };
  }

  let added = 0;
  let updated = 0;

  for (const googleEvent of data.items) {
    // Check if event already exists
    const existing = db.prepare('SELECT id FROM calendar_events WHERE external_id = ? AND calendar_source_id = ?')
      .get(googleEvent.id, source.id) as { id: string } | undefined;

    const eventData = {
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description || null,
      location: googleEvent.location || null,
      start_time: googleEvent.start.dateTime || googleEvent.start.date,
      end_time: googleEvent.end.dateTime || googleEvent.end.date,
      is_all_day: googleEvent.start.date ? 1 : 0,
      timezone: googleEvent.start.timeZone || 'UTC',
      external_id: googleEvent.id,
      external_url: googleEvent.htmlLink,
      external_etag: googleEvent.etag,
      status: googleEvent.status || 'confirmed',
      organizer: googleEvent.organizer?.email || null,
      attendees: googleEvent.attendees ? JSON.stringify(googleEvent.attendees.map((a: any) => ({
        email: a.email,
        name: a.displayName,
        status: a.responseStatus,
      }))) : null,
    };

    if (existing) {
      // Update existing event
      db.prepare(`
        UPDATE calendar_events
        SET
          title = ?,
          description = ?,
          location = ?,
          start_time = ?,
          end_time = ?,
          is_all_day = ?,
          timezone = ?,
          external_url = ?,
          external_etag = ?,
          status = ?,
          organizer = ?,
          attendees = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        eventData.title,
        eventData.description,
        eventData.location,
        eventData.start_time,
        eventData.end_time,
        eventData.is_all_day,
        eventData.timezone,
        eventData.external_url,
        eventData.external_etag,
        eventData.status,
        eventData.organizer,
        eventData.attendees,
        existing.id
      );
      updated++;
    } else {
      // Insert new event
      db.prepare(`
        INSERT INTO calendar_events (
          id, user_id, calendar_source_id, title, description, location,
          start_time, end_time, is_all_day, timezone, external_id, external_url,
          external_etag, status, organizer, attendees
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        source.user_id,
        source.id,
        eventData.title,
        eventData.description,
        eventData.location,
        eventData.start_time,
        eventData.end_time,
        eventData.is_all_day,
        eventData.timezone,
        eventData.external_id,
        eventData.external_url,
        eventData.external_etag,
        eventData.status,
        eventData.organizer,
        eventData.attendees
      );
      added++;
    }
  }

  return { added, updated, deleted: 0 };
}

/**
 * Sync iCal/WebCal calendar
 */
async function syncICalCalendar(source: CalendarSource): Promise<{ added: number; updated: number; deleted: number }> {
  const db = getDatabase();

  if (!source.url) {
    throw new Error('Calendar URL is required for iCal sync');
  }

  // Fetch iCal data
  let url = source.url;
  if (url.startsWith('webcal://')) {
    url = url.replace('webcal://', 'https://');
  }

  const icalData = await fetchUrl(url);

  // Parse iCal (basic parsing - you can use a library like 'ical' for production)
  const events = parseICalBasic(icalData);

  let added = 0;
  let updated = 0;

  for (const event of events) {
    // Check if event already exists
    const existing = db.prepare('SELECT id FROM calendar_events WHERE external_id = ? AND calendar_source_id = ?')
      .get(event.uid, source.id) as { id: string } | undefined;

    const eventData = {
      title: event.summary || 'Untitled Event',
      description: event.description || null,
      location: event.location || null,
      start_time: event.dtstart,
      end_time: event.dtend,
      is_all_day: event.isAllDay ? 1 : 0,
      timezone: 'UTC',
      external_id: event.uid,
    };

    if (existing) {
      // Update existing event
      db.prepare(`
        UPDATE calendar_events
        SET
          title = ?,
          description = ?,
          location = ?,
          start_time = ?,
          end_time = ?,
          is_all_day = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        eventData.title,
        eventData.description,
        eventData.location,
        eventData.start_time,
        eventData.end_time,
        eventData.is_all_day,
        existing.id
      );
      updated++;
    } else {
      // Insert new event
      db.prepare(`
        INSERT INTO calendar_events (
          id, user_id, calendar_source_id, title, description, location,
          start_time, end_time, is_all_day, timezone, external_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        source.user_id,
        source.id,
        eventData.title,
        eventData.description,
        eventData.location,
        eventData.start_time,
        eventData.end_time,
        eventData.is_all_day,
        eventData.timezone,
        eventData.external_id
      );
      added++;
    }
  }

  return { added, updated, deleted: 0 };
}

/**
 * Fetch URL with authentication
 */
function fetchWithAuth(url: string, options: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Fetch URL (simple GET)
 */
function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Basic iCal parser (minimal implementation)
 * For production, use a proper library like 'ical.js' or 'node-ical'
 */
function parseICalBasic(icalData: string): Array<{
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  dtstart: string;
  dtend: string;
  isAllDay: boolean;
}> {
  const events: Array<any> = [];
  const lines = icalData.split(/\r?\n/);

  let currentEvent: any = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Handle line folding (lines starting with space or tab)
    while (i + 1 < lines.length && /^[ \t]/.test(lines[i + 1])) {
      line += lines[i + 1].trim();
      i++;
    }

    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.uid && currentEvent.dtstart && currentEvent.dtend) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex);
      const value = line.substring(colonIndex + 1);

      if (key === 'UID') {
        currentEvent.uid = value;
      } else if (key === 'SUMMARY') {
        currentEvent.summary = value;
      } else if (key === 'DESCRIPTION') {
        currentEvent.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',');
      } else if (key === 'LOCATION') {
        currentEvent.location = value;
      } else if (key.startsWith('DTSTART')) {
        const isAllDay = key.includes('VALUE=DATE');
        currentEvent.dtstart = parseICalDate(value);
        currentEvent.isAllDay = isAllDay;
      } else if (key.startsWith('DTEND')) {
        currentEvent.dtend = parseICalDate(value);
      }
    }
  }

  return events;
}

/**
 * Parse iCal date format to ISO 8601
 */
function parseICalDate(dateStr: string): string {
  // Format: 20240315T100000Z or 20240315
  if (dateStr.length === 8) {
    // All-day event: YYYYMMDD
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  } else if (dateStr.includes('T')) {
    // DateTime: YYYYMMDDTHHmmssZ
    const date = dateStr.substring(0, 8);
    const time = dateStr.substring(9, 15);
    return `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}T${time.substring(0, 2)}:${time.substring(2, 4)}:${time.substring(4, 6)}Z`;
  }
  return dateStr;
}

/**
 * Start automatic sync scheduler (runs every X minutes)
 */
export function startCalendarSyncScheduler() {
  const db = getDatabase();

  setInterval(() => {
    try {
      // Get all sources that need syncing
      const sources = db.prepare(`
        SELECT id, sync_interval, last_synced_at
        FROM calendar_sources
        WHERE sync_enabled = 1 AND is_enabled = 1
      `).all() as Array<{ id: string; sync_interval: number; last_synced_at: string | null }>;

      for (const source of sources) {
        const now = new Date();
        const lastSynced = source.last_synced_at ? new Date(source.last_synced_at) : null;

        // Check if sync is due
        if (!lastSynced || (now.getTime() - lastSynced.getTime()) >= source.sync_interval * 1000) {
          console.log(`[CalendarSync] Auto-syncing source ${source.id}`);
          syncCalendarSource(source.id).catch((error) => {
            console.error(`[CalendarSync] Auto-sync failed for source ${source.id}:`, error);
          });
        }
      }
    } catch (error) {
      console.error('[CalendarSync] Scheduler error:', error);
    }
  }, 60000); // Check every minute

  console.log('[CalendarSync] Scheduler started');
}
