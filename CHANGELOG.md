# Changelog

All notable changes to Agent Player.

---

## [1.3.0] - 2026-02-22

### 🎉 Complete System Redesign

**Development resumed after 7-month break (personal reasons - new child).**

This is a **complete rewrite** from the ground up.

### Architecture Overhaul
- Complete backend rewrite (Fastify 5, TypeScript)
- Complete frontend rewrite (Next.js 15, React 19, TailwindCSS)
- New database structure (SQLite with auto-migrations)
- Professional extension system (VSCode-style plugins)
- Agent personality system (PERSONALITY.md, MEMORY.md per agent)

### Major Features Added
- Multi-agent system with cron scheduling
- 3D avatar viewer (Ready Player Me integration)
- Interactive 3D worlds with physics (WASD controls)
- 18 built-in agentic tools (browser, memory, storage, CLI)
- Extension SDK with JSON render support
- Skills system (Skill Hub integration - thousands of skills)
- Calendar integration (Google Calendar, iCal)
- WebRTC video calls with AI vision
- Notification system (in-app, email, push, WhatsApp)
- Storage management system
- Database management UI (backup/restore/cleanup)
- Security hardening (42/45 vulnerabilities fixed)
- Credentials vault (AES-256-GCM encryption)
- Audit logging system

### Documentation
- Complete documentation rewrite (11 files)
- CONTRIBUTING.md for developers
- Extension development guide
- Skills system guide
- API reference (50+ endpoints)
- Database schema documentation
- Agent personality system docs

### Credits
Built by: **9mtm** (Creator), **Claude Code** (AI Assistant), **Google Antigravity** (AI Partner)

---

## [1.2.0] - 2026-02-20 [OLDER VERSION]

### Added
- Agent Files System (PERSONALITY.md, MEMORY.md per agent)
- Calendar System (Google Calendar sync, iCal import)
- Database Management UI (backup/restore/cleanup)
- Security Hardening (42/45 vulnerabilities fixed)
- Extension SDK System (plugin architecture)
- Interactive Worlds (physics-based 3D environments)
- Skills System (install from Skill Hub)
- Notification System (in-app, email, push, WhatsApp)
- WebRTC Video Calls with AI vision
- Camera recording and playback

### Changed
- Email Client moved to extension (from core)
- Documentation simplified (7 essential files only)
- Improved security (JWT tokens, account lockout, audit logs)

### Fixed
- Login authentication (database migration paths)
- Avatar ownership bug (hardcoded user ID)
- THREE.js skinned mesh cloning issue

---

## [1.2.0] - 2026-02-20

### Added
- Multi-Agent System with cron scheduling
- 18 Agentic Tools (browser, memory, storage, CLI)
- 3D Avatar Viewer with effects
- Task Kanban Board
- Storage Management
- Credentials Vault (AES-256-GCM)

---

## [1.1.0] - 2026-02-18

### Added
- Agent management
- Chat sessions
- Database migrations
- Authentication system

---

## [1.0.0] - 2026-02-15

### Added
- Initial release
- Basic agent functionality
- SQLite database
- Fastify backend
- Next.js frontend

---

**Version Format:** [Major.Minor.Patch]
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes
