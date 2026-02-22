/**
 * create_reminder Tool
 *
 * Allows the AI to create scheduled reminders/notifications for the user.
 * When user says "remind me tomorrow to call my brother", this tool creates
 * a notification_schedule entry that will fire at the specified time.
 *
 * Examples:
 * - "Remind me tomorrow at 9am to call my brother"
 * - "Remind me every day at 8pm to take my medicine"
 * - "Remind me on Monday at 2pm for the meeting"
 */

import type { Tool, ToolResult } from '../types.js';
import { getDatabase } from '../../db/index.js';
import { randomUUID } from 'crypto';

export const createReminderTool: Tool = {
  name: 'create_reminder',
  description: `Create a scheduled reminder/notification for the user. Use this when the user asks to be reminded about something at a specific time or date. Supports one-time reminders, daily reminders, weekly reminders, etc. The reminder will be sent via the user's preferred notification channels (in-app, email, WhatsApp, push).`,

  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Short title for the reminder (e.g., "Call your brother", "Take medicine", "Meeting with team")',
      },
      body: {
        type: 'string',
        description: 'Optional detailed message for the reminder. This will be shown in the notification body.',
      },
      schedule_type: {
        type: 'string',
        enum: ['once', 'daily', 'weekly', 'weekdays', 'weekends'],
        description: `Type of schedule:
- once: Fire only once at a specific date/time
- daily: Fire every day at the specified time
- weekly: Fire on specific days of the week
- weekdays: Fire Monday-Friday at the specified time
- weekends: Fire Saturday-Sunday at the specified time`,
      },
      schedule_time: {
        type: 'string',
        description: 'Time to fire the reminder in HH:MM format (24-hour). Example: "09:00" for 9am, "14:30" for 2:30pm, "20:00" for 8pm.',
      },
      schedule_date: {
        type: 'string',
        description: 'For "once" type only: The date in YYYY-MM-DD format. Example: "2026-02-21" for tomorrow. Leave empty for recurring reminders.',
      },
      schedule_days: {
        type: 'array',
        items: { type: 'number' },
        description: 'For "weekly" type only: Array of day numbers (0=Sunday, 1=Monday, ..., 6=Saturday). Example: [1,3,5] for Mon/Wed/Fri. Leave empty for other types.',
      },
      channels: {
        type: 'array',
        items: { type: 'string' },
        description: 'Which channels to send the reminder through. Options: "in_app", "email", "push", "whatsapp", "sound". Default: ["in_app"]',
      },
      user_id: {
        type: 'string',
        description: 'User ID to send the reminder to. Default: "1" (current user)',
      },
    },
    required: ['title', 'schedule_type', 'schedule_time'],
  },

  async execute(params): Promise<ToolResult> {
    const {
      title,
      body = '',
      schedule_type,
      schedule_time,
      schedule_date,
      schedule_days,
      channels = ['in_app'],
      user_id = '1',
    } = params as {
      title: string;
      body?: string;
      schedule_type: 'once' | 'daily' | 'weekly' | 'weekdays' | 'weekends';
      schedule_time: string;
      schedule_date?: string;
      schedule_days?: number[];
      channels?: string[];
      user_id?: string;
    };

    try {
      // Validate time format (HH:MM)
      if (!/^\d{2}:\d{2}$/.test(schedule_time)) {
        return {
          content: [{ type: 'text', text: 'Error: schedule_time must be in HH:MM format (e.g., "09:00", "14:30")' }],
          error: 'Invalid time format',
        };
      }

      // Validate date format for "once" type
      if (schedule_type === 'once' && (!schedule_date || !/^\d{4}-\d{2}-\d{2}$/.test(schedule_date))) {
        return {
          content: [{ type: 'text', text: 'Error: For "once" reminders, schedule_date is required in YYYY-MM-DD format' }],
          error: 'Missing or invalid date',
        };
      }

      // Calculate next_fire_at
      const now = new Date();
      let nextFireAt: Date;

      if (schedule_type === 'once' && schedule_date) {
        // One-time reminder: use the exact date + time
        nextFireAt = new Date(`${schedule_date}T${schedule_time}:00`);
      } else {
        // Recurring: calculate next occurrence
        const [hours, minutes] = schedule_time.split(':').map(Number);
        nextFireAt = new Date();
        nextFireAt.setHours(hours, minutes, 0, 0);

        // If the time has passed today, move to tomorrow
        if (nextFireAt <= now) {
          nextFireAt.setDate(nextFireAt.getDate() + 1);
        }

        // For weekly: adjust to next matching day
        if (schedule_type === 'weekly' && schedule_days && schedule_days.length > 0) {
          const currentDay = nextFireAt.getDay();
          const sortedDays = [...schedule_days].sort((a, b) => a - b);
          const nextDay = sortedDays.find(d => d > currentDay) ?? sortedDays[0];
          const daysToAdd = nextDay > currentDay ? nextDay - currentDay : 7 - currentDay + nextDay;
          nextFireAt.setDate(nextFireAt.getDate() + daysToAdd);
        }

        // For weekdays: skip to Monday if today is weekend
        if (schedule_type === 'weekdays') {
          const day = nextFireAt.getDay();
          if (day === 0) nextFireAt.setDate(nextFireAt.getDate() + 1); // Sunday -> Monday
          if (day === 6) nextFireAt.setDate(nextFireAt.getDate() + 2); // Saturday -> Monday
        }

        // For weekends: skip to Saturday if today is weekday
        if (schedule_type === 'weekends') {
          const day = nextFireAt.getDay();
          if (day >= 1 && day <= 5) {
            const daysUntilSaturday = 6 - day;
            nextFireAt.setDate(nextFireAt.getDate() + daysUntilSaturday);
          }
        }
      }

      const db = getDatabase();
      const id = randomUUID();

      db.prepare(`
        INSERT INTO notification_schedules (
          id, user_id, title, body, type, schedule_type, schedule_time,
          schedule_date, schedule_days, channels, is_active, next_fire_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        user_id,
        title,
        body,
        'reminder',
        schedule_type,
        schedule_time,
        schedule_date || null,
        schedule_days ? JSON.stringify(schedule_days) : null,
        JSON.stringify(channels),
        1, // is_active
        nextFireAt.toISOString()
      );

      const scheduleInfo = schedule_type === 'once'
        ? `on ${schedule_date} at ${schedule_time}`
        : schedule_type === 'daily'
          ? `every day at ${schedule_time}`
          : schedule_type === 'weekdays'
            ? `every weekday at ${schedule_time}`
            : schedule_type === 'weekends'
              ? `every weekend at ${schedule_time}`
              : `weekly on ${schedule_days?.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')} at ${schedule_time}`;

      return {
        content: [{
          type: 'text',
          text: `✅ Reminder created successfully!

Title: ${title}
Schedule: ${scheduleInfo}
Next reminder: ${nextFireAt.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
Channels: ${channels.join(', ')}

The reminder will be sent through your selected notification channels.`,
        }],
        details: {
          reminderId: id,
          nextFireAt: nextFireAt.toISOString(),
          scheduleType: schedule_type,
        },
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Error creating reminder: ${err.message}` }],
        error: err.message,
      };
    }
  },
};
