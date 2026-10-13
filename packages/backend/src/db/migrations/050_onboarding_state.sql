-- Migration 050: per-user state of the web onboarding wizard (F-05)
-- Purpose: /onboarding is shown after the first owner login; this table keeps
-- whether the wizard is done, the step reached and the saved (non-secret)
-- answers. Provider API keys are NOT stored here: they go through the settings
-- manager, encrypted.
-- Date: 2026-10-13

CREATE TABLE IF NOT EXISTS onboarding_state (
  user_id TEXT PRIMARY KEY,
  current_step INTEGER NOT NULL DEFAULT 1,
  answers TEXT NOT NULL DEFAULT '{}',
  completed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
