-- Email Client Extension - Database Tables
-- Professional email system with multi-account support, OAuth, IMAP/SMTP

-- 1. Email Accounts
CREATE TABLE IF NOT EXISTS email_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  provider TEXT NOT NULL, -- 'gmail' | 'outlook' | 'imap'

  -- IMAP
  imap_host TEXT NOT NULL,
  imap_port INTEGER NOT NULL,
  imap_user TEXT NOT NULL,
  imap_pass_encrypted TEXT NOT NULL,
  imap_tls INTEGER DEFAULT 1,

  -- SMTP
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL,
  smtp_user TEXT NOT NULL,
  smtp_pass_encrypted TEXT NOT NULL,
  smtp_tls INTEGER DEFAULT 1,

  -- OAuth
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  oauth_expires_at DATETIME,

  -- Settings
  signature TEXT,
  sync_enabled INTEGER DEFAULT 1,
  sync_frequency INTEGER DEFAULT 5,
  last_sync DATETIME,

  is_default INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_email_accounts_user ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_enabled ON email_accounts(enabled) WHERE enabled = 1;

-- 2. Email Folders
CREATE TABLE IF NOT EXISTS email_folders (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT,
  type TEXT NOT NULL, -- 'system' | 'custom'
  imap_path TEXT,
  parent_id TEXT,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,

  FOREIGN KEY (account_id) REFERENCES email_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_folders_account ON email_folders(account_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON email_folders(parent_id);

-- 3. Emails
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  folder_id TEXT NOT NULL,

  imap_uid TEXT NOT NULL,
  message_id TEXT,

  from_address TEXT NOT NULL,
  from_name TEXT,
  to_addresses TEXT NOT NULL,
  cc_addresses TEXT,
  bcc_addresses TEXT,
  reply_to TEXT,

  subject TEXT,
  date DATETIME NOT NULL,

  body_text TEXT,
  body_html TEXT,
  body_snippet TEXT,

  is_read INTEGER DEFAULT 0,
  is_starred INTEGER DEFAULT 0,
  is_draft INTEGER DEFAULT 0,
  is_replied INTEGER DEFAULT 0,
  is_forwarded INTEGER DEFAULT 0,

  has_attachments INTEGER DEFAULT 0,
  attachments TEXT,

  size_bytes INTEGER,
  synced_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (account_id) REFERENCES email_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (folder_id) REFERENCES email_folders(id) ON DELETE CASCADE,
  UNIQUE(account_id, imap_uid, folder_id)
);

CREATE INDEX IF NOT EXISTS idx_emails_account_folder ON emails(account_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(date DESC);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read);
CREATE INDEX IF NOT EXISTS idx_emails_is_starred ON emails(is_starred) WHERE is_starred = 1;
CREATE INDEX IF NOT EXISTS idx_emails_folder_date ON emails(folder_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_emails_has_attachments ON emails(has_attachments) WHERE has_attachments = 1;

-- 4. Full-Text Search (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS emails_fts USING fts5(
  email_id UNINDEXED,
  subject,
  from_name,
  body_text,
  tokenize='porter'
);

-- 5. Email Attachments
CREATE TABLE IF NOT EXISTS email_attachments (
  id TEXT PRIMARY KEY,
  email_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,

  storage_path TEXT,
  storage_file_id TEXT,

  imap_part_id TEXT,
  downloaded INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
  FOREIGN KEY (storage_file_id) REFERENCES storage_files(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_email ON email_attachments(email_id);

-- 6. Email Drafts
CREATE TABLE IF NOT EXISTS email_drafts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,

  to_addresses TEXT,
  cc_addresses TEXT,
  bcc_addresses TEXT,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,

  attachments TEXT,

  is_reply_to TEXT,
  is_forward_of TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (account_id) REFERENCES email_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_drafts_account ON email_drafts(account_id);
CREATE INDEX IF NOT EXISTS idx_drafts_updated ON email_drafts(updated_at DESC);
