-- Migration 009: Add cron scheduling and auto-approve fields to agents_config

ALTER TABLE agents_config ADD COLUMN cron_schedule TEXT;
ALTER TABLE agents_config ADD COLUMN cron_enabled INTEGER DEFAULT 0;
ALTER TABLE agents_config ADD COLUMN auto_approve_tasks INTEGER DEFAULT 0;
ALTER TABLE agents_config ADD COLUMN last_heartbeat DATETIME;
