# Telegram Extension

Connect Agent Player to Telegram for messaging.

## Setup

1. Create a bot with [@BotFather](https://t.me/BotFather)
2. Get your bot token
3. Configure in Agent Player settings

## Configuration

| Setting | Required | Description |
|---------|----------|-------------|
| `bot_token` | Yes | Token from BotFather |
| `webhook_url` | No | Webhook URL (optional) |
| `allowed_users` | No | Whitelist user IDs |

## Features

- Send and receive messages
- Support for media (photos, documents)
- Inline keyboards
- Commands support
- User authentication

## Usage

Once configured, users can chat with your bot on Telegram and Agent Player will respond.

### Commands

| Command | Description |
|---------|-------------|
| `/start` | Start conversation |
| `/help` | Show help |
| `/status` | Check agent status |

## API

```typescript
// Send message
await telegram.sendMessage(chatId, 'Hello!');

// Send with keyboard
await telegram.sendMessage(chatId, 'Choose:', {
  reply_markup: {
    inline_keyboard: [[
      { text: 'Option 1', callback_data: 'opt1' },
      { text: 'Option 2', callback_data: 'opt2' }
    ]]
  }
});
```
