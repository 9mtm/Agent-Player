# Email Client Extension

Professional email system with multi-account support, Gmail/Outlook OAuth, IMAP/SMTP sync, and full-text search.

## Features

- ✅ **Multi-Account Support** - Connect unlimited email accounts
- ✅ **OAuth Integration** - Gmail and Outlook OAuth2 authentication
- ✅ **IMAP/SMTP** - Universal email protocol support
- ✅ **Full-Text Search** - FTS5-powered search across all emails
- ✅ **Auto-Sync** - Automatic email synchronization (configurable intervals)
- ✅ **Attachments** - Download and manage email attachments
- ✅ **Drafts** - Auto-save email drafts
- ✅ **Folders** - Organize emails in folders (Inbox, Sent, Trash, etc.)

## Installation

1. Go to `/dashboard/extensions`
2. Find **Email Client** extension
3. Click **Enable**
4. Backend will restart automatically
5. Access email at `/dashboard/email`

## Configuration

### Add Email Account

**Option 1: Gmail (OAuth)**
1. Go to `/dashboard/email`
2. Click "Add Account"
3. Select "Gmail"
4. Follow OAuth flow to connect your Google account

**Option 2: Outlook (OAuth)**
1. Click "Add Account"
2. Select "Outlook"
3. Follow Microsoft OAuth flow

**Option 3: IMAP/SMTP (Any Provider)**
1. Click "Add Account"
2. Select "IMAP"
3. Enter server details:
   - **IMAP Host**: `imap.example.com`
   - **IMAP Port**: `993` (TLS) or `143`
   - **SMTP Host**: `smtp.example.com`
   - **SMTP Port**: `465` (TLS) or `587` (STARTTLS)
   - **Username**: Your email address
   - **Password**: Your email password or app password

### Common IMAP/SMTP Settings

**Gmail** (App Password required):
- IMAP: `imap.gmail.com:993`
- SMTP: `smtp.gmail.com:465`

**Outlook/Hotmail**:
- IMAP: `outlook.office365.com:993`
- SMTP: `smtp.office365.com:587`

**Yahoo**:
- IMAP: `imap.mail.yahoo.com:993`
- SMTP: `smtp.mail.yahoo.com:465`

**ProtonMail** (Bridge required):
- IMAP: `127.0.0.1:1143`
- SMTP: `127.0.0.1:1025`

## Database Tables

The extension creates 6 tables:

1. **email_accounts** - Email account configurations
2. **email_folders** - Folder structure per account
3. **emails** - Email messages
4. **emails_fts** - Full-text search index
5. **email_attachments** - Attachment metadata
6. **email_drafts** - Draft emails

## API Endpoints

All endpoints require JWT authentication.

### Email Accounts
- `GET /api/email/accounts` - List all accounts
- `POST /api/email/accounts` - Add new account
- `PUT /api/email/accounts/:id` - Update account
- `DELETE /api/email/accounts/:id` - Remove account

### Email Folders
- `GET /api/email/folders` - List folders
- `POST /api/email/folders` - Create folder
- `PUT /api/email/folders/:id` - Update folder
- `DELETE /api/email/folders/:id` - Delete folder

### Email Messages
- `GET /api/email/messages` - List messages (with filters)
- `GET /api/email/messages/:id` - Get single message
- `PUT /api/email/messages/:id` - Update message (mark read/starred)
- `DELETE /api/email/messages/:id` - Delete message
- `POST /api/email/messages/bulk` - Bulk operations

### Email Search
- `GET /api/email/search?q=keyword` - Full-text search

### Email Compose
- `POST /api/email/compose/send` - Send email
- `POST /api/email/compose/reply` - Reply to email
- `POST /api/email/compose/forward` - Forward email

### Email Attachments
- `GET /api/email/attachments/:id` - Download attachment
- `POST /api/email/attachments/upload` - Upload attachment

### Email Drafts
- `GET /api/email/drafts` - List drafts
- `POST /api/email/drafts` - Create/update draft
- `DELETE /api/email/drafts/:id` - Delete draft

## Settings

Configure via extension settings:

- **Default Sync Interval** - How often to sync emails (minutes)
- **Default Provider** - Gmail, Outlook, or IMAP
- **Auto-download Attachments** - Automatically download attachments
- **Enable Full-Text Search** - Enable FTS5 search index

## Sync Service

The extension runs an auto-sync service that:
- Checks enabled accounts every X minutes (configurable)
- Syncs new emails via IMAP
- Updates folder counts
- Indexes emails for search

## Security

- ✅ All passwords are AES-256-GCM encrypted
- ✅ OAuth tokens stored securely
- ✅ JWT authentication required for all API calls
- ✅ Per-user email isolation

## Troubleshooting

### "Failed to connect to IMAP server"
- Check IMAP host and port
- Verify credentials
- Enable "Less secure apps" or use app password (Gmail, Yahoo)
- Check firewall/proxy settings

### "OAuth failed"
- Ensure OAuth credentials are configured
- Check redirect URI matches
- Verify Google/Microsoft API is enabled

### "Emails not syncing"
- Check sync is enabled for account
- Verify sync interval setting
- Check extension is enabled
- Review backend logs for errors

## Uninstallation

**Warning**: Uninstalling will delete all email data!

1. Go to `/dashboard/extensions`
2. Find **Email Client**
3. Click **Delete**
4. Confirm deletion
5. All email tables will be dropped

## Development

Extension structure:
```
email-client/
├── agentplayer.plugin.json   # Extension manifest
├── index.js                   # Extension entry point
├── migrations/
│   └── 001_email_tables.sql  # Database schema
└── README.md                  # This file
```

## Support

For issues or feature requests, check:
- Extension logs in backend console
- Database tables for data integrity
- API responses for error messages

## Version

**v1.0.0** - Initial release with full email client functionality
