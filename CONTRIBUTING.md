# Contributing to Agent Player

Thank you for your interest in contributing!

---

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Git
- Python 3.12 (for audio features)

### Initial Setup

```bash
# 1. Fork the repository on GitHub
# Click "Fork" button on GitHub

# 2. Clone YOUR fork
git clone https://github.com/YOUR_USERNAME/Agent-Player.git
cd Agent-Player

# 3. Add upstream remote
git remote add upstream https://github.com/Agent-Player/Agent-Player.git

# 4. Install dependencies
pnpm install
cd packages/backend
pnpm install
cd ../..

# 5. Setup environment
cd packages/backend
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

---

## Running in Development Mode

### Terminal 1 - Backend
```bash
cd packages/backend
pnpm dev
# Runs on http://localhost:41522
```

### Terminal 2 - Frontend
```bash
cd agent_player
pnpm dev
# Runs on http://localhost:41521
```

### Login Credentials
- Email: `owner@localhost`
- Password: `admin123`

---

## Making Changes

### 1. Create a New Branch

**ALWAYS create a new branch for your changes:**

```bash
# Get latest code from upstream
git checkout main
git pull upstream main

# Create new branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring

### 2. Make Your Changes

- Write clean, readable code
- Follow existing code style
- Add comments for complex logic
- Test your changes thoroughly

### 3. Test Your Changes

```bash
# Test backend
cd packages/backend
pnpm test

# Test frontend
cd ../..
pnpm test

# Manual testing
# 1. Run both backend and frontend
# 2. Test your feature
# 3. Check browser console for errors
# 4. Check backend console for errors
```

### 4. Commit Your Changes

```bash
# Check what changed
git status

# Add files
git add .

# Commit with clear message
git commit -m "Add feature: description of what you did"
```

**Good commit messages:**
- `Add calendar sync feature`
- `Fix avatar loading bug`
- `Update documentation for extensions`
- `Refactor database queries for performance`

**Bad commit messages:**
- `fix`
- `update`
- `changes`

### 5. Push to Your Fork

```bash
# Push to YOUR fork
git push origin feature/your-feature-name
```

---

## Submitting a Pull Request

### 1. Create Pull Request on GitHub

1. Go to **your fork** on GitHub
2. Click "Compare & pull request" button
3. **Base repository:** ORIGINAL_OWNER/agent_player
4. **Base branch:** main
5. **Head repository:** YOUR_USERNAME/agent_player
6. **Compare branch:** feature/your-feature-name

### 2. Fill Pull Request Template

**Title:** Clear description of changes
```
Add calendar sync feature
```

**Description:**
```markdown
## What does this PR do?
- Adds Google Calendar sync functionality
- Implements iCal import
- Adds calendar UI in dashboard

## How to test?
1. Enable calendar extension
2. Go to /dashboard/calendar
3. Add Google Calendar source
4. Verify events sync

## Screenshots
[If applicable, add screenshots]

## Checklist
- [x] Code tested locally
- [x] No console errors
- [x] Documentation updated
- [x] Follows code style guidelines
```

### 3. Wait for Review

We will review your pull request and may:
- ✅ **Approve and merge** - Your changes are good!
- 💬 **Request changes** - Small fixes needed
- ❌ **Close** - Does not fit project goals

---

## Review Process

### What We Check

1. **Code Quality**
   - Clean, readable code
   - Follows project style
   - No unnecessary changes
   - Proper error handling

2. **Functionality**
   - Feature works as described
   - No bugs introduced
   - Edge cases handled
   - Performance acceptable

3. **Tests**
   - Changes tested manually
   - No breaking changes
   - Backend and frontend work together
   - No console errors

4. **Documentation**
   - README updated if needed
   - Code comments added
   - API documented if new routes
   - Clear commit messages

### Timeline

- Initial review: 1-3 days
- Discussion/changes: As needed
- Final merge: After approval

---

## Code Style Guidelines

### General

- **Language:** English only (code, comments, docs)
- **Formatting:** Use Prettier
- **Linting:** Use ESLint
- **Line length:** 100 characters max

### Backend (TypeScript)

```typescript
// Use async/await
async function fetchData() {
  const data = await getData();
  return data;
}

// Use interfaces for types
interface User {
  id: string;
  name: string;
  email: string;
}

// Use parameterized queries
db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

// Handle errors properly
try {
  await someOperation();
} catch (error) {
  console.error('Error:', error);
  return reply.status(500).send({ error: 'Internal error' });
}
```

### Frontend (React/TypeScript)

```typescript
// Use function components
export default function MyComponent() {
  const [data, setData] = useState<Data[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  return <div>...</div>;
}

// Use hooks
const { user } = useAuth();
const navigate = useNavigate();

// Handle loading states
if (isLoading) return <Spinner />;
if (error) return <ErrorMessage />;
```

### Extensions (JavaScript)

```javascript
// Pure JavaScript only (no TypeScript)
export default {
  id: 'my-extension',

  async register(api) {
    // Use async/await
    await api.runMigrations([...]);

    // Register routes
    api.registerRoutes(async (fastify) => {
      fastify.get('/route', handler);
    });
  }
};
```

---

## Database Changes

### Creating Migrations

```sql
-- Migration: XXX_description.sql
-- Create table
CREATE TABLE IF NOT EXISTS my_table (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_my_table_name
ON my_table(name);
```

**Important:**
- Always use `IF NOT EXISTS`
- Number migrations sequentially (001, 002, 003...)
- Test migration before submitting PR

---

## Common Issues

### Backend won't start
```bash
# Check .env file exists
ls packages/backend/.env

# Verify API key set
cat packages/backend/.env | grep ANTHROPIC_API_KEY

# Check port not in use
netstat -an | grep 41522
```

### Frontend won't start
```bash
# Clear build cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
pnpm install
```

### Database errors
```bash
# Delete and recreate database
cd packages/backend/.data
rm database.db
# Restart backend (migrations auto-run)
```

---

## Getting Help

### Stuck? Ask for help!

1. **GitHub Issues:** Open an issue describing your problem
2. **Pull Request Comments:** Ask questions in your PR
3. **Documentation:** Check `docs/` folder

### Before asking:

1. Read error messages carefully
2. Check console logs (browser + backend)
3. Search existing issues
4. Review documentation

---

## What We're Looking For

### Good Contributions ✅

- Bug fixes with tests
- New features with documentation
- Performance improvements
- Documentation improvements
- Code refactoring (with tests)
- Security fixes

### Not Accepting ❌

- Breaking changes without discussion
- Features that don't fit project scope
- Code without tests
- Incomplete features
- Style-only changes without value
- Arabic or non-English text in code

---

## Code of Conduct

### Be Respectful

- Be kind and courteous
- Respect different opinions
- Accept constructive criticism
- Focus on what's best for the project

### Don't

- Use offensive language
- Make personal attacks
- Harass other contributors
- Share others' private information

---

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Credited in release notes
- Thanked in pull request comments

---

## Questions?

Open an issue with your question, and we'll help you out!

---

**Thank you for contributing to Agent Player!** 🚀
