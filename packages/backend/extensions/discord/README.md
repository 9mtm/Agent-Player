# Discord Extension

Connect Agent Player to Discord servers.

## Setup

1. Create application at Discord Developer Portal
2. Create a bot and get token
3. Invite bot to your server
4. Configure in Agent Player settings

## Configuration

| Setting | Required | Description |
|---------|----------|-------------|
| `bot_token` | Yes | Discord Bot Token |
| `client_id` | No | Application Client ID |
| `guild_id` | No | Server ID for commands |
| `allowed_channels` | No | Whitelist channel IDs |

## Features

- Send and receive messages
- Slash commands
- Embed messages
- Reactions
- Thread support
- Voice channel info

## Permissions

Bot needs these permissions:
- Read Messages
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- Add Reactions

## Commands

| Command | Description |
|---------|-------------|
| `/chat` | Start conversation |
| `/help` | Show help |
| `/status` | Check agent status |
| `/clear` | Clear conversation |
