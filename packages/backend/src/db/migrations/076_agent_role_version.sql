-- Migration 076: role / department edits bump agents_config.version (CORE-01d)
--
-- PUT /api/agents/:id can now change role and department (BE-UI-01 CAS via
-- expectedVersion / If-Match). The version trigger of migration 067 only
-- watched the older columns, so a role-only edit would keep the version and
-- a stale editor would not notice. Same trigger, two more columns.
-- Date: 2026-10-14

DROP TRIGGER IF EXISTS trg_agents_config_version;

CREATE TRIGGER IF NOT EXISTS trg_agents_config_version
AFTER UPDATE OF name, description, emoji, system_prompt, model, provider, temperature, max_tokens, capabilities, is_primary, role, department
ON agents_config
WHEN NEW.version = OLD.version
BEGIN
  UPDATE agents_config SET version = OLD.version + 1 WHERE id = NEW.id;
END;
