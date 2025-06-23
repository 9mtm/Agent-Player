# Agent Player Makefile
# Makefile for managing Agent Player development tasks

.PHONY: help update-rules validate-rules watch-rules pre-commit setup-hooks clean-logs

# Default target
help:
	@echo "Agent Player Development Commands"
	@echo "=================================="
	@echo ""
	@echo "Rules Management:"
	@echo "  update-rules     - Update rules with current API endpoints and database tables"
	@echo "  validate-rules   - Validate that all endpoints/tables are documented in rules"
	@echo "  watch-rules      - Watch for changes and auto-update rules (runs every 30s)"
	@echo "  organize-rules   - Organize existing rules into proper directory structure"
	@echo "  pre-commit       - Run all checks before committing code"
	@echo ""
	@echo "Setup:"
	@echo "  setup-hooks      - Install git hooks for automatic rules updates"
	@echo "  install-deps     - Install Python dependencies"
	@echo "  setup-rules-dirs - Create organized rules directory structure"
	@echo ""
	@echo "Maintenance:"
	@echo "  clean-logs       - Clean old log files"
	@echo "  run-backend      - Start the backend server"
	@echo "  run-frontend     - Start the frontend development server"
	@echo ""

# Rules management commands
update-rules:
	@echo "🔄 Updating rules with current code structure..."
	@python backend/core/rules_tracker.py

validate-rules:
	@echo "Validating rules completeness..."
	@python -c "from backend.core.rules_tracker import RulesTracker; tracker = RulesTracker(); tracker.run_full_scan()"

organize-rules:
	@echo "Organizing rules into directory structure..."
	@mkdir -p .cursor/rules/01-core
	@mkdir -p .cursor/rules/02-backend
	@mkdir -p .cursor/rules/03-frontend
	@mkdir -p .cursor/rules/04-database
	@mkdir -p .cursor/rules/05-api
	@mkdir -p .cursor/rules/06-security
	@mkdir -p .cursor/rules/07-performance
	@mkdir -p .cursor/rules/08-testing
	@mkdir -p .cursor/rules/09-deployment
	@mkdir -p .cursor/rules/10-maintenance
	@mkdir -p .cursor/rules/11-agent-player-specific
	@echo "Rules directories created successfully!"

setup-rules-dirs: organize-rules
	@echo "Setting up complete rules directory structure..."
	@echo "Rules organization complete!"

watch-rules:
	@echo "👀 Watching for changes and updating rules every 30 seconds..."
	@echo "Press Ctrl+C to stop"
	@python -c "import time; from backend.core.rules_tracker import RulesTracker; tracker = RulesTracker(); [tracker.run_full_scan() or time.sleep(30) for _ in iter(int, 1)]"

# Pre-commit checks
pre-commit: update-rules validate-rules
	@echo "✅ Pre-commit rules check complete"
	@echo "📝 Ready to commit!"

# Setup commands
setup-hooks:
	@echo "⚙️  Setting up git hooks..."
	@mkdir -p .git/hooks
	@echo '#!/bin/bash' > .git/hooks/pre-commit
	@echo 'echo "🔍 Checking for API/Database changes..."' >> .git/hooks/pre-commit
	@echo 'if git diff --cached --name-only | grep -E "backend/(api|models)" > /dev/null; then' >> .git/hooks/pre-commit
	@echo '    echo "📝 Backend changes detected - updating rules..."' >> .git/hooks/pre-commit
	@echo '    cd "$$(git rev-parse --show-toplevel)"' >> .git/hooks/pre-commit
	@echo '    python backend/core/rules_tracker.py' >> .git/hooks/pre-commit
	@echo '    git add .cursor/rules/*.mdc' >> .git/hooks/pre-commit
	@echo '    echo "✅ Rules updated automatically"' >> .git/hooks/pre-commit
	@echo 'fi' >> .git/hooks/pre-commit
	@echo 'exit 0' >> .git/hooks/pre-commit
	@chmod +x .git/hooks/pre-commit
	@echo "✅ Git hooks installed successfully!"

install-deps:
	@echo "📦 Installing Python dependencies..."
	@pip install -r backend/requirements.txt
	@echo "📦 Installing Node.js dependencies..."
	@cd frontend && npm install

# Development server commands
run-backend:
	@echo "🚀 Starting Agent Player backend server..."
	@cd backend && python main.py

run-frontend:
	@echo "🚀 Starting Agent Player frontend development server..."
	@cd frontend && npm run dev

# Maintenance commands
clean-logs:
	@echo "🧹 Cleaning old log files..."
	@find backend/logs -name "*.log.*" -mtime +7 -delete 2>/dev/null || true
	@echo "✅ Log cleanup complete"

# Database commands
db-migrate:
	@echo "🗄️  Running database migrations..."
	@cd backend && python -c "import subprocess; subprocess.run(['alembic', 'upgrade', 'head'])"

db-reset:
	@echo "⚠️  Resetting database (WARNING: This will delete all data!)"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@cd backend && python -c "import subprocess; subprocess.run(['alembic', 'downgrade', 'base'])"
	@cd backend && python -c "import subprocess; subprocess.run(['alembic', 'upgrade', 'head'])"

# Testing commands
test-backend:
	@echo "🧪 Running backend tests..."
	@cd backend && python -m pytest tests/ -v

test-frontend:
	@echo "🧪 Running frontend tests..."
	@cd frontend && npm test

test-all: test-backend test-frontend
	@echo "✅ All tests completed!"

# Code quality commands
lint-backend:
	@echo "🔍 Linting backend code..."
	@cd backend && python -m flake8 . --max-line-length=100 --exclude=migrations

lint-frontend:
	@echo "🔍 Linting frontend code..."
	@cd frontend && npm run lint

format-backend:
	@echo "🎨 Formatting backend code..."
	@cd backend && python -m black . --line-length=100

format-frontend:
	@echo "🎨 Formatting frontend code..."
	@cd frontend && npm run format

lint-all: lint-backend lint-frontend
format-all: format-backend format-frontend

# Full development workflow
dev-setup: install-deps setup-hooks
	@echo "🎉 Agent Player development environment ready!"
	@echo ""
	@echo "Next steps:"
	@echo "1. Run 'make run-backend' to start the backend server"
	@echo "2. Run 'make run-frontend' to start the frontend server"
	@echo "3. Use 'make update-rules' to keep rules synchronized"

# Production deployment
deploy-prep: test-all lint-all update-rules
	@echo "🚀 Ready for deployment!"

# Quick status check
status:
	@echo "📊 Agent Player Project Status"
	@echo "============================="
	@echo ""
	@echo "📁 Project Structure:"
	@find . -name "*.py" -path "./backend/*" | wc -l | xargs echo "  Backend Python files:"
	@find . -name "*.ts" -o -name "*.tsx" | grep "./frontend" | wc -l | xargs echo "  Frontend TypeScript files:"
	@echo ""
	@echo "🔧 API Endpoints:"
	@grep -r "@router\." backend/api/ --include="*.py" | wc -l | xargs echo "  Total endpoints:"
	@echo ""
	@echo "🗄️  Database Tables:"
	@grep -r "__tablename__" backend/ --include="*.py" | wc -l | xargs echo "  Total tables:"
	@echo ""
	@echo "📋 Rules Files:"
	@ls -la .cursor/rules/*.mdc 2>/dev/null | wc -l | xargs echo "  Rules files:" 