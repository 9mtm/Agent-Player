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

## Features

### Core System
- Multi-Agent System with custom tools
- 3D Avatar Viewer (Ready Player Me)
- Extension SDK (plugin system)
- **19 Professional Tools** with examples-driven design (browser, memory, storage, execute_code)
- Programmatic Tool Calling (10x faster multi-step workflows)
- WebRTC Video Calls with AI Vision

### Interactive Worlds & Multiverse
- **World Builder** - Create and edit 3D worlds with manual building tools
  - Resizable sidebar (200-600px) for better workspace control
  - AI Assistant integrated in left sidebar
  - Horizontally scrollable tabs for compact views
  - Real-time 3D preview with physics
- **Multiverse System** - Tab-based world management
  - My Worlds: Create, edit, and manage your personal worlds
  - Explore: Discover public worlds from other users
  - World Builder: Manual world creation with AI assistance (no file upload required)
  - Bots: AI agents for world management
- **Physics & Controls** - WASD movement, jump, gravity, third-person camera
- **Simplified Workflow** - Create world → Opens World Builder → Build manually

### Integrations
- Calendar Integration (Google, iCal)
- Email Client (optional extension)
- WAF Security Scanner (extension)

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

## Using Multiverse & World Builder

### Create a World
1. Navigate to **Dashboard → Multiverse**
2. Go to **My Worlds** tab
3. Click **Create New World**
4. Enter world name and description
5. Set visibility (Public/Private) and max players (default: 10, max: 100)
6. Click **Create** → Automatically opens World Builder

### Build Your World
- **Left Sidebar Tools**:
  - Tools: Add objects, lights, terrain features
  - Ground: Configure floor size and appearance
  - Size: Adjust world dimensions
  - AI: Use AI assistant to generate world elements (enter commands)
- **Resize Sidebar**: Drag the right edge (200-600px range)
- **Scroll Tabs**: Tabs scroll horizontally when sidebar is narrow
- **Real-time Preview**: See changes instantly in 3D viewport
- **Save & Export**: Save changes or export as GLB file

### Explore Public Worlds
1. Go to **Explore** tab in Multiverse
2. Browse public worlds created by other users
3. Click **Join World** to enter and explore
4. Physics-based movement: WASD keys, Space to jump
5. Mouse drag for 360° camera rotation

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
