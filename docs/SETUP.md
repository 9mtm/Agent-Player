# Setup Guide

## Quick Start

### Install Dependencies

```bash
# Install root dependencies
pnpm install

# Install backend dependencies
cd packages/backend
pnpm install
```

### Environment Setup

```bash
cd packages/backend
cp .env.example .env
```

Edit `.env` and add:
```env
ANTHROPIC_API_KEY=your_key_here
JWT_SECRET=random_secret_here
PORT=41522
FRONTEND_URL=http://localhost:41521
```

### Run the Application

**Terminal 1 - Backend:**
```bash
cd packages/backend
pnpm dev
# → http://localhost:41522
```

**Terminal 2 - Frontend:**
```bash
cd agent_player_last
pnpm dev
# → http://localhost:41521
```

### Default Login

- Email: `owner@localhost`
- Password: `admin123`

---

## Project Structure

```
packages/backend/          # Backend API (Fastify)
  ├── src/api/routes/     # API endpoints
  ├── src/db/             # Database & migrations
  ├── src/tools/          # AI tools
  ├── extensions/         # Extension plugins
  └── .data/              # Local data (gitignored)

src/                      # Frontend (Next.js)
  ├── app/               # Pages
  ├── components/        # React components
  └── contexts/          # State management
```

---

## Development

### Backend Changes
- Edit files in `packages/backend/src/`
- Auto-reloads on save

### Frontend Changes
- Edit files in `src/`
- Hot reloads on save

### Database Changes
- Create migration: `packages/backend/src/db/migrations/XXX_name.sql`
- Restart backend (migrations auto-run)

---

## Troubleshooting

**Backend won't start:**
- Check `.env` exists with `ANTHROPIC_API_KEY`
- Check port 41522 is free

**Frontend won't start:**
- Check port 41521 is free
- Delete `.next` folder and retry

**Database errors:**
- Delete `packages/backend/.data/database.db`
- Restart backend
