# RULES MIGRATION PLAN

## Current Rules Files to Migrate

### Existing Files:
- `dpro-agent-rule.mdc` - Main rules (split into multiple files)
- `api.mdc` - API development rules
- `backend.mdc` - Backend development rules  
- `datebase.mdc` - Database rules
- `frontend.mdc` - Frontend development rules
- `logging.mdc` - Logging system rules
- `rules-updater.mdc` - Rules tracking system

### Target Organization:

#### 01-CORE (Core Standards)
- [✅] `project-standards.mdc` - Created from main rules
- [ ] `development-workflow.mdc` - Git workflow, code review
- [ ] `error-handling.mdc` - Error handling standards
- [ ] `logging-standards.mdc` - From logging.mdc
- [ ] `code-quality.mdc` - Code quality standards

#### 02-BACKEND (Backend Development)
- [ ] `architecture.mdc` - From backend.mdc
- [ ] `services.mdc` - Service layer patterns
- [ ] `repositories.mdc` - Repository patterns
- [ ] `security.mdc` - Backend security
- [ ] `testing.mdc` - Backend testing

#### 03-FRONTEND (Frontend Development)
- [ ] `react-standards.mdc` - From frontend.mdc
- [ ] `component-patterns.mdc` - Component design
- [ ] `state-management.mdc` - State management
- [ ] `ui-ux.mdc` - UI/UX requirements
- [ ] `testing.mdc` - Frontend testing

#### 04-DATABASE (Database Design)
- [ ] `schema-design.mdc` - From datebase.mdc
- [ ] `performance.mdc` - DB performance
- [ ] `migrations.mdc` - Migration management
- [ ] `security.mdc` - DB security
- [ ] `backup.mdc` - Backup procedures

#### 05-API (API Development)
- [ ] `rest-standards.mdc` - From api.mdc
- [ ] `authentication.mdc` - Auth patterns
- [ ] `validation.mdc` - Input validation
- [ ] `documentation.mdc` - API docs
- [ ] `versioning.mdc` - API versioning

#### 06-SECURITY (Security Requirements)
- [ ] `authentication.mdc` - Auth mechanisms
- [ ] `authorization.mdc` - Permissions
- [ ] `data-protection.mdc` - Data encryption
- [ ] `audit.mdc` - Security auditing
- [ ] `compliance.mdc` - Compliance rules

#### 07-PERFORMANCE (Performance Optimization)
- [ ] `backend-performance.mdc` - Backend performance
- [ ] `frontend-performance.mdc` - Frontend performance
- [ ] `database-performance.mdc` - DB performance
- [ ] `caching.mdc` - Caching strategies
- [ ] `monitoring.mdc` - Performance monitoring

#### 08-TESTING (Testing Standards)
- [ ] `unit-testing.mdc` - Unit test requirements
- [ ] `integration-testing.mdc` - Integration tests
- [ ] `e2e-testing.mdc` - E2E testing
- [ ] `test-automation.mdc` - Test automation
- [ ] `coverage.mdc` - Coverage requirements

#### 09-DEPLOYMENT (Deployment Rules)
- [ ] `environment-management.mdc` - Environment config
- [ ] `ci-cd.mdc` - CI/CD pipelines
- [ ] `docker.mdc` - Docker rules
- [ ] `monitoring.mdc` - Production monitoring
- [ ] `rollback.mdc` - Rollback procedures

#### 10-MAINTENANCE (Maintenance Rules)
- [ ] `dependency-management.mdc` - Dependency updates
- [ ] `log-management.mdc` - Log cleanup
- [ ] `backup-procedures.mdc` - Backup management
- [ ] `security-updates.mdc` - Security updates
- [ ] `performance-monitoring.mdc` - Performance tracking

#### 11-AGENT-PLAYER-SPECIFIC (Agent Player Specific)
- [✅] `workflow-management.mdc` - Created from agent-player-workflow.mdc
- [ ] `ai-agent-management.mdc` - From main rules
- [ ] `training-lab.mdc` - Training lab rules
- [ ] `licensing.mdc` - License validation
- [ ] `real-time-communication.mdc` - WebSocket rules

## Migration Commands

```bash
# Create directory structure
make organize-rules

# Move and split existing files
# This needs to be done manually to preserve content properly

# Update rules tracker to work with new structure
# Already updated in backend/core/rules_tracker.py

# Test the new structure
make validate-rules
```

## Benefits of New Structure

1. **Better Organization** - Rules are categorized logically
2. **Faster Navigation** - Easier to find specific rules
3. **Modular Updates** - Update specific areas without affecting others
4. **Clear Separation** - Each domain has its own rules
5. **Scalability** - Easy to add new rule categories
6. **Tool Integration** - Better integration with development tools

## Next Steps

1. Complete the migration of existing rules
2. Update rules tracker to work with new structure
3. Create automated migration script
4. Update documentation
5. Test with development workflow 