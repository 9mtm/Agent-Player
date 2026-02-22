# Agent Player

Self-hosted AI Agent Platform with 3D avatars and interactive worlds.

---

## Quick Start

### Install
```bash
git clone https://github.com/Agent-Player/Agent-Player.git
cd Agent-Player
pnpm install

cd packages/backend
pnpm install
cp .env.example .env
# Edit .env: add ANTHROPIC_API_KEY
```

### Run

**Backend (Terminal 1):**
```bash
cd packages/backend
pnpm dev
# → http://localhost:41522
```

**Frontend (Terminal 2):**
```bash
cd Agent-Player
pnpm dev
# → http://localhost:41521
```

**Login:** `owner@localhost` / `admin123`

---

## Features

- Multi-Agent System with custom tools
- 3D Avatar Viewer (Ready Player Me)
- Interactive Worlds (physics, WASD controls)
- Extension SDK (plugin system)
- 18 Built-in Tools (browser, memory, storage)
- Calendar Integration (Google, iCal)
- WebRTC Video Calls

---

## Structure

```
packages/backend/          # Backend (Fastify)
  ├── src/api/routes/     # API endpoints
  ├── src/tools/          # AI tools
  ├── extensions/         # Plugins
  └── .data/              # Local data

src/                      # Frontend (Next.js)
  ├── app/               # Pages
  └── components/        # React components
```

---

## Environment

Edit `packages/backend/.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=random_secret
PORT=41522
FRONTEND_URL=http://localhost:41521
```

---

## Documentation

- [docs/SETUP.md](docs/SETUP.md) - Installation & running
- [docs/EXTENSIONS.md](docs/EXTENSIONS.md) - Build extensions
- [docs/SKILLS.md](docs/SKILLS.md) - Install skills from Skill Hub
- [docs/API.md](docs/API.md) - API endpoints
- [docs/DATABASE.md](docs/DATABASE.md) - Database structure
- [docs/AGENT_PERSONALITY.md](docs/AGENT_PERSONALITY.md) - Agent personality system

---

## Tech Stack

Next.js 15, React 19, Fastify 5, SQLite, Claude Sonnet 4.5, Three.js

---

## Contributing

Want to contribute? See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- How to create a branch
- How to submit pull requests
- Code style guidelines

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and recent updates.

---

## Built By

This project was collaboratively built by:
- **9mtm** - Creator & Lead Developer
- **Claude Code** - AI Assistant
- **Google Antigravity** - AI Assistant

---

## License

MIT - See [LICENSE](LICENSE) for details
