/** Public setup metadata; contains no account credentials. */
export const channelSetup = [
  {
    "id": "a2a",
    "label": "A2A",
    "requiredEnv": [],
    "prerequisites": "No extra packages needed (stdlib only)",
    "prepare": "Prepare an A2A endpoint and its authentication settings; identify the remote agent and supported message direction."
  },
  {
    "id": "api_server",
    "label": "API Server",
    "requiredEnv": [],
    "prerequisites": "Requires platform-specific account, SDK or bridge configuration.",
    "prepare": "Choose a private bind address, port and API authentication for the channel service; prepare an API client for testing."
  },
  {
    "id": "bluebubbles",
    "label": "iMessage via BlueBubbles",
    "requiredEnv": [],
    "prerequisites": "Requires platform-specific account, SDK or bridge configuration.",
    "prepare": "Set up a BlueBubbles server on a compatible Mac with iMessage signed in. Obtain its server URL and password."
  },
  {
    "id": "buzz",
    "label": "Buzz",
    "requiredEnv": [
      "BUZZ_RELAY_URL",
      "BUZZ_PRIVATE_KEY"
    ],
    "prerequisites": "Requires the buzz CLI binary (https://github.com/block/buzz) on PATH or at BUZZ_CLI_PATH",
    "prepare": "Install the Buzz CLI and prepare the relay URL and account private key."
  },
  {
    "id": "dingtalk",
    "label": "DingTalk",
    "requiredEnv": [
      "DINGTALK_CLIENT_ID",
      "DINGTALK_CLIENT_SECRET"
    ],
    "prerequisites": "pip install 'dingtalk-stream>=0.20' httpx",
    "prepare": "Create a DingTalk application and robot. Obtain the client ID/secret and configure its supported stream connection."
  },
  {
    "id": "discord",
    "label": "Discord",
    "requiredEnv": [
      "DISCORD_BOT_TOKEN"
    ],
    "prerequisites": "Install the provider SDKs for Discord; see docs/CHANNELS.md.",
    "prepare": "Create a bot in Discord Developer Portal, enable Message Content Intent, and invite it to a test server with View Channel and Send Messages. Enable Developer Mode to copy your user and channel IDs."
  },
  {
    "id": "email",
    "label": "Email",
    "requiredEnv": [
      "EMAIL_ADDRESS",
      "EMAIL_PASSWORD",
      "EMAIL_SMTP_HOST"
    ],
    "prerequisites": "Email uses the Python stdlib (smtplib/imaplib) — no extra deps",
    "prepare": "Prepare a dedicated mailbox, its SMTP/IMAP server details and an app password or provider-supported credentials."
  },
  {
    "id": "feishu",
    "label": "Feishu / Lark",
    "requiredEnv": [
      "FEISHU_APP_ID",
      "FEISHU_APP_SECRET"
    ],
    "prerequisites": "Install the provider SDKs for Feishu; see docs/CHANNELS.md.",
    "prepare": "Create a Feishu/Lark application, enable bot messaging and obtain its app ID and secret."
  },
  {
    "id": "google_chat",
    "label": "Google Chat",
    "requiredEnv": [
      "GOOGLE_CHAT_SERVICE_ACCOUNT_JSON"
    ],
    "prerequisites": "Install the provider SDKs for Google Chat; see docs/CHANNELS.md.",
    "prepare": "Create a Google Chat app and service account. Configure its delivery method, credentials and a test space."
  },
  {
    "id": "homeassistant",
    "label": "Home Assistant",
    "requiredEnv": [
      "HASS_TOKEN"
    ],
    "prerequisites": "pip install aiohttp",
    "prepare": "Prepare your Home Assistant URL and a long-lived access token for a dedicated account."
  },
  {
    "id": "irc",
    "label": "IRC",
    "requiredEnv": [
      "IRC_SERVER",
      "IRC_CHANNEL",
      "IRC_NICKNAME"
    ],
    "prerequisites": "No extra packages needed (stdlib only)",
    "prepare": "Choose the IRC server, port, nickname and channel. Prepare authentication and TLS settings if required."
  },
  {
    "id": "line",
    "label": "LINE",
    "requiredEnv": [
      "LINE_CHANNEL_ACCESS_TOKEN",
      "LINE_CHANNEL_SECRET"
    ],
    "prerequisites": "pip install aiohttp",
    "prepare": "Create a LINE Messaging API channel. Obtain its access token and channel secret, and configure the required callback endpoint."
  },
  {
    "id": "matrix",
    "label": "Matrix",
    "requiredEnv": [
      "MATRIX_HOMESERVER",
      "MATRIX_ACCESS_TOKEN"
    ],
    "prerequisites": "pip install 'mautrix[encryption]'",
    "prepare": "Prepare a Matrix homeserver, bot account/access token and a test room. Install encryption dependencies if the room requires them."
  },
  {
    "id": "mattermost",
    "label": "Mattermost",
    "requiredEnv": [
      "MATTERMOST_URL",
      "MATTERMOST_TOKEN"
    ],
    "prerequisites": "pip install aiohttp",
    "prepare": "Create a Mattermost bot account, obtain its access token and server URL, and add it to a test channel."
  },
  {
    "id": "msgraph_webhook",
    "label": "Microsoft Graph Webhook",
    "requiredEnv": [],
    "prerequisites": "Requires platform-specific account, SDK or bridge configuration.",
    "prepare": "Prepare Microsoft Entra application credentials and a Graph subscription with the required callback validation and permissions."
  },
  {
    "id": "ntfy",
    "label": "ntfy",
    "requiredEnv": [
      "NTFY_TOPIC"
    ],
    "prerequisites": "pip install httpx",
    "prepare": "Choose an ntfy server and a dedicated topic. Configure topic access controls and an access token if the server requires one."
  },
  {
    "id": "photon",
    "label": "iMessage via Photon",
    "requiredEnv": [
      "PHOTON_PROJECT_ID",
      "PHOTON_PROJECT_SECRET"
    ],
    "prerequisites": "Requires a Photon Spectrum project and configured spectrum-ts sidecar.",
    "prepare": "Prepare a Photon project and its iMessage service. Obtain project credentials and install the Spectrum sidecar dependencies."
  },
  {
    "id": "qqbot",
    "label": "QQ Bot",
    "requiredEnv": [],
    "prerequisites": "Requires platform-specific account, SDK or bridge configuration.",
    "prepare": "Create a QQ bot application and prepare its application credentials and supported test context."
  },
  {
    "id": "raft",
    "label": "Raft",
    "requiredEnv": [
      "RAFT_PROFILE"
    ],
    "prerequisites": "Install the Raft CLI from https://raft.build",
    "prepare": "Install the Raft CLI and configure the account, endpoint and credentials required by your deployment."
  },
  {
    "id": "relay",
    "label": "Connector Relay",
    "requiredEnv": [],
    "prerequisites": "Requires platform-specific account, SDK or bridge configuration.",
    "prepare": "Prepare the relay WebSocket endpoint, bot identity and capability descriptor matching the relay service."
  },
  {
    "id": "signal",
    "label": "Signal",
    "requiredEnv": [],
    "prerequisites": "Requires platform-specific account, SDK or bridge configuration.",
    "prepare": "Configure a Signal account with a signal-cli HTTP daemon. Identify its server URL and recipient."
  },
  {
    "id": "simplex",
    "label": "SimpleX Chat",
    "requiredEnv": [
      "SIMPLEX_WS_URL"
    ],
    "prerequisites": "pip install websockets   # SimpleX adapter requires the websockets package",
    "prepare": "Run and configure the SimpleX chat service with its supported local API connection. Prepare a test contact."
  },
  {
    "id": "slack",
    "label": "Slack",
    "requiredEnv": [
      "SLACK_BOT_TOKEN",
      "SLACK_APP_TOKEN"
    ],
    "prerequisites": "Install the provider SDKs for Slack; see docs/CHANNELS.md.",
    "prepare": "Create a Slack app and bot, configure messaging scopes and its supported connection mode, install it in a workspace and invite it to a test channel."
  },
  {
    "id": "sms",
    "label": "SMS (Twilio)",
    "requiredEnv": [
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_PHONE_NUMBER"
    ],
    "prerequisites": "pip install aiohttp",
    "prepare": "Prepare an SMS provider account, API credentials, sending number and the inbound callback required by the adapter."
  },
  {
    "id": "teams",
    "label": "Microsoft Teams",
    "requiredEnv": [
      "TEAMS_CLIENT_ID",
      "TEAMS_CLIENT_SECRET",
      "TEAMS_TENANT_ID"
    ],
    "prerequisites": "Configure the provider SDK and account.",
    "prepare": "Create the Teams bot/application, configure Microsoft identity credentials and its supported callback hosting, then install it in a test conversation."
  },
  {
    "id": "telegram",
    "label": "Telegram",
    "requiredEnv": [
      "TELEGRAM_BOT_TOKEN"
    ],
    "prerequisites": "Install the provider SDKs for Telegram; see docs/CHANNELS.md.",
    "prepare": "Create a bot with @BotFather using /newbot and copy its token. Use a dedicated bot with no competing polling process or existing webhook."
  },
  {
    "id": "webhook",
    "label": "Webhook",
    "requiredEnv": [],
    "prerequisites": "Requires platform-specific account, SDK or bridge configuration.",
    "prepare": "Prepare the webhook URL, authentication and supported payload format. Identify whether your deployment supports inbound, outbound or both directions."
  },
  {
    "id": "wecom",
    "label": "WeCom (Enterprise WeChat)",
    "requiredEnv": [
      "WECOM_BOT_ID",
      "WECOM_SECRET"
    ],
    "prerequisites": "Configure the provider SDK and account.",
    "prepare": "Create a WeCom application or bot and obtain the credentials for the selected connection mode."
  },
  {
    "id": "wecom_callback",
    "label": "WeCom Callback (self-built apps)",
    "requiredEnv": [
      "WECOM_CALLBACK_CORP_ID",
      "WECOM_CALLBACK_CORP_SECRET"
    ],
    "prerequisites": "Configure the provider SDK and account.",
    "prepare": "Configure a WeCom callback endpoint, verification token and encoding AES key. Complete provider callback verification."
  },
  {
    "id": "weixin",
    "label": "Weixin",
    "requiredEnv": [],
    "prerequisites": "Requires platform-specific account, SDK or bridge configuration.",
    "prepare": "Prepare a supported Weixin account and complete the adapter-specific authentication or pairing flow."
  },
  {
    "id": "whatsapp",
    "label": "WhatsApp",
    "requiredEnv": [
      "WHATSAPP_ENABLED"
    ],
    "prerequisites": "WhatsApp requires a Node.js bridge — see the WhatsApp messaging docs",
    "prepare": "Install the included Baileys bridge dependencies and pair a dedicated WhatsApp account using its supported pairing flow."
  },
  {
    "id": "whatsapp_cloud",
    "label": "WhatsApp Cloud API",
    "requiredEnv": [],
    "prerequisites": "Requires platform-specific account, SDK or bridge configuration.",
    "prepare": "Prepare a Meta WhatsApp Cloud API application, access token, phone number ID and verified callback configuration."
  },
  {
    "id": "yuanbao",
    "label": "Yuanbao",
    "requiredEnv": [],
    "prerequisites": "Requires platform-specific account, SDK or bridge configuration.",
    "prepare": "Prepare the Yuanbao account and adapter-specific service credentials or connection settings."
  }
] as const;
